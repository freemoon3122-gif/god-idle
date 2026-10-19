/**
 * 화면 없이 게임을 빠르게 돌려 보는 시뮬레이터. 실행: npm run simulate
 * "골드가 생기면 가장 싼 강화를 사고, 스킬은 쿨타임마다 쓴다"는 단순한 플레이어가
 * 시간에 따라 몇 레벨·몇 스테이지까지 가는지 출력한다.
 *
 * 사용법: npm run simulate            → 제우스
 *         npm run simulate poseidon   → 포세이돈
 */
import { stageLabel, UPGRADES, upgradeCost } from '../src/game/balance';
import { formatNumber } from '../src/game/format';
import {
  availableSkills,
  buyUpgrade,
  canBuy,
  canCast,
  castSkill,
  challengeBoss,
  canFuse,
  chooseGod,
  formName,
  fuseWeapon,
  needsGodChoice,
  newGame,
  tick,
} from '../src/game/engine';
import { GameState, GodId } from '../src/game/types';
import { WEAPON_LIST } from '../src/game/weapons';

const god = (process.argv[2] as GodId) || 'zeus';
const DT = 100; // 0.1초 단위로 진행 (실제 앱과 동일)
const CHECKPOINTS_MIN = [1, 5, 10, 20, 30, 45, 60, 120, 240, 480, 960];

let s: GameState = newGame(0);
let farmingSince = 0;
let elapsed = 0;
const milestones: string[] = [];
const MILESTONE_LEVELS = [1000, 2000, 3000, 10000];
const MILESTONE_STAGES = [500, 1000, 2500, 5000];
const reached = new Set<number>();
let deaths = 0; // 신이 쓰러진 횟수

for (const minutes of CHECKPOINTS_MIN) {
  while (elapsed < minutes * 60_000) {
    const r = tick(s, DT);
    s = r.state;
    if (r.heroDown) deaths++;
    elapsed += DT;
    for (const st of MILESTONE_STAGES) {
      if (s.maxWave >= st && !reached.has(-st)) {
        reached.add(-st);
        milestones.push(`스테이지 ${st} 도달: ${(elapsed / 60_000).toFixed(1)}분`);
      }
    }
    // 레벨은 tick뿐 아니라 스킬로 처치할 때도 오르므로, 이전 값과 비교하지 않고 "처음 넘은 순간"을 기록한다
    for (const lv of MILESTONE_LEVELS) {
      if (s.level >= lv && !reached.has(lv)) {
        reached.add(lv);
        milestones.push(`Lv.${lv} 도달: ${(elapsed / 60_000).toFixed(1)}분`);
      }
    }

    if (needsGodChoice(s)) s = chooseGod(s, god);
    for (const id of availableSkills(s)) if (canCast(s, id)) s = castSkill(s, id).state;
    for (const w of WEAPON_LIST) while (canFuse(s, w.id)) s = fuseWeapon(s, w.id).state; // 무기 3개 모이면 바로 등급업

    for (let guard = 0; guard < 500; guard++) {
      // guard: 숫자가 Infinity까지 커지면 무한 반복이 되므로 한 tick에 최대 500번만 산다
      const affordable = UPGRADES.filter((u) => canBuy(s, u.id)).sort(
        (a, b) => upgradeCost(a.id, s.levels[a.id]) - upgradeCost(b.id, s.levels[b.id]),
      );
      if (affordable.length === 0) break;
      s = buyUpgrade(s, affordable[0].id);
    }

    // 보스에게 졌으면 30초 동안 골드를 모은 뒤 재도전
    if (s.farming) {
      farmingSince ||= elapsed;
      if (elapsed - farmingSince > 30_000) {
        s = challengeBoss(s);
        farmingSince = 0;
      }
    }
  }
  const lv = s.levels;
  console.log(
    `${String(minutes).padStart(4)}분: Lv.${String(s.level).padEnd(4)} ${formName(s).padEnd(5)} ` +
      `스테이지 ${stageLabel(s.maxWave).padEnd(6)} 골드 ${formatNumber(s.gold).padStart(7)} · ` +
      `강화 신력${lv.damage} 공물${lv.gold} · 무기 ${s.equippedWeapon ?? '-'} (${Object.values(s.weapons).reduce((a, b) => a + (b ?? 0), 0)}개)`,
  );
}
console.log(milestones.join('\n'));
console.log(`쓰러진 횟수: ${deaths}`);
