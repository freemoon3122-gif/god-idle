import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrate, SAVE_VERSION } from '../game/engine';
import { GameState } from '../game/types';

const SAVE_KEY = 'god-idle/save';

/** 기기에 저장한다. (Java의 Preferences, 안드로이드 SharedPreferences와 비슷한 key-value 저장소) */
export async function saveGame(state: GameState): Promise<void> {
  try {
    // 연타 스킬의 남은 타격(queuedHits)은 잠깐 쓰는 상태라 저장하지 않는다.
    // (스킬이 바뀐 다른 버전으로 불러와도 모르는 스킬의 타격이 남아 멈추지 않게)
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, queuedHits: [] }));
  } catch (e) {
    console.warn('저장 실패', e);
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const json = await AsyncStorage.getItem(SAVE_KEY);
    if (!json) return null;
    const state = JSON.parse(json) as GameState;
    // 예전 버전 저장도 migrate가 새 형식으로 바꿔 준다. 더 새로운 버전(앱을 되돌린 경우)만 버린다
    return (state.version ?? 1) <= SAVE_VERSION ? migrate(state) : null;
  } catch (e) {
    console.warn('불러오기 실패', e);
    return null;
  }
}
