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
  buyUpgrade,
  castSkill,
  challengeBoss,
  chooseGod,
  needsGodChoice,
  newGame,
  offlineReward,
  OfflineReward,
  tap,
  tick,
} from './src/game/engine';
import { loadGame, saveGame } from './src/storage/save';
import { BattleView, Fx, FX_LIFETIME } from './src/ui/BattleView';
import { EvolveModal, GodChoiceModal, OfflineModal } from './src/ui/Modals';
import { SkillBar, StatusBar as GameStatusBar, UpgradeList } from './src/ui/Panels';
import { colors } from './src/ui/theme';

const TICK_MS = 100; // 0.1초마다 게임을 진행
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
  const [fx, setFx] = useState<Fx[]>([]);
  const fxId = useRef(0);
  const lastAutoAt = useRef(0);
  const lastHitAt = useRef(0);
  const [offline, setOffline] = useState<OfflineReward | null>(null);
  const [evolved, setEvolved] = useState(false);

  /** 엔진이 돌려준 결과를 화면 상태에 반영한다. 모든 행동이 이 함수를 거친다. */
  const apply = useCallback((r: ActionResult) => {
    const now = Date.now();
    gameRef.current = r.state;
    setGame(r.state);
    if (r.hits.length > 0) {
      lastHitAt.current = now;
      if (r.hits.some((h) => h.source === 'auto')) lastAutoAt.current = now;
      const added = r.hits.slice(-4).map((hit) => ({ id: fxId.current++, hit, born: now }));
      setFx((old) => [...old.filter((f) => now - f.born < FX_LIFETIME), ...added].slice(-14));
    }
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

  const act = (fn: (s: GameState) => GameState) => {
    if (!gameRef.current) return;
    apply({ state: fn(gameRef.current), hits: [], killed: false, bossFailed: false, levelUps: 0, evolvedTo: null });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <GameStatusBar state={game} />
          <BattleView
            state={game}
            fx={fx}
            now={Date.now()}
            lastAutoAt={lastAutoAt.current}
            lastHitAt={lastHitAt.current}
            onTap={() => gameRef.current && apply(tap(gameRef.current))}
            onChallengeBoss={() => act(challengeBoss)}
          />
          <SkillBar state={game} onCast={(id: SkillId) => gameRef.current && apply(castSkill(gameRef.current, id))} />
          <UpgradeList state={game} onBuy={(id: UpgradeId) => act((s) => buyUpgrade(s, id))} />
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
