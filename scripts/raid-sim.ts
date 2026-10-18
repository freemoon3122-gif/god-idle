/**
 * 레이드 클리어 가능성 시뮬레이터. 실행: npm run raid-sim [zeus|poseidon] [키우는 시간(분)]
 * 단순한 플레이어로 N분 키운 뒤, 두 레이드를 0단계부터 차례로 올라가며 몇 단계까지 깨는지 본다 (스킬은 쿨타임마다, 터치는 안 함).
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

/** 단계 0부터 차례로 도전해서 몇 단계까지 깨는지 본다. 같은 단계에서 3번 연속 실패하면 멈춘다. */
function climb(base: GameState, id: RaidId) {
  let clears = 0;
  const log: string[] = [];
  for (let fails = 0; fails < 3; ) {
    const entry: GameState = {
      ...base,
      level: id === 'typhoeus' ? Math.max(base.level, 500) : base.level, // 티포에우스는 Lv.500부터 열린다
      raidClears: { gigantomachy: id === 'gigantomachy' ? clears : 1, typhoeus: id === 'typhoeus' ? clears : 0 },
      raidTickets: { day: '', used: {} },
    };
    let r = startRaid(entry, id, 0).state;
    let t = 0;
    while (r.raid) {
      r = play(tick(r, DT).state);
      t += DT;
    }
    const res = r.raidResult!;
    if (res.cleared) {
      log.push(`${clears}단계 ${(t / 1000).toFixed(0)}초`);
      clears++;
      fails = 0;
    } else {
      fails++;
      if (fails === 3) log.push(`${clears}단계 실패(${res.knockedOut ? '쓰러짐' : '시간 초과'}, 피해 ${Math.floor(res.damagePct * 100)}%)`);
    }
  }
  console.log(`${RAIDS[id].name}: 최고 ${clears}단계까지 클리어 | ${log.join(' → ')}`);
}
// 스킬 쿨타임을 비운 상태로 입장
const ready = { ...s, skillCooldowns: {}, buff: null, queuedHits: [] };
climb(ready, 'gigantomachy');
climb(ready, 'typhoeus');
