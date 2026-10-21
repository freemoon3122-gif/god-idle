import { monsterHp } from './balance';
import { GodId, RaidId, SkillId } from './types';
import { Rarity } from './weapons';

/**
 * 레이드 데이터. 그리스 신화의 두 전쟁을 바탕으로 했다.
 *
 * ⚔️ 기간토마키아: 대지의 여신 가이아가 티탄의 패배에 분노해 낳은 뱀 다리 거인족 기간테스와의 전쟁.
 *    거인은 신의 힘만으로는 죽지 않아서, 인간 영웅 헤라클레스의 도움이 필요했다.
 *    제우스는 거인의 왕 포르피리온을 번개로 쓰러뜨렸고, 포세이돈은 폴리보테스를 코스 섬까지 쫓아가
 *    섬을 뜯어 던져 깔아뭉갰다 (그 바위가 니시로스 섬).
 * 🐍 티포에우스: 가이아와 타르타로스의 아들, 괴물 중의 괴물. 어깨에서 수백 개의 뱀 머리가 솟는다.
 *    제우스는 한때 힘줄이 잘려 쓰러졌지만, 헤르메스와 판이 힘줄을 되찾아 주었고,
 *    결국 번개로 제압해 에트나 화산 밑에 봉인했다.
 */

export interface RaidPhase {
  kind: string; // 스프라이트
  name: string;
  hpScale: number; // 레이드: 그 단계의 기준 체력(같은 웨이브 일반 몬스터 체력) × 이 값 / 일일 던전: 내 초당 피해 × 이 값(초)
  isBoss: boolean;
}

export interface RaidInfo {
  id: RaidId;
  name: string;
  emoji: string;
  subtitle: string;
  timeLimit: number; // ms
  ticketsPerDay: number;
  goldReward: number; // 클리어 보상 = 최고 웨이브 몬스터 골드 × 이 값
  xpReward: number;
  weaponTable: [Rarity, number][]; // 클리어 시 무기 등급 확률
  gimmicks: string[];
  daily: boolean; // true = 일일 던전 (피해량으로 보상), false = 레이드 (단계 클리어)
}

export const RAIDS: Record<RaidId, RaidInfo> = {
  gigantomachy: {
    id: 'gigantomachy',
    name: '기간토마키아',
    emoji: '⚔️',
    subtitle: '끝없이 몰려오는 거인족 기간테스와의 전쟁',
    timeLimit: 90_000,
    ticketsPerDay: 1,
    daily: true,
    goldReward: 150,
    xpReward: 60,
    weaponTable: [
      ['epic', 0.6],
      ['legend', 0.4],
    ],
    gimmicks: [
      '90초 동안 거인이 끝없이 몰려온다 (한 바퀴 돌 때마다 체력 ×1.6)',
      '불사의 거인: 평소에는 피해가 절반만 들어간다',
      '헤라클레스가 6초마다 화살을 쏜다 → 3초간 「필멸의 표식」: 피해 1.5배',
      '넣은 피해의 총합에 따라 골드와 💎 다이아 지급',
      '첫 참전: 제우스 「거인 사냥」 / 포세이돈 「니시로스 투척」',
    ],
  },
  typhoeus: {
    id: 'typhoeus',
    name: '티포에우스',
    emoji: '🐍',
    subtitle: '괴물 중의 괴물, 수백 개의 뱀 머리',
    timeLimit: 120_000,
    ticketsPerDay: 3,
    daily: false,
    goldReward: 400,
    xpReward: 150,
    weaponTable: [
      ['legend', 0.7],
      ['transcendent', 0.3],
    ],
    gimmicks: [
      '체력 60%: 「힘줄 절단」 → 8초간 공격력 80% 감소',
      '헤르메스와 판이 힘줄을 되찾아 오면 10초간 공격력 1.5배',
      '불길 브레스에 맞으면 1초간 기절 (체력 25% 이하에서 분노해 더 자주)',
      '첫 클리어: 자기 신의 초월 무기 확정',
      '클리어할 때마다 단계가 올라 체력·공격력·방어력이 기하급수로 오른다',
    ],
  },
};

export const RAID_LIST: RaidInfo[] = Object.values(RAIDS).filter((r) => !r.daily); // 레이드 목록
export const DAILY_LIST: RaidInfo[] = Object.values(RAIDS).filter((r) => r.daily); // 일일 던전 목록

export const GIGANTO_UNLOCK_LEVEL = 3000; // 신이 되는 레벨
export const TYPHON_UNLOCK_LEVEL = 5000; // 티포에우스 레이드

// 기간토마키아 기믹
export const IMMORTAL_MULTIPLIER = 0.5;
export const MARK_MULTIPLIER = 1.5;
export const MARK_DURATION = 3_000;
export const HERACLES_INTERVAL = 6_000; // 6초마다 쏘고 표식은 3초 → 절반은 표식, 절반은 불사 상태
export const HERACLES_DAMAGE = 3; // 공격력의 3배

// 티포에우스 기믹
export const TENDON_HP_RATIO = 0.6;
export const TENDON_DURATION = 8_000;
export const TENDON_MULTIPLIER = 0.2;
export const RESTORED_DURATION = 10_000;
export const RESTORED_MULTIPLIER = 1.5;
export const ENRAGE_HP_RATIO = 0.25;
export const BREATH_INTERVAL = 12_000;
export const BREATH_INTERVAL_ENRAGED = 6_000;
export const STUN_DURATION = 1_200;

export function raidPhases(id: RaidId, god: GodId | null): RaidPhase[] {
  if (id === 'gigantomachy') {
    return [
      { kind: 'giant_spear', name: '기간테스 전사', hpScale: 8, isBoss: false },
      { kind: 'giant_rock', name: '기간테스 투석병', hpScale: 8, isBoss: false },
      god === 'poseidon'
        ? { kind: 'polybotes', name: '바다의 거인 폴리보테스', hpScale: 30, isBoss: true }
        : { kind: 'porphyrion', name: '거인의 왕 포르피리온', hpScale: 30, isBoss: true },
    ];
  }
  return [{ kind: 'typhoeus', name: '티포에우스', hpScale: 50, isBoss: true }];
}

// ───────────── 레이드 단계: 클리어할 때마다 한 단계씩 올라가고, 적이 기하급수로 강해진다 ─────────────
//
// 단계 n의 능력치 (모두 지수 함수 = 기하급수)
//   체력   = 기준 웨이브 + n × STAGE_WAVE_STEP 웨이브의 몬스터 체력 × 페이즈 배율
//            → 몬스터 체력이 웨이브마다 1.18배이므로 한 단계에 1.18^8 ≈ 3.8배
//   방어력 = 20 × (1.5^n − 1)               → 받는 피해 × 100 / (100 + 방어력)
//   공격력 = 기본값 × 1.45^n                 → 3초마다 신의 체력을 깎는다
// 입장권은 실패할 때만 쓴다 (클리어하면 돌려준다) → 쉬운 단계는 한 번에 쭉 올라가고, 막히는 단계에서 하루 3번 도전.
// 신의 체력은 레벨이 오를수록 늘어난다 (100 × 1.5^((레벨−3000)/1000)) → 성장하면 다시 따라잡을 수 있다.

export const STAGE_WAVE_STEP = 40; // 레이드 한 단계 = 메인 스테이지 40개만큼 (예전 웨이브 8개)
const ANCHOR_WAVE: Record<RaidId, number> = { gigantomachy: 1750, typhoeus: 2550 } // 메인 스테이지 번호 (예전 웨이브 350·510); // 단계 0의 기준 웨이브
const BASE_ATTACK: Record<RaidId, number> = { gigantomachy: 3, typhoeus: 4 };
export const ATTACK_GROWTH = 1.45;
export const DEFENSE_BASE = 20;
export const DEFENSE_GROWTH = 1.5;
export const RAID_ATTACK_INTERVAL = 3_000;
export const BREATH_DAMAGE = 3; // 브레스는 공격력의 3배
export const REWARD_GROWTH = 1.4; // 단계가 오를수록 골드·경험치 보상도 1.4배씩

/** 단계의 기준 체력: 기준 웨이브의 "일반 몬스터" 체력 (보스 웨이브 6배는 빼고) */
function stageBaseHp(id: RaidId, stage: number): number {
  const wave = ANCHOR_WAVE[id] + stage * STAGE_WAVE_STEP;
  return monsterHp(wave % 10 === 0 ? wave + 1 : wave);
}

export function raidPhaseHp(id: RaidId, stage: number, phase: RaidPhase): number {
  return Math.ceil(stageBaseHp(id, stage) * phase.hpScale);
}

export function raidDefense(stage: number): number {
  return DEFENSE_BASE * (Math.pow(DEFENSE_GROWTH, stage) - 1);
}

/** 방어력이 피해를 얼마나 남기는지 (방어력 0 → 1, 100 → 0.5, 900 → 0.1) */
export function defenseMultiplier(defense: number): number {
  return 100 / (100 + defense);
}

export function raidAttack(id: RaidId, stage: number): number {
  return BASE_ATTACK[id] * Math.pow(ATTACK_GROWTH, stage);
}

/** 레이드에서 신의 체력: Lv.3000 = 100, Lv.5000 ≈ 225, Lv.10000 ≈ 1,700 */
export function godRaidHp(level: number): number {
  return Math.round(100 * Math.pow(1.5, Math.max(0, level - 3000) / 1000));
}

/** UI용: 단계 n의 적 능력치를 단계 0과 비교한 배율 */
export function stageMultipliers(id: RaidId, stage: number) {
  return {
    hp: stageBaseHp(id, stage) / stageBaseHp(id, 0),
    attack: raidAttack(id, stage),
    defense: raidDefense(stage),
  };
}

// ───────────── 일일 던전 「기간토마키아」 ─────────────
//
// 점수 = 넣은 피해 총합 ÷ 입장할 때 내 초당 피해(전투력)
//   = "평타만 쳤을 때 몇 초어치 피해를 넣었나". 스킬·표식 타이밍·터치를 잘할수록 오른다.
// → 피해량 숫자는 지수로 커지지만 점수는 성장과 상관없이 비슷한 범위라 다이아가 폭주하지 않는다.
//   골드는 최고 웨이브 기준이라 성장할수록 커진다.
// 거인 체력도 같은 기준 (전사 8초, 투석병 8초, 왕 30초어치, 바퀴마다 ×1.6)
export const DAILY_LAP_GROWTH = 1.6;
export const DAILY_GOLD_PER_POINT = 0.25; // 골드 = 최고 웨이브 몬스터 골드 × 점수 × 0.25 (스킬이 12개로 늘어 점수가 약 200~330 → 550~640점이 되어 0.5에서 낮춤)
export const DAILY_DIAMONDS_PER_POINT = 0.1; // 점수 10점당 💎1 (스킬 개편 전에는 5점당)
export const DAILY_DIAMOND_CAP = 100; // 하루 최대 💎100

export function dailyPhaseHp(refHp: number, lap: number, phase: RaidPhase): number {
  return Math.ceil(refHp * phase.hpScale * Math.pow(DAILY_LAP_GROWTH, lap));
}

export function dailyDiamonds(points: number): number {
  return Math.min(DAILY_DIAMOND_CAP, Math.floor(points * DAILY_DIAMONDS_PER_POINT));
}

/** 일일 던전 첫 참전으로 얻는 신별 스킬 */
export function gigantoRewardSkill(god: GodId | null): SkillId | null {
  if (god === 'zeus') return 'zeus_gigas';
  if (god === 'poseidon') return 'poseidon_nisyros';
  return null;
}

/** 입장권은 기기 날짜 기준으로 하루마다 초기화 */
export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
