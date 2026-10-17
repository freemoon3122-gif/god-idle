import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FORM_INFO, formOf, GOD_LEVEL, GODS, SKILLS, UPGRADES, upgradeCost, xpToNext } from '../game/balance';
import { bulkPlan, canCast, formName } from '../game/engine';
import { formatNumber } from '../game/format';
import { GameState, SkillId, UpgradeId } from '../game/types';
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
        <Text style={styles.gold}>💰 {formatNumber(state.gold)}</Text>
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

/** 스킬 버튼. 신이 되기 전에는 잠겨 있다. */
export function SkillBar({ state, onCast }: { state: GameState; onCast: (id: SkillId) => void }) {
  if (!state.god) {
    const form = formOf(state.level);
    return (
      <View style={styles.lockedSkills}>
        <Text style={styles.lockedText}>
          🔒 Lv.{GOD_LEVEL}에 신이 되면 스킬이 열려요 · 지금은 {FORM_INFO[form].name} (공격력 ×{FORM_INFO[form].multiplier})
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.skills}>
      {GODS[state.god].skills.map((id) => {
        const skill = SKILLS[id];
        const cd = state.skillCooldowns[id] ?? 0;
        const ready = canCast(state, id);
        return (
          <Pressable
            key={id}
            onPress={() => onCast(id)}
            disabled={!ready}
            accessibilityRole="button"
            style={({ pressed }) => [styles.skill, !ready && styles.skillCooling, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.skillEmoji}>{skill.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.skillName}>{skill.name}</Text>
              <Text style={styles.skillDesc} numberOfLines={2}>
                {ready ? skill.description : `${Math.ceil(cd / 1000)}초 후 사용 가능`}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 골드 강화 목록 */
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
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: colors.panelLight, marginTop: 8 },
  xpFill: { height: '100%', borderRadius: 4, backgroundColor: colors.xp },
  xpText: { color: colors.subText, fontSize: 11, marginTop: 3 },

  lockedSkills: { backgroundColor: colors.panel, borderRadius: 14, padding: 14, marginTop: 12 },
  lockedText: { color: colors.subText, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  skills: { flexDirection: 'row', gap: 10, marginTop: 12 },
  skill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 10,
  },
  skillCooling: { backgroundColor: colors.disabled },
  skillEmoji: { fontSize: 28 },
  skillName: { color: '#fff', fontWeight: '800', fontSize: 14 },
  skillDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },

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
