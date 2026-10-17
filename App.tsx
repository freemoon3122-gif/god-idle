import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import {
  ActionResult,
  GameState,
  GodId,
  SkillId,
  UpgradeId,
} from './src/game/types';
import {
  applyOfflineReward,
  buyUpgradeBulk,
  castSkill,
  challengeBoss,
  chooseGod,
  devAddGold,
  devGiveWeapon,
  devSetLevel,
  enhanceWeapon,
  equipWeapon,
  fuseWeapon,
  needsGodChoice,
  newGame,
  offlineReward,
  OfflineReward,
  tap,
  tick,
} from './src/game/engine';
import { loadGame, saveGame } from './src/storage/save';
import { BattleHandle, BattleView } from './src/ui/BattleView';
import { DevPanel } from './src/ui/DevPanel';
import { EvolveModal, GodChoiceModal, OfflineModal } from './src/ui/Modals';
import { SkillBar, StatusBar as GameStatusBar, UpgradeList, WeaponPanel } from './src/ui/Panels';
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
  const [game, setGame] = useState<GameState | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const battleRef = useRef<BattleHandle>(null);
  const [offline, setOffline] = useState<OfflineReward | null>(null);
  const [evolved, setEvolved] = useState(false);
  const [buyAmount, setBuyAmount] = useState(1); // 강화 한 번에 몇 단계씩 살지 (×1/×10/×50/×100)

  /** 엔진이 돌려준 결과를 화면 상태에 반영한다. 모든 행동이 이 함수를 거친다. */
  const apply = useCallback((r: ActionResult) => {
    gameRef.current = r.state;
    setGame(r.state);
    battleRef.current?.play(r); // 타격·스킬·무기 획득 연출
    if (r.evolvedTo === 'teen') setEvolved(true);
  }, []);

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
        if (r.evolvedTo === 'teen') setEvolved(true);
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
      if (gameRef.current) apply(tick(gameRef.current, dt));
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
    apply({ state: fn(gameRef.current), hits: [], casts: [], drops, killed: false, bossFailed: false, levelUps: 0, evolvedTo: null });
  };

  const fuse = (id: WeaponId) => {
    if (!gameRef.current) return;
    const { state, result } = fuseWeapon(gameRef.current, id);
    act(() => state, result ? [result] : []);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <GameStatusBar state={game} />
          <BattleView
            ref={battleRef}
            state={game}
            onTap={() => gameRef.current && apply(tap(gameRef.current))}
            onChallengeBoss={() => act(challengeBoss)}
          />
          <SkillBar state={game} onCast={(id: SkillId) => gameRef.current && apply(castSkill(gameRef.current, id))} />
          <UpgradeList
            state={game}
            buyAmount={buyAmount}
            onChangeAmount={setBuyAmount}
            onBuy={(id: UpgradeId) => act((s) => buyUpgradeBulk(s, id, buyAmount))}
          />
          <WeaponPanel
            state={game}
            onEquip={(id) => act((s) => equipWeapon(s, id))}
            onFuse={fuse}
            onEnhance={(target, material) => act((s) => enhanceWeapon(s, target, material))}
          />
          {__DEV__ && (
            <DevPanel
              onSetLevel={(level) => gameRef.current && apply(devSetLevel(gameRef.current, level))}
              onAddGold={() => act((s) => devAddGold(s, Math.max(1000, s.gold * 1000)))}
              onReset={() => act(() => newGame(Date.now()))}
              onGiveWeapon={(id) => gameRef.current && apply(devGiveWeapon(gameRef.current, id))}
            />
          )}
        </ScrollView>

        <OfflineModal reward={offline} onClose={() => setOffline(null)} />
        <EvolveModal visible={evolved && !offline} onClose={() => setEvolved(false)} />
        <GodChoiceModal
          visible={needsGodChoice(game) && !offline}
          onChoose={(god: GodId) => {
            act((s) => chooseGod(s, god));
            setEvolved(false);
            save();
          }}
        />
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 16, paddingBottom: 40 },
});
