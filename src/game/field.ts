import { DIFFICULTIES, isBossWave, monsterGold, monsterHp, monsterKindFor, WAVES_PER_STAGE, xpForKill } from './balance';
import { FieldMonster, Hero } from './types';

/**
 * 필드 전투: 신이 움직이고, 몬스터 여러 마리가 다가와 공격한다.
 *
 * 좌표계 (화면과 무관한 "필드 단위")
 *   x: 0(왼쪽) ~ 240(오른쪽)  ← 화면에는 100단위만 보인다. 맵이 화면보다 넓어서 카메라가 신을 따라간다
 *   y: 0(앞, 화면 아래) ~ 1(뒤, 화면 위)  ← 깊이. 1 = DEPTH_SCALE(160)단위
 * 화면 픽셀로 바꾸는 건 BattleView가 한다. (엔진은 화면 크기를 모른다 → 시뮬레이터에서도 그대로 돈다)
 */

export const FIELD_W = 240;
export const VIEW_W = 100; // 화면 한 폭에 보이는 필드 단위
export const HERO_SPEED = 45; // 초당 필드 단위
export const HERO_START = { x: FIELD_W / 2, y: 0.5 };
export const MONSTER_SPEED = 14;
export const BOSS_SPEED = 10;
/** 몬스터는 신에게서 이만큼 떨어진 곳(화면 가장자리 바깥쯤)에서 나타난다 */
const SPAWN_DIST = 62;
/**
 * 접촉 거리: 이 안에 들어오면 몬스터가 공격한다.
 * y(깊이)는 0~1이라 x와 단위를 맞추려고 DEPTH_SCALE을 곱해서 잰다. 맵 세로 길이 = 160단위 (화면 폭의 1.6배)
 */
export const CONTACT_RANGE = 9;
export const DEPTH_SCALE = 160;
export const MONSTER_ATTACK_INTERVAL = 1_000;
/**
 * 몬스터 공격력 = 자기 최대 체력 × 이 값 → 체력이 제곱되는 높은 난이도에서는 공격력도 제곱된다.
 * 신의 최대 체력 = 내 초당 피해 × HERO_HP_PER_DPS. 그래서 "한 마리 잡는 데 오래 걸리는 몬스터일수록 아프다".
 *   예) 혼자 5초에 잡는 몬스터 한 방 = 최대 체력의 약 0.6%, 15초짜리면 약 1.9%
 */
export const MONSTER_ATTACK_RATIO = 0.05;
export const BOSS_ATTACK_RATIO = 0.025;
export const HERO_HP_PER_DPS = 40;
/** 붙은 몬스터가 없으면 체력이 초당 이만큼 회복된다 → 떨어져서 회복하고 다시 싸우는 전략 */
export const HERO_REGEN = 0.06;

/** 무리의 몬스터 한 마리 체력·골드 = 예전 "몬스터 1마리"의 이 비율 */
const MOB_SHARE = 0.45;
/**
 * 경험치는 더 짜게: 한 스테이지는 예전 웨이브 0.2개만큼만 강해지는데 몬스터는 4~5마리라서,
 * 체력·골드와 같은 비율로 주면 레벨이 예전보다 9배 빨리 오른다.
 */
const MOB_XP_SHARE = 0.06;
const BOSS_XP_SHARE = 0.3;

export function newHero(): Hero {
  return { x: HERO_START.x, y: HERO_START.y, hp: 1, moving: false };
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, (ay - by) * DEPTH_SCALE);
}

/**
 * 신(around) 주변 SPAWN_DIST 거리, 방향 angle(라디안)의 맵 위 위치. 맵 끝에 걸리면 반대 방향으로.
 */
function aroundPoint(around: { x: number; y: number }, angle: number, dist: number) {
  for (const a of [angle, angle + Math.PI]) {
    const x = around.x + Math.cos(a) * dist;
    const y = around.y + (Math.sin(a) * dist) / DEPTH_SCALE;
    if (x >= EDGE && x <= FIELD_W - EDGE && y >= 0 && y <= 1) return { x, y };
  }
  return clampHero(around.x + Math.cos(angle) * dist, around.y + (Math.sin(angle) * dist) / DEPTH_SCALE);
}

/**
 * 스테이지의 몬스터 무리. 일반은 3~5마리, 보스 스테이지는 보스 + 졸개 2마리. 골드는 공물 강화 반영 전 값.
 * 신을 둘러싸듯 여러 방향에서 나타난다 (한쪽 방향으로 뭉쳐서 오도록 시작 방향만 무작위)
 */
export function spawnWave(stage: number, difficulty: number, firstId: number, rng: () => number, around = HERO_START): FieldMonster[] {
  const { kind, name } = monsterKindFor(stage);
  const list: FieldMonster[] = [];
  const add = (m: Omit<FieldMonster, 'id' | 'attackCd' | 'attack'>, ratio: number) =>
    list.push({ ...m, id: firstId + list.length, attack: m.maxHp * ratio, attackCd: MONSTER_ATTACK_INTERVAL * (0.5 + rng() * 0.5) });
  const base = rng() * Math.PI * 2;
  const mob = (st: number, i: number, n: number) => {
    const { x, y } = aroundPoint(around, base + ((i - (n - 1) / 2) * Math.PI) / 3.5, SPAWN_DIST + rng() * 12);
    const hp = Math.ceil(monsterHp(st, difficulty) * MOB_SHARE);
    add(
      { kind, name, hp, maxHp: hp, isBoss: false, x, y, gold: monsterGold(st, 0, difficulty) * MOB_SHARE, xp: xpForKill(st) * MOB_XP_SHARE },
      MONSTER_ATTACK_RATIO,
    );
  };

  if (isBossWave(stage)) {
    const hp = monsterHp(stage, difficulty);
    const p = aroundPoint(around, base, SPAWN_DIST + 8);
    add({ kind, name: `보스 ${name}`, hp, maxHp: hp, isBoss: true, ...p, gold: monsterGold(stage, 0, difficulty), xp: xpForKill(stage) * BOSS_XP_SHARE }, BOSS_ATTACK_RATIO);
    mob(stage - 1, 0, 3);
    mob(stage - 1, 2, 3);
    return list;
  }
  const count = 3 + (stage % 3);
  for (let i = 0; i < count; i++) mob(stage, i, count);
  return list;
}

export function difficultyName(d: number): string {
  return DIFFICULTIES[d].name;
}

/** 신에게 가장 가까운 몬스터 (자동 공격·단일 대상 스킬의 대상) */
export function nearestMonster(hero: Hero, monsters: FieldMonster[]): FieldMonster | null {
  let best: FieldMonster | null = null;
  let bestD = Infinity;
  for (const m of monsters) {
    const d = distance(hero.x, hero.y, m.x, m.y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

/** 스테이지 번호: 웨이브 1~10 = 1스테이지 */
export function stageOf(wave: number): number {
  return Math.floor((wave - 1) / WAVES_PER_STAGE) + 1;
}

/** 맵 가장자리 여유: 카메라는 맵 끝에서 멈추므로, 신이 끝까지 가면 그림이 화면 밖으로 잘린다 */
const EDGE = 14;

export function clampHero(x: number, y: number): { x: number; y: number } {
  return { x: Math.min(FIELD_W - EDGE, Math.max(EDGE, x)), y: Math.min(1, Math.max(0, y)) };
}
