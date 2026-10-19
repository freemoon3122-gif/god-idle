import { WeaponId } from './weapons';

/** 골드로 올리는 강화 항목 */
export type UpgradeId = 'damage' | 'speed' | 'crit' | 'gold';

/** Lv.3000에 고르는 신 */
export type GodId = 'zeus' | 'poseidon';

export type SkillId =
  | 'teen_slash' // 청소년 신 (Lv.1000~)
  | 'adult_whirl' // 성인 신 (Lv.2000~)
  | 'zeus_bolt'
  | 'zeus_storm'
  | 'zeus_chain' // Lv.4000
  | 'zeus_eagle' // Lv.6000
  | 'zeus_king' // Lv.8000
  | 'zeus_judgment' // 제우스 궁극기 (Lv.10000)
  | 'poseidon_wave'
  | 'poseidon_trident'
  | 'poseidon_maelstrom' // Lv.4000
  | 'poseidon_quake' // Lv.6000
  | 'poseidon_blessing' // Lv.8000
  | 'poseidon_kraken' // 포세이돈 궁극기 (Lv.10000)
  | 'zeus_gigas' // 레이드 「기간토마키아」 첫 클리어 보상 (제우스)
  | 'poseidon_nisyros'; // 레이드 「기간토마키아」 첫 클리어 보상 (포세이돈)

export type RaidId = 'gigantomachy' | 'typhoeus';

/** 레이드 중 일어나는 일. 화면에서 컷신·연출을 띄우는 데 쓴다. */
export type RaidEvent = 'intro' | 'boss' | 'tendon' | 'hermes' | 'enrage' | 'breath' | 'strike' | 'down' | 'clear' | 'fail';

/** 성장 단계: 아기(1~999) → 청소년(1000~1999) → 성인(2000~2999) → 신(3000~) */
export type Form = 'baby' | 'teen' | 'adult' | 'god';

export interface Monster {
  kind: string; // 스프라이트 이름
  name: string;
  hp: number;
  maxHp: number;
  isBoss: boolean;
}

/** 필드 위의 몬스터: 위치가 있고, 신에게 다가와 공격한다 (좌표는 field.ts 참고) */
export interface FieldMonster extends Monster {
  id: number;
  x: number;
  y: number;
  attack: number; // 한 번 공격할 때의 피해 (체력에 비례 → 난이도에 따라 제곱)
  attackCd: number;
  gold: number; // 쓰러뜨리면 주는 골드·경험치
  xp: number;
}

/** 신의 위치와 체력. 체력은 최대 체력 대비 비율(0~1) */
export interface Hero {
  x: number;
  y: number;
  hp: number;
  moving: boolean; // 움직이는 중이면 자동 공격을 하지 않는다
}

/** 이동 입력 (조이스틱 방향, 길이 0~1) */
export interface MoveInput {
  x: number;
  y: number;
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
  // 일일 던전(기간토마키아): 거인이 끝없이 나온다
  lap: number; // 몇 바퀴째인지 (한 바퀴 = 전사 → 투석병 → 왕). 바퀴마다 체력이 커진다
  kills: number;
  refHp: number; // 일일 던전 점수 기준: 입장할 때의 내 초당 피해
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
  diamonds: number;
  coins: number;
  firstClear: boolean;
  daily: { damage: number; points: number; kills: number } | null; // 일일 던전 결과 (레이드면 null)
}

/**
 * 저장되는 게임 상태. JSON으로 바꿔서 기기에 저장하므로 함수는 넣지 않는다.
 * (Java의 Serializable DTO와 비슷하다.)
 */
export interface GameState {
  version: number;
  level: number;
  xp: number; // 현재 레벨에서 모은 경험치
  god: GodId | null; // Lv.3000에 고르기 전에는 null
  wave: number; // 지금 스테이지 (몬스터 무리 하나 = 한 스테이지). 10의 배수가 보스
  maxWave: number; // 지금 난이도에서 도달한 최고 스테이지
  difficulty: number; // 0 쉬움, 1 보통, 2 어려움, 3 극악
  unlockedDifficulty: number; // 들어갈 수 있는 가장 높은 난이도
  bestStages: number[]; // 난이도별 최고 스테이지 (난이도를 바꿀 때 이어서 하려고)
  storySeen: number[]; // 난이도별로 본 마지막 장(1~10). 새 장에 들어가면 스토리를 보여 준다
  hero: Hero;
  gold: number;
  levels: Record<UpgradeId, number>; // 강화 레벨
  monsters: FieldMonster[]; // 지금 필드의 몬스터들
  nextMonsterId: number;
  bossTimeLeft: number | null; // 보스전 남은 시간(ms). 보스가 아니면 null
  bossBonusLeft: number; // 이번 보스전(또는 레이드)에서 스킬로 더 늘릴 수 있는 시간(ms). 무한히 늘려 버티는 것을 막는다
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
  diamonds: number; // 💎 캐시 재화
  coins: number; // 🪙 강화코인 (스킬 강화 재료)
  skillLevels: Partial<Record<SkillId, number>>; // 스킬 강화 레벨 (없으면 0)
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
  /** 맞은 몬스터 (화면에서 그 몬스터 위치에 연출을 그린다). 레이드는 없음 */
  targetId?: number;
  /** 광역 스킬의 두 번째 이후 대상: 큰 연출은 생략하고 숫자만 */
  secondary?: boolean;
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
  diamonds: number; // 이번에 얻은 다이아 (알림용)
  killedIds: number[]; // 이번에 쓰러진 몬스터
  heroDamage: number; // 이번에 신이 받은 피해 (최대 체력 대비)
  heroDown: boolean; // 신이 쓰러졌는지
  difficultyUnlocked: number | null; // 새 난이도가 열렸으면 그 번호
}
