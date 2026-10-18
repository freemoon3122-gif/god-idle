import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { SKILLS } from '../game/balance';
import { canEnterRaid, raidStage, raidUnlocked, ticketsLeft } from '../game/engine';
import { formatNumber } from '../game/format';
import { defenseMultiplier, GIGANTO_UNLOCK_LEVEL, godRaidHp, RAID_LIST, RAIDS, stageMultipliers, TYPHON_UNLOCK_LEVEL } from '../game/raids';
import { StoryLine } from '../game/story';
import { GameState, RaidId, RaidResult } from '../game/types';
import { RARITY_INFO, WEAPONS } from '../game/weapons';
import { PixelSprite, spriteSize } from './PixelSprite';
import { colors } from './theme';

// ───────────── 레이드 목록 ─────────────

export function RaidPanel({ state, onEnter }: { state: GameState; onEnter: (id: RaidId) => void }) {
  const now = Date.now();
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>⚔️ 레이드</Text>
      <Text style={styles.sectionDesc}>
        신화 속 전쟁에 참전한다. 클리어할 때마다 단계가 올라 적이 기하급수로 강해진다. 입장권은 실패할 때만 쓴다.
      </Text>
      {RAID_LIST.map((raid) => {
        const unlocked = raidUnlocked(state, raid.id);
        const left = ticketsLeft(state, raid.id, now);
        const enterable = canEnterRaid(state, raid.id, now);
        const stage = raidStage(state, raid.id);
        const m = stageMultipliers(raid.id, stage);
        const lockText =
          raid.id === 'gigantomachy'
            ? `🔒 Lv.${GIGANTO_UNLOCK_LEVEL}에 신이 되면 열려요`
            : `🔒 Lv.${TYPHON_UNLOCK_LEVEL} + 기간토마키아 클리어 시 열려요`;
        return (
          <View key={raid.id} style={[styles.card, !unlocked && { opacity: 0.6 }]}>
            <View style={styles.cardHead}>
              <Text style={styles.raidEmoji}>{raid.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.raidName}>{raid.name}</Text>
                <Text style={styles.raidSub}>{raid.subtitle}</Text>
              </View>
              <Text style={styles.clears}>{stage}단계</Text>
            </View>
            {raid.gimmicks.map((g) => (
              <Text key={g} style={styles.gimmick}>
                · {g}
              </Text>
            ))}
            <Text style={styles.gimmick}>
              · 제한 시간 {raid.timeLimit / 1000}초 · 실패해도 넣은 피해만큼 보상
            </Text>
            {unlocked && (
              <View style={styles.stats}>
                <Text style={styles.stat}>❤️ 체력 ×{formatNumber(m.hp)}</Text>
                <Text style={styles.stat}>⚔️ 공격력 {formatNumber(m.attack)}</Text>
                <Text style={styles.stat}>
                  🛡️ 방어력 {formatNumber(m.defense)} (피해 {Math.round(defenseMultiplier(m.defense) * 100)}%)
                </Text>
                <Text style={[styles.stat, { color: colors.xp }]}>💙 내 신의 체력 {formatNumber(godRaidHp(state.level))}</Text>
              </View>
            )}
            {unlocked ? (
              <View style={styles.enterRow}>
                <Text style={styles.tickets}>
                  🎟️ 오늘 {left}/{raid.ticketsPerDay}
                </Text>
                <Pressable
                  onPress={() => onEnter(raid.id)}
                  disabled={!enterable}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.enter, !enterable && styles.enterDisabled, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.enterText}>{state.raid ? '전투 중' : left > 0 ? '입장' : '내일 다시'}</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.lock}>{lockText}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ───────────── 컷신 대화창: 화면을 터치하면 다음 대사로 ─────────────

export function StoryModal({ lines, index, onNext }: { lines: StoryLine[] | null; index: number; onNext: () => void }) {
  const line = lines?.[index];
  return (
    <Modal visible={!!line} transparent animationType="fade">
      <Pressable style={styles.storyBackdrop} onPress={onNext} accessibilityRole="button">
        {line && (
          <View style={styles.dialog}>
            {line.sprite ? (
              <View style={styles.portrait}>
                {/* 큰 몬스터도 초상 칸(84pt)에 들어가도록 배율을 줄인다 */}
                <PixelSprite name={line.sprite} scale={Math.min(3.5, 84 / spriteSize(line.sprite, 1).w)} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              {line.sprite ? <Text style={styles.speaker}>{line.speaker}</Text> : null}
              <Text style={[styles.line, !line.sprite && styles.narration]}>{line.text}</Text>
              <Text style={styles.next}>
                {index + 1}/{lines!.length} ▶ 터치
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </Modal>
  );
}

// ───────────── 레이드 결과 ─────────────

export function RaidResultModal({ result, onClose }: { result: RaidResult | null; onClose: () => void }) {
  const weapon = result?.weapon ? WEAPONS[result.weapon] : null;
  const skill = result?.unlockedSkill ? SKILLS[result.unlockedSkill] : null;
  return (
    <Modal visible={!!result} transparent animationType="fade">
      <View style={styles.backdrop}>
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>{result.cleared ? '🏆' : '🏳️'}</Text>
            <Text style={styles.resultTitle}>
              {RAIDS[result.id].name} {result.stage}단계 {result.cleared ? '클리어!' : '실패'}
            </Text>
            {result.cleared && <Text style={styles.resultBody}>다음 단계({result.stage + 1}단계)부터 적이 더 강해져요. 입장권은 돌려받았어요.</Text>}
            {result.knockedOut && <Text style={[styles.resultBody, { color: colors.hp }]}>신이 쓰러졌다... 레벨을 올려 체력을 키우거나 더 빨리 쓰러뜨려야 해요.</Text>}
            {result.firstClear && <Text style={styles.firstClear}>✨ 첫 클리어 보상 ✨</Text>}
            {!result.cleared && (
              <Text style={styles.resultBody}>넣은 피해 {Math.floor(result.damagePct * 100)}% → 보상의 일부를 받았어요.</Text>
            )}
            <Text style={styles.reward}>💰 {formatNumber(result.gold)}</Text>
            <Text style={[styles.reward, { color: colors.xp }]}>EXP {formatNumber(result.xp)}</Text>
            {weapon && (
              <Text style={[styles.rewardLine, { color: RARITY_INFO[weapon.rarity].color }]}>
                {weapon.emoji} [{RARITY_INFO[weapon.rarity].name}] {weapon.name}
              </Text>
            )}
            {skill && (
              <View style={styles.skillBox}>
                <Text style={styles.skillTitle}>
                  새 스킬 {skill.emoji} 「{skill.name}」
                </Text>
                <Text style={styles.resultBody}>{skill.description}</Text>
              </View>
            )}
            <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
              <Text style={styles.buttonText}>확인</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.panel, borderRadius: 14, padding: 12, marginTop: 12, gap: 8 },
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  sectionDesc: { color: colors.subText, fontSize: 12 },
  card: { backgroundColor: colors.panelLight, borderRadius: 12, padding: 12, gap: 3 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  raidEmoji: { fontSize: 30 },
  raidName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  raidSub: { color: colors.subText, fontSize: 12 },
  clears: { color: colors.gold, fontSize: 14, fontWeight: '900' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  stat: { color: colors.text, fontSize: 12, fontWeight: '700', backgroundColor: colors.panel, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  gimmick: { color: colors.subText, fontSize: 12, lineHeight: 17 },
  enterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  tickets: { color: colors.text, fontWeight: '800', fontSize: 13 },
  enter: { backgroundColor: colors.boss, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 22 },
  enterDisabled: { backgroundColor: colors.disabled },
  enterText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  lock: { color: colors.subText, fontSize: 12, fontWeight: '700', marginTop: 6 },

  storyBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5, 3, 15, 0.35)', padding: 16, paddingBottom: 40 },
  dialog: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(20, 14, 40, 0.96)',
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
  },
  portrait: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelLight, borderRadius: 12 },
  speaker: { color: colors.gold, fontWeight: '900', fontSize: 15, marginBottom: 4 },
  line: { color: colors.text, fontSize: 15, lineHeight: 22 },
  narration: { fontStyle: 'italic', color: '#E0D9FF' },
  next: { color: colors.subText, fontSize: 11, textAlign: 'right', marginTop: 'auto', paddingTop: 6 },

  backdrop: { flex: 1, backgroundColor: 'rgba(5, 3, 15, 0.7)', justifyContent: 'center', padding: 20 },
  resultCard: { backgroundColor: colors.panel, borderRadius: 20, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  resultEmoji: { fontSize: 48 },
  resultTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 6 },
  firstClear: { color: colors.gold, fontWeight: '900', marginTop: 6 },
  resultBody: { color: colors.subText, fontSize: 13, textAlign: 'center', lineHeight: 19, marginVertical: 6 },
  reward: { color: colors.gold, fontSize: 22, fontWeight: '900', marginTop: 4 },
  rewardLine: { fontSize: 15, fontWeight: '900', marginTop: 8 },
  skillBox: { backgroundColor: colors.panelLight, borderRadius: 12, padding: 10, marginTop: 10, alignSelf: 'stretch', alignItems: 'center' },
  skillTitle: { color: colors.text, fontWeight: '900', fontSize: 15 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignSelf: 'stretch', alignItems: 'center', marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
