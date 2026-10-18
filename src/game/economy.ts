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
