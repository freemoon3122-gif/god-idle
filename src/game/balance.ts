import { formatNumber } from './format';
import { Form, GodId, SkillId, UpgradeId } from './types';

/**
 * 게임 밸런스 공식 모음. 숫자를 바꾸고 `npm run simulate`로 확인한다.
 *
 * 방치형 게임의 기본 구조는 "지수 vs 지수"이다.
 * 몬스터 체력과 강화 비용이 모두 거듭제곱(1.x^n)으로 커지고,
 * 어느 쪽이 더 빨리 커지느냐에 따라 막히는 지점(벽)이 생긴다.
 */

export const WAVES_PER_STAGE = 10; // 10스테이지마다 보스
export const BOSS_TIME_LIMIT = 30_000; // 보스전 제한 시간 30초
export const MAX_TIME_BONUS = 30_000; // 스킬로 늘릴 수 있는 시간은 한 번의 보스전·레이드에서 최대 30초
export const CRIT_MULTIPLIER = 3;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000; // 오프라인 보상은 최대 8시간
export const OFFLINE_EFFICIENCY = 0.5; // 오프라인에서는 골드를 50%만 번다
// 경험치는 레벨에 바로 반영돼서 더 짜게 준다. (이보다 크면 켜 두는 것보다 꺼 두는 게 이득이 된다)
export const OFFLINE_XP_EFFICIENCY = 0.1;

// ───────────── 레벨 & 성장 단계 ─────────────

export const TEEN_LEVEL = 1000;
export const ADULT_LEVEL = 2000;
export const GOD_LEVEL = 3000;
/** 신의 스킬 3개: 신이 되자마자 1개, Lv.3400에 1개, Lv.3800에 궁극기 (다른 단계처럼 단계 안에서 차례로 열린다) */
export const GOD_SKILL_LEVELS = [3000, 3400];
export const ULTIMATE_LEVEL = 3800;

/**
 * 레벨 숫자는 화면에 보이는 값이고, 밸런스 공식은 "레벨 ÷ 10"을 기준으로 계산한다.
 * (예전에는 Lv.100에 청소년이 됐는데, 레벨을 10배로 늘리면서 성장 속도는 그대로 두려고)
 */
export const LEVEL_SCALE = 10;

export function formOf(level: number): Form {
  if (level >= GOD_LEVEL) return 'god';
  if (level >= ADULT_LEVEL) return 'adult';
  if (level >= TEEN_LEVEL) return 'teen';
  return 'baby';
}

export const FORM_INFO: Record<Form, { name: string; multiplier: number }> = {
  baby: { name: '아기 신', multiplier: 1 },
  teen: { name: '청소년 신', multiplier: 1.5 },
  adult: { name: '성인 신', multiplier: 2 },
  god: { name: '신', multiplier: 2.5 },
};

/**
 * 다음 레벨까지 필요한 경험치.
 * 예전 공식(5 + 레벨^1.6)을 "레벨 ÷ 10"에 적용하고 10으로 나눴다 → 같은 경험치로 레벨이 10배 오른다.
 */
export function xpToNext(level: number): number {
  const l = level / LEVEL_SCALE;
  return Math.ceil((5 + Math.pow(l, 1.6)) / LEVEL_SCALE);
}

export function xpForKill(stage: number): number {
  const wave = effectiveWave(stage);
  const base = (6 + wave * 3.6) * Math.pow(1.01, Math.max(0, wave - 300));
  return Math.ceil(isBossWave(stage) ? base * 5 : base);
}

/** 레벨이 오를수록 기본 공격력이 조금씩 오른다 (Lv.10 = 1배, Lv.1000 ≈ 5배, Lv.3000 ≈ 13배) */
export function levelMultiplier(level: number): number {
  return 1 + Math.max(0, level / LEVEL_SCALE - 1) * 0.04;
}

// ───────────── 몬스터 ─────────────

export function isBossWave(wave: number): boolean {
  return wave % WAVES_PER_STAGE === 0;
}

/** 화면 표시용 스테이지 번호 */
export function stageLabel(stage: number): string {
  return `${stage}`;
}

// ───────────── 난이도 ─────────────
//
// 쉬움 → 보통 → 어려움 → 극악. 각 난이도는 5000스테이지이고, 5000스테이지를 깨면 다음 난이도가 열린다.
// 몬스터·스토리·스테이지는 같고, 몬스터의 체력·공격력이 쉬움의 거듭제곱이다.
//   보통 = 쉬움² (제곱), 어려움 = 쉬움³ (세제곱), 극악 = 쉬움⁴ (네제곱)
// 골드 보상도 같은 지수로 올린다. (체력만 제곱하고 골드는 그대로면 보통부터는 수학적으로 깰 수 없다)
// 쉬움 5000스테이지 체력이 약 10⁷⁵ → 극악은 약 10³⁰⁰. JavaScript 숫자 한계(1.8×10³⁰⁸) 바로 아래로 맞췄다.
export const STAGES_PER_DIFFICULTY = 5000;
export const DIFFICULTIES = [
  { name: '쉬움', color: '#5CC46B', power: 1 },
  { name: '보통', color: '#4C9DFF', power: 2 },
  { name: '어려움', color: '#FF8A3D', power: 3 },
  { name: '극악', color: '#FF3B5C', power: 4 },
];

/**
 * 스테이지 → 예전 공식의 "웨이브". 한 스테이지 = 몬스터 무리 한 번이라, 예전 웨이브 0.2개만큼 강해진다.
 * (스테이지 5000 = 예전 웨이브 약 1000)
 */
export const STAGE_TO_WAVE = 0.2;
export function effectiveWave(stage: number): number {
  return 1 + (stage - 1) * STAGE_TO_WAVE;
}

/**
 * 웨이브 300까지는 ×1.19씩, 그 뒤로는 ×1.18씩 늘어난다.
 * 골드로 올릴 수 있는 공격력은 웨이브당 약 ×1.158씩 늘기 때문에, 후반에도 1.19를 쓰면 넘을 수 없는 벽이 생긴다.
 * 반대로 1.158보다 작게 하면 플레이어가 기하급수적으로 폭주한다. 그 사이의 완만한 오르막으로 맞춘다.
 */
export const HP_GROWTH_EARLY = 1.19;
export const HP_GROWTH_LATE = 1.18;
export const HP_GROWTH_SWITCH_WAVE = 300;

/** 몬스터 체력. difficulty(0~3)에 따라 기본 체력을 1·2·4·8제곱한다. 보스 스테이지는 6배 */
export function monsterHp(stage: number, difficulty = 0): number {
  const wave = effectiveWave(stage);
  const early = Math.min(wave, HP_GROWTH_SWITCH_WAVE) - 1;
  const late = Math.max(0, wave - HP_GROWTH_SWITCH_WAVE);
  const base = Math.pow(10 * Math.pow(HP_GROWTH_EARLY, early) * Math.pow(HP_GROWTH_LATE, late), DIFFICULTIES[difficulty].power);
  return Math.ceil(isBossWave(stage) ? base * 6 : base);
}

export function monsterGold(stage: number, goldLevel: number, difficulty = 0): number {
  const base = Math.pow(3 * Math.pow(1.17, effectiveWave(stage) - 1), DIFFICULTIES[difficulty].power);
  return Math.ceil((isBossWave(stage) ? base * 8 : base) * goldMultiplier(goldLevel));
}

/** 500스테이지 = 한 장(chapter). 장마다 주로 나오는 몬스터가 바뀐다 (총 10장) */
export const CHAPTER_LENGTH = 500;
export const MONSTER_KINDS = [
  { kind: 'slime', name: '독 슬라임' },
  { kind: 'bat', name: '흡혈 박쥐' },
  { kind: 'skeleton', name: '해골 전사' },
  { kind: 'ghost', name: '원령' },
  { kind: 'cyclops', name: '분노한 키클롭스' },
  { kind: 'giant_spear', name: '기간테스 전사' },
  { kind: 'giant_rock', name: '기간테스 투석병' },
  { kind: 'polybotes', name: '바다 거인' },
  { kind: 'porphyrion', name: '거인 군주' },
  { kind: 'typhoeus', name: '티포에우스의 자식' },
];

/** 몇 번째 장인지 (0~9) */
export function chapterOf(stage: number): number {
  return Math.min(MONSTER_KINDS.length - 1, Math.floor((stage - 1) / CHAPTER_LENGTH));
}

/** 장의 주 몬스터가 나오고, 20스테이지 중 10스테이지는 지난 장의 몬스터가 섞여 나온다 (1장은 주 몬스터만) */
export function monsterKindFor(stage: number) {
  const ch = chapterOf(stage);
  const block = Math.floor((stage - 1) / WAVES_PER_STAGE);
  return MONSTER_KINDS[ch > 0 && block % 2 === 1 ? ch - 1 : ch];
}

// ───────────── 신 & 스킬 ─────────────

/**
 * 성장 단계마다 3개씩 열리는 공용 스킬 [스킬, 열리는 레벨].
 * 단계가 올라가도 사라지지 않고 계속 쌓인다 → 아기 3 → 청소년 6 → 성인 9 → 신 12 (신의 스킬 3개 포함)
 * 각 단계의 첫 스킬은 그 단계가 되자마자, 나머지는 단계 안에서 차례로 열린다.
 */
export const STAGE_SKILLS: [SkillId, number][] = [
  ['baby_star', 1],
  ['baby_halo', 300],
  ['baby_feather', 600],
  ['teen_slash', TEEN_LEVEL],
  ['teen_dash', 1300],
  ['teen_laurel', 1600],
  ['adult_whirl', ADULT_LEVEL],
  ['adult_shield', 2400],
  ['adult_meteor', 2800],
];

export interface GodInfo {
  id: GodId;
  name: string;
  title: string;
  emoji: string;
  passive: string;
  skills: SkillId[]; // GOD_SKILL_LEVELS(Lv.3000, 3400)에 하나씩 열리는 스킬 2개
  ultimate: SkillId; // Lv.3800에 열리는 궁극기 → 신의 스킬은 모두 3개
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
  /** 무조건 치명타 */
  alwaysCrit?: boolean;
  /** 보스(레이드) 제한 시간 증가 (ms) */
  bossTimeBonus?: number;
  /** 다른 스킬의 쿨타임: reset = 바로 초기화, halve = 절반으로 */
  cooldownEffect?: 'reset' | 'halve';
  /** 레이드 중 신의 체력 회복 (최대 체력 대비 비율) */
  healRatio?: number;
  /** 광역: 필드의 모든 몬스터를 때린다 (없으면 가장 가까운 한 마리) */
  aoe?: boolean;
  /** 궁극기: 버튼이 주황 바탕·금색 테두리, 시전할 때 큰 배너와 화면 연출 */
  ultimate?: boolean;
}

export const SKILLS: Record<SkillId, SkillInfo> = {
  // ───── 👶 아기 신 (Lv.1~) ─────
  baby_star: {
    id: 'baby_star',
    name: '별똥별',
    emoji: '⭐',
    description: '작은 별을 떨어뜨려 공격력의 3배 피해',
    cooldown: 5_000,
    damageMultiplier: 3,
  },
  baby_halo: {
    id: 'baby_halo',
    name: '후광 부메랑',
    emoji: '😇',
    description: '머리 위 후광을 던져 3번 베고 돌아온다. 매번 공격력의 2.5배',
    cooldown: 8_000,
    damageMultiplier: 2.5,
    hits: 3,
    hitInterval: 150,
  },
  baby_feather: {
    id: 'baby_feather',
    name: '깃털 폭풍',
    emoji: '🪶',
    description: '날개를 퍼덕여 깃털 5개를 흩뿌린다. 모든 적에게 매번 공격력의 2배',
    cooldown: 16_000,
    damageMultiplier: 2,
    hits: 5,
    hitInterval: 110,
    aoe: true,
  },
  // ───── 🧒 청소년 신 (Lv.1000~) ─────
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
  teen_dash: {
    id: 'teen_dash',
    name: '섬광 돌진',
    emoji: '💨',
    description: '번쩍이는 속도로 돌진해 꿰뚫는다. 공격력의 10배',
    cooldown: 10_000,
    damageMultiplier: 10,
  },
  teen_laurel: {
    id: 'teen_laurel',
    name: '월계수 칼날비',
    emoji: '🍃',
    description: '날카로운 월계수 잎이 쏟아진다. 모든 적에게 6번, 매번 공격력의 2.5배',
    cooldown: 18_000,
    damageMultiplier: 2.5,
    hits: 6,
    hitInterval: 100,
    aoe: true,
  },
  // ───── 🛡️ 성인 신 (Lv.2000~) ─────
  adult_whirl: {
    id: 'adult_whirl',
    name: '회오리 검무',
    emoji: '🌪️',
    description: '검을 휘돌려 회오리를 일으킨다. 4번, 매번 공격력의 8배',
    cooldown: 10_000,
    damageMultiplier: 8,
    hits: 4,
    hitInterval: 130,
    aoe: true,
  },
  adult_shield: {
    id: 'adult_shield',
    name: '방패 강타',
    emoji: '🛡️',
    description: '방패로 내리찍어 공격력의 16배 피해 + 보스 제한 시간 3초 증가',
    cooldown: 12_000,
    damageMultiplier: 16,
    bossTimeBonus: 3_000,
  },
  adult_meteor: {
    id: 'adult_meteor',
    name: '천공의 일격',
    emoji: '☄️',
    description: '하늘 높이 뛰어올라 유성처럼 내리꽂는다. 모든 적에게 5번, 매번 공격력의 9배 (궁극기)',
    cooldown: 60_000,
    damageMultiplier: 9,
    hits: 5,
    hitInterval: 140,
    aoe: true,
    ultimate: true,
  },
  // ───── ⚡ 제우스 / 🔱 포세이돈 (Lv.3000~) ─────
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
    aoe: true,
    ultimate: true,
  },
  poseidon_wave: {
    id: 'poseidon_wave',
    name: '대해일',
    emoji: '🌊',
    description: '공격력의 20배 피해 + 보스 제한 시간 5초 증가',
    cooldown: 8_000,
    damageMultiplier: 20,
    bossTimeBonus: 5_000,
    aoe: true,
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
    bossTimeBonus: 10_000,
    aoe: true,
    ultimate: true,
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
    // 치명타 피해: 레벨 제한 없이 계속 세진다. 대신 비용이 가파르게 오른다 (신력은 레벨당 ×1.14, 이건 ×2.0)
    id: 'critDmg',
    name: '치명타 피해',
    emoji: '🗡️',
    maxLevel: Infinity,
    baseCost: 1000,
    costGrowth: 1.6,
    describe: (lv) => `치명타 피해 +${formatNumber(Math.round((critDamageBonus(lv) - 1) * 100))}%`,
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

/**
 * 치명타 피해 강화 배율: 레벨당 +1%p씩 더한다 (100레벨 +100%, 300레벨 +300%). 레벨 제한 없음.
 * 곱(×1.04ⁿ)으로 하면 비용과 지수끼리 경쟁해서 성장이 폭주한다 (시뮬레이터: 쉬움을 1시간 만에 클리어).
 * 더하기로 하면 올릴수록 세지지만, 비용은 지수로 올라서 점점 완만해진다.
 */
export const CRIT_DAMAGE_PER_LEVEL = 0.01;
export function critDamageBonus(level: number): number {
  return 1 + CRIT_DAMAGE_PER_LEVEL * level;
}

export function findUpgrade(id: UpgradeId): UpgradeInfo {
  return UPGRADES.find((u) => u.id === id)!;
}

export function upgradeCost(id: UpgradeId, level: number): number {
  const u = findUpgrade(id);
  return Math.ceil(u.baseCost * Math.pow(u.costGrowth, level));
}
