import { SKILLS } from './balance';
import { SkillId } from './types';
import { Rarity } from './weapons';

/**
 * 💎 다이아(캐시 재화)와 🪙 강화코인.
 * - 다이아: 스테이지 보스 첫 처치·레이드 클리어로 얻는다. 무기 뽑기와 강화코인 구매에 쓴다.
 *   (App Store 인앱 결제로 파는 것은 나중에 붙인다. 지금은 게임 안에서만 모은다)
 * - 강화코인: 레이드 보상 또는 다이아로 산다. 스킬 강화에 쓴다.
 */

// ───────────── 다이아 획득 ─────────────
export const BOSS_FIRST_KILL_DIAMONDS = 10; // 스테이지 보스를 처음 잡으면
export const RAID_CLEAR_DIAMONDS = 30; // 레이드 클리어

// ───────────── 무기 뽑기 ─────────────
export const GACHA_COST = 100; // 1회
export const GACHA_11_COST = 1000; // 11회 (1회 보너스 + 레전드 이상 1개 확정)

/** 뽑기 등급 확률 (%) */
export const GACHA_RATES: [Rarity, number][] = [
  ['common', 50],
  ['rare', 30],
  ['epic', 15],
  ['legend', 4.5],
  ['transcendent', 0.5],
];
/** 11회 뽑기의 확정 칸: 레전드 이상 (레전드 90% / 초월 10%, 위 확률의 비율 그대로) */
export const GACHA_GUARANTEED_RATES: [Rarity, number][] = [
  ['legend', 90],
  ['transcendent', 10],
];

// ───────────── 강화코인 ─────────────
export const COIN_PACK = { diamonds: 100, coins: 10 }; // 💎100 → 🪙10

/** 레이드 보상 코인: 클리어하면 3 + 단계, 실패하면 넣은 피해 비율만큼 (최대 2) */
export function raidCoins(cleared: boolean, stage: number, damagePct: number): number {
  return cleared ? 3 + stage : Math.floor(damagePct * 2);
}

// ───────────── 스킬 강화 ─────────────
export const SKILL_MAX_LEVEL = 20;
export const SKILL_DAMAGE_PER_LEVEL = 0.15; // 공격 스킬: 레벨당 피해 +15%
export const SKILL_COOLDOWN_PER_LEVEL = 0.025; // 버프·유틸 스킬: 레벨당 쿨타임 −2.5% (20레벨 = −50%)

/** 다음 레벨로 올리는 데 드는 코인: 2, 4, 6, ... (20레벨까지 총 420개) */
export function skillUpgradeCost(level: number): number {
  return 2 + level * 2;
}

/** 공격 스킬인지 (피해 배율이 있으면 공격 스킬, 없으면 버프·유틸 스킬) */
export function isDamageSkill(id: SkillId): boolean {
  return !!SKILLS[id].damageMultiplier;
}

export function skillDamageBonus(id: SkillId, level: number): number {
  return isDamageSkill(id) ? 1 + SKILL_DAMAGE_PER_LEVEL * level : 1;
}

export function skillCooldownFor(id: SkillId, level: number): number {
  const base = SKILLS[id].cooldown;
  return isDamageSkill(id) ? base : Math.round(base * (1 - SKILL_COOLDOWN_PER_LEVEL * level));
}

/** 화면 표시용: 이 레벨에서의 효과 */
export function skillLevelEffect(id: SkillId, level: number): string {
  return isDamageSkill(id)
    ? `피해 +${Math.round(SKILL_DAMAGE_PER_LEVEL * level * 100)}%`
    : `쿨타임 −${Math.round(SKILL_COOLDOWN_PER_LEVEL * level * 100)}%`;
}

// ───────────── 패시브 스킬 (🪙 강화코인으로 강화, 누르지 않아도 항상 적용) ─────────────

/** ① 거인 사냥꾼: 보스(스테이지 보스·레이드 보스)에게 주는 피해 증가. 최대 30레벨 */
export const BOSS_PASSIVE_MAX_LEVEL = 30;
export const BOSS_PASSIVE_PER_LEVEL = 0.1; // 레벨당 +10% (만렙 ×4)

export function bossPassiveBonus(level: number): number {
  return 1 + BOSS_PASSIVE_PER_LEVEL * level;
}

/** 다음 레벨 비용: 5, 10, 15, ... (30레벨까지 총 2325개) */
export function bossPassiveCost(level: number): number {
  return 5 + level * 5;
}

/**
 * ② 신의 각성: 4단계가 순환한다. 한 단계를 5번 강화하면 다음 단계로 넘어간다.
 *   1단계 피해 → 2단계 이동 속도 → 3단계 공격 속도 → 4단계 치명타 피해 → 다시 1단계 ...
 * 레벨 제한은 없지만, 효과는 더하기(+%p)이고 비용은 강화할수록 계속 오른다.
 * (곱하기로 쌓으면 지수로 커지는 몬스터 체력을 따라잡아 성장이 폭주한다)
 */
export type AwakenKind = 'damage' | 'move' | 'speed' | 'critDmg';
export const AWAKEN_STEPS_PER_STAGE = 5;
export const AWAKEN_ORDER: { kind: AwakenKind; name: string; emoji: string; perLevel: number }[] = [
  { kind: 'damage', name: '피해', emoji: '🔥', perLevel: 0.05 }, // 레벨당 +5%
  { kind: 'move', name: '이동 속도', emoji: '👟', perLevel: 0.03 }, // +3%
  { kind: 'speed', name: '공격 속도', emoji: '⚡', perLevel: 0.03 }, // +3%
  { kind: 'critDmg', name: '치명타 피해', emoji: '🎯', perLevel: 0.08 }, // +8%
];
const CYCLE = AWAKEN_STEPS_PER_STAGE * AWAKEN_ORDER.length; // 한 바퀴 = 20번

/** 지금 강화할 단계 (0~3) */
export function awakenStage(total: number): number {
  return Math.floor(total / AWAKEN_STEPS_PER_STAGE) % AWAKEN_ORDER.length;
}

/** 지금 단계에서 몇 번 강화했는지 (0~4) */
export function awakenStep(total: number): number {
  return total % AWAKEN_STEPS_PER_STAGE;
}

/** 지금까지 몇 바퀴 돌았는지 (1바퀴 = 4단계 × 5번) */
export function awakenCycle(total: number): number {
  return Math.floor(total / CYCLE);
}

/** 총 강화 횟수 total에서 이 종류가 받은 강화 횟수 */
export function awakenCount(total: number, kind: AwakenKind): number {
  const idx = AWAKEN_ORDER.findIndex((a) => a.kind === kind);
  const full = awakenCycle(total) * AWAKEN_STEPS_PER_STAGE;
  const rest = total % CYCLE;
  return full + Math.min(AWAKEN_STEPS_PER_STAGE, Math.max(0, rest - idx * AWAKEN_STEPS_PER_STAGE));
}

export function awakenBonus(total: number, kind: AwakenKind): number {
  return 1 + AWAKEN_ORDER.find((a) => a.kind === kind)!.perLevel * awakenCount(total, kind);
}

/** 다음 강화 비용: 3, 4, 5, ... 한 번 할 때마다 1개씩 비싸진다 */
export function awakenCost(total: number): number {
  return 3 + total;
}
