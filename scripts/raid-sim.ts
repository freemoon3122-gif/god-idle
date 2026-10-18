/**
 * 레이드 클리어 가능성 시뮬레이터. 실행: npm run raid-sim [zeus|poseidon] [키우는 시간(분)]
 * 단순한 플레이어로 N분 키운 뒤, 두 레이드에 각각 여러 번 들어가 본다 (스킬은 쿨타임마다, 터치는 안 함).
 */
import { UPGRADES, upgradeCost } from '../src/game/balance';
import {
  availableSkills,
  buyUpgrade,
  canBuy,
  canCast,
  canFuse,
  castSkill,
  challengeBoss,
  chooseGod,
  fuseWeapon,
  needsGodChoice,
  newGame,
  startRaid,
  tick,
} from '../src/game/engine';
import { RAIDS } from '../src/game/raids';
import { GameState, GodId, RaidId } from '../src/game/types';
import { WEAPON_LIST } from '../src/game/weapons';

const god = (process.argv[2] as GodId) || 'zeus';
const minutes = Number(process.argv[3] ?? 240);
const DT = 100;

function play(s: GameState): GameState {
  if (needsGodChoice(s)) s = chooseGod(s, god);
  for (const id of availableSkills(s)) if (canCast(s, id)) s = castSkill(s, id).state;
  for (const w of WEAPON_LIST) while (canFuse(s, w.id)) s = fuseWeapon(s, w.id).state;
  return s;
}

let s: GameState = newGame(0);
let farmingSince = 0;
for (let t = 0; t < minutes * 60_000; t += DT) {
  s = play(tick(s, DT).state);
  for (let guard = 0; guard < 500; guard++) {
    const affordable = UPGRADES.filter((u) => canBuy(s, u.id)).sort(
      (a, b) => upgradeCost(a.id, s.levels[a.id]) - upgradeCost(b.id, s.levels[b.id]),
    );
    if (!affordable.length) break;
    s = buyUpgrade(s, affordable[0].id);
  }
  if (s.farming) {
    farmingSince += DT;
    if (farmingSince > 60_000) {
      s = challengeBoss(s);
      farmingSince = 0;
    }
  }
}
console.log(`${god} ${minutes}분 육성 → Lv.${s.level}, 웨이브 ${s.maxWave}`);

function runRaid(base: GameState, id: RaidId, trials = 20) {
  let clears = 0;
  let timeSum = 0;
  let pctSum = 0;
  for (let i = 0; i < trials; i++) {
    let r = startRaid({ ...base, level: Math.max(base.level, 500), raidClears: { gigantomachy: 1 } }, id, 0).state;
    let t = 0;
    while (r.raid) {
      r = play(tick(r, DT).state);
      t += DT;
    }
    const res = r.raidResult!;
    if (res.cleared) {
      clears++;
      timeSum += t;
    }
    pctSum += res.damagePct;
  }
  const info = RAIDS[id];
  console.log(
    `${info.name}: 클리어 ${clears}/${trials}, 평균 피해 ${((pctSum / trials) * 100).toFixed(0)}%` +
      (clears ? `, 평균 클리어 시간 ${(timeSum / clears / 1000).toFixed(1)}초 / ${info.timeLimit / 1000}초` : ''),
  );
}
// 스킬 쿨타임을 비운 상태로 입장
const ready = { ...s, skillCooldowns: {}, buff: null, queuedHits: [] };
runRaid(ready, 'gigantomachy');
runRaid(ready, 'typhoeus');
