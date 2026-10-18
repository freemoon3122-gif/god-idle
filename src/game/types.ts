import { WeaponId } from './weapons';

/** 골드로 올리는 강화 항목 */
export type UpgradeId = 'damage' | 'speed' | 'crit' | 'gold';

/** Lv.200에 고르는 신 */
export type GodId = 'zeus' | 'poseidon';

export type SkillId =
  | 'teen_slash' // 청소년 신 (Lv.100~199)
  | 'zeus_bolt'
  | 'zeus_storm'
  | 'zeus_judgment' // 제우스 궁극기 (Lv.1000)
  | 'poseidon_wave'
  | 'poseidon_trident'
  | 'poseidon_kraken' // 포세이돈 궁극기 (Lv.1000)
  | 'zeus_gigas' // 레이드 「기간토마키아」 첫 클리어 보상 (제우스)
  | 'poseidon_nisyros'; // 레이드 「기간토마키아」 첫 클리어 보상 (포세이돈)

export type RaidId = 'gigantomachy' | 'typhoeus';

/** 레이드 중 일어나는 일. 화면에서 컷신·연출을 띄우는 데 쓴다. */
export type RaidEvent = 'intro' | 'boss' | 'tendon' | 'hermes' | 'enrage' | 'breath' | 'strike' | 'down' | 'clear' | 'fail';

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

/** 연타 스킬의 아직 안 들어간 타격. 시간이 되면 tick()에서 피해를 준다. */
export interface QueuedHit {
  skill: SkillId;
  dueIn: number; // 몇 ms 뒤에 들어가는지
  multiplier: number; // 일반 공격의 몇 배
  index: number; // 몇 번째 타격인지 (0부터)
  total: number; // 전체 타격 수
}

/** 진행 중인 레이드 */
export interface RaidState {
  id: RaidId;
  phase: number; // 몇 번째 적인지 (0부터)
  monster: Monster;
  timeLeft: number; // 제한 시간 (ms)
  stage: number; // 레이드 단계 (= 지금까지 클리어한 횟수). 높을수록 적의 체력·공격력·방어력이 기하급수로 오른다
  defense: number; // 적의 방어력. 받는 피해 × 100 / (100 + 방어력)
  attack: number; // 적의 공격력. 3초마다 신의 체력을 이만큼 깎는다
  attackCooldown: number;
  godHp: number; // 레이드 안에서만 쓰는 신의 체력. 0이 되면 쓰러져서 실패
  godMaxHp: number;
  totalHp: number; // 모든 적의 체력 합 (실패 시 보상 비율 계산용)
  totalDamage: number;
  // 기간토마키아: 헤라클레스의 화살 → 필멸의 표식
  heraclesCooldown: number;
  markLeft: number;
  // 티포에우스: 힘줄 절단 → 헤르메스와 판이 되찾아 옴 → 되찾은 힘
  tendonLeft: number;
  tendonDone: boolean;
  restoredLeft: number;
  breathCooldown: number;
  stunLeft: number; // 브레스에 맞아 기절한 시간 (자동 공격 불가)
  enraged: boolean;
}

export interface RaidResult {
  id: RaidId;
  cleared: boolean;
  damagePct: number; // 넣은 피해 비율 (0~1)
  stage: number; // 도전한 단계
  knockedOut: boolean; // 신이 쓰러져서 실패했는지
  gold: number;
  xp: number;
  weapon: WeaponId | null;
  unlockedSkill: SkillId | null; // 첫 클리어 보상 스킬
  firstClear: boolean;
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
  queuedHits: QueuedHit[];
  weapons: Partial<Record<WeaponId, number>>; // 가진 무기와 개수
  weaponEnhance: Partial<Record<WeaponId, number>>; // 초월 무기 강화 단계
  equippedWeapon: WeaponId | null;
  raid: RaidState | null; // 레이드 중이면 여기 있고, 메인 전투는 멈춘다
  raidTickets: { day: string; used: Partial<Record<RaidId, number>> }; // 하루 입장 횟수
  raidClears: Partial<Record<RaidId, number>>;
  raidResult: RaidResult | null; // 화면에 보여줄 레이드 결과
  unlockedSkills: SkillId[]; // 레이드 보상으로 얻은 스킬
  totalKills: number;
  savedAt: number; // 마지막 저장 시각 (Date.now()). 오프라인 보상 계산용
}

/** 한 번의 공격 결과. 화면에 데미지 숫자를 띄우는 데 쓴다. 저장하지 않는다. */
export interface Hit {
  damage: number;
  crit: boolean;
  source: 'auto' | 'tap' | 'heracles' | SkillId;
  /** 연타 스킬이면 몇 번째 타격인지 (화면 연출용) */
  combo?: { index: number; total: number };
}

/** tick(), tap(), castSkill()이 돌려주는 결과: 새 상태 + 이번에 일어난 일들 */
export interface ActionResult {
  state: GameState;
  hits: Hit[];
  casts: SkillId[]; // 이번에 시전된 스킬 (화면 연출용)
  drops: WeaponId[]; // 이번에 얻은 무기
  raidEvents: RaidEvent[];
  killed: boolean;
  bossFailed: boolean;
  levelUps: number;
  evolvedTo: Form | null; // 이번에 성장 단계가 바뀌었으면 새 단계
}
