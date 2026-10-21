import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BOSS_TIME_LIMIT, chapterOf, DIFFICULTIES, isBossWave, SKILLS, stageLabel } from '../game/balance';
import { availableSkills } from '../game/engine';
import { DEPTH_SCALE, FIELD_W, nearestMonster, SPLASH_RANGE, VIEW_W } from '../game/field';
import { BACKDROP_H, BgTheme, FieldBackground, SKY } from './Background';
import { CHAPTERS } from '../game/story';
import { formatNumber } from '../game/format';
import { defenseMultiplier, RAIDS, raidPhases } from '../game/raids';
import { ActionResult, FieldMonster, GameState, Hit, MoveInput, SkillId } from '../game/types';
import { RARITY_INFO, WEAPONS } from '../game/weapons';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Effect, EffectSpec, EffectView } from './effects';
import { FLOAT_CELLS, heroLayout, HeroSprite } from './HeroSprite';
import { PixelSprite, spriteSize } from './PixelSprite';
import { heroSprite } from './sprites';
import { colors } from './theme';

const ND = Platform.OS !== 'web';
const SIDE = 20; // 좌우 여백
const HERO_SCALE = 3.6;
const MOUNTED_SCALE = 3.1; // 탈것(구름·상어)을 타면 폭이 넓어지므로 조금 작게
const MOB_WIDTH = 32; // 일반 몬스터 그림 폭(pt). 스프라이트 크기가 달라도 이 폭에 맞춘다 (여러 마리가 나와서 작게)
const BOSS_WIDTH = 55;
const FIELD_HUD = 120; // 필드 위쪽에 남겨 둘 공간 (스테이지·몬스터 정보 글자, 캐릭터 머리)
const STICK_MAX = 46; // 조이스틱 손잡이가 움직이는 최대 거리(pt)
const MAX_EFFECTS = 70;
/** 광역 스킬에서 주 대상의 타격 연출이 늦게 들어가는 시간(ms). 나머지 대상도 맞춰서 늦게 */
const SECONDARY_DELAY: Partial<Record<string, number>> = { adult_meteor: 160, poseidon_kraken: 80 };
const RAID_HUD = 150; // 레이드 화면 위쪽 정보(칩·보스 이름·체력바)가 차지하는 높이

/** 부모(App)가 전투 결과를 넘겨 연출을 재생하게 하는 통로 */
export interface BattleHandle {
  play: (r: ActionResult) => void;
}

interface Props {
  state: GameState;
  onTap: () => void;
  onChallengeBoss: () => void;
  onLeaveRaid: () => void;
  /** 조이스틱 입력 (손을 떼면 null → 멈춰서 자동 공격) */
  onMove: (move: MoveInput | null) => void;
  /** 끌고 있는 동안은 바깥 스크롤을 막는다 */
  onDragging?: (dragging: boolean) => void;
  /** 화면 위아래를 덮는 UI(상단 정보, 스킬 버튼·하단 탭)의 높이. 그만큼 피해서 필드를 그린다 */
  topInset: number;
  bottomInset: number;
  /** 알림(toast)을 띄울 높이 (아래 창이 열려 있으면 창 위). 없으면 아래 UI 바로 위 */
  toastBottom?: number;
}

/** 몬스터 그림 배율: 스프라이트 원래 크기가 제각각이라 정해진 폭에 맞춘다 */
function mobScale(m: { kind: string; isBoss: boolean }): number {
  return (m.isBoss ? BOSS_WIDTH : MOB_WIDTH) / spriteSize(m.kind, 1).w;
}


/**
 * 전투 화면. 손맛을 내는 연출 요소:
 *   - 화면 흔들림(shake), 화면 번쩍임(flash), 궁극기 때 어두워짐(tint)
 *   - 신의 돌진(dash), 몬스터가 맞으면 밀려나고(knock) 하얗게 번쩍임(hitFlash)
 *   - 스킬별 이펙트(참격, 번개, 해일, 촉수...)와 튀어오르는 데미지 숫자
 * forwardRef + useImperativeHandle: 부모가 battleRef.current.play(result)로 이 컴포넌트의 함수를 직접 부를 수 있게 한다.
 */
export const BattleView = forwardRef<BattleHandle, Props>(function BattleView({ state, onTap, onChallengeBoss, onLeaveRaid, onMove, onDragging, topInset, bottomInset, toastBottom }, ref) {
  // 전체 화면: 실제 크기를 재서 쓴다 (폰마다 다르다)
  const [size, setSize] = useState({ w: 390, h: 760 });
  const width = size.w;
  const HEIGHT = size.h;
  const GROUND = bottomInset + 18; // 필드 맨 앞(y=0)이 서는 높이: 아래 UI 바로 위
  // 화면에 보이는 필드 높이 (위 정보 영역과 아래 버튼 사이)
  const DEPTH_PX = Math.max(80, HEIGHT - GROUND - topInset - FIELD_HUD);
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
  // 무기 휘두르기: 0 가만히 → 1 뒤로 젖힘 → 2 앞으로 내리침 → 3 제자리 (끝나면 0으로)
  const swing = useRef(new Animated.Value(0)).current;
  const swingAngle = swing.interpolate({ inputRange: [0, 1, 2, 3], outputRange: ['0deg', '-35deg', '55deg', '0deg'] });
  const swingBusy = useRef(false);

  const hero = heroSprite(state);
  const heroScale = state.god ? MOUNTED_SCALE : HERO_SCALE;
  const heroSize = heroLayout(hero, heroScale); // 탈것(구름·상어)까지 포함한 크기
  const heroBodyH = spriteSize(hero, heroScale).h;
  const heroFloat = heroSize.floating ? FLOAT_CELLS * heroScale : 0; // 탈것을 타면 살짝 떠 있다
  const raid = state.raid;
  // ───────────── 카메라: 맵(240×160단위)이 화면(100단위 폭)보다 커서, 신을 화면 가운데에 두고 따라간다 ─────────────
  const u = width / VIEW_W; // 필드 1단위 = u픽셀
  const worldW = FIELD_W * u;
  const worldH = DEPTH_SCALE * u; // 맵 세로(깊이) 픽셀
  // 맵 끝에 가면 카메라가 멈추고 신만 움직인다 (맵 바깥이 보이지 않게)
  const camX = Math.min(FIELD_W - VIEW_W / 2, Math.max(VIEW_W / 2, state.hero.x));
  const camY = worldH > DEPTH_PX ? Math.min(worldH - DEPTH_PX, Math.max(0, state.hero.y * worldH - DEPTH_PX / 2)) : 0;
  // 필드 좌표 → 화면: x는 좌우, y(깊이)는 뒤에 있을수록 위
  const toX = (x: number) => width / 2 + (x - camX) * u;
  const toBottom = (y: number) => GROUND - 14 + y * worldH - camY;
  const heroLeft = toX(state.hero.x) - heroSize.w / 2;
  const heroBottom = toBottom(state.hero.y) + heroFloat;
  // 주 대상: 레이드면 레이드 보스, 아니면 신에게 가장 가까운 몬스터
  const nearest = raid ? null : nearestMonster(state.hero, state.monsters);
  const monster = raid?.monster ?? nearest ?? { kind: 'slime', name: '', hp: 0, maxHp: 1, isBoss: false };
  // 레이드 보스는 크게(4배) 그리되, 작은 화면에서 스킬 버튼이 두 줄이면 위쪽 레이드 정보에 닿지 않게 줄인다
  const monsterScale = raid ? Math.max(2, Math.min(4, (HEIGHT - GROUND - topInset - RAID_HUD) / spriteSize(monster.kind, 1).h)) : mobScale(monster);
  const monsterSize = spriteSize(monster.kind, monsterScale);
  // 기간토마키아: 헤라클레스가 뒤쪽 바위 언덕 위에서 활을 쏜다
  const heraclesScale = 2.5;
  const heracles = { left: width * 0.44, bottom: GROUND + DEPTH_PX * 0.85, ...spriteSize('heracles', heraclesScale) };

  // 좌표 계산 (전투 영역 기준)
  const pos = useRef({ heroX: 0, heroY: 0, monX: 0, monY: 0, monTop: 0, groundY: 0 });
  // 필드 몬스터의 화면 위치 (연출을 맞은 몬스터 위치에 그리려고 기억해 둔다. 쓰러진 뒤에도 마지막 위치가 남는다)
  const mobPos = useRef(new Map<number, { monX: number; monY: number; monTop: number }>());
  for (const m of state.monsters) {
    const size = spriteSize(m.kind, mobScale(m));
    const b = toBottom(m.y);
    mobPos.current.set(m.id, { monX: toX(m.x), monY: HEIGHT - b - size.h / 2, monTop: HEIGHT - b - size.h });
  }
  pos.current = {
    heroX: heroLeft + heroSize.w * 0.75,
    heroY: HEIGHT - heroBottom - heroSize.h + heroBodyH * 0.5, // 신의 가슴 높이에서 공격이 나간다
    ...(raid || !nearest
      ? {
          monX: width - SIDE - monsterSize.w / 2,
          monY: HEIGHT - GROUND - monsterSize.h / 2,
          monTop: HEIGHT - GROUND - monsterSize.h,
        }
      : mobPos.current.get(nearest.id)!),
    groundY: HEIGHT - GROUND,
  };
  /** 맞은 몬스터의 화면 위치 (없으면 주 대상) */
  const targetPos = (id?: number) => {
    const p = pos.current;
    return { ...p, ...(id !== undefined && !raid ? mobPos.current.get(id) : undefined) };
  };
  // 필드 몬스터별 피격 애니메이션 (FieldMonsterView가 등록한다)
  const mobAnims = useRef(new Map<number, { flash: Animated.Value; knock: Animated.Value }>());
  // 배경도 카메라를 따라 부드럽게 민다
  const bgX = useRef(new Animated.Value(-toX(0))).current;
  const bgY = useRef(new Animated.Value(0)).current;
  const bgLeft = toX(0);
  const bgBottom = toBottom(0) - 14; // 맵 앞쪽 끝이 바닥보다 조금 아래까지
  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgX, { toValue: bgLeft, duration: 60, easing: Easing.linear, useNativeDriver: ND }),
      Animated.timing(bgY, { toValue: -bgBottom, duration: 60, easing: Easing.linear, useNativeDriver: ND }),
    ]).start();
  }, [bgLeft, bgBottom]);

  // 신의 위치: 엔진은 0.05초마다 위치를 바꾸므로, 그 사이를 부드럽게 이어 준다
  const heroPosX = useRef(new Animated.Value(heroLeft)).current;
  const heroPosY = useRef(new Animated.Value(-heroBottom)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroPosX, { toValue: heroLeft, duration: 60, easing: Easing.linear, useNativeDriver: ND }),
      Animated.timing(heroPosY, { toValue: -heroBottom, duration: 60, easing: Easing.linear, useNativeDriver: ND }),
    ]).start();
  }, [heroLeft, heroBottom]);

  // ───────────── 조이스틱: 화면 어디든 누르고 끌면 그 방향으로 움직이고, 손을 떼면 멈춰서 자동 공격 ─────────────
  const [stick, setStick] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const cb = useRef({ onMove, onTap, onDragging });
  cb.current = { onMove, onTap, onDragging };
  const pan = useRef(
    (() => {
      let startAt = 0;
      const end = (tap: boolean) => {
        cb.current.onMove(null);
        cb.current.onDragging?.(false);
        setStick(null);
        if (tap) cb.current.onTap(); // 끌지 않고 짧게 톡 치면 추가 공격
      };
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false, // 끄는 도중에 스크롤이 손을 뺏어 가지 않게
        onPanResponderGrant: (e) => {
          startAt = Date.now();
          cb.current.onDragging?.(true);
          setStick({ ox: e.nativeEvent.locationX, oy: e.nativeEvent.locationY, dx: 0, dy: 0 });
        },
        onPanResponderMove: (_, g) => {
          const len = Math.hypot(g.dx, g.dy);
          const k = Math.min(1, len / STICK_MAX);
          cb.current.onMove(len > 6 ? { x: (g.dx / len) * k, y: (g.dy / len) * k } : null);
          setStick((st) => st && { ...st, dx: len > STICK_MAX ? (g.dx / len) * STICK_MAX : g.dx, dy: len > STICK_MAX ? (g.dy / len) * STICK_MAX : g.dy });
        },
        onPanResponderRelease: (_, g) => end(Math.hypot(g.dx, g.dy) < 8 && Date.now() - startAt < 300),
        onPanResponderTerminate: () => end(false),
      });
    })(),
  ).current;
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

  // 알림(toast)은 아래 UI(스킬 버튼·탭) 바로 위에 띄운다. 스킬 버튼이 두 줄이 되면 그만큼 올라간다
  const toastBottomRef = useRef(0);
  toastBottomRef.current = toastBottom ?? bottomInset + 56;
  const add = useCallback((spec: EffectSpec) => {
    if (spec.kind === 'toast' && spec.bottom === undefined) spec = { ...spec, bottom: toastBottomRef.current };
    const id = nextId.current++;
    setEffects((list) => {
      // 배너·알림은 한 번에 하나만: 새 것이 오면 이전 것을 치운다 (겹쳐서 안 읽히는 것 방지)
      const kept = spec.kind === 'banner' || spec.kind === 'toast' ? list.filter((e) => e.kind !== spec.kind) : list;
      // 개수가 넘치면 오래된 효과부터 버리되, 배너·알림은 남긴다 (광역 스킬은 한 번에 효과를 수십 개 만든다)
      const pinned = kept.filter((e) => e.kind === 'banner' || e.kind === 'toast');
      const rest = kept.filter((e) => e.kind !== 'banner' && e.kind !== 'toast');
      return [...pinned, ...rest.slice(-(MAX_EFFECTS - 1 - pinned.length)), { ...spec, id } as Effect];
    });
  }, []);
  const remove = useCallback((id: number) => setEffects((list) => list.filter((e) => e.id !== id)), []);

  // 새 스킬이 열리면 알림 (단계마다 3개씩 차례로 열린다). 처음 화면이 뜰 때는 알리지 않는다
  const skillIds = availableSkills(state);
  const prevSkills = useRef<SkillId[] | null>(null);
  useEffect(() => {
    const prev = prevSkills.current;
    prevSkills.current = skillIds;
    if (!prev) return;
    const fresh = skillIds.filter((id) => !prev.includes(id));
    if (fresh.length) add({ kind: 'toast', text: `✨ 새 스킬 ${fresh.map((id) => `${SKILLS[id].emoji} 「${SKILLS[id].name}」`).join(' ')}!`, color: colors.gold });
  }, [skillIds.join(',')]);
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
  const hitMonsterAnim = (id: number | undefined, power: number, hitStop = 0) => {
    // 필드 몬스터: 그 몬스터만 번쩍이고 밀려난다
    const anim = !raid ? mobAnims.current.get(id ?? nearest?.id ?? -1) : undefined;
    if (anim) {
      anim.flash.setValue(1);
      Animated.sequence([Animated.delay(hitStop), Animated.timing(anim.flash, { toValue: 0, duration: 150, useNativeDriver: ND })]).start();
      anim.knock.setValue(power * 0.6);
      Animated.sequence([Animated.delay(hitStop), Animated.spring(anim.knock, { toValue: 0, friction: 4, tension: 200, useNativeDriver: ND })]).start();
      return;
    }
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
      add({ kind: 'ghost', x: heroLeft, bottom: heroBottom, sprite: hero, scale: heroScale, color: ghostColor, dx: (distance * i) / 4 });
    }
    Animated.sequence([
      Animated.timing(dash, { toValue: distance, duration: 55, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.delay(60),
      Animated.timing(dash, { toValue: 0, duration: 170, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
    ]).start();
  };

  const damageText = (hit: Hit, size: number, color: string, at?: { monX: number; monTop: number }) => {
    const p = at ?? targetPos(hit.targetId);
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
    swingWeapon();
    const p = pos.current;
    const skill = SKILLS[id];
    const isUlt = !!skill.ultimate;
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
          hitMonsterAnim(undefined, 6);
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
    } else if (id === 'baby_star') {
      add({ kind: 'glow', x: p.heroX, y: p.heroY - 30, color: '#FFE27A', size: 110 });
    } else if (id === 'baby_halo') {
      // 머리 위 후광이 반짝 빛나고 날아간다
      add({ kind: 'glow', x: p.heroX, y: p.heroY - 45, color: '#FFF3A8', size: 120 });
      add({ kind: 'rays', x: p.heroX, y: p.heroY - 45, color: '#FFF3A8', size: 150, count: 8 });
    } else if (id === 'baby_feather') {
      // 날개를 퍼덕이면 깃털이 사방으로
      flashIt('#FFFFFF', 0.3, 160);
      add({ kind: 'debris', x: p.heroX, y: p.heroY, color: '#FFFFFF', count: 14, power: 110 });
    } else if (id === 'teen_slash') {
      add({ kind: 'glow', x: p.heroX + 30, y: p.heroY - 20, color: '#7FE8FF', size: 140 });
    } else if (id === 'teen_dash') {
      add({ kind: 'glow', x: p.heroX, y: p.heroY, color: '#B8F0FF', size: 130 });
    } else if (id === 'teen_laurel') {
      add({ kind: 'rays', x: p.heroX, y: p.heroY, color: '#7CE08A', size: 220, count: 12 });
      add({ kind: 'debris', x: p.heroX, y: p.heroY - 20, color: '#7CE08A', count: 12, power: 90 }); // 흩날리는 잎
    } else if (id === 'adult_whirl') {
      add({ kind: 'glow', x: p.heroX + 20, y: p.heroY, color: '#FFB347', size: 150 });
    } else if (id === 'adult_shield') {
      add({ kind: 'glow', x: p.heroX + 20, y: p.heroY, color: '#E8B04A', size: 150 });
    } else if (id === 'adult_meteor') {
      // 성인 신의 궁극기: 화면이 어두워지고 하늘로 뛰어오른다
      tintIt('#1A0804', 0.65, 1000);
      add({ kind: 'speedlines', width, height: HEIGHT, x: p.monX, y: p.monY, color: '#FF7A3D' });
      add({ kind: 'glow', x: p.heroX, y: p.heroY, color: '#FF7A3D', size: 220 });
      zoomIt(0.05);
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

  /** chainFrom: 자동 공격 범위 피해가 시작된 곳 (처음 맞은 몬스터 위치) */
  /** 번개·삼지창을 휘두른다. 공격 속도가 빨라서 휘두르는 중이면 새로 시작하지 않는다 (모션이 끊겨 보이지 않게) */
  const swingWeapon = () => {
    if (swingBusy.current) return;
    swingBusy.current = true;
    swing.setValue(0);
    Animated.sequence([
      Animated.timing(swing, { toValue: 1, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(swing, { toValue: 2, duration: 80, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
      Animated.timing(swing, { toValue: 3, duration: 200, easing: Easing.out(Easing.back(2)), useNativeDriver: ND }),
    ]).start(() => {
      swing.setValue(0);
      swingBusy.current = false;
    });
  };

  const playHit = (hit: Hit, skillInSameTick: boolean, chainFrom: { monX: number; monY: number } | null = null) => {
    if (!hit.secondary) swingWeapon();
    const p = targetPos(hit.targetId); // 맞은 몬스터 위치에 연출을 그린다
    const hitMonster = (power: number, hitStop = 0) => hitMonsterAnim(hit.targetId, power, hitStop);
    // 광역 스킬의 두 번째 이후 대상: 큰 연출은 첫 대상에만, 나머지는 작은 폭발과 숫자만
    if (hit.secondary && hit.source === 'auto') {
      // 자동 공격의 범위 피해 (숫자까지 띄우면 화면이 너무 어지러워서 생략)
      if (state.god === 'zeus' && chainFrom) {
        // 제우스: 처음 맞은 몬스터에서 이 몬스터로 번개가 이어진다
        add({ kind: 'zap', width, height: HEIGHT, fromX: chainFrom.monX, fromY: chainFrom.monY, toX: p.monX, toY: p.monY, color: '#FFE97A', thick: 3 });
        add({ kind: 'glow', x: p.monX, y: p.monY, color: '#FFE97A', size: 46 });
        hitMonster(4);
      } else if (state.god === 'poseidon') {
        // 포세이돈: 퍼져 나온 물결이 닿으면 물보라 (파도가 닿는 시간만큼 늦게)
        later(220, () => {
          add({ kind: 'debris', x: p.monX, y: p.monY, color: '#BFF4FF', count: 4, power: 30 });
          hitMonster(4);
        });
      } else {
        add({ kind: 'burst', x: p.monX, y: p.monY, color: orbColor(state), size: 40 });
        hitMonster(4);
      }
      return;
    }
    if (hit.secondary) {
      // 주 대상 연출이 늦게 떨어지는 스킬(유성·촉수)은 나머지 대상도 같은 만큼 늦게 맞는다
      later(SECONDARY_DELAY[hit.source] ?? 0, () => {
        add({ kind: 'burst', x: p.monX, y: p.monY, color: skillColor(hit.source as SkillId), size: 80 });
        hitMonster(10);
        damageText(hit, 20, skillColor(hit.source as SkillId), p);
      });
      return;
    }
    const combo = hit.combo;
    const last = combo ? combo.index === combo.total - 1 : true;

    switch (hit.source) {
      case 'auto': {
        const color = orbColor(state);
        if (state.god === 'zeus') {
          // 제우스: 손에서 몬스터로 번개가 꽂힌다 (날아가는 시간 없이 바로)
          add({ kind: 'zap', width, height: HEIGHT, fromX: p.heroX, fromY: p.heroY - 10, toX: p.monX, toY: p.monY, color, thick: 4 });
          add({ kind: 'glow', x: p.monX, y: p.monY, color, size: 80 });
          add({ kind: 'debris', x: p.monX, y: p.monY, color, count: 4, power: 36 });
          hitMonster(5);
          if (!skillInSameTick) damageText(hit, 16, colors.text, p);
          return;
        }
        add({ kind: 'orb', fromX: p.heroX, fromY: p.heroY, toX: p.monX, toY: p.monY, color });
        if (state.god === 'poseidon') {
          // 포세이돈: 물 구슬이 닿으면 그 자리에서 파도 물결이 동그랗게 퍼진다 (범위 피해 범위만큼)
          later(160, () => {
            add({ kind: 'ripple', x: p.monX, y: p.monY + 10, size: SPLASH_RANGE * (width / VIEW_W) * 2.4, color });
            add({ kind: 'debris', x: p.monX, y: p.monY, color: '#E6FBFF', count: 6, power: 44 });
            hitMonster(5);
            if (!skillInSameTick) damageText(hit, 16, colors.text, p);
          });
          return;
        }
        later(160, () => {
          add({ kind: 'glow', x: p.monX, y: p.monY, color, size: 70 });
          add({ kind: 'debris', x: p.monX, y: p.monY, color, count: 4, power: 36 });
          hitMonster(5);
          // 스킬 숫자가 잘 보이도록, 같은 순간에 스킬 타격이 있으면 기본 공격 숫자는 생략
          if (!skillInSameTick) damageText(hit, 16, colors.text, p);
        });
        return;
      }
      case 'tap': {
        add({ kind: 'crescent', x: p.monX, y: p.monY, angle: Math.random() * 360, radius: 46, color: '#FFFFFF', flip: Math.random() < 0.5 });
        add({ kind: 'burst', x: p.monX, y: p.monY, color: '#FFFFFF', size: 70 });
        add({ kind: 'debris', x: p.monX, y: p.monY, color: '#FFFFFF', count: 5, power: 45 });
        hitMonster(8);
        shakeIt(3);
        damageText(hit, 18, colors.text, p);
        return;
      }
      case 'baby_star': {
        // 별똥별: 하늘에서 별이 떨어져 반짝 터진다
        const C = '#FFE27A';
        add({ kind: 'orb', fromX: p.monX - 70, fromY: p.monY - 220, toX: p.monX, toY: p.monY, color: C });
        later(160, () => {
          add({ kind: 'burst', x: p.monX, y: p.monY, color: C, size: 100, spikes: 5 });
          add({ kind: 'debris', x: p.monX, y: p.monY, color: '#FFF7C2', count: 10, power: 70 });
          hitMonster(12, 40);
          shakeIt(6, 40);
          damageText(hit, 24, C, p);
        });
        return;
      }
      case 'baby_halo': {
        // 후광 부메랑: 첫 타에 후광이 날아가고, 몬스터 둘레를 금빛 고리가 돌며 3번 벤다
        const i = combo?.index ?? 0;
        const C = '#FFF3A8';
        if (i === 0) add({ kind: 'orb', fromX: p.heroX, fromY: p.heroY - 45, toX: p.monX, toY: p.monY, color: '#FFE27A' });
        later(0, () => {
          add({ kind: 'crescent', x: p.monX, y: p.monY, angle: i * 120, radius: last ? 80 : 60, color: C, flip: i % 2 === 1 });
          add({ kind: 'glow', x: p.monX, y: p.monY, color: C, size: last ? 130 : 90 });
          hitMonster(last ? 14 : 8, last ? 50 : 0);
          shakeIt(last ? 7 : 3);
          damageText(hit, last ? 26 : 20, '#FFE27A', p);
        });
        return;
      }
      case 'baby_feather': {
        // 깃털 폭풍: 하얀 깃털이 화면을 가로질러 흩날린다
        const i = combo?.index ?? 0;
        add({ kind: 'thrust', fromX: p.heroX, toX: p.monX + (p.monX >= p.heroX ? 30 : -30), y: p.monY - 30 + i * 12, color: '#FFFFFF' });
        add({ kind: 'debris', x: p.monX, y: p.monY, color: '#FFFFFF', count: 7, power: 80 });
        hitMonster(last ? 12 : 6);
        if (last) {
          add({ kind: 'groundRing', x: p.monX, y: p.groundY - 4, color: '#FFD6E8', size: 200 });
          shakeIt(6);
        }
        damageText(hit, last ? 24 : 18, '#FFD6E8', p);
        return;
      }
      case 'teen_dash': {
        // 섬광 돌진: 잔상을 남기며 끝까지 돌진 → 관통하는 한 줄기 빛 + 히트스톱
        const C = '#B8F0FF';
        dashIt(Math.max(0, p.monX - p.heroX - 20), C);
        add({ kind: 'thrust', fromX: p.heroX, toX: p.monX + (p.monX >= p.heroX ? 60 : -60), y: p.monY, color: C });
        add({ kind: 'speedlines', width, height: HEIGHT, x: p.monX, y: p.monY, color: C });
        later(60, () => {
          impact(p.monX, p.monY, C, 1.4, true);
          flashIt(C, 0.6, 220, true);
          zoomIt(0.06);
          hitMonster(26, 90);
          shakeIt(14, 90);
          damageText(hit, 34, C, p);
        });
        return;
      }
      case 'teen_laurel': {
        // 월계수 칼날비: 초록 잎 칼날이 몬스터 주변에 비처럼 꽂힌다
        const i = combo?.index ?? 0;
        const C = '#7CE08A';
        const x = p.monX + [-30, 25, -10, 35, -40, 0][i % 6];
        add({ kind: 'crescent', x, y: p.monY, angle: 60 + i * 50, radius: last ? 70 : 46, color: C, flip: i % 2 === 0 });
        add({ kind: 'debris', x, y: p.monY, color: C, count: 6, power: 60 });
        hitMonster(last ? 14 : 6, last ? 50 : 0);
        shakeIt(last ? 8 : 3);
        if (last) add({ kind: 'groundRing', x: p.monX, y: p.groundY - 4, color: C, size: 220 });
        damageText(hit, last ? 28 : 20, C, p);
        return;
      }
      case 'adult_shield': {
        // 방패 강타: 돌진해서 방패로 내리찍는다 → 땅이 울리고 흙먼지
        const C = '#E8B04A';
        dashIt(Math.max(0, p.monX - p.heroX - 50), C);
        later(70, () => {
          impact(p.monX, p.monY, C, 1.6, true);
          add({ kind: 'groundRing', x: p.monX, y: p.groundY - 4, color: C, size: 300 });
          add({ kind: 'debris', x: p.monX, y: p.groundY - 8, color: '#8A6A44', count: 14, power: 110 });
          add({ kind: 'smoke', x: p.monX, y: p.groundY - 20, count: 6 });
          flashIt('#FFE7B0', 0.6, 260, true);
          zoomIt(0.07);
          hitMonster(30, 100);
          shakeIt(20, 100);
          damageText(hit, 38, C, p);
        });
        return;
      }
      case 'adult_meteor': {
        // 천공의 일격: 유성이 몬스터 주변에 차례로 떨어지고, 마지막은 신이 직접 내리꽂힌다
        const C = '#FF7A3D';
        const x = last ? p.monX : p.monX + (Math.random() - 0.5) * 150;
        add({ kind: 'orb', fromX: x - 90, fromY: -40, toX: x, toY: p.groundY - 10, color: C });
        later(160, () => {
          add({ kind: 'groundRing', x, y: p.groundY - 4, color: C, size: last ? 340 : 150 });
          add({ kind: 'debris', x, y: p.groundY - 10, color: '#FFB347', count: last ? 22 : 9, power: last ? 150 : 80 });
          add({ kind: 'smoke', x, y: p.groundY - 20, count: last ? 8 : 3 });
          hitMonster(last ? 34 : 12, last ? 110 : 20);
          if (last) {
            dashIt(Math.max(0, p.monX - p.heroX - 30), C);
            impact(p.monX, p.monY, C, 2.1, true);
            flashIt('#FFD9B0', 1, 420, true);
            zoomIt(0.09);
            shakeIt(22, 110);
          } else {
            flashIt('#FFB347', 0.3, 140);
            shakeIt(8, 20);
          }
          damageText(hit, last ? 40 : 26, C, p);
        });
        return;
      }
      case 'teen_slash': {
        // 삼연참: 잔상을 남기며 돌진 → 초승달 검기가 X자로 교차 → 마지막은 거대한 횡베기 + 히트스톱
        const i = combo?.index ?? 0;
        const angles = [-35, 35, 0];
        const C = '#7FE8FF';
        dashIt(Math.max(0, p.monX - p.heroX - 40), C);
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
          damageText(hit, last ? 32 : 24, C, p);
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
        damageText(hit, 34, C, p);
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
        damageText(hit, 32, C, p);
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
        damageText(hit, last ? 40 : 26, C, p);
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
          damageText(hit, last ? 40 : 26, P, p);
        });
        return;
      }
      case 'adult_whirl': {
        // 회오리 검무: 돌진하며 검기를 빙글빙글 4번. 마지막은 큰 회오리 + 히트스톱
        const i = combo?.index ?? 0;
        const C = '#FFB347';
        if (i === 0) dashIt(Math.max(0, p.monX - p.heroX - 40), C);
        add({ kind: 'crescent', x: p.monX, y: p.monY, angle: i * 90, radius: last ? 100 : 72, color: C, flip: i % 2 === 1 });
        add({ kind: 'crescent', x: p.monX, y: p.monY, angle: i * 90 + 180, radius: last ? 90 : 60, color: '#FFFFFF', flip: i % 2 === 0 });
        impact(p.monX, p.monY, C, last ? 1.5 : 0.8, last);
        hitMonster(last ? 26 : 12, last ? 90 : 20);
        shakeIt(last ? 13 : 5, last ? 90 : 20);
        if (last) {
          zoomIt(0.06);
          add({ kind: 'groundRing', x: p.monX, y: p.groundY - 4, color: C, size: 230 });
        }
        damageText(hit, last ? 32 : 22, C, p);
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
          damageText(hit, 22, C, p);
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
        damageText(hit, last ? 38 : 24, C, p);
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
          damageText(hit, 42, C, p);
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
      const autoCount = r.hits.filter((h) => h.source === 'auto' && !h.secondary).length;
      const skillInSameTick = r.hits.some((h) => h.source !== 'auto' && h.source !== 'tap');
      // 자동 공격 + 그 범위 피해는 한 묶음: 공격 속도가 빠를 때는 화면이 가려지지 않게 묶음째 일부만 보여 준다
      let chainFrom: { monX: number; monY: number } | null = null;
      let skipChain = false;
      for (const h of r.hits) {
        if (h.source === 'auto' && !h.secondary) {
          chainFrom = targetPos(h.targetId);
          skipChain = autoCount > 2 && Math.random() < 0.5;
        }
        if (h.source === 'auto' && skipChain) continue;
        playHit(h, skillInSameTick, chainFrom);
      }
      if (r.killed) {
        const targets = r.killedIds.length ? r.killedIds.map((id) => targetPos(id)) : [pos.current];
        later(120, () => {
          for (const p of targets) {
            add({ kind: 'debris', x: p.monX, y: p.monY, color: '#FFFFFF', count: 8, power: 70 });
            add({ kind: 'smoke', x: p.monX, y: p.monY + 10, count: 2 });
          }
        });
      }
      // 몬스터에게 맞음: 신이 빨갛게 번쩍. 쓰러지면 배너
      if (r.heroDamage > 0) {
        heroHit.setValue(Math.min(1, 0.4 + r.heroDamage * 20));
        Animated.timing(heroHit, { toValue: 0, duration: 220, useNativeDriver: ND }).start();
        if (r.heroDamage > 0.03) shakeIt(4);
      }
      if (r.heroDown) {
        tintIt('#300000', 0.6, 500);
        add({ kind: 'banner', text: r.bossFailed ? '쓰러졌다... 한 스테이지 뒤로' : '쓰러졌다! 다시 도전', color: '#FF4D4D', big: false });
      }
      if (r.difficultyUnlocked !== null) {
        const d = DIFFICULTIES[r.difficultyUnlocked];
        add({ kind: 'banner', text: `「${d.name}」 난이도 개방!`, color: d.color, big: true });
        add({ kind: 'rays', x: width / 2, y: 150, color: d.color, size: 420 });
        flashIt(d.color, 0.7, 500, true);
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
      if (r.diamonds > 0) add({ kind: 'toast', text: `💎 다이아 +${r.diamonds}`, color: '#7FE8FF' });
      r.raidEvents.forEach(playRaidEvent);
    },
  }));

  // 기간토마키아는 핏빛 노을, 티포에우스는 용암이 끓는 화산
  const theme: BgTheme = state.god ?? 'earth';
  const [skyTop, skyBottom] = raid ? (raid.id === 'gigantomachy' ? ['#2A0E14', '#7A2A1E'] : ['#12040A', '#4A0E08']) : SKY[theme];
  const phases = raid ? raidPhases(raid.id, state.god) : [];
  const boss = raid ? null : state.monsters.find((m) => m.isBoss) ?? null;
  const faceLeft = !!nearest && nearest.x < state.hero.x;
  const mobView = (m: FieldMonster) => {
    const sc = mobScale(m);
    const size = spriteSize(m.kind, sc);
    return (
      <FieldMonsterView
        key={m.id}
        m={m}
        left={toX(m.x) - size.w / 2}
        bottom={toBottom(m.y)}
        scale={sc}
        faceRight={m.x < state.hero.x}
        bob={bob}
        register={(id, anim) => (anim ? mobAnims.current.set(id, anim) : (mobAnims.current.delete(id), mobPos.current.delete(id)))}
      />
    );
  };

  return (
    <View
      {...pan.panHandlers}
      onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={styles.outer}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: skyBottom, transform: [{ translateX: shake.x }, { translateY: shake.y }, { scale: zoom }] },
        ]}
      >
        {/* 하늘(화면 고정) / 맵 배경(카메라를 따라 움직임) / 땅(아래 UI 뒤) */}
        <View style={[styles.skyTop, { backgroundColor: skyTop, height: HEIGHT * 0.45 }]} />
        {!raid && (
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, bottom: 0, transform: [{ translateX: bgX }, { translateY: bgY }] }}
          >
            <FieldBackground theme={theme} w={worldW} h={worldH + 28} />
          </Animated.View>
        )}
        <View style={[styles.ground, { height: bottomInset }, raid && { backgroundColor: raid.id === 'typhoeus' ? '#3A1208' : '#3A2418' }]} />
        {raid?.id === 'typhoeus' && <View style={[styles.lava, { bottom: bottomInset }]} />}

        {/* 헤라클레스: 바위 언덕 위에서 활을 겨눈다 */}
        {raid?.id === 'gigantomachy' && (
          <View style={{ position: 'absolute', left: heracles.left, bottom: heracles.bottom - 10 }} pointerEvents="none">
            <PixelSprite name="heracles" scale={heraclesScale} />
            <View style={styles.ledge} />
          </View>
        )}

        {/* 필드 몬스터 중 신보다 뒤(화면 위쪽)에 있는 것을 먼저 그린다 → 앞에 있는 것이 위에 겹친다 */}
        {!raid &&
          state.monsters
            .filter((m) => m.y >= state.hero.y)
            .sort((a, b) => b.y - a.y)
            .map((m) => mobView(m))}

        {/* 신 */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            transform: [
              { translateX: Animated.add(heroPosX, Animated.add(dash, recoil)) },
              { translateY: Animated.add(heroPosY, bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })) },
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
          {/* 발밑 그림자: 땅에 붙어 있어서 캐릭터가 떠 있는(탈것) 높이만큼 아래에 그린다 */}
          <View
            pointerEvents="none"
            style={[styles.shadow, { width: heroSize.w * 0.7, height: heroSize.w * 0.16, left: heroSize.w * 0.15, bottom: -heroFloat - heroSize.w * 0.06 }]}
          />
          {/* 가까운 몬스터가 왼쪽에 있으면 그쪽을 본다 */}
          <View style={{ transform: [{ scaleX: faceLeft ? -1 : 1 }] }}>
            <HeroSprite name={hero} scale={heroScale} swing={swingAngle} />
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: heroHit }]} pointerEvents="none">
              <HeroSprite name={hero} scale={heroScale} tint="#FF3B3B" swing={swingAngle} />
            </Animated.View>
          </View>
          {raid && raid.stunLeft > 0 && <Text style={styles.stun}>💫</Text>}
          {/* 레이드 중 신의 체력 (적이 공격하는 레이드에서만) */}
          {(!raid || raid.attack > 0) && (
            <View style={[styles.godHpTrack, { width: Math.min(heroSize.w, 90) }]} pointerEvents="none">
              <View
                style={[
                  styles.godHpFill,
                  { width: `${Math.max(0, raid ? raid.godHp / raid.godMaxHp : state.hero.hp) * 100}%` },
                  !raid && state.hero.hp < 0.3 && { backgroundColor: colors.hp },
                ]}
              />
            </View>
          )}
        </Animated.View>

        {!raid &&
          state.monsters
            .filter((m) => m.y < state.hero.y)
            .sort((a, b) => b.y - a.y)
            .map((m) => mobView(m))}

        {/* 레이드 보스 (필드 몬스터는 위에서 그렸다) */}
        {raid && (
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
        )}

        {/* 궁극기 어둠 → 이펙트 → 번쩍임 순서로 겹친다 */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, opacity: tint }]} />
        {effects.map((e) => (
          <EffectView key={e.id} effect={e} onDone={remove} />
        ))}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, opacity: flash }]} />

        {/* HUD: 스테이지, 보스 타이머, 몬스터 체력 */}
        <View style={{ height: topInset }} pointerEvents="none" />
        <View style={styles.topRow} pointerEvents="none">
          <Text style={styles.stage}>
            {raid
              ? RAIDS[raid.id].daily
                ? `${RAIDS[raid.id].emoji} ${RAIDS[raid.id].name} · 처치 ${raid.kills}`
                : `${RAIDS[raid.id].emoji} ${RAIDS[raid.id].name} ${raid.stage}단계 · ${raid.phase + 1}/${phases.length}`
              : `${DIFFICULTIES[state.difficulty].name} · 스테이지 ${stageLabel(state.wave)}`}
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
        {!raid && <Text style={[styles.chapter, { top: topInset + 36 }]} pointerEvents="none">{CHAPTERS[chapterOf(state.wave)].title}</Text>}
        <View style={styles.monsterInfo} pointerEvents="none">
          {raid || boss ? (
            <>
              <Text style={[styles.monsterName, (raid ? monster : boss!).isBoss && { color: colors.boss }]}>{(raid ? monster : boss!).name}</Text>
              <View style={styles.hpTrack}>
                <View style={[styles.hpFill, { width: `${Math.max(0, (raid ? monster : boss!).hp / (raid ? monster : boss!).maxHp) * 100}%` }]} />
              </View>
              <Text style={styles.hpText}>
                {formatNumber((raid ? monster : boss!).hp)} / {formatNumber((raid ? monster : boss!).maxHp)}
              </Text>
            </>
          ) : (
            <Text style={styles.monsterName}>
              {monster.name} 무리 · 남은 {state.monsters.length}
            </Text>
          )}
        </View>

        {/* 조이스틱: 누른 자리에 나타난다 */}
        {stick && (
          <View pointerEvents="none" style={[styles.stickBase, { left: stick.ox - STICK_MAX, top: stick.oy - STICK_MAX }]}>
            <View style={[styles.stickKnob, { transform: [{ translateX: stick.dx }, { translateY: stick.dy }] }]} />
          </View>
        )}

        {raid ? (
          <Pressable onPress={onLeaveRaid} style={[styles.challenge, { bottom: bottomInset + 4, backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Text style={styles.challengeText}>🏳️ 포기하고 나가기</Text>
          </Pressable>
        ) : state.farming ? (
          <Pressable onPress={onChallengeBoss} style={[styles.challenge, { bottom: bottomInset + 4 }]}>
            <Text style={styles.challengeText}>👑 보스 재도전</Text>
          </Pressable>
        ) : (
          <Text style={[styles.hint, { bottom: bottomInset + 6 }]} pointerEvents="none">
            끌어서 이동 · 멈추면 자동 공격 · 톡 치면 추가 공격
          </Text>
        )}
      </Animated.View>
    </View>
  );
});

/** 필드 몬스터 하나: 위치를 부드럽게 따라가고, 맞으면 번쩍이며 밀려난다. 머리 위에 작은 체력바 */
function FieldMonsterView({
  m,
  left,
  bottom,
  scale,
  faceRight,
  bob,
  register,
}: {
  m: FieldMonster;
  left: number;
  bottom: number;
  scale: number;
  faceRight: boolean;
  bob: Animated.Value;
  register: (id: number, anim: { flash: Animated.Value; knock: Animated.Value } | null) => void;
}) {
  const px = useRef(new Animated.Value(left)).current;
  const py = useRef(new Animated.Value(-bottom)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const knock = useRef(new Animated.Value(0)).current;
  const spawn = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    register(m.id, { flash, knock });
    Animated.spring(spawn, { toValue: 1, friction: 5, tension: 140, useNativeDriver: ND }).start();
    return () => register(m.id, null);
  }, []);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(px, { toValue: left, duration: 60, easing: Easing.linear, useNativeDriver: ND }),
      Animated.timing(py, { toValue: -bottom, duration: 60, easing: Easing.linear, useNativeDriver: ND }),
    ]).start();
  }, [left, bottom]);
  const size = spriteSize(m.kind, scale);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        transform: [
          { translateX: Animated.add(px, faceRight ? Animated.multiply(knock, -1) : knock) },
          { translateY: Animated.add(py, bob.interpolate({ inputRange: [0, 1], outputRange: [-2, 0] })) },
          { scale: spawn },
        ],
      }}
    >
      <View style={[styles.mobHpTrack, { width: Math.min(size.w, 60), alignSelf: 'center' }]}>
        <View style={[styles.mobHpFill, { width: `${Math.max(0, m.hp / m.maxHp) * 100}%` }, m.isBoss && { backgroundColor: colors.boss }]} />
      </View>
      <View style={[styles.shadow, { width: size.w * 0.8, height: size.w * 0.2, left: size.w * 0.1, bottom: -size.w * 0.07 }]} />
      {/* 스프라이트는 왼쪽(신 쪽)을 보고 있다. 신이 오른쪽에 있으면 뒤집는다 */}
      <View style={{ transform: [{ scaleX: faceRight ? -1 : 1 }] }}>
        <PixelSprite name={m.kind} scale={scale} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: flash }]}>
          <PixelSprite name={m.kind} scale={scale} tint="#FFFFFF" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** 레이드 기믹 상태를 HUD 칩으로: [글자, 색] */
function raidChips(r: NonNullable<GameState['raid']>): [string, string][] {
  const sec = (ms: number) => `${Math.ceil(ms / 1000)}초`;
  // 일일 던전: 누적 피해와 점수 / 레이드: 신의 체력·적 공격력·방어력
  const chips: [string, string][] = RAIDS[r.id].daily
    ? [[`💥 ${formatNumber(r.totalDamage)} · 점수 ${Math.floor(r.totalDamage / r.refHp)}`, colors.gold]]
    : [
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
    case 'baby_star':
    case 'baby_halo':
      return '#FFE27A';
    case 'baby_feather':
      return '#FFD6E8';
    case 'teen_slash':
      return '#7FE8FF';
    case 'teen_dash':
      return '#B8F0FF';
    case 'teen_laurel':
      return '#7CE08A';
    case 'adult_whirl':
      return '#FFB347';
    case 'adult_shield':
      return '#E8B04A';
    case 'adult_meteor':
      return '#FF7A3D';
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
  shadow: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(10, 6, 25, 0.32)' },
  // userSelect: 웹에서 끌 때 글자가 파랗게 선택되지 않게
  outer: { flex: 1, overflow: 'hidden', backgroundColor: '#000', userSelect: 'none' } as object,
  container: { flex: 1 },
  skyTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.ground },
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
  chapter: { position: 'absolute', top: 36, left: 12, color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700' },
  stickBase: {
    position: 'absolute',
    width: STICK_MAX * 2,
    height: STICK_MAX * 2,
    borderRadius: STICK_MAX,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickKnob: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)' },
  mobHpTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.5)', marginBottom: 2, overflow: 'hidden' },
  mobHpFill: { height: '100%', backgroundColor: colors.hp },
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
  lava: { position: 'absolute', left: 0, right: 0, height: 6, backgroundColor: '#FF7A1F', opacity: 0.8 },
  ledge: { width: 70, height: 14, marginLeft: -10, marginTop: -4, borderRadius: 8, backgroundColor: '#5A3A2A', borderWidth: 2, borderColor: '#1C1430' },
  godHpTrack: { position: 'absolute', bottom: -12, left: 4, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.5)', overflow: 'hidden' },
  godHpFill: { height: '100%', backgroundColor: colors.xp },
  stun: { position: 'absolute', top: -6, alignSelf: 'center', fontSize: 26 },
  mark: { position: 'absolute', left: 0, top: 0, borderRadius: 999, borderWidth: 3, borderColor: 'rgba(255, 213, 74, 0.8)', backgroundColor: 'rgba(255, 213, 74, 0.12)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, marginTop: 6 },
  chip: { fontSize: 11, fontWeight: '800', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.45)', overflow: 'hidden' },
});
