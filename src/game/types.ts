/** 골드로 올리는 강화 항목 */
export type UpgradeId = 'damage' | 'speed' | 'crit' | 'gold';

/** Lv.200에 고르는 신 */
export type GodId = 'zeus' | 'poseidon';

export type SkillId = 'zeus_bolt' | 'zeus_storm' | 'poseidon_wave' | 'poseidon_trident';

/** 성장 단계: 아기(1~99) → 청소년(100~199) → 신(200~) */
export type Form = 'baby' | 'teen' | 'god';

export interface Monster {
  kind: string; // 스프라이트 이름
  name: string;
  hp: number;
  maxHp: number;
  isBoss: boolean;
}

/** 지속 효과가 있는 스킬이 켜져 있는 동안의 상태 */
export interface Buff {
  skill: SkillId;
  timeLeft: number; // ms
}

/**
 * 저장되는 게임 상태. JSON으로 바꿔서 기기에 저장하므로 함수는 넣지 않는다.
 * (Java의 Serializable DTO와 비슷하다.)
 */
export interface GameState {
  version: number;
  level: number;
  xp: number; // 현재 레벨에서 모은 경험치
  god: GodId | null; // Lv.200에 고르기 전에는 null
  wave: number; // 지금 싸우는 몬스터 번호. 10의 배수가 보스
  maxWave: number;
  gold: number;
  levels: Record<UpgradeId, number>; // 강화 레벨
  monster: Monster;
  bossTimeLeft: number | null; // 보스전 남은 시간(ms). 보스가 아니면 null
  farming: boolean; // 보스에게 졌으면 true: 같은 웨이브에서 골드를 모은다
  attackCooldown: number; // 다음 자동 공격까지 남은 시간(ms)
  skillCooldowns: Partial<Record<SkillId, number>>; // 남은 재사용 대기시간(ms)
  buff: Buff | null;
  totalKills: number;
  savedAt: number; // 마지막 저장 시각 (Date.now()). 오프라인 보상 계산용
}

/** 한 번의 공격 결과. 화면에 데미지 숫자를 띄우는 데 쓴다. 저장하지 않는다. */
export interface Hit {
  damage: number;
  crit: boolean;
  source: 'auto' | 'tap' | SkillId;
}

/** tick(), tap(), castSkill()이 돌려주는 결과: 새 상태 + 이번에 일어난 일들 */
export interface ActionResult {
  state: GameState;
  hits: Hit[];
  killed: boolean;
  bossFailed: boolean;
  levelUps: number;
  evolvedTo: Form | null; // 이번에 성장 단계가 바뀌었으면 새 단계
}
