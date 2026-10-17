import {
  baseAttacksPerSecond,
  baseCritChance,
  BOSS_TIME_LIMIT,
  CRIT_MULTIPLIER,
  findUpgrade,
  FORM_INFO,
  formOf,
  GOD_LEVEL,
  GODS,
  isBossWave,
  KRAKEN_BOSS_TIME_BONUS,
  levelMultiplier,
  monsterGold,
  monsterHp,
  monsterKindFor,
  OFFLINE_CAP_MS,
  OFFLINE_EFFICIENCY,
  OFFLINE_XP_EFFICIENCY,
  SKILLS,
  ULTIMATE_LEVEL,
  upgradeCost,
  upgradeDamage,
  WAVE_BOSS_TIME_BONUS,
  xpForKill,
  xpToNext,
} from './balance';
import { ActionResult, Form, GameState, GodId, Hit, Monster, QueuedHit, SkillId, UpgradeId } from './types';
import { FUSE_COST, nextRarity, randomWeaponOf, rollWeaponDrop, WEAPON_LIST, WeaponId, weaponPower, WEAPONS } from './weapons';

export type Rng = () => number;

export const SAVE_VERSION = 1;

/*
 * 게임 규칙. UI가 없는 순수 함수들이라 Node에서 그대로 테스트할 수 있다.
 * 모든 함수는 state를 직접 고치지 않고 새 객체를 반환한다(불변성).
 *
 * 화면은 0.05초마다 tick()을 호출한다. 게임 루프의 기본 형태:
 *   while (true) { state = update(state, dt); render(state); }
 */

export function newGame(now: number): GameState {
  return {
    version: SAVE_VERSION,
    level: 1,
    xp: 0,
    god: null,
    wave: 1,
    maxWave: 1,
    gold: 0,
    levels: { damage: 0, speed: 0, crit: 0, gold: 0 },
    monster: spawnMonster(1),
    bossTimeLeft: null,
    farming: false,
    attackCooldown: 0,
    skillCooldowns: {},
    buff: null,
    queuedHits: [],
    weapons: {},
    weaponEnhance: {},
    equippedWeapon: null,
    totalKills: 0,
    savedAt: now,
  };
}

/**
 * 예전 버전의 저장 데이터에 새로 생긴 필드를 채워 넣는다(마이그레이션).
 * 필드를 추가할 때마다 여기에 기본값을 넣으면 기존 플레이어의 진행이 날아가지 않는다.
 */
export function migrate(saved: GameState): GameState {
  return {
    ...saved,
    queuedHits: saved.queuedHits ?? [],
    weapons: saved.weapons ?? {},
    weaponEnhance: saved.weaponEnhance ?? {},
    equippedWeapon: saved.equippedWeapon ?? null,
  };
}

// ───────────── 현재 전투 능력치 (레벨·단계·신·버프를 모두 반영) ─────────────

export function attackDamage(s: GameState): number {
  return Math.round(
    upgradeDamage(s.levels.damage) * levelMultiplier(s.level) * FORM_INFO[formOf(s.level)].multiplier * weaponMultiplier(s),
  );
}

/** 장착한 무기의 공격력 배율 (무기가 없으면 1) */
export function weaponMultiplier(s: GameState): number {
  const id = s.equippedWeapon;
  return id ? ownedPower(s, id) : 1;
}

export function ownedPower(s: GameState, id: WeaponId): number {
  return weaponPower(id, s.weaponEnhance[id] ?? 0, s.god);
}

/** 지금 쓸 수 있는 스킬 목록: 청소년 → 삼연참, 신 → 스킬 2개 (+ Lv.1000 궁극기) */
export function availableSkills(s: GameState): SkillId[] {
  if (s.god) {
    const god = GODS[s.god];
    return s.level >= ULTIMATE_LEVEL ? [...god.skills, god.ultimate] : god.skills;
  }
  return formOf(s.level) === 'teen' ? ['teen_slash'] : [];
}

export function attacksPerSecond(s: GameState, includeBuff = true): number {
  let aps = baseAttacksPerSecond(s.levels.speed);
  if (s.god === 'zeus') aps *= 1.3;
  if (includeBuff && s.buff?.skill === 'zeus_storm') aps *= 3;
  return aps;
}

export function critChance(s: GameState, includeBuff = true): number {
  if (includeBuff && s.buff?.skill === 'poseidon_trident') return 1;
  return Math.min(1, baseCritChance(s.levels.crit) + (s.god === 'poseidon' ? 0.15 : 0));
}

/** 치명타 피해 배율. 포세이돈은 4배 */
export function critMultiplier(s: GameState): number {
  return s.god === 'poseidon' ? 4 : CRIT_MULTIPLIER;
}

/** 평균 초당 피해량(DPS). 치명타 기대값 포함, 버프 제외 (오프라인 계산용) */
export function averageDps(s: GameState): number {
  const crit = critChance(s, false);
  return attackDamage(s) * (1 + crit * (critMultiplier(s) - 1)) * attacksPerSecond(s, false);
}

export function needsGodChoice(s: GameState): boolean {
  return s.level >= GOD_LEVEL && s.god === null;
}

export function formName(s: GameState): string {
  return s.god ? GODS[s.god].name : FORM_INFO[formOf(s.level)].name;
}

// ───────────── 행동 ─────────────

/** dt(ms)만큼 시간을 흘린다. 자동 공격, 쿨타임, 버프, 보스 타이머가 여기서 처리된다. */
export function tick(state: GameState, dt: number, rng: Rng = Math.random): ActionResult {
  let s: GameState = { ...state, skillCooldowns: decreaseCooldowns(state.skillCooldowns, dt) };
  if (s.buff) s.buff = s.buff.timeLeft > dt ? { ...s.buff, timeLeft: s.buff.timeLeft - dt } : null;

  const result = emptyResult(s);

  // 1) 연타 스킬의 예약된 타격: 시간이 된 것부터 차례로 들어간다
  if (s.queuedHits.length > 0) {
    const queue = s.queuedHits.map((q) => ({ ...q, dueIn: q.dueIn - dt }));
    s.queuedHits = queue.filter((q) => q.dueIn > 0);
    for (const q of queue.filter((q) => q.dueIn <= 0)) s = hitMonster(s, skillHit(s, q, rng), result, rng);
  }

  // 2) 자동 공격: 쿨타임이 0 이하가 될 때마다 한 번씩 공격
  s.attackCooldown -= dt;
  while (s.attackCooldown <= 0) {
    s.attackCooldown += 1000 / attacksPerSecond(s);
    s = hitMonster(s, normalHit(s, 'auto', rng), result, rng);
  }

  // 3) 보스 제한 시간
  if (s.bossTimeLeft !== null && !result.killed) {
    s.bossTimeLeft -= dt;
    if (s.bossTimeLeft <= 0) {
      s = { ...enterWave(s, s.wave - 1), farming: true }; // 한 웨이브 뒤로 가서 골드를 모은다
      result.bossFailed = true;
    }
  }

  result.state = s;
  return result;
}

/** 화면을 터치했을 때의 추가 공격 */
export function tap(state: GameState, rng: Rng = Math.random): ActionResult {
  const result = emptyResult(state);
  result.state = hitMonster(state, normalHit(state, 'tap', rng), result, rng);
  return result;
}

export function canCast(s: GameState, id: SkillId): boolean {
  return availableSkills(s).includes(id) && !s.skillCooldowns[id];
}

export function castSkill(state: GameState, id: SkillId, rng: Rng = Math.random): ActionResult {
  const result = emptyResult(state);
  if (!canCast(state, id)) return result;

  const skill = SKILLS[id];
  let s: GameState = { ...state, skillCooldowns: { ...state.skillCooldowns, [id]: skill.cooldown } };
  result.casts.push(id);

  if (skill.buffDuration) s.buff = { skill: id, timeLeft: skill.buffDuration };
  if (s.bossTimeLeft !== null) {
    if (id === 'poseidon_wave') s.bossTimeLeft += WAVE_BOSS_TIME_BONUS;
    if (id === 'poseidon_kraken') s.bossTimeLeft += KRAKEN_BOSS_TIME_BONUS;
  }
  if (skill.damageMultiplier) {
    // 첫 타는 바로, 나머지는 hitInterval 간격으로 예약 → tick()에서 차례로 들어간다
    const total = skill.hits ?? 1;
    const hits: QueuedHit[] = Array.from({ length: total }, (_, index) => ({
      skill: id,
      dueIn: index * (skill.hitInterval ?? 0),
      multiplier: skill.damageMultiplier!,
      index,
      total,
    }));
    s = hitMonster(s, skillHit(s, hits[0], rng), result, rng);
    s.queuedHits = [...s.queuedHits, ...hits.slice(1)];
  }

  result.state = s;
  return result;
}

export function chooseGod(state: GameState, god: GodId): GameState {
  if (!needsGodChoice(state)) return state;
  return { ...state, god };
}

// ───────────── 개발용 치트 (DevPanel에서만 사용) ─────────────

/** 레벨을 바로 바꾼다. 성장 단계가 바뀌면 evolvedTo로 알려서 진화 팝업이 뜨게 한다. */
export function devSetLevel(state: GameState, level: number): ActionResult {
  const result = emptyResult(state);
  const before = formOf(state.level);
  const after = formOf(level);
  if (after !== before) result.evolvedTo = after;
  result.state = { ...state, level, xp: 0, god: level < GOD_LEVEL ? null : state.god };
  return result;
}

export function devGiveWeapon(state: GameState, id: WeaponId): ActionResult {
  const result = emptyResult(state);
  result.drops.push(id);
  result.state = addWeapon(state, id);
  return result;
}

// ───────────── 무기 ─────────────

export function equipWeapon(state: GameState, id: WeaponId): GameState {
  if (!state.weapons[id]) return state;
  return { ...state, equippedWeapon: id };
}

export function canFuse(s: GameState, id: WeaponId): boolean {
  return nextRarity(WEAPONS[id].rarity) !== null && (s.weapons[id] ?? 0) >= FUSE_COST;
}

/** 등급업: 같은 무기 3개 → 다음 등급 무기 1개 (무작위). 결과로 나온 무기를 함께 돌려준다. */
export function fuseWeapon(state: GameState, id: WeaponId, rng: Rng = Math.random): { state: GameState; result: WeaponId | null } {
  if (!canFuse(state, id)) return { state, result: null };
  const result = randomWeaponOf(nextRarity(WEAPONS[id].rarity)!, rng);
  let s: GameState = { ...state, weapons: { ...state.weapons, [id]: state.weapons[id]! - FUSE_COST } };
  s = addWeapon(s, result);
  return { state: equipBestIfMissing(s), result };
}

/**
 * 초월 무기 강화: 다른 초월 무기 1개를 재료로 쓴다. 이것 말고는 초월 무기를 강화할 방법이 없다.
 * 같은 종류를 재료로 쓰려면 2개 이상 있어야 한다 (강화할 무기 자신은 남아야 하므로).
 */
export function canEnhance(s: GameState, target: WeaponId, material: WeaponId): boolean {
  if (WEAPONS[target].rarity !== 'transcendent' || WEAPONS[material].rarity !== 'transcendent') return false;
  if (!s.weapons[target]) return false;
  return (s.weapons[material] ?? 0) >= (material === target ? 2 : 1);
}

export function enhanceWeapon(state: GameState, target: WeaponId, material: WeaponId): GameState {
  if (!canEnhance(state, target, material)) return state;
  const s: GameState = {
    ...state,
    weapons: { ...state.weapons, [material]: state.weapons[material]! - 1 },
    weaponEnhance: { ...state.weaponEnhance, [target]: (state.weaponEnhance[target] ?? 0) + 1 },
  };
  return equipBestIfMissing(s);
}

/** 가진 무기 중 가장 센 무기 */
export function bestWeapon(s: GameState): WeaponId | null {
  let best: WeaponId | null = null;
  for (const w of WEAPON_LIST) {
    if ((s.weapons[w.id] ?? 0) > 0 && (!best || ownedPower(s, w.id) > ownedPower(s, best))) best = w.id;
  }
  return best;
}

/** 장착 중인 무기를 재료로 다 써 버렸으면 가장 센 무기로 바꿔 낀다 */
function equipBestIfMissing(s: GameState): GameState {
  if (s.equippedWeapon && (s.weapons[s.equippedWeapon] ?? 0) > 0) return s;
  return { ...s, equippedWeapon: bestWeapon(s) };
}

/** 무기를 얻는다. 지금 무기보다 세면 자동으로 장착한다. */
function addWeapon(state: GameState, id: WeaponId): GameState {
  const s = { ...state, weapons: { ...state.weapons, [id]: (state.weapons[id] ?? 0) + 1 } };
  const current = s.equippedWeapon ? ownedPower(s, s.equippedWeapon) : 1;
  return ownedPower(s, id) > current ? { ...s, equippedWeapon: id } : s;
}

export function devAddGold(state: GameState, amount: number): GameState {
  return { ...state, gold: state.gold + amount };
}

export function canBuy(state: GameState, id: UpgradeId): boolean {
  const level = state.levels[id];
  return level < findUpgrade(id).maxLevel && state.gold >= upgradeCost(id, level);
}

export function buyUpgrade(state: GameState, id: UpgradeId): GameState {
  return buyUpgradeBulk(state, id, 1);
}

/**
 * 최대 maxCount단계까지 살 때 실제로 몇 단계를, 얼마에 살 수 있는지 계산한다.
 * 레벨마다 가격이 다르므로(1.x^레벨) 한 단계씩 더해 보면서 돈이 모자라면 멈춘다.
 */
export function bulkPlan(state: GameState, id: UpgradeId, maxCount: number): { count: number; cost: number } {
  const maxLevel = findUpgrade(id).maxLevel;
  let level = state.levels[id];
  let count = 0;
  let cost = 0;
  while (count < maxCount && level < maxLevel) {
    const next = upgradeCost(id, level);
    if (cost + next > state.gold) break;
    cost += next;
    level++;
    count++;
  }
  return { count, cost };
}

/** 한 번에 여러 단계 강화. 돈이 모자라면 살 수 있는 만큼만 산다. */
export function buyUpgradeBulk(state: GameState, id: UpgradeId, maxCount: number): GameState {
  const { count, cost } = bulkPlan(state, id, maxCount);
  if (count === 0) return state;
  return { ...state, gold: state.gold - cost, levels: { ...state.levels, [id]: state.levels[id] + count } };
}

/** 보스에게 졌을 때 누르는 "보스 재도전" 버튼 */
export function challengeBoss(state: GameState): GameState {
  if (!state.farming) return state;
  return enterWave({ ...state, farming: false }, state.wave + 1);
}

// ───────────── 오프라인 보상 ─────────────

export interface OfflineReward {
  minutes: number;
  gold: number;
  xp: number;
}

/**
 * 앱을 껐다 켰을 때 그동안 번 골드와 경험치.
 * 실제 전투를 돌리지 않고 "몬스터 하나 잡는 데 걸리는 시간"으로 추정한다.
 */
export function offlineReward(s: GameState, now: number): OfflineReward | null {
  const elapsed = Math.min(Math.max(0, now - s.savedAt), OFFLINE_CAP_MS);
  if (elapsed < 60_000) return null; // 1분 미만은 보상 없음
  const farmWave = isBossWave(s.wave) ? s.wave - 1 : s.wave;
  const secondsPerKill = Math.max(monsterHp(farmWave) / averageDps(s), 1 / attacksPerSecond(s, false));
  const kills = elapsed / 1000 / secondsPerKill;
  return {
    minutes: Math.floor(elapsed / 60_000),
    gold: Math.floor(kills * OFFLINE_EFFICIENCY * monsterGold(farmWave, s.levels.gold)),
    xp: Math.floor(kills * OFFLINE_XP_EFFICIENCY * xpForKill(farmWave)),
  };
}

export function applyOfflineReward(state: GameState, reward: OfflineReward): ActionResult {
  const result = emptyResult(state);
  result.state = gainXp({ ...state, gold: state.gold + reward.gold }, reward.xp, result);
  return result;
}

// ───────────── 내부 함수 ─────────────

function emptyResult(state: GameState): ActionResult {
  return { state, hits: [], casts: [], drops: [], killed: false, bossFailed: false, levelUps: 0, evolvedTo: null };
}

export function spawnMonster(wave: number): Monster {
  const { kind, name } = monsterKindFor(wave);
  const hp = monsterHp(wave);
  const isBoss = isBossWave(wave);
  return { kind, name: isBoss ? `보스 ${name}` : name, hp, maxHp: hp, isBoss };
}

function normalHit(s: GameState, source: Hit['source'], rng: Rng): Hit {
  const crit = rng() < critChance(s);
  return { damage: attackDamage(s) * (crit ? critMultiplier(s) : 1), crit, source };
}

function skillHit(s: GameState, q: QueuedHit, rng: Rng): Hit {
  const hit = normalHit(s, q.skill, rng);
  return { ...hit, damage: hit.damage * q.multiplier, combo: { index: q.index, total: q.total } };
}

/** 몬스터에게 피해를 주고, 쓰러뜨리면 보상을 받고 다음 몬스터로 넘어간다. result에 기록을 남긴다. */
function hitMonster(state: GameState, hit: Hit, result: ActionResult, rng: Rng): GameState {
  result.hits.push(hit);
  const hp = state.monster.hp - hit.damage;
  if (hp > 0) return { ...state, monster: { ...state.monster, hp } };

  result.killed = true;
  let s: GameState = {
    ...state,
    gold: state.gold + monsterGold(state.wave, state.levels.gold),
    totalKills: state.totalKills + 1,
  };
  s = gainXp(s, xpForKill(state.wave), result);

  const drop = rollWeaponDrop(state.wave, state.monster.isBoss, rng);
  if (drop) {
    s = addWeapon(s, drop);
    result.drops.push(drop);
  }
  return enterWave(s, s.farming ? s.wave : s.wave + 1);
}

function gainXp(state: GameState, amount: number, result: ActionResult): GameState {
  const before: Form = formOf(state.level);
  let { level, xp } = state;
  xp += amount;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level++;
    result.levelUps++;
  }
  const after = formOf(level);
  if (after !== before) result.evolvedTo = after;
  return { ...state, level, xp };
}

function enterWave(state: GameState, wave: number): GameState {
  return {
    ...state,
    wave,
    maxWave: Math.max(state.maxWave, wave),
    monster: spawnMonster(wave),
    bossTimeLeft: isBossWave(wave) ? BOSS_TIME_LIMIT : null,
  };
}

function decreaseCooldowns(cds: GameState['skillCooldowns'], dt: number): GameState['skillCooldowns'] {
  const next: GameState['skillCooldowns'] = {};
  for (const [id, ms] of Object.entries(cds) as [SkillId, number][]) {
    if (ms > dt) next[id] = ms - dt;
  }
  return next;
}
