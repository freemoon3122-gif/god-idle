import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GODS, SKILLS } from '../game/balance';
import { OfflineReward } from '../game/engine';
import { formatNumber } from '../game/format';
import { GodId } from '../game/types';
import { PixelSprite } from './PixelSprite';
import { colors } from './theme';

function Popup({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>{children}</View>
      </View>
    </Modal>
  );
}

function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function OfflineModal({ reward, onClose }: { reward: OfflineReward | null; onClose: () => void }) {
  return (
    <Popup visible={!!reward}>
      {reward && (
        <>
          <Text style={styles.emoji}>🌙</Text>
          <Text style={styles.title}>자리를 비운 동안</Text>
          <Text style={styles.body}>
            {Math.floor(reward.minutes / 60)}시간 {reward.minutes % 60}분 동안 신자들이 공물을 바쳤어요.
          </Text>
          <Text style={styles.reward}>💰 {formatNumber(reward.gold)}</Text>
          <Text style={[styles.reward, { color: colors.xp }]}>EXP {formatNumber(reward.xp)}</Text>
          <Button title="받기" onPress={onClose} />
        </>
      )}
    </Popup>
  );
}

export function EvolveModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Popup visible={visible}>
      <View style={styles.spriteBox}>
        <PixelSprite name="teen" scale={6} />
      </View>
      <Text style={styles.title}>청소년 신으로 성장했다!</Text>
      <Text style={styles.body}>공격력이 1.5배가 되었어요.{'\n'}Lv.200이 되면 진짜 신이 될 수 있어요.</Text>
      <Button title="좋아!" onPress={onClose} />
    </Popup>
  );
}

/** Lv.200 도달 시 신을 고르는 창. 고르기 전에는 닫을 수 없다. */
export function GodChoiceModal({ visible, onChoose }: { visible: boolean; onChoose: (god: GodId) => void }) {
  return (
    <Popup visible={visible}>
      <Text style={styles.title}>✨ 신이 될 시간이다 ✨</Text>
      <Text style={styles.body}>어떤 신이 될지 골라 주세요. 한 번 고르면 바꿀 수 없어요!</Text>
      <View style={styles.gods}>
        {(Object.keys(GODS) as GodId[]).map((id) => {
          const god = GODS[id];
          return (
            <Pressable
              key={id}
              onPress={() => onChoose(id)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.god, pressed && { borderColor: colors.gold }]}
            >
              <PixelSprite name={id} scale={4} />
              <Text style={styles.godName}>
                {god.emoji} {god.name}
              </Text>
              <Text style={styles.godTitle}>{god.title}</Text>
              <Text style={styles.godPassive}>패시브: {god.passive}</Text>
              {god.skills.map((sid) => (
                <Text key={sid} style={styles.godSkill}>
                  {SKILLS[sid].emoji} {SKILLS[sid].name}
                </Text>
              ))}
            </Pressable>
          );
        })}
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5, 3, 15, 0.7)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.panel, borderRadius: 20, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emoji: { fontSize: 48 },
  spriteBox: { marginBottom: 8 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  body: { color: colors.subText, fontSize: 14, textAlign: 'center', lineHeight: 21, marginVertical: 12 },
  reward: { color: colors.gold, fontSize: 24, fontWeight: '900', marginBottom: 4 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignSelf: 'stretch', alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  gods: { flexDirection: 'row', gap: 10 },
  god: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.panelLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  godName: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 10 },
  godTitle: { color: colors.subText, fontSize: 12, marginTop: 2 },
  godPassive: { color: colors.gold, fontSize: 12, marginTop: 8, fontWeight: '700' },
  godSkill: { color: colors.text, fontSize: 13, marginTop: 4 },
});
