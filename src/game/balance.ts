import { formatNumber } from './format';
import { Form, GodId, SkillId, UpgradeId } from './types';

/**
 * 게임 밸런스 공식 모음. 숫자를 바꾸고 `npm run simulate`로 확인한다.
 *
 * 방치형 게임의 기본 구조는 "지수 vs 지수"이다.
 * 몬스터 체력과 강화 비용이 모두 거듭제곱(1.x^n)으로 커지고,
 * 어느 쪽이 더 빨리 커지느냐에 따라 막히는 지점(벽)이 생긴다.
 */

export const WAVES_PER_STAGE = 10; // 10번째 몬스터는 보스
export const BOSS_TIME_LIMIT = 30_000; // 보스전 제한 시간 30초
export const CRIT_MULTIPLIER = 3;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000; // 오프라인 보상은 최대 8시간
export const OFFLINE_EFFICIENCY = 0.5; // 오프라인에서는 골드를 50%만 번다
// 경험치는 레벨에 바로 반영돼서 더 짜게 준다. (이보다 크면 켜 두는 것보다 꺼 두는 게 이득이 된다)
export const OFFLINE_XP_EFFICIENCY = 0.1;

// ───────────── 레벨 & 성장 단계 ─────────────

export const TEEN_LEVEL = 100;
export const GOD_LEVEL = 200;
export const ULTIMATE_LEVEL = 1000;

export function formOf(level: number): Form {
  if (level >= GOD_LEVEL) return 'god';
  if (level >= TEEN_LEVEL) return 'teen';
  return 'baby';
}

export const FORM_INFO: Record<Form, { name: string; multiplier: number }> = {
  baby: { name: '아기 신', multiplier: 1 },
  teen: { name: '청소년 신', multiplier: 1.5 },
  god: { name: '신', multiplier: 2.5 },
};

/** 다음 레벨까지 필요한 경험치 */
export function xpToNext(level: number): number {
  return Math.ceil(5 + Math.pow(level, 1.6));
}

export function xpForKill(wave: number): number {
  const base = (6 + wave * 3.6) * Math.pow(1.01, Math.max(0, wave - 300));
  return Math.ceil(isBossWave(wave) ? base * 5 : base);
}

/** 레벨이 오를수록 기본 공격력이 조금씩 오른다 (Lv.1 = 1배, Lv.200 ≈ 9배) */
export function levelMultiplier(level: number): number {
  return 1 + (level - 1) * 0.04;
}

// ───────────── 몬스터 ─────────────

export function isBossWave(wave: number): boolean {
  return wave % WAVES_PER_STAGE === 0;
}

/** 화면 표시용: wave 23 → "3-3" */
export function stageLabel(wave: number): string {
  const stage = Math.floor((wave - 1) / WAVES_PER_STAGE) + 1;
  const step = ((wave - 1) % WAVES_PER_STAGE) + 1;
  return `${stage}-${step}`;
}

/**
 * 웨이브 300까지는 ×1.19씩, 그 뒤로는 ×1.18씩 늘어난다.
 * 골드로 올릴 수 있는 공격력은 웨이브당 약 ×1.158씩 늘기 때문에, 후반에도 1.19를 쓰면 넘을 수 없는 벽이 생긴다.
 * 반대로 1.158보다 작게 하면 플레이어가 기하급수적으로 폭주한다. 그 사이의 완만한 오르막으로 맞춘다.
 */
export const HP_GROWTH_EARLY = 1.19;
export const HP_GROWTH_LATE = 1.18;
export const HP_GROWTH_SWITCH_WAVE = 300;

export function monsterHp(wave: number): number {
  const early = Math.min(wave, HP_GROWTH_SWITCH_WAVE) - 1;
  const late = Math.max(0, wave - HP_GROWTH_SWITCH_WAVE);
  const base = 10 * Math.pow(HP_GROWTH_EARLY, early) * Math.pow(HP_GROWTH_LATE, late);
  return Math.ceil(isBossWave(wave) ? base * 6 : base);
}

export function monsterGold(wave: number, goldLevel: number): number {
  const base = 3 * Math.pow(1.17, wave - 1);
  return Math.ceil((isBossWave(wave) ? base * 8 : base) * goldMultiplier(goldLevel));
}

/** 스테이지마다 등장하는 몬스터가 바뀐다. 마지막 종류 이후로는 반복된다. */
export const MONSTER_KINDS = [
  { kind: 'slime', name: '독 슬라임' },
  { kind: 'bat', name: '흡혈 박쥐' },
  { kind: 'skeleton', name: '해골 전사' },
  { kind: 'ghost', name: '원령' },
  { kind: 'cyclops', name: '분노한 키클롭스' },
];

export function monsterKindFor(wave: number) {
  const stage = Math.floor((wave - 1) / WAVES_PER_STAGE);
  return MONSTER_KINDS[stage % MONSTER_KINDS.length];
}

// ───────────── 신 & 스킬 ─────────────

export interface GodInfo {
  id: GodId;
  name: string;
  title: string;
  emoji: string;
  passive: string;
  skills: SkillId[];
  ultimate: SkillId; // Lv.1000에 열리는 궁극기
}

export const GODS: Record<GodId, GodInfo> = {
  zeus: {
    id: 'zeus',
    name: '제우스',
    title: '하늘과 번개의 신',
    emoji: '⚡',
    passive: '공격 속도 +30%',
    skills: ['zeus_bolt', 'zeus_storm'],
    ultimate: 'zeus_judgment',
  },
  poseidon: {
    id: 'poseidon',
    name: '포세이돈',
    title: '바다와 지진의 신',
    emoji: '🔱',
    passive: '치명타 확률 +15%, 치명타 피해 4배',
    skills: ['poseidon_wave', 'poseidon_trident'],
    ultimate: 'poseidon_kraken',
  },
};

export interface SkillInfo {
  id: SkillId;
  name: string;
  emoji: string;
  description: string;
  cooldown: number; // ms
  /** 타격 한 번의 피해: 일반 공격의 몇 배 */
  damageMultiplier?: number;
  /** 연타 횟수 (없으면 1번) */
  hits?: number;
  /** 연타 사이 간격 (ms) */
  hitInterval?: number;
  /** 지속 효과 시간 (ms) */
  buffDuration?: number;
}

export const SKILLS: Record<SkillId, SkillInfo> = {
  teen_slash: {
    id: 'teen_slash',
    name: '삼연참',
    emoji: '🗡️',
    description: '검으로 세 번 찔러 매번 공격력의 6배 피해',
    cooldown: 6_000,
    damageMultiplier: 6,
    hits: 3,
    hitInterval: 160,
  },
  zeus_bolt: {
    id: 'zeus_bolt',
    name: '낙뢰',
    emoji: '⚡',
    description: '번개를 내리꽂아 공격력의 25배 피해',
    cooldown: 8_000,
    damageMultiplier: 25,
  },
  zeus_storm: {
    id: 'zeus_storm',
    name: '천둥 폭풍',
    emoji: '🌩️',
    description: '10초 동안 공격 속도 3배',
    cooldown: 40_000,
    buffDuration: 10_000,
  },
  zeus_judgment: {
    id: 'zeus_judgment',
    name: '올림포스의 심판',
    emoji: '🌩️',
    description: '하늘에서 번개 8줄기가 쏟아져 각각 공격력의 15배 피해',
    cooldown: 60_000,
    damageMultiplier: 15,
    hits: 8,
    hitInterval: 110,
  },
  poseidon_wave: {
    id: 'poseidon_wave',
    name: '대해일',
    emoji: '🌊',
    description: '공격력의 20배 피해 + 보스 제한 시간 5초 증가',
    cooldown: 8_000,
    damageMultiplier: 20,
  },
  poseidon_trident: {
    id: 'poseidon_trident',
    name: '삼지창 난무',
    emoji: '🔱',
    description: '10초 동안 모든 공격이 치명타',
    cooldown: 40_000,
    buffDuration: 10_000,
  },
  poseidon_kraken: {
    id: 'poseidon_kraken',
    name: '크라켄 강림',
    emoji: '🐙',
    description: '거대한 촉수가 6번 내리쳐 각각 공격력의 20배 피해 + 보스 시간 10초 증가',
    cooldown: 60_000,
    damageMultiplier: 20,
    hits: 6,
    hitInterval: 170,
  },
  // ───── 레이드 「기간토마키아」 첫 클리어 보상 ─────
  zeus_gigas: {
    id: 'zeus_gigas',
    name: '거인 사냥',
    emoji: '🏹',
    description: '번개와 헤라클레스의 화살이 번갈아 8번, 각각 공격력의 9배',
    cooldown: 45_000,
    damageMultiplier: 9,
    hits: 8,
    hitInterval: 120,
  },
  poseidon_nisyros: {
    id: 'poseidon_nisyros',
    name: '니시로스 투척',
    emoji: '🏝️',
    description: '코스 섬을 뜯어 내던진다. 공격력의 70배',
    cooldown: 45_000,
    damageMultiplier: 70,
  },
};

export const KRAKEN_BOSS_TIME_BONUS = 10_000;


export const WAVE_BOSS_TIME_BONUS = 5_000;

// ───────────── 강화 효과 ─────────────

export function upgradeDamage(level: number): number {
  return 3 * Math.pow(1.13, level) + level * 2;
}

export function baseAttacksPerSecond(level: number): number {
  return 1 + level * 0.1;
}

export function baseCritChance(level: number): number {
  return level * 0.02;
}

export function goldMultiplier(level: number): number {
  return 1 + level * 0.1;
}

export interface UpgradeInfo {
  id: UpgradeId;
  name: string;
  emoji: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  /** 현재 레벨의 효과를 사람이 읽는 문자열로 */
  describe: (level: number) => string;
}

export const UPGRADES: UpgradeInfo[] = [
  {
    id: 'damage',
    name: '신력',
    emoji: '✨',
    maxLevel: Infinity,
    baseCost: 5,
    costGrowth: 1.14,
    describe: (lv) => `기본 피해 ${formatNumber(upgradeDamage(lv))}`,
  },
  {
    id: 'speed',
    name: '시전 속도',
    emoji: '💨',
    maxLevel: 40,
    baseCost: 20,
    costGrowth: 1.4,
    describe: (lv) => `초당 ${baseAttacksPerSecond(lv).toFixed(1)}회`,
  },
  {
    id: 'crit',
    name: '치명타',
    emoji: '💥',
    maxLevel: 25,
    baseCost: 40,
    costGrowth: 1.45,
    describe: (lv) => `확률 ${Math.round(baseCritChance(lv) * 100)}%`,
  },
  {
    id: 'gold',
    name: '공물',
    emoji: '💰',
    maxLevel: Infinity,
    baseCost: 30,
    costGrowth: 1.3,
    describe: (lv) => `골드 +${Math.round((goldMultiplier(lv) - 1) * 100)}%`,
  },
];

export function findUpgrade(id: UpgradeId): UpgradeInfo {
  return UPGRADES.find((u) => u.id === id)!;
}

export function upgradeCost(id: UpgradeId, level: number): number {
  const u = findUpgrade(id);
  return Math.ceil(u.baseCost * Math.pow(u.costGrowth, level));
}
