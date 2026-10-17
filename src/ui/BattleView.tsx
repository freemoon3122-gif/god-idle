import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BOSS_TIME_LIMIT, SKILLS, stageLabel } from '../game/balance';
import { formatNumber } from '../game/format';
import { GameState, Hit } from '../game/types';
import { PixelSprite } from './PixelSprite';
import { heroSprite, skyColors } from './sprites';
import { colors } from './theme';

/** 화면에 잠깐 떴다가 사라지는 효과(데미지 숫자 등). 저장하지 않는 UI 전용 데이터 */
export interface Fx {
  id: number;
  hit: Hit;
  born: number;
}

export const FX_LIFETIME = 800;
const PROJECTILE_TIME = 180;

interface Props {
  state: GameState;
  fx: Fx[];
  now: number;
  lastAutoAt: number;
  lastHitAt: number;
  onTap: () => void;
  onChallengeBoss: () => void;
}

export function BattleView({ state, fx, now, lastAutoAt, lastHitAt, onTap, onChallengeBoss }: Props) {
  const { monster } = state;
  const [skyTop, skyBottom] = skyColors(state);
  const bob = Math.sin(now / 300) * 3; // 위아래로 둥실둥실
  const shake = now - lastHitAt < 90 ? 4 : 0; // 맞으면 살짝 흔들림
  const projectile = (now - lastAutoAt) / PROJECTILE_TIME; // 0→1 사이일 때 마법 구슬이 날아간다
  const recentSkill = [...fx].reverse().find((f) => f.hit.source !== 'auto' && f.hit.source !== 'tap');

  return (
    <Pressable onPressIn={onTap} style={[styles.container, { backgroundColor: skyBottom }]}>
      <View style={[styles.skyTop, { backgroundColor: skyTop }]} />

      {/* 상단: 스테이지 & 보스 타이머 */}
      <View style={styles.topRow}>
        <Text style={styles.stage}>스테이지 {stageLabel(state.wave)}</Text>
        {state.buff && (
          <Text style={styles.buff}>
            {SKILLS[state.buff.skill].emoji} {Math.ceil(state.buff.timeLeft / 1000)}초
          </Text>
        )}
      </View>
      {state.bossTimeLeft !== null && (
        <View style={styles.bossTimerTrack}>
          <View style={[styles.bossTimerFill, { width: `${(state.bossTimeLeft / BOSS_TIME_LIMIT) * 100}%` }]} />
        </View>
      )}

      {/* 몬스터 이름 + 체력 */}
      <View style={styles.monsterInfo}>
        <Text style={[styles.monsterName, monster.isBoss && { color: colors.boss }]}>{monster.name}</Text>
        <View style={styles.hpTrack}>
          <View style={[styles.hpFill, { width: `${(monster.hp / monster.maxHp) * 100}%` }]} />
        </View>
        <Text style={styles.hpText}>
          {formatNumber(monster.hp)} / {formatNumber(monster.maxHp)}
        </Text>
      </View>

      {/* 전장 */}
      <View style={styles.field}>
        <View style={{ transform: [{ translateY: bob }] }}>
          <PixelSprite name={heroSprite(state)} scale={6} />
        </View>

        {projectile >= 0 && projectile < 1 && (
          <View style={[styles.orb, { left: `${28 + projectile * 40}%`, backgroundColor: orbColor(state) }]} />
        )}

        <View style={{ transform: [{ translateX: shake }, { translateY: -bob / 2 }] }}>
          <PixelSprite name={monster.kind} scale={monster.isBoss ? 9 : 6} />
        </View>

        {recentSkill && now - recentSkill.born < 400 && (
          <Text style={styles.skillFlash}>{SKILLS[recentSkill.hit.source as keyof typeof SKILLS].emoji}</Text>
        )}

        {/* 데미지 숫자 */}
        {fx.slice(-6).map((f) => {
          const age = now - f.born;
          return (
            <Text
              key={f.id}
              style={[
                styles.damage,
                f.hit.crit && styles.crit,
                {
                  opacity: 1 - age / FX_LIFETIME,
                  transform: [{ translateY: -age / 15 }],
                  right: 16 + (f.id % 4) * 22,
                  bottom: 100 + (f.id % 3) * 18,
                },
              ]}
            >
              {formatNumber(f.hit.damage)}
              {f.hit.crit ? '!' : ''}
            </Text>
          );
        })}
      </View>
      <View style={styles.ground} />

      {state.farming ? (
        <Pressable onPress={onChallengeBoss} style={styles.challenge}>
          <Text style={styles.challengeText}>👑 보스 재도전</Text>
        </Pressable>
      ) : (
        <Text style={styles.hint}>화면을 터치하면 추가 공격!</Text>
      )}
    </Pressable>
  );
}

function orbColor(s: GameState): string {
  if (s.god === 'zeus') return '#FFE97A';
  if (s.god === 'poseidon') return '#6FE3FF';
  return '#FFFFFF';
}

const styles = StyleSheet.create({
  container: { height: 320, overflow: 'hidden', borderRadius: 18 },
  skyTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
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
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  orb: { position: 'absolute', bottom: 50, width: 12, height: 12, borderRadius: 6 },
  skillFlash: { position: 'absolute', right: 40, bottom: 30, fontSize: 64 },
  damage: { position: 'absolute', color: colors.text, fontWeight: '800', fontSize: 16 },
  crit: { color: colors.gold, fontSize: 22 },
  ground: { height: 34, backgroundColor: colors.ground },
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
