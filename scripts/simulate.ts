/**
 * 화면 없이 게임을 빠르게 돌려 보는 시뮬레이터. 실행: npm run simulate
 * "골드가 생기면 가장 싼 강화를 사고, 스킬은 쿨타임마다 쓴다"는 단순한 플레이어가
 * 시간에 따라 몇 레벨·몇 스테이지까지 가는지 출력한다.
 *
 * 사용법: npm run simulate            → 제우스
 *         npm run simulate poseidon   → 포세이돈
 */
import { GODS, stageLabel, UPGRADES, upgradeCost } from '../src/game/balance';
import { formatNumber } from '../src/game/format';
import {
  buyUpgrade,
  canBuy,
  canCast,
  castSkill,
  challengeBoss,
  chooseGod,
  formName,
  needsGodChoice,
  newGame,
  tick,
} from '../src/game/engine';
import { GameState, GodId } from '../src/game/types';

const god = (process.argv[2] as GodId) || 'zeus';
const DT = 100; // 0.1초 단위로 진행 (실제 앱과 동일)
const CHECKPOINTS_MIN = [1, 5, 10, 20, 30, 45, 60, 90, 120];

let s: GameState = newGame(0);
let farmingSince = 0;
let elapsed = 0;
const milestones: string[] = [];

for (const minutes of CHECKPOINTS_MIN) {
  while (elapsed < minutes * 60_000) {
    const prevLevel = s.level;
    s = tick(s, DT).state;
    elapsed += DT;
    if (prevLevel < 100 && s.level >= 100) milestones.push(`Lv.100 도달: ${(elapsed / 60_000).toFixed(1)}분`);
    if (prevLevel < 200 && s.level >= 200) milestones.push(`Lv.200 도달: ${(elapsed / 60_000).toFixed(1)}분`);

    if (needsGodChoice(s)) s = chooseGod(s, god);
    if (s.god) for (const id of GODS[s.god].skills) if (canCast(s, id)) s = castSkill(s, id).state;

    for (;;) {
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
      `강화 신력${lv.damage} 속도${lv.speed} 치명${lv.crit} 공물${lv.gold}`,
  );
}
console.log(milestones.join('\n'));
