import { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { SKILLS } from '../game/balance';
import {
  COIN_PACK,
  GACHA_11_COST,
  GACHA_COST,
  GACHA_RATES,
  isDamageSkill,
  AWAKEN_ORDER,
  AWAKEN_STEPS_PER_STAGE,
  awakenCost,
  awakenCount,
  awakenCycle,
  awakenStage,
  awakenStep,
  BOSS_PASSIVE_MAX_LEVEL,
  BOSS_PASSIVE_PER_LEVEL,
  bossPassiveCost,
  SKILL_MAX_LEVEL,
  skillLevelEffect,
  skillUpgradeCost,
} from '../game/economy';
import { availableSkills, canAwaken, canUpgradeBossPassive, canUpgradeSkill, skillLevel } from '../game/engine';
import { formatNumber } from '../game/format';
import { GameState, SkillId } from '../game/types';
import { RARITY_INFO, RARITY_ORDER, WeaponId, WEAPONS } from '../game/weapons';
import { colors } from './theme';

const ND = Platform.OS !== 'web';

// ───────────── 스킬 강화 ─────────────

export function SkillUpgradePanel({ state, onUpgrade }: { state: GameState; onUpgrade: (id: SkillId) => void }) {
  const skills = availableSkills(state);
  if (!skills.length) return null;
  return (
    <View style={styles.panel}>
      <View style={styles.headRow}>
        <Text style={styles.title}>📈 스킬 강화</Text>
        <Text style={styles.balance}>🪙 {formatNumber(state.coins)}</Text>
      </View>
      <Text style={styles.desc}>공격 스킬은 레벨당 피해 +15%, 버프·유틸 스킬은 레벨당 쿨타임 −2.5% (최대 {SKILL_MAX_LEVEL}레벨)</Text>
      {skills.map((id) => {
        const skill = SKILLS[id];
        const lv = skillLevel(state, id);
        const max = lv >= SKILL_MAX_LEVEL;
        const cost = skillUpgradeCost(lv);
        const ok = canUpgradeSkill(state, id);
        return (
          <View key={id} style={styles.row}>
            <Text style={styles.emoji}>{skill.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {skill.name} <Text style={styles.lv}>Lv.{lv}</Text>
              </Text>
              <Text style={styles.small}>
                {lv > 0 ? skillLevelEffect(id, lv) : isDamageSkill(id) ? '공격 스킬' : '버프·유틸 스킬'}
                {!max && ` → ${skillLevelEffect(id, lv + 1)}`}
              </Text>
            </View>
            <Pressable
              onPress={() => onUpgrade(id)}
              disabled={!ok}
              accessibilityRole="button"
              style={({ pressed }) => [styles.buy, !ok && styles.disabled, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.buyText}>{max ? 'MAX' : `🪙 ${cost}`}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

// ───────────── 패시브 스킬: 버튼을 누를 필요 없이 항상 적용된다 ─────────────

export function PassivePanel({ state, onBoss, onAwaken }: { state: GameState; onBoss: () => void; onAwaken: () => void }) {
  const bossLv = state.bossPassive;
  const bossMax = bossLv >= BOSS_PASSIVE_MAX_LEVEL;
  const bossOk = canUpgradeBossPassive(state);
  const stage = awakenStage(state.awaken);
  const step = awakenStep(state.awaken);
  const now = AWAKEN_ORDER[stage];
  const awakenOk = canAwaken(state);
  return (
    <View style={styles.panel}>
      <View style={styles.headRow}>
        <Text style={styles.title}>✨ 패시브 스킬</Text>
        <Text style={styles.balance}>🪙 {formatNumber(state.coins)}</Text>
      </View>
      <Text style={styles.desc}>누르지 않아도 항상 적용돼요. 강화코인 🪙로 강화해요.</Text>

      <View style={styles.row}>
        <Text style={styles.emoji}>👹</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            거인 사냥꾼 <Text style={styles.lv}>Lv.{bossLv}</Text>
          </Text>
          <Text style={styles.small}>
            보스 피해 +{Math.round(bossLv * BOSS_PASSIVE_PER_LEVEL * 100)}%
            {!bossMax && ` → +${Math.round((bossLv + 1) * BOSS_PASSIVE_PER_LEVEL * 100)}%`} (최대 {BOSS_PASSIVE_MAX_LEVEL}레벨)
          </Text>
        </View>
        <Pressable
          onPress={onBoss}
          disabled={!bossOk}
          accessibilityRole="button"
          accessibilityLabel="거인 사냥꾼 강화"
          style={({ pressed }) => [styles.buy, !bossOk && styles.disabled, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.buyText}>{bossMax ? 'MAX' : `🪙 ${bossPassiveCost(bossLv)}`}</Text>
        </Pressable>
      </View>

      <Text style={styles.subTitle}>🌟 신의 각성 · {awakenCycle(state.awaken) + 1}바퀴째</Text>
      <Text style={styles.desc}>4단계가 순환해요. 한 단계를 {AWAKEN_STEPS_PER_STAGE}번 강화하면 다음 단계로 넘어가요.</Text>
      {AWAKEN_ORDER.map((a, i) => {
        const pct = Math.round(a.perLevel * awakenCount(state.awaken, a.kind) * 100);
        const active = i === stage;
        return (
          <View key={a.kind} style={[styles.awakenRow, active && styles.awakenActive]}>
            <Text style={styles.awakenStage}>{i + 1}단계</Text>
            <Text style={styles.emoji}>{a.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{a.name} +{pct}%</Text>
              <Text style={styles.small}>
                {active ? `${'●'.repeat(step)}${'○'.repeat(AWAKEN_STEPS_PER_STAGE - step)}  강화할 때마다 +${Math.round(a.perLevel * 100)}%` : `강화당 +${Math.round(a.perLevel * 100)}%`}
              </Text>
            </View>
          </View>
        );
      })}
      <Pressable
        onPress={onAwaken}
        disabled={!awakenOk}
        accessibilityRole="button"
        accessibilityLabel="신의 각성 강화"
        style={({ pressed }) => [styles.shopButton, !awakenOk && styles.disabled, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.shopLabel}>
          {now.emoji} {stage + 1}단계 {now.name} 강화 ({step + 1}/{AWAKEN_STEPS_PER_STAGE})
        </Text>
        <Text style={styles.shopPrice}>🪙 {awakenCost(state.awaken)}</Text>
      </Pressable>
    </View>
  );
}

// ───────────── 상점: 무기 뽑기 + 강화코인 ─────────────

export function ShopPanel({ state, onGacha, onBuyCoins }: { state: GameState; onGacha: (count: 1 | 11) => void; onBuyCoins: () => void }) {
  const rates = GACHA_RATES.map(([r, p]) => `${RARITY_INFO[r].name} ${p}%`).join(' · ');
  return (
    <View style={styles.panel}>
      <View style={styles.headRow}>
        <Text style={styles.title}>🎰 상점</Text>
        <Text style={styles.balance}>💎 {formatNumber(state.diamonds)}</Text>
      </View>
      <Text style={styles.desc}>💎는 스테이지 보스를 처음 잡거나 레이드를 클리어하면 얻어요.</Text>

      <Text style={styles.subTitle}>무기 뽑기</Text>
      <View style={styles.gachaRow}>
        <ShopButton label="1회 뽑기" price={`💎 ${GACHA_COST}`} enabled={state.diamonds >= GACHA_COST} onPress={() => onGacha(1)} />
        <ShopButton
          label="11회 뽑기"
          sub="레전드 이상 1개 확정!"
          price={`💎 ${GACHA_11_COST}`}
          enabled={state.diamonds >= GACHA_11_COST}
          onPress={() => onGacha(11)}
          highlight
        />
      </View>
      <Text style={styles.rates}>확률: {rates}</Text>

      <Text style={styles.subTitle}>강화코인</Text>
      <View style={styles.gachaRow}>
        <ShopButton
          label={`🪙 강화코인 ${COIN_PACK.coins}개`}
          price={`💎 ${COIN_PACK.diamonds}`}
          enabled={state.diamonds >= COIN_PACK.diamonds}
          onPress={onBuyCoins}
        />
      </View>
      <Text style={styles.rates}>강화코인은 레이드에서도 얻어요 (클리어: 3 + 단계, 실패: 넣은 피해만큼 최대 2)</Text>
    </View>
  );
}

function ShopButton({
  label,
  sub,
  price,
  enabled,
  onPress,
  highlight,
}: {
  label: string;
  sub?: string;
  price: string;
  enabled: boolean;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.shopButton, highlight && styles.shopHighlight, !enabled && styles.disabled, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.shopLabel}>{label}</Text>
      {sub && <Text style={styles.shopSub}>{sub}</Text>}
      <Text style={styles.shopPrice}>{price}</Text>
    </Pressable>
  );
}

// ───────────── 뽑기 결과: 카드가 한 장씩 튀어나온다. 가장 높은 등급이 제목 색이 된다 ─────────────

export function GachaResultModal({ pulls, onClose }: { pulls: WeaponId[] | null; onClose: () => void }) {
  const best = pulls?.length ? RARITY_ORDER[Math.max(...pulls.map((id) => RARITY_ORDER.indexOf(WEAPONS[id].rarity)))] : null;
  return (
    <Modal visible={!!pulls?.length} transparent animationType="fade">
      <View style={styles.backdrop}>
        {pulls && best && (
          <View style={[styles.resultCard, { borderColor: RARITY_INFO[best].color }]}>
            <Text style={[styles.resultTitle, { color: RARITY_INFO[best].color }]}>
              {best === 'transcendent' ? '✨ 초월 등장! ✨' : best === 'legend' ? '🌟 레전드 획득!' : '🎁 뽑기 결과'}
            </Text>
            <View style={styles.cards}>
              {pulls.map((id, i) => (
                <GachaCard key={i} id={id} index={i} />
              ))}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.close, pressed && { opacity: 0.8 }]}>
              <Text style={styles.buyText}>확인</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

function GachaCard({ id, index }: { id: WeaponId; index: number }) {
  const w = WEAPONS[id];
  const color = RARITY_INFO[w.rarity].color;
  const high = w.rarity === 'legend' || w.rarity === 'transcendent';
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // 순서대로 뒤집히듯 튀어나온다 (높은 등급은 조금 더 크게 튕긴다)
    Animated.sequence([
      Animated.delay(index * 90),
      Animated.spring(p, { toValue: 1, friction: high ? 4 : 6, tension: 140, useNativeDriver: ND }),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: color, backgroundColor: high ? `${color}33` : colors.panelLight },
        { opacity: p, transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] },
      ]}
    >
      <Text style={styles.cardEmoji}>{w.emoji}</Text>
      <Text style={[styles.cardRarity, { color }]}>{RARITY_INFO[w.rarity].name}</Text>
      <Text style={styles.cardName} numberOfLines={2}>
        {w.name}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.panel, borderRadius: 14, padding: 12, marginTop: 12, gap: 6 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontWeight: '800', fontSize: 15 },
  balance: { color: colors.text, fontWeight: '900', fontSize: 15 },
  desc: { color: colors.subText, fontSize: 12, lineHeight: 17 },
  subTitle: { color: colors.text, fontWeight: '800', fontSize: 13, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  emoji: { fontSize: 24 },
  name: { color: colors.text, fontWeight: '700', fontSize: 14 },
  lv: { color: colors.gold, fontWeight: '900' },
  small: { color: colors.subText, fontSize: 12, marginTop: 2 },
  buy: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 8, minWidth: 80, alignItems: 'center' },
  disabled: { backgroundColor: colors.disabled },
  buyText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  gachaRow: { flexDirection: 'row', gap: 8 },
  shopButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 },
  shopHighlight: { backgroundColor: '#C2410C' },
  shopLabel: { color: '#fff', fontWeight: '900', fontSize: 15 },
  shopSub: { color: '#FFE6A8', fontWeight: '800', fontSize: 11 },
  shopPrice: { color: '#fff', fontWeight: '800', fontSize: 13, marginTop: 2 },
  rates: { color: colors.subText, fontSize: 11 },
  awakenRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  awakenActive: { borderColor: colors.gold, backgroundColor: 'rgba(255, 213, 74, 0.08)' },
  awakenStage: { color: colors.subText, fontWeight: '900', fontSize: 11, width: 30 },

  backdrop: { flex: 1, backgroundColor: 'rgba(5, 3, 15, 0.8)', justifyContent: 'center', padding: 16 },
  resultCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  resultTitle: { fontSize: 22, fontWeight: '900', marginBottom: 12 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  card: { width: 84, borderRadius: 12, borderWidth: 2, padding: 6, alignItems: 'center' },
  cardEmoji: { fontSize: 30 },
  cardRarity: { fontSize: 11, fontWeight: '900', marginTop: 2 },
  cardName: { color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  close: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignSelf: 'stretch', alignItems: 'center', marginTop: 16 },
});
