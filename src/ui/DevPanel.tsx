import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

interface Props {
  onSetLevel: (level: number) => void;
  onAddGold: () => void;
  onReset: () => void;
}

/**
 * 테스트용 치트 버튼. App.tsx에서 `__DEV__`일 때만 보여준다.
 * __DEV__는 React Native가 넣어 주는 전역 변수로, `npm start`(개발 모드)에서는 true,
 * App Store용 정식 빌드에서는 false가 되어 이 패널이 아예 사라진다.
 * (Java로 치면 컴파일 시점 상수 `static final boolean DEBUG`로 디버그 코드를 감싸는 것과 같다.)
 */
export function DevPanel({ onSetLevel, onAddGold, onReset }: Props) {
  const buttons: [string, () => void][] = [
    ['Lv.99', () => onSetLevel(99)],
    ['Lv.100', () => onSetLevel(100)],
    ['Lv.199', () => onSetLevel(199)],
    ['Lv.200', () => onSetLevel(200)],
    ['골드 ×1000', onAddGold],
    ['초기화', onReset],
  ];
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>🛠 개발자 테스트 (정식 빌드에서는 안 보임)</Text>
      <View style={styles.row}>
        {buttons.map(([label, onPress]) => (
          <Pressable key={label} onPress={onPress} accessibilityRole="button" style={styles.button}>
            <Text style={styles.buttonText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.boss, borderStyle: 'dashed' },
  title: { color: colors.boss, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { backgroundColor: colors.panelLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  buttonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
