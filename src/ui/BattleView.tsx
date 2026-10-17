import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BOSS_TIME_LIMIT, SKILLS, stageLabel } from '../game/balance';
import { formatNumber } from '../game/format';
import { ActionResult, GameState, Hit, SkillId } from '../game/types';
import { RARITY_INFO, WEAPONS } from '../game/weapons';
import { Effect, EffectSpec, EffectView } from './effects';
import { PixelSprite } from './PixelSprite';
import { heroSprite, skyColors, SPRITES } from './sprites';
import { colors } from './theme';

const ND = Platform.OS !== 'web';
const HEIGHT = 330;
const GROUND = 34; // 바닥 높이
const SIDE = 26; // 좌우 여백
const HERO_SCALE = 6;
const MAX_EFFECTS = 70;

/** 부모(App)가 전투 결과를 넘겨 연출을 재생하게 하는 통로 */
export interface BattleHandle {
  play: (r: ActionResult) => void;
}

interface Props {
  state: GameState;
  onTap: () => void;
  onChallengeBoss: () => void;
}

function spriteSize(name: string, scale: number) {
  const rows = SPRITES[name] ?? [];
  return { w: Math.max(...rows.map((r) => r.length)) * scale, h: rows.length * scale };
}

/**
 * 전투 화면. 손맛을 내는 연출 요소:
 *   - 화면 흔들림(shake), 화면 번쩍임(flash), 궁극기 때 어두워짐(tint)
 *   - 신의 돌진(dash), 몬스터가 맞으면 밀려나고(knock) 하얗게 번쩍임(hitFlash)
 *   - 스킬별 이펙트(참격, 번개, 해일, 촉수...)와 튀어오르는 데미지 숫자
 * forwardRef + useImperativeHandle: 부모가 battleRef.current.play(result)로 이 컴포넌트의 함수를 직접 부를 수 있게 한다.
 */
export const BattleView = forwardRef<BattleHandle, Props>(function BattleView({ state, onTap, onChallengeBoss }, ref) {
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
  const bob = useRef(new Animated.Value(0)).current;
  const aura = useRef(new Animated.Value(0)).current;

  const hero = heroSprite(state);
  const heroSize = spriteSize(hero, HERO_SCALE);
  const monsterScale = state.monster.isBoss ? 9 : 6;
  const monsterSize = spriteSize(state.monster.kind, monsterScale);

  // 좌표 계산 (전투 영역 기준)
  const pos = useRef({ heroX: 0, heroY: 0, monX: 0, monY: 0, monTop: 0, groundY: 0 });
  pos.current = {
    heroX: SIDE + heroSize.w * 0.75,
    heroY: HEIGHT - GROUND - heroSize.h * 0.6,
    monX: width - SIDE - monsterSize.w / 2,
    monY: HEIGHT - GROUND - monsterSize.h / 2,
    monTop: HEIGHT - GROUND - monsterSize.h,
    groundY: HEIGHT - GROUND,
  };

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
  }, [state.wave, state.totalKills]);

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

  /** 화면 흔들림: 세기(px)만큼 무작위로 몇 번 흔들고 제자리로 */
  const shakeIt = (power: number) => {
    const steps = Array.from({ length: 5 }, (_, i) => {
      const k = power * (1 - i / 5);
      return Animated.timing(shake, {
        toValue: { x: (Math.random() - 0.5) * 2 * k, y: (Math.random() - 0.5) * 2 * k },
        duration: 28,
        useNativeDriver: ND,
      });
    });
    Animated.sequence([...steps, Animated.timing(shake, { toValue: { x: 0, y: 0 }, duration: 40, useNativeDriver: ND })]).start();
  };

  const flashIt = (color: string, peak: number, duration = 220) => {
    setFlashColor(color);
    flash.setValue(peak);
    Animated.timing(flash, { toValue: 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
  };

  const tintIt = (color: string, peak: number, hold: number) => {
    setTintColor(color);
    Animated.sequence([
      Animated.timing(tint, { toValue: peak, duration: 120, useNativeDriver: ND }),
      Animated.delay(hold),
      Animated.timing(tint, { toValue: 0, duration: 300, useNativeDriver: ND }),
    ]).start();
  };

  /** 몬스터 피격: 뒤로 밀려나고 하얗게 번쩍 */
  const hitMonster = (power: number) => {
    knock.setValue(power);
    Animated.spring(knock, { toValue: 0, friction: 4, tension: 220, useNativeDriver: ND }).start();
    hitFlash.setValue(1);
    Animated.timing(hitFlash, { toValue: 0, duration: 140, useNativeDriver: ND }).start();
  };

  /** 신의 돌진: 앞으로 튀어나갔다 돌아온다 */
  const dashIt = (distance: number) => {
    Animated.sequence([
      Animated.timing(dash, { toValue: distance, duration: 55, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.timing(dash, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
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
    });
  };

  // ───────────── 스킬 시전 연출 (피해가 없는 부분: 배너, 분위기) ─────────────

  const playCast = (id: SkillId) => {
    const p = pos.current;
    const skill = SKILLS[id];
    const isUlt = id === 'zeus_judgment' || id === 'poseidon_kraken';
    const color = skillColor(id);
    add({ kind: 'banner', text: `${skill.name}!`, color, big: isUlt });

    if (id === 'zeus_storm') {
      flashIt('#FFF6B0', 0.6);
      shakeIt(8);
      for (let i = 0; i < 3; i++) setTimeout(() => add({ kind: 'bolt', x: 60 + Math.random() * (width - 120), toY: p.groundY, color: '#FFE97A', thick: 6 }), i * 90);
    } else if (id === 'poseidon_trident') {
      flashIt('#9FF3FF', 0.45);
      for (let i = 0; i < 4; i++) setTimeout(() => add({ kind: 'thrust', fromX: p.heroX, toX: p.monX, y: p.monY - 20 + i * 14, color: '#6FE3FF' }), i * 60);
    } else if (id === 'poseidon_wave') {
      add({ kind: 'wave', width, height: 170, bottom: GROUND - 6 });
    } else if (id === 'zeus_judgment') {
      tintIt('#05040F', 0.65, 1000);
    } else if (id === 'poseidon_kraken') {
      tintIt('#021A33', 0.7, 1150);
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
        setTimeout(() => {
          add({ kind: 'sparks', x: p.monX, y: p.monY, color, count: 5, power: 34 });
          hitMonster(5);
          // 스킬 숫자가 잘 보이도록, 같은 순간에 스킬 타격이 있으면 기본 공격 숫자는 생략
          if (!skillInSameTick) damageText(hit, 16, colors.text);
        }, 150);
        return;
      }
      case 'tap': {
        add({ kind: 'slash', x: p.monX, y: p.monY, angle: (Math.random() - 0.5) * 120, length: 120, color: '#FFFFFF' });
        add({ kind: 'sparks', x: p.monX, y: p.monY, color: '#FFFFFF', count: 6, power: 40 });
        hitMonster(7);
        shakeIt(3);
        damageText(hit, 18, colors.text);
        return;
      }
      case 'teen_slash': {
        // 삼연참: 돌진하며 찌르기 → 위아래로 교차하는 참격, 세 번째는 크고 화면이 번쩍
        const angles = [-28, 28, 0];
        const i = combo?.index ?? 0;
        dashIt(width * 0.32);
        add({ kind: 'slash', x: p.monX, y: p.monY, angle: angles[i], length: last ? 260 : 190, color: '#7FE8FF' });
        if (last) add({ kind: 'slash', x: p.monX, y: p.monY + 4, angle: 0, length: 300, color: '#FFFFFF' });
        add({ kind: 'sparks', x: p.monX, y: p.monY, color: '#7FE8FF', count: last ? 18 : 10, power: last ? 90 : 60 });
        hitMonster(last ? 22 : 12);
        shakeIt(last ? 11 : 5);
        if (last) {
          flashIt('#FFFFFF', 0.45);
          add({ kind: 'ring', x: p.monX, y: p.monY, color: '#7FE8FF', size: 150 });
        }
        damageText(hit, last ? 30 : 24, '#7FE8FF');
        return;
      }
      case 'zeus_bolt': {
        add({ kind: 'bolt', x: p.monX, toY: p.monY, color: '#FFE97A', thick: 10 });
        flashIt('#FFFDE0', 0.7);
        shakeIt(13);
        add({ kind: 'ring', x: p.monX, y: p.monY, color: '#FFE97A', size: 170 });
        add({ kind: 'sparks', x: p.monX, y: p.monY, color: '#FFE97A', count: 18, power: 100 });
        hitMonster(20);
        damageText(hit, 32, '#FFE97A');
        return;
      }
      case 'poseidon_wave': {
        flashIt('#B8F4FF', 0.45);
        shakeIt(10);
        add({ kind: 'sparks', x: p.monX, y: p.monY, color: '#6FE3FF', count: 20, power: 90 });
        hitMonster(24);
        damageText(hit, 30, '#6FE3FF');
        return;
      }
      case 'zeus_judgment': {
        // 올림포스의 심판: 번개 8줄기가 몬스터 주변에 연달아 떨어지고, 마지막은 초대형
        const x = last ? p.monX : p.monX + (Math.random() - 0.5) * 140;
        add({ kind: 'bolt', x, toY: p.groundY - 6, color: '#FFE97A', thick: last ? 18 : 9 });
        add({ kind: 'sparks', x, y: p.groundY - 10, color: '#FFE97A', count: last ? 30 : 10, power: last ? 140 : 70 });
        flashIt(last ? '#FFFFFF' : '#FFF6B0', last ? 0.95 : 0.3, last ? 420 : 160);
        shakeIt(last ? 20 : 7);
        hitMonster(last ? 30 : 10);
        if (last) {
          add({ kind: 'ring', x: p.monX, y: p.monY, color: '#FFE97A', size: 260 });
          add({ kind: 'ring', x: p.monX, y: p.monY, color: '#FFFFFF', size: 180 });
        }
        damageText(hit, last ? 38 : 26, '#FFE97A');
        return;
      }
      case 'poseidon_kraken': {
        // 크라켄 강림: 촉수가 몬스터 양옆에서 번갈아 솟구쳐 내리친다. 마지막엔 해일까지
        const offsets = [-60, 55, -25, 70, -75, 0];
        const i = combo?.index ?? 0;
        add({ kind: 'tentacle', x: p.monX + offsets[i % offsets.length], bottom: GROUND - 4, height: last ? 230 : 180, tilt: offsets[i % offsets.length] > 0 ? -10 : 10 });
        add({ kind: 'sparks', x: p.monX, y: p.monY, color: '#9FE7FF', count: last ? 26 : 12, power: last ? 130 : 70 });
        shakeIt(last ? 18 : 8);
        hitMonster(last ? 30 : 12);
        if (last) {
          add({ kind: 'wave', width, height: 210, bottom: GROUND - 6 });
          flashIt('#B8F4FF', 0.8, 380);
        }
        damageText(hit, last ? 38 : 26, '#B48CFF');
        return;
      }
      default:
        // 지속형 스킬(천둥 폭풍, 삼지창 난무)은 시전 연출만 있다
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
        add({ kind: 'sparks', x: p.monX, y: p.monY, color: '#FFFFFF', count: 12, power: 70 });
      }
      for (const id of r.drops) {
        const w = WEAPONS[id];
        const rarity = RARITY_INFO[w.rarity];
        if (w.rarity === 'legend' || w.rarity === 'transcendent') {
          add({ kind: 'banner', text: `${w.emoji} ${rarity.name} 획득!`, color: rarity.color, big: w.rarity === 'transcendent' });
          flashIt(rarity.color, 0.5, 500);
          shakeIt(w.rarity === 'transcendent' ? 14 : 6);
        }
        add({ kind: 'toast', text: `🎁 [${rarity.name}] ${w.name}`, color: rarity.color });
      }
    },
  }));

  const { monster } = state;
  const [skyTop, skyBottom] = skyColors(state);

  return (
    <Pressable onPressIn={onTap} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={styles.outer}>
      <Animated.View
        style={[styles.container, { backgroundColor: skyBottom, transform: [{ translateX: shake.x }, { translateY: shake.y }] }]}
      >
        <View style={[styles.skyTop, { backgroundColor: skyTop }]} />
        <View style={styles.ground} />

        {/* 신 */}
        <Animated.View
          style={{
            position: 'absolute',
            left: SIDE,
            bottom: GROUND,
            transform: [{ translateX: dash }, { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
          }}
        >
          {state.buff && (
            <Animated.View
              style={[
                styles.aura,
                {
                  width: heroSize.w * 1.6,
                  height: heroSize.w * 1.6,
                  borderRadius: heroSize.w,
                  left: -heroSize.w * 0.3,
                  top: heroSize.h / 2 - heroSize.w * 0.8,
                  backgroundColor: skillColor(state.buff.skill),
                  opacity: aura.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
                  transform: [{ scale: aura.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] }) }],
                },
              ]}
            />
          )}
          <PixelSprite name={hero} scale={HERO_SCALE} />
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
            ],
          }}
        >
          <PixelSprite name={monster.kind} scale={monsterScale} />
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
          <Text style={styles.stage}>스테이지 {stageLabel(state.wave)}</Text>
          {state.buff && (
            <Text style={styles.buff}>
              {SKILLS[state.buff.skill].emoji} {Math.ceil(state.buff.timeLeft / 1000)}초
            </Text>
          )}
        </View>
        {state.bossTimeLeft !== null && (
          <View style={styles.bossTimerTrack} pointerEvents="none">
            <View style={[styles.bossTimerFill, { width: `${Math.min(1, state.bossTimeLeft / BOSS_TIME_LIMIT) * 100}%` }]} />
          </View>
        )}
        <View style={styles.monsterInfo} pointerEvents="none">
          <Text style={[styles.monsterName, monster.isBoss && { color: colors.boss }]}>{monster.name}</Text>
          <View style={styles.hpTrack}>
            <View style={[styles.hpFill, { width: `${(monster.hp / monster.maxHp) * 100}%` }]} />
          </View>
          <Text style={styles.hpText}>
            {formatNumber(monster.hp)} / {formatNumber(monster.maxHp)}
          </Text>
        </View>

        {state.farming ? (
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

export function skillColor(id: SkillId): string {
  switch (id) {
    case 'teen_slash':
      return '#7FE8FF';
    case 'zeus_bolt':
    case 'zeus_storm':
    case 'zeus_judgment':
      return '#FFE97A';
    case 'poseidon_wave':
    case 'poseidon_trident':
      return '#6FE3FF';
    case 'poseidon_kraken':
      return '#B48CFF';
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
});
