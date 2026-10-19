import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ADULT_LEVEL, formOf, GOD_LEVEL, GODS, SKILLS, TEEN_LEVEL, ULTIMATE_LEVEL, UPGRADES, upgradeCost, xpToNext, DIFFICULTIES, STAGES_PER_DIFFICULTY } from '../game/balance';
import { availableSkills, bulkPlan, canCast, canEnhance, canFuse, formName, ownedPower, skillCooldown, skillLevel } from '../game/engine';
import { formatNumber } from '../game/format';
import { GameState, SkillId, UpgradeId } from '../game/types';
import { FUSE_COST, RARITY_INFO, WEAPON_LIST, WeaponId, WEAPONS } from '../game/weapons';
import { colors } from './theme';

/** 상단: 레벨, 경험치, 골드 */
export function StatusBar({ state }: { state: GameState }) {
  const need = xpToNext(state.level);
  return (
    <View style={styles.status}>
      <View style={styles.statusRow}>
        <Text style={styles.level}>
          Lv.{state.level} <Text style={styles.form}>{formName(state)}</Text>
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.gold}>💰 {formatNumber(state.gold)}</Text>
          <Text style={styles.currency}>
            💎 {formatNumber(state.diamonds)}  🪙 {formatNumber(state.coins)}
          </Text>
        </View>
      </View>
      <View style={styles.xpTrack}>
        <View style={[styles.xpFill, { width: `${Math.min(1, state.xp / need) * 100}%` }]} />
      </View>
      <Text style={styles.xpText}>
        EXP {formatNumber(state.xp)} / {formatNumber(need)}
      </Text>
    </View>
  );
}

/** 난이도 칩: Lv 위에 작게. 누르면 난이도 고르는 창이 열린다 */
export function DifficultyChip({ state, onPress }: { state: GameState; onPress: () => void }) {
  const d = DIFFICULTIES[state.difficulty];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="난이도 선택" hitSlop={8} style={[styles.chip, { borderColor: d.color }]}>
      <Text style={[styles.chipText, { color: d.color }]}>
        {d.name} {state.maxWave}/{STAGES_PER_DIFFICULTY} ▾
      </Text>
    </Pressable>
  );
}

/** 난이도 고르기: 5000스테이지를 깨면 다음 난이도가 열린다 */
export function DifficultyPicker({
  state,
  visible,
  onChoose,
  onClose,
}: {
  state: GameState;
  visible: boolean;
  onChoose: (d: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <View style={styles.picker}>
          <Text style={styles.pickerTitle}>난이도 선택</Text>
          <Text style={styles.pickerDesc}>5000스테이지를 깨면 다음 난이도가 열려요. 몬스터 체력·공격력은 쉬움의 2·3·4제곱!</Text>
          {DIFFICULTIES.map((d, i) => {
            const locked = i > state.unlockedDifficulty;
            const active = i === state.difficulty;
            const best = active ? state.maxWave : state.bestStages[i] ?? 0;
            return (
              <Pressable
                key={d.name}
                onPress={() => {
                  onChoose(i);
                  onClose();
                }}
                disabled={locked || active || !!state.raid}
                accessibilityRole="button"
                style={[styles.diffRow, { borderColor: d.color }, active && { backgroundColor: d.color }, locked && { opacity: 0.4 }]}
              >
                <Text style={[styles.diffName, { color: active ? '#fff' : d.color }]}>
                  {locked ? '🔒 ' : active ? '✓ ' : ''}
                  {d.name}
                </Text>
                <Text style={[styles.diffBest, active && { color: '#fff' }]}>
                  {locked ? `앞 난이도 ${STAGES_PER_DIFFICULTY} 클리어 시 열림` : `최고 ${best}/${STAGES_PER_DIFFICULTY}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

/** 스킬 버튼. 아기 신은 스킬이 없고, 청소년 1개, 성인 2개, 신은 최대 5개 + 궁극기 */
export function SkillBar({ state, onCast }: { state: GameState; onCast: (id: SkillId) => void }) {
  const skills = availableSkills(state);
  const form = formOf(state.level);
  // 다음에 열릴 스킬 안내
  const nextGodSkill = state.god ? GODS[state.god].extraSkills.find(([, lv]) => state.level < lv) : undefined;
  const nextHint =
    form === 'baby'
      ? `🔒 Lv.${TEEN_LEVEL} 청소년 신이 되면 「삼연참」이 열려요`
      : form === 'teen'
        ? `🔒 Lv.${ADULT_LEVEL} 성인 신이 되면 「${SKILLS.adult_whirl.name}」이 열려요`
        : form === 'adult'
          ? `🔒 Lv.${GOD_LEVEL}에 진짜 신이 되면 신의 스킬이 열려요`
          : nextGodSkill
            ? `🔒 Lv.${nextGodSkill[1]}에 「${SKILLS[nextGodSkill[0]].emoji} ${SKILLS[nextGodSkill[0]].name}」이 열려요`
            : state.god && state.level < ULTIMATE_LEVEL
              ? `🔒 Lv.${ULTIMATE_LEVEL}에 궁극기 「${SKILLS[GODS[state.god].ultimate].name}」이 열려요`
              : null;

  return (
    <View style={styles.skillArea}>
      {skills.length > 0 && (
        <View style={styles.skills}>
          {skills.map((id) => {
            const skill = SKILLS[id];
            const cd = state.skillCooldowns[id] ?? 0;
            const ready = canCast(state, id);
            const isUlt = state.god !== null && GODS[state.god].ultimate === id;
            return (
              <Pressable
                key={id}
                onPress={() => onCast(id)}
                disabled={!ready}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.skill,
                  isUlt && styles.skillUlt,
                  !ready && styles.skillCooling,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
                ]}
              >
                {/* 쿨타임 진행 막대 */}
                {!ready && <View style={[styles.cooldownFill, { width: `${(1 - cd / skillCooldown(state, id)) * 100}%` }]} />}
                <Text style={styles.skillEmoji}>{skill.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.skillName}>
                    {skill.name}
                    {skillLevel(state, id) > 0 && <Text style={styles.skillLv}> +{skillLevel(state, id)}</Text>}
                  </Text>
                  <Text style={styles.skillDesc} numberOfLines={2}>
                    {ready ? skill.description : `${Math.ceil(cd / 1000)}초`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      {nextHint && (
        <View style={styles.lockedSkills}>
          <Text style={styles.lockedText}>{nextHint}</Text>
        </View>
      )}
    </View>
  );
}

/** 무기 창: 장착 무기 + 가진 무기 목록. 같은 무기 3개면 등급업, 초월 무기는 초월 무기를 재료로 강화 */
export function WeaponPanel({
  state,
  onEquip,
  onFuse,
  onEnhance,
}: {
  state: GameState;
  onEquip: (id: WeaponId) => void;
  onFuse: (id: WeaponId) => void;
  onEnhance: (target: WeaponId, material: WeaponId) => void;
}) {
  const owned = WEAPON_LIST.filter((w) => (state.weapons[w.id] ?? 0) > 0).reverse(); // 높은 등급이 위로
  const equipped = state.equippedWeapon ? WEAPONS[state.equippedWeapon] : null;

  return (
    <View style={styles.weapons}>
      <Text style={styles.sectionTitle}>무기</Text>
      <View style={styles.equipped}>
        {equipped ? (
          <>
            <Text style={styles.weaponEmojiBig}>{equipped.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rarity, { color: RARITY_INFO[equipped.rarity].color }]}>{RARITY_INFO[equipped.rarity].name}</Text>
              <Text style={styles.weaponName}>
                {equipped.name}
                {(state.weaponEnhance[equipped.id] ?? 0) > 0 ? ` +${state.weaponEnhance[equipped.id]}` : ''}
              </Text>
              <Text style={styles.weaponDesc}>공격력 ×{ownedPower(state, equipped.id).toFixed(2)}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.weaponDesc}>아직 무기가 없어요. 몬스터를 잡으면 가끔 떨어져요! (보스는 확률 ↑)</Text>
        )}
      </View>

      {owned.map((w) => {
        const count = state.weapons[w.id] ?? 0;
        const rarity = RARITY_INFO[w.rarity];
        const isEquipped = state.equippedWeapon === w.id;
        const enhance = state.weaponEnhance[w.id] ?? 0;
        // 초월 무기 강화 재료: 다른 초월 무기를 먼저, 없으면 같은 무기
        const material = WEAPON_LIST.filter((m) => m.rarity === 'transcendent')
          .map((m) => m.id)
          .sort((a) => (a === w.id ? 1 : -1))
          .find((m) => canEnhance(state, w.id, m));
        return (
          <View key={w.id} style={[styles.weaponRow, { borderLeftColor: rarity.color }]}>
            <Text style={styles.weaponEmoji}>{w.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.weaponRowName}>
                <Text style={{ color: rarity.color }}>[{rarity.name}]</Text> {w.name}
                {enhance > 0 ? ` +${enhance}` : ''} <Text style={styles.count}>×{count}</Text>
              </Text>
              <Text style={styles.weaponDesc}>
                공격력 ×{ownedPower(state, w.id).toFixed(2)}
                {w.rarity !== 'transcendent' ? ` · ${FUSE_COST}개면 등급업` : ' · 초월 무기 1개로 강화'}
              </Text>
            </View>
            {w.rarity === 'transcendent' ? (
              <SmallButton label="강화" enabled={!!material} onPress={() => material && onEnhance(w.id, material)} color={rarity.color} />
            ) : (
              <SmallButton label="등급업" enabled={canFuse(state, w.id)} onPress={() => onFuse(w.id)} color={rarity.color} />
            )}
            <SmallButton label={isEquipped ? '장착중' : '장착'} enabled={!isEquipped} onPress={() => onEquip(w.id)} color={colors.primary} />
          </View>
        );
      })}
    </View>
  );
}

function SmallButton({ label, enabled, onPress, color }: { label: string; enabled: boolean; onPress: () => void; color: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.smallButton, { backgroundColor: enabled ? color : colors.disabled }, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.smallButtonText, enabled && color !== colors.primary && { color: colors.background }]}>{label}</Text>
    </Pressable>
  );
}

export const BUY_AMOUNTS = [1, 10, 50, 100];

interface UpgradeListProps {
  state: GameState;
  buyAmount: number;
  onChangeAmount: (amount: number) => void;
  onBuy: (id: UpgradeId) => void;
}

export function UpgradeList({ state, buyAmount, onChangeAmount, onBuy }: UpgradeListProps) {
  return (
    <View style={styles.upgrades}>
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>강화</Text>
        {BUY_AMOUNTS.map((n) => (
          <Pressable
            key={n}
            onPress={() => onChangeAmount(n)}
            accessibilityRole="button"
            accessibilityState={{ selected: n === buyAmount }}
            style={[styles.amount, n === buyAmount && styles.amountSelected]}
          >
            <Text style={[styles.amountText, n === buyAmount && styles.amountTextSelected]}>×{n}</Text>
          </Pressable>
        ))}
      </View>
      {UPGRADES.map((u) => {
        const level = state.levels[u.id];
        const maxed = level >= u.maxLevel;
        const plan = bulkPlan(state, u.id, buyAmount);
        const affordable = plan.count > 0;
        // 살 수 있으면 "+단계 수 · 총 가격", 못 사면 다음 1단계 가격을 보여준다
        const label = maxed
          ? 'MAX'
          : affordable
            ? `${buyAmount > 1 ? `+${plan.count} · ` : ''}💰 ${formatNumber(plan.cost)}`
            : `💰 ${formatNumber(upgradeCost(u.id, level))}`;
        return (
          <View key={u.id} style={styles.upgradeRow}>
            <Text style={styles.upgradeEmoji}>{u.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeName}>
                {u.name} <Text style={styles.upgradeLevel}>Lv.{level}</Text>
              </Text>
              <Text style={styles.upgradeDesc}>{u.describe(level)}</Text>
            </View>
            <Pressable
              onPress={() => onBuy(u.id)}
              disabled={!affordable}
              accessibilityRole="button"
              style={({ pressed }) => [styles.buy, !affordable && styles.buyDisabled, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.buyText}>{label}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  status: { paddingVertical: 10 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  level: { color: colors.text, fontSize: 22, fontWeight: '900' },
  form: { color: colors.subText, fontSize: 15, fontWeight: '700' },
  gold: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  chip: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, backgroundColor: 'rgba(10,6,25,0.6)', marginBottom: 2 },
  chipText: { fontSize: 11, fontWeight: '900' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(5,3,15,0.6)', justifyContent: 'center', padding: 24 },
  picker: { backgroundColor: colors.panel, borderRadius: 18, padding: 18, gap: 8, borderWidth: 1, borderColor: colors.border },
  pickerTitle: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  pickerDesc: { color: colors.subText, fontSize: 12, textAlign: 'center', marginBottom: 4, lineHeight: 17 },
  diffRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  diffName: { fontWeight: '900', fontSize: 16 },
  diffBest: { color: colors.subText, fontSize: 12, fontWeight: '700' },
  currency: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 2 },
  skillLv: { color: colors.gold, fontWeight: '900' },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: colors.panelLight, marginTop: 8 },
  xpFill: { height: '100%', borderRadius: 4, backgroundColor: colors.xp },
  xpText: { color: colors.subText, fontSize: 11, marginTop: 3 },

  skillArea: { marginTop: 12, gap: 10 },
  lockedSkills: { backgroundColor: colors.panel, borderRadius: 14, padding: 12 },
  lockedText: { color: colors.subText, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skill: {
    flexGrow: 1,
    flexBasis: '45%',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 10,
  },
  skillUlt: { flexBasis: '100%', backgroundColor: '#C2410C' },
  skillCooling: { backgroundColor: colors.disabled },
  cooldownFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.12)' },
  skillEmoji: { fontSize: 28 },
  skillName: { color: '#fff', fontWeight: '800', fontSize: 14 },
  skillDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },

  weapons: { backgroundColor: colors.panel, borderRadius: 14, padding: 12, marginTop: 12, gap: 8 },
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  equipped: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panelLight, borderRadius: 12, padding: 12 },
  weaponEmojiBig: { fontSize: 36 },
  rarity: { fontSize: 12, fontWeight: '900' },
  weaponName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  weaponDesc: { color: colors.subText, fontSize: 12, marginTop: 2 },
  weaponRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 8, borderLeftWidth: 3 },
  weaponEmoji: { fontSize: 22 },
  weaponRowName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  count: { color: colors.subText, fontWeight: '600' },
  smallButton: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  smallButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  upgrades: { backgroundColor: colors.panel, borderRadius: 14, padding: 6, marginTop: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
  amountLabel: { color: colors.text, fontWeight: '800', fontSize: 15, marginRight: 'auto' },
  amount: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.panelLight },
  amountSelected: { backgroundColor: colors.gold },
  amountText: { color: colors.subText, fontWeight: '800', fontSize: 13 },
  amountTextSelected: { color: colors.background },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  upgradeEmoji: { fontSize: 24 },
  upgradeName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  upgradeLevel: { color: colors.subText, fontWeight: '600', fontSize: 13 },
  upgradeDesc: { color: colors.subText, fontSize: 12, marginTop: 2 },
  buy: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 8, minWidth: 104, alignItems: 'center' },
  buyDisabled: { backgroundColor: colors.disabled },
  buyText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
