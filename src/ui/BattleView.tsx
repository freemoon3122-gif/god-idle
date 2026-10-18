import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BOSS_TIME_LIMIT, SKILLS, stageLabel } from '../game/balance';
import { formatNumber } from '../game/format';
import { defenseMultiplier, RAIDS, raidPhases } from '../game/raids';
import { ActionResult, GameState, Hit, SkillId } from '../game/types';
import { RARITY_INFO, WEAPONS } from '../game/weapons';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Effect, EffectSpec, EffectView } from './effects';
import { FLOAT_CELLS, heroLayout, HeroSprite } from './HeroSprite';
import { PixelSprite, spriteSize } from './PixelSprite';
import { heroSprite, skyColors } from './sprites';
import { colors } from './theme';

const ND = Platform.OS !== 'web';
const HEIGHT = 330;
const GROUND = 34; // 바닥 높이
const SIDE = 26; // 좌우 여백
const HERO_SCALE = 4; // 신 스프라이트는 약 24×26칸 → 약 100pt
const MOUNTED_SCALE = 3.5; // 탈것(구름·상어)을 타면 폭이 넓어지므로 조금 작게
const MAX_EFFECTS = 70;

/** 부모(App)가 전투 결과를 넘겨 연출을 재생하게 하는 통로 */
export interface BattleHandle {
  play: (r: ActionResult) => void;
}

interface Props {
  state: GameState;
  onTap: () => void;
  onChallengeBoss: () => void;
  onLeaveRaid: () => void;
}


/**
 * 전투 화면. 손맛을 내는 연출 요소:
 *   - 화면 흔들림(shake), 화면 번쩍임(flash), 궁극기 때 어두워짐(tint)
 *   - 신의 돌진(dash), 몬스터가 맞으면 밀려나고(knock) 하얗게 번쩍임(hitFlash)
 *   - 스킬별 이펙트(참격, 번개, 해일, 촉수...)와 튀어오르는 데미지 숫자
 * forwardRef + useImperativeHandle: 부모가 battleRef.current.play(result)로 이 컴포넌트의 함수를 직접 부를 수 있게 한다.
 */
export const BattleView = forwardRef<BattleHandle, Props>(function BattleView({ state, onTap, onChallengeBoss, onLeaveRaid }, ref) {
  const [width, setWidth] = useState(360);
  const [effects, setEffects] = useState<Effect[]>([]);
  const nextId = useRef(0);
  const [flashColor, setFlashColor] = useState('#FFFFFF');
  const [tintColor, setTintColor] = useState('#000000');

  // 애니메이션 값들 (렌더링과 상관없이 60fps로 움직인다)
  const shake = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const flash = useRef(new Animated.Value(0)).current;
  const tint = useRef(new Animated.Value(0)).current;
  const dash = useRef(new Animated.Value(0)).current;
  const knock = useRef(new Animated.Value(0)).current;
  const hitFlash = useRef(new Animated.Value(0)).current;
  const spawn = useRef(new Animated.Value(1)).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const squash = useRef(new Animated.Value(1)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const aura = useRef(new Animated.Value(0)).current;
  const heroHit = useRef(new Animated.Value(0)).current; // 신이 맞으면 빨갛게 번쩍
  const recoil = useRef(new Animated.Value(0)).current; // 신이 맞으면 뒤로 밀려남

  const hero = heroSprite(state);
  const heroScale = state.god ? MOUNTED_SCALE : HERO_SCALE;
  const heroSize = heroLayout(hero, heroScale); // 탈것(구름·상어)까지 포함한 크기
  const heroBodyH = spriteSize(hero, heroScale).h;
  const heroFloat = heroSize.floating ? FLOAT_CELLS * heroScale : 0; // 탈것을 타면 살짝 떠 있다
  const raid = state.raid;
  const monster = raid?.monster ?? state.monster; // 레이드 중에는 레이드 적과 싸운다
  const monsterScale = raid ? 4 : monster.isBoss ? 5 : 4; // 레이드 적은 그림 자체가 커서 배율 4
  const monsterSize = spriteSize(monster.kind, monsterScale);
  // 기간토마키아: 헤라클레스가 뒤쪽 바위 언덕 위에서 활을 쏜다
  const heraclesScale = 2.5;
  const heracles = { left: width * 0.44, bottom: GROUND + 122, ...spriteSize('heracles', heraclesScale) };

  // 좌표 계산 (전투 영역 기준)
  const pos = useRef({ heroX: 0, heroY: 0, monX: 0, monY: 0, monTop: 0, groundY: 0 });
  pos.current = {
    heroX: SIDE + heroSize.w * 0.75,
    heroY: HEIGHT - GROUND - heroFloat - heroSize.h + heroBodyH * 0.5, // 신의 가슴 높이에서 공격이 나간다
    monX: width - SIDE - monsterSize.w / 2,
    monY: HEIGHT - GROUND - monsterSize.h / 2,
    monTop: HEIGHT - GROUND - monsterSize.h,
    groundY: HEIGHT - GROUND,
  };
  const heraclesRef = useRef({ x: 0, y: 0 });
  heraclesRef.current = { x: heracles.left + heracles.w * 0.8, y: HEIGHT - heracles.bottom - heracles.h * 0.55 };
  const monsterSizeRef = useRef(monsterSize);
  monsterSizeRef.current = monsterSize;

  // 둥실둥실 (무한 반복)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      ]),
    ).start();
  }, []);

  // 버프 중에는 신 뒤에서 오라가 맥동한다
  useEffect(() => {
    if (!state.buff) {
      aura.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(aura, { toValue: 1, duration: 350, useNativeDriver: ND }),
        Animated.timing(aura, { toValue: 0.4, duration: 350, useNativeDriver: ND }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state.buff?.skill]);

  // 새 몬스터 등장: 작게 튀어나왔다가 제자리로
  useEffect(() => {
    spawn.setValue(0.4);
    Animated.spring(spawn, { toValue: 1, friction: 5, tension: 140, useNativeDriver: ND }).start();
  }, [state.wave, state.totalKills, raid?.id, raid?.phase]);

  // ───────────── 연출 도구 ─────────────

  const add = useCallback((spec: EffectSpec) => {
    const id = nextId.current++;
    setEffects((list) => {
      // 배너·알림은 한 번에 하나만: 새 것이 오면 이전 것을 치운다 (겹쳐서 안 읽히는 것 방지)
      const kept = spec.kind === 'banner' || spec.kind === 'toast' ? list.filter((e) => e.kind !== spec.kind) : list;
      return [...kept.slice(-(MAX_EFFECTS - 1)), { ...spec, id } as Effect];
    });
  }, []);
  const remove = useCallback((id: number) => setEffects((list) => list.filter((e) => e.id !== id)), []);
  const later = (ms: number, fn: () => void) => setTimeout(fn, ms);

  /** 화면 흔들림: 세기(px)만큼 무작위로 몇 번 흔들고 제자리로. delay = 히트스톱 동안은 멈춰 있다가 흔들린다 */
  const shakeIt = (power: number, delay = 0) => {
    const steps = Array.from({ length: 6 }, (_, i) => {
      const k = power * (1 - i / 6);
      return Animated.timing(shake, {
        toValue: { x: (Math.random() - 0.5) * 2 * k, y: (Math.random() - 0.5) * 2 * k },
        duration: 26,
        useNativeDriver: ND,
      });
    });
    Animated.sequence([Animated.delay(delay), ...steps, Animated.timing(shake, { toValue: { x: 0, y: 0 }, duration: 40, useNativeDriver: ND })]).start();
  };

  /** 화면 번쩍임. double이면 하얗게 한 번 → 색으로 한 번, 두 번 번쩍인다 */
  const flashIt = (color: string, peak: number, duration = 220, double = false) => {
    setFlashColor(double ? '#FFFFFF' : color);
    flash.setValue(peak);
    Animated.timing(flash, { toValue: 0, duration: double ? 90 : duration, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(() => {
      if (!double) return;
      setFlashColor(color);
      flash.setValue(peak * 0.7);
      Animated.timing(flash, { toValue: 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
    });
  };

  const tintIt = (color: string, peak: number, hold: number) => {
    setTintColor(color);
    Animated.sequence([
      Animated.timing(tint, { toValue: peak, duration: 120, useNativeDriver: ND }),
      Animated.delay(hold),
      Animated.timing(tint, { toValue: 0, duration: 300, useNativeDriver: ND }),
    ]).start();
  };

  /** 줌 펀치: 화면 전체가 순간 확대됐다가 튕기듯 돌아온다 */
  const zoomIt = (amount: number) => {
    zoom.setValue(1 + amount);
    Animated.spring(zoom, { toValue: 1, friction: 5, tension: 260, useNativeDriver: ND }).start();
  };

  /**
   * 몬스터 피격: 하얗게 번쩍 → (히트스톱 동안 멈칫) → 뒤로 날아갔다 튕겨 돌아온다.
   * 히트스톱: 강한 타격 순간 0.05~0.1초 멈추는 연출. 액션 게임 "손맛"의 핵심이다.
   */
  const hitMonster = (power: number, hitStop = 0) => {
    hitFlash.setValue(1);
    Animated.sequence([Animated.delay(hitStop), Animated.timing(hitFlash, { toValue: 0, duration: 150, useNativeDriver: ND })]).start();
    knock.setValue(hitStop > 0 ? power * 0.3 : power);
    Animated.sequence([
      Animated.delay(hitStop),
      Animated.timing(knock, { toValue: power, duration: 40, useNativeDriver: ND }),
      Animated.spring(knock, { toValue: 0, friction: 4, tension: 200, useNativeDriver: ND }),
    ]).start();
    squash.setValue(hitStop > 0 ? 0.82 : 0.9);
    Animated.sequence([Animated.delay(hitStop), Animated.spring(squash, { toValue: 1, friction: 3, tension: 300, useNativeDriver: ND })]).start();
  };

  /** 신의 돌진: 앞으로 튀어나갔다 돌아온다. 지나간 자리에 잔상이 남는다 */
  const dashIt = (distance: number, ghostColor: string) => {
    for (let i = 1; i <= 3; i++) {
      add({ kind: 'ghost', x: SIDE, bottom: GROUND, sprite: hero, scale: HERO_SCALE, color: ghostColor, dx: (distance * i) / 4 });
    }
    Animated.sequence([
      Animated.timing(dash, { toValue: distance, duration: 55, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.delay(60),
      Animated.timing(dash, { toValue: 0, duration: 170, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
    ]).start();
  };

  const damageText = (hit: Hit, size: number, color: string) => {
    const p = pos.current;
    // 연타는 순서대로 좌우로 엇갈리며 위로 쌓이게 해서 숫자가 겹치지 않게 한다
    const i = hit.combo?.index ?? Math.floor(Math.random() * 3);
    add({
      kind: 'damage',
      x: p.monX + (i % 2 === 0 ? -1 : 1) * (14 + Math.random() * 22),
      y: p.monTop - 16 - (i % 4) * 24 - Math.random() * 8,
      text: formatNumber(hit.damage) + (hit.crit ? '!' : ''),
      color: hit.crit ? colors.gold : color,
      size: hit.crit ? size + 6 : size,
      crit: hit.crit,
    });
  };

  /** 강한 타격 한 세트: 빛 번짐 + 폭발 + 파편 (+ 광선) */
  const impact = (x: number, y: number, color: string, scale: number, rays = false) => {
    add({ kind: 'glow', x, y, color, size: 160 * scale });
    add({ kind: 'burst', x, y, color, size: 120 * scale });
    add({ kind: 'debris', x, y, color, count: Math.round(10 * scale), power: 70 * scale });
    if (rays) add({ kind: 'rays', x, y, color, size: 300 * scale });
  };

  // ───────────── 스킬 시전 연출 (피해가 없는 부분: 배너, 분위기) ─────────────

  const playCast = (id: SkillId) => {
    const p = pos.current;
    const skill = SKILLS[id];
    const isUlt = id === 'zeus_judgment' || id === 'poseidon_kraken';
    const color = skillColor(id);
    add({ kind: 'banner', text: `${skill.name}!`, color, big: isUlt });

    if (id === 'zeus_storm') {
      tintIt('#0A0820', 0.45, 350);
      flashIt('#FFF6B0', 0.6, 260, true);
      shakeIt(9);
      add({ kind: 'glow', x: p.heroX, y: p.heroY, color: '#FFE97A', size: 220 });
      for (let i = 0; i < 4; i++) {
        later(i * 80, () => add({ kind: 'bolt', width, height: HEIGHT, x: 50 + Math.random() * (width - 100), toY: p.groundY, color: '#FFE97A', thick: 6 }));
      }
    } else if (id === 'poseidon_trident') {
      flashIt('#9FF3FF', 0.5, 240, true);
      add({ kind: 'rays', x: p.heroX, y: p.heroY, color: '#6FE3FF', size: 260 });
      for (let i = 0; i < 5; i++) {
        later(i * 55, () => {
          add({ kind: 'thrust', fromX: p.heroX, toX: p.monX + 20, y: p.monY - 30 + i * 14, color: '#6FE3FF' });
          hitMonster(6);
        });
      }
    } else if (id === 'poseidon_wave') {
      add({ kind: 'wave', width, height: 190, bottom: GROUND - 8 });
    } else if (id === 'zeus_judgment') {
      tintIt('#04030C', 0.75, 1100);
      add({ kind: 'speedlines', width, height: HEIGHT, x: p.monX, y: p.monY, color: '#FFE97A' });
      zoomIt(0.05);
    } else if (id === 'poseidon_kraken') {
      tintIt('#021A33', 0.75, 1250);
      add({ kind: 'speedlines', width, height: HEIGHT, x: p.monX, y: p.monY, color: '#B48CFF' });
      zoomIt(0.05);
    } else if (id === 'teen_slash') {
      add({ kind: 'glow', x: p.heroX + 30, y: p.heroY - 20, color: '#7FE8FF', size: 140 });
    } else if (id === 'zeus_gigas') {
      tintIt('#0A0820', 0.5, 900);
      flashIt('#FFE97A', 0.5, 240, true);
      add({ kind: 'glow', x: p.heroX, y: p.heroY, color: '#FFE97A', size: 220 });
      add({ kind: 'rays', x: p.heroX, y: p.heroY, color: '#FFD54A', size: 260 });
    } else if (id === 'poseidon_nisyros') {
      tintIt('#021A33', 0.55, 500);
      shakeIt(6);
      add({ kind: 'speedlines', width, height: HEIGHT, x: p.monX, y: p.monY, color: '#5FD3B0' });
    }
  };

  // ───────────── 타격 연출 ─────────────

  const playHit = (hit: Hit, autoCount: number, skillInSameTick: boolean) => {
    const p = pos.current;
    const combo = hit.combo;
    const last = combo ? combo.index === combo.total - 1 : true;

    switch (hit.source) {
      case 'auto': {
        // 공격 속도가 빠를 때는 연출이 화면을 가리지 않게 일부만 보여준다
        if (autoCount > 2 && Math.random() < 0.5) return;
        const color = orbColor(state);
        add({ kind: 'orb', fromX: p.heroX, fromY: p.heroY, toX: p.monX, toY: p.monY, color });
        later(160, () => {
          add({ kind: 'glow', x: p.monX, y: p.monY, color, size: 70 });
          add({ kind: 'debris', x: p.monX, y: p.monY, color, count: 4, power: 36 });
          hitMonster(5);
          // 스킬 숫자가 잘 보이도록, 같은 순간에 스킬 타격이 있으면 기본 공격 숫자는 생략
          if (!skillInSameTick) damageText(hit, 16, colors.text);
        });
        return;
      }
      case 'tap': {
        add({ kind: 'crescent', x: p.monX, y: p.monY, angle: Math.random() * 360, radius: 46, color: '#FFFFFF', flip: Math.random() < 0.5 });
        add({ kind: 'burst', x: p.monX, y: p.monY, color: '#FFFFFF', size: 70 });
        add({ kind: 'debris', x: p.monX, y: p.monY, color: '#FFFFFF', count: 5, power: 45 });
        hitMonster(8);
        shakeIt(3);
        damageText(hit, 18, colors.text);
        return;
      }
      case 'teen_slash': {
        // 삼연참: 잔상을 남기며 돌진 → 초승달 검기가 X자로 교차 → 마지막은 거대한 횡베기 + 히트스톱
        const i = combo?.index ?? 0;
        const angles = [-35, 35, 0];
        const C = '#7FE8FF';
        dashIt(width * 0.34, C);
        later(50, () => {
          add({ kind: 'crescent', x: p.monX, y: p.monY, angle: angles[i], radius: last ? 95 : 70, color: C, flip: i === 1 });
          if (last) add({ kind: 'crescent', x: p.monX, y: p.monY + 6, angle: 180, radius: 110, color: '#FFFFFF', flip: true });
          impact(p.monX, p.monY, C, last ? 1.5 : 0.9, last);
          hitMonster(last ? 26 : 13, last ? 90 : 30);
          shakeIt(last ? 13 : 6, last ? 90 : 30);
          if (last) {
            zoomIt(0.07);
            flashIt(C, 0.6, 260, true);
            add({ kind: 'speedlines', width, height: HEIGHT, x: p.monX, y: p.monY, color: C });
            add({ kind: 'groundRing', x: p.monX, y: p.groundY - 4, color: C, size: 220 });
          }
          damageText(hit, last ? 32 : 24, C);
        });
        return;
      }
      case 'zeus_bolt': {
        const C = '#FFE97A';
        add({ kind: 'bolt', width, height: HEIGHT, x: p.monX, toY: p.monY, color: C, thick: 12, branches: 3 });
        flashIt(C, 0.8, 260, true);
        impact(p.monX, p.monY, C, 1.5, true);
        add({ kind: 'groundRing', x: p.monX, y: p.groundY - 4, color: C, size: 240 });
        add({ kind: 'smoke', x: p.monX, y: p.groundY - 20, count: 5 });
        zoomIt(0.06);
        hitMonster(24, 80);
        shakeIt(15, 80);
        damageText(hit, 34, C);
        return;
      }
      case 'poseidon_wave': {
        const C = '#6FE3FF';
        flashIt(C, 0.5, 260, true);
        impact(p.monX, p.monY, C, 1.3);
        add({ kind: 'debris', x: p.monX, y: p.monY + 20, color: '#E6FBFF', count: 18, power: 120 }); // 물보라
        zoomIt(0.04);
        hitMonster(30, 60);
        shakeIt(12, 60);
        damageText(hit, 32, C);
        return;
      }
      case 'zeus_judgment': {
        // 올림포스의 심판: 번개 8줄기가 몬스터 주변에 쏟아지고, 마지막은 초대형 번개 + 폭발
        const C = '#FFE97A';
        const x = last ? p.monX : p.monX + (Math.random() - 0.5) * 160;
        add({ kind: 'bolt', width, height: HEIGHT, x, toY: p.groundY - 6, color: C, thick: last ? 22 : 9, branches: last ? 4 : 2 });
        add({ kind: 'groundRing', x, y: p.groundY - 4, color: C, size: last ? 320 : 140 });
        add({ kind: 'debris', x, y: p.groundY - 12, color: C, count: last ? 24 : 8, power: last ? 150 : 70 });
        hitMonster(last ? 34 : 10, last ? 110 : 0);
        if (last) {
          impact(p.monX, p.monY, C, 2.2, true);
          add({ kind: 'smoke', x: p.monX, y: p.groundY - 20, count: 8 });
          flashIt(C, 1, 450, true);
          zoomIt(0.09);
          shakeIt(22, 110);
        } else {
          add({ kind: 'glow', x, y: p.groundY - 30, color: C, size: 120 });
          flashIt('#FFF6B0', 0.3, 140);
          shakeIt(7);
        }
        damageText(hit, last ? 40 : 26, C);
        return;
      }
      case 'poseidon_kraken': {
        // 크라켄 강림: 촉수가 몬스터 양옆에서 번갈아 솟구쳐 내리친다. 마지막엔 해일까지
        const offsets = [-60, 55, -25, 70, -75, 0];
        const i = combo?.index ?? 0;
        const off = offsets[i % offsets.length];
        const P = '#B48CFF';
        add({ kind: 'tentacle', x: p.monX + off, bottom: GROUND - 6, height: last ? 250 : 190, tilt: off > 0 ? -10 : 10 });
        add({ kind: 'debris', x: p.monX + off, y: p.groundY - 6, color: '#9FE7FF', count: 10, power: 80 }); // 땅에서 튀는 물보라
        add({ kind: 'groundRing', x: p.monX + off, y: p.groundY - 4, color: '#9FE7FF', size: 150 });
        later(80, () => {
          impact(p.monX, p.monY, P, last ? 1.8 : 0.9, last);
          hitMonster(last ? 34 : 14, last ? 100 : 30);
          shakeIt(last ? 20 : 8, last ? 100 : 30);
          if (last) {
            add({ kind: 'wave', width, height: 220, bottom: GROUND - 8 });
            flashIt('#B8F4FF', 0.9, 420, true);
            zoomIt(0.08);
          }
          damageText(hit, last ? 40 : 26, P);
        });
        return;
      }
      case 'heracles': {
        // 헤라클레스의 화살: 언덕에서 날아가 꽂히고, 맞은 거인에게 금빛 「필멸의 표식」이 새겨진다
        const C = '#FFD54A';
        const h = heraclesRef.current;
        add({ kind: 'arrow', fromX: h.x, fromY: h.y, toX: p.monX - 10, toY: p.monY - 10, color: C });
        later(220, () => {
          add({ kind: 'burst', x: p.monX, y: p.monY, color: C, size: 90, spikes: 8 });
          add({ kind: 'groundRing', x: p.monX, y: p.monY, color: C, size: 130 });
          hitMonster(9);
          damageText(hit, 22, C);
        });
        return;
      }
      case 'zeus_gigas': {
        // 거인 사냥: 짝수 번째는 번개, 홀수 번째는 헤라클레스의 화살. 마지막은 둘이 동시에
        const i = combo?.index ?? 0;
        const C = '#FFE97A';
        const h = heraclesRef.current;
        if (i % 2 === 0 || last) {
          add({ kind: 'bolt', width, height: HEIGHT, x: p.monX + (last ? 0 : (Math.random() - 0.5) * 60), toY: p.monY, color: C, thick: last ? 18 : 9, branches: 2 });
          flashIt('#FFF6B0', last ? 0.8 : 0.35, 180, last);
        }
        if (i % 2 === 1 || last) {
          const fromX = raid?.id === 'gigantomachy' ? h.x : p.heroX;
          const fromY = raid?.id === 'gigantomachy' ? h.y : p.heroY - 30;
          add({ kind: 'arrow', fromX, fromY, toX: p.monX, toY: p.monY - 10 + (i % 3) * 10, color: '#FFD54A' });
        }
        impact(p.monX, p.monY, C, last ? 1.8 : 0.8, last);
        hitMonster(last ? 30 : 12, last ? 100 : 20);
        shakeIt(last ? 18 : 6, last ? 100 : 20);
        if (last) {
          zoomIt(0.07);
          add({ kind: 'groundRing', x: p.monX, y: p.groundY - 4, color: C, size: 280 });
        }
        damageText(hit, last ? 38 : 24, C);
        return;
      }
      case 'poseidon_nisyros': {
        // 니시로스 투척: 섬이 하늘에서 떨어져 내리꽂힌다 → 땅이 갈라지며 큰 충격
        const C = '#5FD3B0';
        const size = Math.max(130, monsterSizeRef.current.w * 1.1);
        add({ kind: 'island', x: p.monX, toY: p.groundY - 10, size });
        later(390, () => {
          impact(p.monX, p.monY, '#C9A26B', 2, true);
          add({ kind: 'debris', x: p.monX, y: p.groundY - 10, color: '#7A5A3E', count: 22, power: 150 });
          add({ kind: 'debris', x: p.monX, y: p.groundY - 10, color: '#5CC46B', count: 10, power: 110 });
          add({ kind: 'groundRing', x: p.monX, y: p.groundY - 4, color: C, size: 340 });
          add({ kind: 'smoke', x: p.monX, y: p.groundY - 20, count: 9 });
          flashIt('#FFFFFF', 0.9, 420, true);
          zoomIt(0.1);
          hitMonster(36, 120);
          shakeIt(24, 120);
          damageText(hit, 42, C);
        });
        return;
      }
      default:
        // 지속형 스킬(천둥 폭풍, 삼지창 난무)은 시전 연출만 있다
        return;
    }
  };

  // ───────────── 레이드 기믹 연출 ─────────────

  /** 적의 공격: 몬스터가 앞으로 덤벼들고 → 신이 빨갛게 번쩍이며 뒤로 밀린다 → 신 머리 위에 받은 피해 */
  const strikeHero = (damage: number, color = '#FF4D4D') => {
    const p = pos.current;
    Animated.sequence([
      Animated.timing(knock, { toValue: -36, duration: 90, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      Animated.spring(knock, { toValue: 0, friction: 5, tension: 160, useNativeDriver: ND }),
    ]).start();
    later(90, () => {
      heroHit.setValue(1);
      Animated.timing(heroHit, { toValue: 0, duration: 260, useNativeDriver: ND }).start();
      recoil.setValue(-14);
      Animated.spring(recoil, { toValue: 0, friction: 4, tension: 200, useNativeDriver: ND }).start();
      add({ kind: 'burst', x: p.heroX, y: p.heroY, color, size: 80, spikes: 7 });
      add({ kind: 'damage', x: p.heroX, y: p.heroY - 70, text: `-${formatNumber(damage)}`, color, size: 22, crit: false });
      shakeIt(6);
    });
  };

  const playRaidEvent = (ev: ActionResult['raidEvents'][number]) => {
    const p = pos.current;
    const m = monsterSizeRef.current;
    switch (ev) {
      case 'intro':
        flashIt('#FFFFFF', 0.8, 400);
        add({ kind: 'banner', text: '레이드 시작!', color: colors.boss, big: true });
        return;
      case 'boss':
        tintIt('#200000', 0.5, 500);
        shakeIt(12);
        add({ kind: 'banner', text: '보스 등장!', color: colors.boss, big: true });
        return;
      case 'strike':
        if (raid) strikeHero(raid.attack);
        return;
      case 'down':
        tintIt('#300000', 0.6, 600);
        shakeIt(18);
        add({ kind: 'banner', text: '신이 쓰러졌다...', color: '#FF4D4D', big: true });
        return;
      case 'breath': {
        // 불길 브레스: 괴물의 입에서 신에게 불길이 뿜어지고, 신은 잠깐 기절
        const mouthX = p.monX - m.w * 0.12;
        const mouthY = p.monTop + m.h * 0.35;
        add({ kind: 'breath', fromX: mouthX, toX: SIDE - 10, y: mouthY + 20, height: 120 });
        later(250, () => {
          flashIt('#FF7A1F', 0.5, 400, true);
          shakeIt(14);
          if (raid) add({ kind: 'damage', x: p.heroX, y: p.heroY - 80, text: `-${formatNumber(raid.attack * 3)}`, color: '#FF7A1F', size: 26, crit: true });
          add({ kind: 'debris', x: p.heroX, y: p.heroY, color: '#FF7A1F', count: 14, power: 90 });
        });
        add({ kind: 'toast', text: '🔥 불길 브레스! 잠깐 기절했다', color: '#FF7A1F' });
        return;
      }
      case 'enrage':
        tintIt('#3A0000', 0.55, 700);
        shakeIt(16);
        zoomIt(0.06);
        add({ kind: 'banner', text: '티포에우스 분노!', color: '#FF4D4D', big: true });
        return;
      case 'tendon':
        flashIt('#B8323A', 0.7, 500, true);
        shakeIt(18);
        add({ kind: 'banner', text: '힘줄 절단!', color: '#FF4D4D', big: true });
        return;
      case 'hermes':
        flashIt('#FFFFFF', 0.6, 300);
        add({ kind: 'rays', x: p.heroX, y: p.heroY, color: '#FFD54A', size: 300 });
        add({ kind: 'glow', x: p.heroX, y: p.heroY, color: '#FFD54A', size: 220 });
        add({ kind: 'banner', text: '힘줄을 되찾았다!', color: colors.gold, big: false });
        return;
      case 'clear':
        flashIt('#FFFFFF', 1, 600, true);
        zoomIt(0.08);
        add({ kind: 'rays', x: width / 2, y: 150, color: colors.gold, size: 420 });
        add({ kind: 'banner', text: '레이드 클리어!', color: colors.gold, big: true });
        return;
      case 'fail':
        tintIt('#000000', 0.5, 400);
        add({ kind: 'banner', text: '레이드 종료', color: colors.subText, big: false });
        return;
    }
  };

  useImperativeHandle(ref, () => ({
    play(r: ActionResult) {
      r.casts.forEach(playCast);
      const autoCount = r.hits.filter((h) => h.source === 'auto').length;
      const skillInSameTick = r.hits.some((h) => h.source !== 'auto' && h.source !== 'tap');
      r.hits.forEach((h) => playHit(h, autoCount, skillInSameTick));
      if (r.killed) {
        const p = pos.current;
        later(120, () => {
          add({ kind: 'debris', x: p.monX, y: p.monY, color: '#FFFFFF', count: 10, power: 80 });
          add({ kind: 'smoke', x: p.monX, y: p.monY + 10, count: 3 });
        });
      }
      for (const id of r.drops) {
        const w = WEAPONS[id];
        const rarity = RARITY_INFO[w.rarity];
        if (w.rarity === 'legend' || w.rarity === 'transcendent') {
          const p = pos.current;
          add({ kind: 'banner', text: `${w.emoji} ${rarity.name} 획득!`, color: rarity.color, big: w.rarity === 'transcendent' });
          add({ kind: 'rays', x: width / 2, y: 150, color: rarity.color, size: 380 });
          add({ kind: 'glow', x: p.monX, y: p.monY, color: rarity.color, size: 240 });
          flashIt(rarity.color, 0.55, 500, true);
          shakeIt(w.rarity === 'transcendent' ? 14 : 6);
        }
        add({ kind: 'toast', text: `🎁 [${rarity.name}] ${w.name}`, color: rarity.color });
      }
      r.raidEvents.forEach(playRaidEvent);
    },
  }));

  // 기간토마키아는 핏빛 노을, 티포에우스는 용암이 끓는 화산
  const [skyTop, skyBottom] = raid ? (raid.id === 'gigantomachy' ? ['#2A0E14', '#7A2A1E'] : ['#12040A', '#4A0E08']) : skyColors(state);
  const phases = raid ? raidPhases(raid.id, state.god) : [];

  return (
    <Pressable onPressIn={onTap} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={styles.outer}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: skyBottom, transform: [{ translateX: shake.x }, { translateY: shake.y }, { scale: zoom }] },
        ]}
      >
        <View style={[styles.skyTop, { backgroundColor: skyTop }]} />
        <View style={[styles.ground, raid && { backgroundColor: raid.id === 'typhoeus' ? '#3A1208' : '#3A2418' }]} />
        {raid?.id === 'typhoeus' && <View style={styles.lava} />}

        {/* 헤라클레스: 바위 언덕 위에서 활을 겨눈다 */}
        {raid?.id === 'gigantomachy' && (
          <View style={{ position: 'absolute', left: heracles.left, bottom: heracles.bottom - 10 }} pointerEvents="none">
            <PixelSprite name="heracles" scale={heraclesScale} />
            <View style={styles.ledge} />
          </View>
        )}

        {/* 신 */}
        <Animated.View
          style={{
            position: 'absolute',
            left: SIDE,
            bottom: GROUND + heroFloat,
            transform: [
              { translateX: Animated.add(dash, recoil) },
              { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            ],
          }}
        >
          {state.buff && (
            <Animated.View
              style={[
                styles.aura,
                {
                  width: heroSize.w * 1.6,
                  height: heroSize.w * 1.6,
                  left: -heroSize.w * 0.3,
                  top: heroSize.h / 2 - heroSize.w * 0.8,
                  opacity: aura.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }),
                  transform: [{ scale: aura.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.08] }) }],
                },
              ]}
            >
              {/* 가운데가 밝고 바깥으로 갈수록 투명해지는 빛 */}
              <Svg width={heroSize.w * 1.6} height={heroSize.w * 1.6}>
                <Defs>
                  <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={skillColor(state.buff.skill)} stopOpacity="0.7" />
                    <Stop offset="0.6" stopColor={skillColor(state.buff.skill)} stopOpacity="0.25" />
                    <Stop offset="1" stopColor={skillColor(state.buff.skill)} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx={heroSize.w * 0.8} cy={heroSize.w * 0.8} r={heroSize.w * 0.8} fill="url(#aura)" />
              </Svg>
            </Animated.View>
          )}
          <HeroSprite name={hero} scale={heroScale} />
          {raid && (
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: heroHit }]} pointerEvents="none">
              <HeroSprite name={hero} scale={heroScale} tint="#FF3B3B" />
            </Animated.View>
          )}
          {raid && raid.stunLeft > 0 && <Text style={styles.stun}>💫</Text>}
          {/* 레이드 중 신의 체력 */}
          {raid && (
            <View style={[styles.godHpTrack, { width: Math.min(heroSize.w, 110) }]} pointerEvents="none">
              <View style={[styles.godHpFill, { width: `${Math.max(0, raid.godHp / raid.godMaxHp) * 100}%` }]} />
            </View>
          )}
        </Animated.View>

        {/* 몬스터 */}
        <Animated.View
          style={{
            position: 'absolute',
            right: SIDE,
            bottom: GROUND,
            transform: [
              { translateX: knock },
              { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-3, 0] }) },
              { scale: spawn },
              { scaleY: squash }, // 맞으면 납작해졌다가 튕겨 돌아온다
            ],
          }}
        >
          <PixelSprite name={monster.kind} scale={monsterScale} />
          {raid && raid.markLeft > 0 && <View style={[styles.mark, { width: monsterSize.w, height: monsterSize.h }]} />}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: hitFlash }]}>
            <PixelSprite name={monster.kind} scale={monsterScale} tint="#FFFFFF" />
          </Animated.View>
        </Animated.View>

        {/* 궁극기 어둠 → 이펙트 → 번쩍임 순서로 겹친다 */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, opacity: tint }]} />
        {effects.map((e) => (
          <EffectView key={e.id} effect={e} onDone={remove} />
        ))}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, opacity: flash }]} />

        {/* HUD: 스테이지, 보스 타이머, 몬스터 체력 */}
        <View style={styles.topRow} pointerEvents="none">
          <Text style={styles.stage}>
            {raid
              ? `${RAIDS[raid.id].emoji} ${RAIDS[raid.id].name} ${raid.stage}단계 · ${raid.phase + 1}/${phases.length}`
              : `스테이지 ${stageLabel(state.wave)}`}
          </Text>
          {raid && <Text style={[styles.buff, { color: raid.timeLeft < 15_000 ? colors.hp : colors.text }]}>⏱ {Math.ceil(raid.timeLeft / 1000)}초</Text>}
          {state.buff && (
            <Text style={styles.buff}>
              {SKILLS[state.buff.skill].emoji} {Math.ceil(state.buff.timeLeft / 1000)}초
            </Text>
          )}
        </View>
        {raid && (
          <View style={styles.bossTimerTrack} pointerEvents="none">
            <View style={[styles.bossTimerFill, { width: `${Math.max(0, raid.timeLeft / RAIDS[raid.id].timeLimit) * 100}%` }]} />
          </View>
        )}
        {raid && (
          <View style={styles.chips} pointerEvents="none">
            {raidChips(raid).map(([text, color]) => (
              <Text key={text} style={[styles.chip, { borderColor: color, color }]}>
                {text}
              </Text>
            ))}
          </View>
        )}
        {!raid && state.bossTimeLeft !== null && (
          <View style={styles.bossTimerTrack} pointerEvents="none">
            <View style={[styles.bossTimerFill, { width: `${Math.min(1, state.bossTimeLeft / BOSS_TIME_LIMIT) * 100}%` }]} />
          </View>
        )}
        <View style={styles.monsterInfo} pointerEvents="none">
          <Text style={[styles.monsterName, monster.isBoss && { color: colors.boss }]}>{monster.name}</Text>
          <View style={styles.hpTrack}>
            <View style={[styles.hpFill, { width: `${Math.max(0, monster.hp / monster.maxHp) * 100}%` }]} />
          </View>
          <Text style={styles.hpText}>
            {formatNumber(monster.hp)} / {formatNumber(monster.maxHp)}
          </Text>
        </View>

        {raid ? (
          <Pressable onPress={onLeaveRaid} style={[styles.challenge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Text style={styles.challengeText}>🏳️ 포기하고 나가기</Text>
          </Pressable>
        ) : state.farming ? (
          <Pressable onPress={onChallengeBoss} style={styles.challenge}>
            <Text style={styles.challengeText}>👑 보스 재도전</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint} pointerEvents="none">
            화면을 터치하면 추가 공격!
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
});

/** 레이드 기믹 상태를 HUD 칩으로: [글자, 색] */
function raidChips(r: NonNullable<GameState['raid']>): [string, string][] {
  const sec = (ms: number) => `${Math.ceil(ms / 1000)}초`;
  const chips: [string, string][] = [
    [`💙 ${formatNumber(Math.max(0, r.godHp))}/${formatNumber(r.godMaxHp)}`, colors.xp],
    [`⚔️ ${formatNumber(r.attack)}`, '#FF8A8A'],
    [`🛡️ ${formatNumber(r.defense)} (피해 ${Math.round(defenseMultiplier(r.defense) * 100)}%)`, '#C9C2E8'],
  ];
  if (r.id === 'gigantomachy') {
    chips.push(r.markLeft > 0 ? [`🎯 필멸의 표식 ×1.5 ${sec(r.markLeft)}`, colors.gold] : ['🛡️ 불사의 거인: 피해 ½', '#A79FCC']);
  } else {
    if (r.tendonLeft > 0) chips.push([`🩸 힘줄 절단 ×0.2 ${sec(r.tendonLeft)}`, '#FF6B6B']);
    if (r.restoredLeft > 0) chips.push([`🪽 되찾은 힘 ×1.5 ${sec(r.restoredLeft)}`, colors.gold]);
    if (r.stunLeft > 0) chips.push(['💫 기절', '#FF9F43']);
    if (r.enraged) chips.push(['🔥 분노', '#FF4D4D']);
  }
  return chips;
}

export function skillColor(id: SkillId): string {
  switch (id) {
    case 'teen_slash':
      return '#7FE8FF';
    case 'zeus_bolt':
    case 'zeus_storm':
    case 'zeus_judgment':
    case 'zeus_gigas':
      return '#FFE97A';
    case 'poseidon_wave':
    case 'poseidon_trident':
      return '#6FE3FF';
    case 'poseidon_kraken':
      return '#B48CFF';
    case 'poseidon_nisyros':
      return '#5FD3B0';
  }
}

function orbColor(s: GameState): string {
  if (s.god === 'zeus') return '#FFE97A';
  if (s.god === 'poseidon') return '#6FE3FF';
  return '#FFFFFF';
}

const styles = StyleSheet.create({
  outer: { height: HEIGHT, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
  container: { flex: 1 },
  skyTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: GROUND, backgroundColor: colors.ground },
  aura: { position: 'absolute' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  stage: { color: colors.text, fontWeight: '800', fontSize: 15 },
  buff: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  bossTimerTrack: { height: 6, marginHorizontal: 12, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.35)' },
  bossTimerFill: { height: '100%', borderRadius: 3, backgroundColor: colors.boss },
  monsterInfo: { alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 8 },
  monsterName: { color: colors.text, fontWeight: '700', fontSize: 14 },
  hpTrack: { width: 140, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.4)', marginTop: 4 },
  hpFill: { height: '100%', borderRadius: 4, backgroundColor: colors.hp },
  hpText: { color: colors.subText, fontSize: 11, marginTop: 2 },
  hint: { position: 'absolute', bottom: 9, alignSelf: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  challenge: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    backgroundColor: colors.boss,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
  },
  challengeText: { color: '#fff', fontWeight: '800' },
  lava: { position: 'absolute', left: 0, right: 0, bottom: GROUND - 6, height: 6, backgroundColor: '#FF7A1F', opacity: 0.8 },
  ledge: { width: 70, height: 14, marginLeft: -10, marginTop: -4, borderRadius: 8, backgroundColor: '#5A3A2A', borderWidth: 2, borderColor: '#1C1430' },
  godHpTrack: { position: 'absolute', bottom: -12, left: 4, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.5)', overflow: 'hidden' },
  godHpFill: { height: '100%', backgroundColor: colors.xp },
  stun: { position: 'absolute', top: -6, alignSelf: 'center', fontSize: 26 },
  mark: { position: 'absolute', left: 0, top: 0, borderRadius: 999, borderWidth: 3, borderColor: 'rgba(255, 213, 74, 0.8)', backgroundColor: 'rgba(255, 213, 74, 0.12)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, marginTop: 6 },
  chip: { fontSize: 11, fontWeight: '800', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.45)', overflow: 'hidden' },
});
