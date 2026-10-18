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
  hpSeconds: number; // 체력 = 입장 시 전투력(초당 피해) × 이 값
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
}

export const RAIDS: Record<RaidId, RaidInfo> = {
  gigantomachy: {
    id: 'gigantomachy',
    name: '기간토마키아',
    emoji: '⚔️',
    subtitle: '가이아의 거인족 기간테스와의 전쟁',
    timeLimit: 90_000,
    ticketsPerDay: 3,
    goldReward: 150,
    xpReward: 60,
    weaponTable: [
      ['epic', 0.6],
      ['legend', 0.4],
    ],
    gimmicks: [
      '불사의 거인: 평소에는 피해가 절반만 들어간다',
      '헤라클레스가 6초마다 화살을 쏜다 → 3초간 「필멸의 표식」: 피해 1.5배',
      '첫 클리어: 제우스 「거인 사냥」 / 포세이돈 「니시로스 투척」',
    ],
  },
  typhoeus: {
    id: 'typhoeus',
    name: '티포에우스',
    emoji: '🐍',
    subtitle: '괴물 중의 괴물, 수백 개의 뱀 머리',
    timeLimit: 120_000,
    ticketsPerDay: 3,
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
    ],
  },
};

export const RAID_LIST: RaidInfo[] = Object.values(RAIDS);

export const GIGANTO_UNLOCK_LEVEL = 200;
export const TYPHON_UNLOCK_LEVEL = 500;

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
      { kind: 'giant_spear', name: '기간테스 전사', hpSeconds: 16, isBoss: false },
      { kind: 'giant_rock', name: '기간테스 투석병', hpSeconds: 16, isBoss: false },
      god === 'poseidon'
        ? { kind: 'polybotes', name: '바다의 거인 폴리보테스', hpSeconds: 95, isBoss: true }
        : { kind: 'porphyrion', name: '거인의 왕 포르피리온', hpSeconds: 95, isBoss: true },
    ];
  }
  return [{ kind: 'typhoeus', name: '티포에우스', hpSeconds: 160, isBoss: true }];
}

/** 기간토마키아 첫 클리어로 얻는 신별 스킬 */
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
