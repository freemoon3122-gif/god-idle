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
  levelMultiplier,
  monsterGold,
  monsterHp,
  monsterKindFor,
  OFFLINE_CAP_MS,
  OFFLINE_EFFICIENCY,
  OFFLINE_XP_EFFICIENCY,
  SKILLS,
  upgradeCost,
  upgradeDamage,
  WAVE_BOSS_TIME_BONUS,
  xpForKill,
  xpToNext,
} from './balance';
import { ActionResult, Form, GameState, GodId, Hit, Monster, SkillId, UpgradeId } from './types';

export type Rng = () => number;

export const SAVE_VERSION = 1;

/*
 * 게임 규칙. UI가 없는 순수 함수들이라 Node에서 그대로 테스트할 수 있다.
 * 모든 함수는 state를 직접 고치지 않고 새 객체를 반환한다(불변성).
 *
 * 화면은 0.1초마다 tick()을 호출한다. 게임 루프의 기본 형태:
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
    totalKills: 0,
    savedAt: now,
  };
}

// ───────────── 현재 전투 능력치 (레벨·단계·신·버프를 모두 반영) ─────────────

export function attackDamage(s: GameState): number {
  return Math.round(upgradeDamage(s.levels.damage) * levelMultiplier(s.level) * FORM_INFO[formOf(s.level)].multiplier);
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

/** 평균 초당 피해량(DPS). 치명타 기대값 포함, 버프 제외 (오프라인 계산용) */
export function averageDps(s: GameState): number {
  const crit = critChance(s, false);
  return attackDamage(s) * (1 + crit * (CRIT_MULTIPLIER - 1)) * attacksPerSecond(s, false);
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

  // 1) 자동 공격: 쿨타임이 0 이하가 될 때마다 한 번씩 공격
  s.attackCooldown -= dt;
  while (s.attackCooldown <= 0) {
    s.attackCooldown += 1000 / attacksPerSecond(s);
    s = hitMonster(s, normalHit(s, 'auto', rng), result);
  }

  // 2) 보스 제한 시간
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
  result.state = hitMonster(state, normalHit(state, 'tap', rng), result);
  return result;
}

export function canCast(s: GameState, id: SkillId): boolean {
  return !!s.god && GODS[s.god].skills.includes(id) && !s.skillCooldowns[id];
}

export function castSkill(state: GameState, id: SkillId, rng: Rng = Math.random): ActionResult {
  const result = emptyResult(state);
  if (!canCast(state, id)) return result;

  const skill = SKILLS[id];
  let s: GameState = { ...state, skillCooldowns: { ...state.skillCooldowns, [id]: skill.cooldown } };

  if (skill.buffDuration) s.buff = { skill: id, timeLeft: skill.buffDuration };
  if (id === 'poseidon_wave' && s.bossTimeLeft !== null) s.bossTimeLeft += WAVE_BOSS_TIME_BONUS;
  if (skill.damageMultiplier) {
    const hit = normalHit(s, id, rng);
    s = hitMonster(s, { ...hit, damage: hit.damage * skill.damageMultiplier }, result);
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

export function devAddGold(state: GameState, amount: number): GameState {
  return { ...state, gold: state.gold + amount };
}

export function canBuy(state: GameState, id: UpgradeId): boolean {
  const level = state.levels[id];
  return level < findUpgrade(id).maxLevel && state.gold >= upgradeCost(id, level);
}

export function buyUpgrade(state: GameState, id: UpgradeId): GameState {
  if (!canBuy(state, id)) return state;
  const cost = upgradeCost(id, state.levels[id]);
  return { ...state, gold: state.gold - cost, levels: { ...state.levels, [id]: state.levels[id] + 1 } };
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
  return { state, hits: [], killed: false, bossFailed: false, levelUps: 0, evolvedTo: null };
}

export function spawnMonster(wave: number): Monster {
  const { kind, name } = monsterKindFor(wave);
  const hp = monsterHp(wave);
  const isBoss = isBossWave(wave);
  return { kind, name: isBoss ? `보스 ${name}` : name, hp, maxHp: hp, isBoss };
}

function normalHit(s: GameState, source: Hit['source'], rng: Rng): Hit {
  const crit = rng() < critChance(s);
  return { damage: attackDamage(s) * (crit ? CRIT_MULTIPLIER : 1), crit, source };
}

/** 몬스터에게 피해를 주고, 쓰러뜨리면 보상을 받고 다음 몬스터로 넘어간다. result에 기록을 남긴다. */
function hitMonster(state: GameState, hit: Hit, result: ActionResult): GameState {
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
