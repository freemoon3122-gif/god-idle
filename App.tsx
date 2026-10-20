import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ActionResult,
  GameState,
  GodId,
  MoveInput,
  RaidId,
  SkillId,
  UpgradeId,
} from './src/game/types';
import {
  applyOfflineReward,
  buyCoins,
  buyUpgradeBulk,
  castSkill,
  challengeBoss,
  changeDifficulty,
  chooseGod,
  devAddDiamonds,
  devAddGold,
  devGiveWeapon,
  devSetLevel,
  devUnlockRaids,
  dismissRaidResult,
  enhanceWeapon,
  equipWeapon,
  formName,
  fuseWeapon,
  gacha,
  leaveRaid,
  markChapterSeen,
  needsGodChoice,
  newGame,
  offlineReward,
  pendingChapter,
  plainResult,
  OfflineReward,
  startRaid,
  tap,
  tick,
  awaken,
  toggleAutoMove,
  upgradeBossPassive,
  upgradeSkill,
} from './src/game/engine';
import { chapterStory, StoryLine, storyFor } from './src/game/story';
import { loadGame, saveGame } from './src/storage/save';
import { BattleHandle, BattleView } from './src/ui/BattleView';
import { DevPanel } from './src/ui/DevPanel';
import { EvolveModal, GodChoiceModal, OfflineModal } from './src/ui/Modals';
import { DifficultyChip, DifficultyPicker, StatusBar as GameStatusBar, UpgradeList, WeaponPanel } from './src/ui/Panels';
import { AutoMoveButton, Sheet, SKILL_DOCK_H, SkillDock, TAB_BAR_H, TabBar, TabId, TABS } from './src/ui/Hud';
import { heroSprite } from './src/ui/sprites';
import { DailyPanel, RaidPanel, RaidResultModal, StoryModal } from './src/ui/RaidUI';
import { GachaResultModal, PassivePanel, ShopPanel, SkillUpgradePanel } from './src/ui/ShopUI';
import { colors } from './src/ui/theme';
import { WeaponId } from './src/game/weapons';

const TICK_MS = 50; // 0.05초마다 게임을 진행 (연타 스킬 간격을 정확히 맞추기 위해)
const SAVE_EVERY_MS = 5_000;

/**
 * 게임 루프를 돌리는 최상위 컴포넌트.
 *
 * - 최신 상태는 useRef에 들고 있다. setInterval 콜백은 처음 만들어질 때의 변수를 기억(클로저)하기 때문에
 *   useState 값만 쓰면 옛날 상태를 계속 보게 된다. ref는 항상 최신 객체를 가리킨다.
 * - useState는 화면을 다시 그리게 하는 용도로만 쓴다.
 */
export default function App() {
  // useSafeAreaInsets()는 SafeAreaProvider 안에서만 쓸 수 있어서, 게임 본체를 한 단계 안쪽 컴포넌트로 둔다
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

/**
 * 전체 화면 게임. 화면 전체가 전투 맵이고, 그 위에 UI를 겹쳐 그린다.
 *   위: 레벨·골드·난이도  /  아래: 스킬 버튼 → 탭 4개  /  탭을 누르면 맵 절반 높이의 창이 올라온다
 */
function Game() {
  const insets = useSafeAreaInsets(); // 노치·홈 바 영역 (그 밑에는 버튼을 두지 않는다)
  const { height: screenH } = useWindowDimensions();
  const [tab, setTab] = useState<TabId | null>(null); // 열려 있는 창 (null = 닫힘)
  const [picking, setPicking] = useState(false); // 난이도 고르는 창
  const [topH, setTopH] = useState(110); // 위쪽 정보 영역의 실제 높이 (재서 전투 화면에 알려 준다)
  const [game, setGame] = useState<GameState | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const battleRef = useRef<BattleHandle>(null);
  const [offline, setOffline] = useState<OfflineReward | null>(null);
  const [evolved, setEvolved] = useState<'teen' | 'adult' | null>(null); // 진화 팝업에 보여 줄 단계
  const [buyAmount, setBuyAmount] = useState(1); // 강화 한 번에 몇 단계씩 살지 (×1/×10/×50/×100)
  // 레이드 컷신: 보여 줄 대사 목록과 지금 몇 번째 줄인지. 컷신이 떠 있는 동안 게임 시간은 멈춘다.
  const [story, setStory] = useState<{ lines: StoryLine[]; index: number } | null>(null);
  const storyRef = useRef(false);
  const [pulls, setPulls] = useState<WeaponId[] | null>(null); // 무기 뽑기 결과
  const moveRef = useRef<MoveInput | null>(null); // 조이스틱 입력 (게임 루프가 매 tick 읽어 간다)

  /** 엔진이 돌려준 결과를 화면 상태에 반영한다. 모든 행동이 이 함수를 거친다. */
  const apply = useCallback((r: ActionResult) => {
    const prev = gameRef.current; // 이번 행동 전의 상태 (컷신을 처음 한 번만 보여 줄지 판단)
    gameRef.current = r.state;
    setGame(r.state);
    battleRef.current?.play(r); // 타격·스킬·무기 획득 연출
    if (r.evolvedTo === 'teen' || r.evolvedTo === 'adult') setEvolved(r.evolvedTo);
    // 레이드 이벤트(입장, 보스 등장, 힘줄 절단...)에 맞는 컷신 대사를 모은다.
    // 이야기는 처음 도전할 때만 보여 준다 (이번 행동 전까지 클리어·참전 기록이 0일 때)
    const raidId = r.state.raid?.id ?? r.state.raidResult?.id;
    const firstTime = raidId !== undefined && !(prev?.raidClears[raidId] ?? 0);
    if (raidId && firstTime && r.raidEvents.length) {
      const lines = r.raidEvents.flatMap((ev) => storyFor(ev, raidId, r.state.god) ?? []);
      if (lines.length) {
        storyRef.current = true;
        setStory((cur) => (cur ? { ...cur, lines: [...cur.lines, ...lines] } : { lines, index: 0 }));
      }
    }
  }, []);

  // 새 장(500스테이지마다)에 처음 들어오면 그 장의 스토리를 보여 준다
  useEffect(() => {
    if (!game || storyRef.current) return;
    const ch = pendingChapter(game);
    if (ch === null) return;
    storyRef.current = true;
    setStory({ lines: chapterStory(ch, heroSprite(game), formName(game)), index: 0 });
    if (gameRef.current) apply(plainResult(markChapterSeen(gameRef.current, ch)));
  }, [game?.wave, game?.difficulty, game?.raid]);

  const nextLine = () =>
    setStory((cur) => {
      if (!cur || cur.index + 1 >= cur.lines.length) {
        storyRef.current = false;
        return null;
      }
      return { ...cur, index: cur.index + 1 };
    });

  const save = useCallback(() => {
    if (gameRef.current) saveGame({ ...gameRef.current, savedAt: Date.now() });
  }, []);

  // 1) 시작: 저장 불러오기 + 오프라인 보상
  useEffect(() => {
    loadGame().then((saved) => {
      const now = Date.now();
      let state = saved ?? newGame(now);
      const reward = saved ? offlineReward(saved, now) : null;
      if (reward) {
        const r = applyOfflineReward(state, reward);
        state = r.state;
        if (r.evolvedTo === 'teen' || r.evolvedTo === 'adult') setEvolved(r.evolvedTo);
        setOffline(reward);
      }
      gameRef.current = { ...state, savedAt: now };
      setGame(gameRef.current);
    });
  }, []);

  // 2) 게임 루프 + 자동 저장
  useEffect(() => {
    if (!game) return;
    let last = Date.now();
    let lastSave = last;
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(now - last, 1000); // 탭이 잠들었다 깨어나도 한 번에 너무 많이 진행하지 않게
      last = now;
      if (gameRef.current && !storyRef.current) apply(tick(gameRef.current, dt, Math.random, moveRef.current)); // 컷신 중에는 시간이 멈춘다
      if (now - lastSave > SAVE_EVERY_MS) {
        save();
        lastSave = now;
      }
    }, TICK_MS);
    // 앱이 백그라운드로 가면 바로 저장 (오프라인 보상 계산의 기준 시각)
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && save());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [!!game, apply, save]);

  if (!game) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  /** 연출이 필요 없는 단순한 상태 변경 (강화 구매, 장착 등) */
  const act = (fn: (s: GameState) => GameState, drops: WeaponId[] = []) => {
    if (!gameRef.current) return;
    apply(plainResult(fn(gameRef.current), drops));
  };

  const enterRaid = (id: RaidId) => {
    if (!gameRef.current) return;
    setTab(null); // 창을 닫고 전투 화면을 보여 준다
    apply(startRaid(gameRef.current, id, Date.now()));
    save();
  };

  const pull = (count: 1 | 11) => {
    if (!gameRef.current) return;
    const r = gacha(gameRef.current, count);
    if (!r.pulls.length) return;
    act(() => r.state);
    setPulls(r.pulls);
    save();
  };

  const fuse = (id: WeaponId) => {
    if (!gameRef.current) return;
    const { state, result } = fuseWeapon(gameRef.current, id);
    act(() => state, result ? [result] : []);
  };

  const bottomUi = insets.bottom + TAB_BAR_H + SKILL_DOCK_H; // 맵 아래를 덮는 UI 높이
  const sheetContent: Record<TabId, React.ReactNode> = {
    content: (
      <>
        <DailyPanel state={game} onEnter={enterRaid} />
        <RaidPanel state={game} onEnter={enterRaid} />
        <ShopPanel state={game} onGacha={pull} onBuyCoins={() => act(buyCoins)} />
        {__DEV__ && (
          <DevPanel
            onSetLevel={(level) => gameRef.current && apply(devSetLevel(gameRef.current, level))}
            onAddGold={() => act((s) => devAddGold(s, Math.max(1000, s.gold * 1000)))}
            onReset={() => act(() => newGame(Date.now()))}
            onGiveWeapon={(id) => gameRef.current && apply(devGiveWeapon(gameRef.current, id))}
            onUnlockRaids={() => act(devUnlockRaids)}
            onAddDiamonds={() => act((s) => devAddDiamonds(s, 10_000))}
          />
        )}
      </>
    ),
    weapon: (
      <WeaponPanel
        state={game}
        onEquip={(id) => act((s) => equipWeapon(s, id))}
        onFuse={fuse}
        onEnhance={(target, material) => act((s) => enhanceWeapon(s, target, material))}
      />
    ),
    power: (
      <UpgradeList
        state={game}
        buyAmount={buyAmount}
        onChangeAmount={setBuyAmount}
        onBuy={(id: UpgradeId) => act((s) => buyUpgradeBulk(s, id, buyAmount))}
      />
    ),
    skill: (
      <>
        {game.god || game.level >= 1000 ? (
          <SkillUpgradePanel state={game} onUpgrade={(id) => act((s) => upgradeSkill(s, id))} />
        ) : (
          <Text style={styles.empty}>Lv.1000 청소년 신이 되면 스킬이 생기고, 강화할 수 있어요.</Text>
        )}
        <PassivePanel state={game} onBoss={() => act(upgradeBossPassive)} onAwaken={() => act(awaken)} />
      </>
    ),
  };

  return (
    <View style={styles.root}>
      {/* 전투 맵: 화면 전체 */}
      <BattleView
        ref={battleRef}
        state={game}
        onTap={() => gameRef.current && apply(tap(gameRef.current))}
        onChallengeBoss={() => act(challengeBoss)}
        onLeaveRaid={() => gameRef.current && apply(leaveRaid(gameRef.current))}
        onMove={(m) => (moveRef.current = m)}
        topInset={topH}
        bottomInset={bottomUi}
      />

      {/* 위: 레벨·골드·난이도 (맵 위에 반투명하게 겹친다) */}
      <View style={[styles.top, { paddingTop: insets.top + 4 }]} onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
        <DifficultyChip state={game} onPress={() => setPicking(true)} />
        <GameStatusBar state={game} />
      </View>

      {/* 아래: 스킬 버튼 → 탭. 탭을 누르면 창이 올라온다 (같은 탭을 다시 누르면 닫힘) */}
      <View style={styles.bottom} pointerEvents="box-none">
        <SkillDock state={game} onCast={(id: SkillId) => gameRef.current && apply(castSkill(gameRef.current, id))} />
        {!game.raid && <AutoMoveButton on={game.autoMove} onPress={() => act(toggleAutoMove)} />}
        <TabBar active={tab} onPress={(id) => setTab((cur) => (cur === id ? null : id))} bottomPad={insets.bottom} />
      </View>
      <Sheet
        open={tab !== null}
        title={TABS.find((t) => t.id === tab)?.label ?? ''}
        height={Math.round(screenH * 0.5)}
        bottom={insets.bottom + TAB_BAR_H}
        onClose={() => setTab(null)}
      >
        {tab && sheetContent[tab]}
      </Sheet>

      <OfflineModal reward={offline} onClose={() => setOffline(null)} />
      <EvolveModal form={offline ? null : evolved} onClose={() => setEvolved(null)} />
      <GodChoiceModal
        visible={needsGodChoice(game) && !offline}
        onChoose={(god: GodId) => {
          act((s) => chooseGod(s, god));
          setEvolved(null);
          save();
        }}
      />
      <StoryModal lines={story?.lines ?? null} index={story?.index ?? 0} onNext={nextLine} />
      <RaidResultModal
        result={story ? null : game.raidResult}
        onClose={() => {
          act(dismissRaidResult);
          save();
        }}
      />
      <GachaResultModal pulls={pulls} onClose={() => setPulls(null)} />
      <DifficultyPicker state={game} visible={picking} onChoose={(d) => act((s) => changeDifficulty(s, d))} onClose={() => setPicking(false)} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, backgroundColor: 'rgba(10, 6, 25, 0.55)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  empty: { color: colors.subText, textAlign: 'center', marginTop: 24, fontSize: 14 },
});
