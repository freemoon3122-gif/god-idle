import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GODS, SKILLS } from '../game/balance';
import { availableSkills, canCast, skillCooldown, skillLevel } from '../game/engine';
import { GameState, SkillId } from '../game/types';
import { colors } from './theme';

const ND = Platform.OS !== 'web';

/**
 * 전체 화면 게임의 겹쳐 그리는 UI(HUD).
 *   - SkillDock: 맵 아래쪽의 동그란 스킬 버튼
 *   - TabBar: 맨 아래 탭 4개 (컨텐츠 / 무기강화 / 힘강화 / 스킬강화)
 *   - Sheet: 탭을 누르면 아래에서 올라오는 맵 절반 높이의 창
 */

export const SKILL_DOCK_H = 64;
export const TAB_BAR_H = 58;

export type TabId = 'content' | 'weapon' | 'power' | 'skill';
export const TABS: { id: TabId; emoji: string; label: string }[] = [
  { id: 'content', emoji: '🗺️', label: '컨텐츠' },
  { id: 'weapon', emoji: '⚔️', label: '무기강화' },
  { id: 'power', emoji: '💪', label: '힘강화' },
  { id: 'skill', emoji: '📈', label: '스킬강화' },
];

// ───────────── 스킬 버튼: 쿨타임 동안은 아래에서부터 차오르는 어두운 막 ─────────────

export function SkillDock({ state, onCast }: { state: GameState; onCast: (id: SkillId) => void }) {
  const skills = availableSkills(state);
  if (!skills.length) return <View style={{ height: SKILL_DOCK_H }} pointerEvents="none" />;
  return (
    <View style={styles.dock} pointerEvents="box-none">
      {skills.map((id) => {
        const skill = SKILLS[id];
        const cd = state.skillCooldowns[id] ?? 0;
        const ready = canCast(state, id);
        const isUlt = state.god !== null && GODS[state.god].ultimate === id;
        const lv = skillLevel(state, id);
        return (
          <Pressable
            key={id}
            onPress={() => onCast(id)}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityLabel={skill.name}
            style={({ pressed }) => [styles.skill, isUlt && styles.skillUlt, pressed && { transform: [{ scale: 0.9 }] }]}
          >
            <Text style={styles.skillEmoji}>{skill.emoji}</Text>
            {!ready && (
              <>
                <View style={[styles.cdFill, { height: `${(cd / skillCooldown(state, id)) * 100}%` }]} />
                <Text style={styles.cdText}>{Math.ceil(cd / 1000)}</Text>
              </>
            )}
            {lv > 0 && <Text style={styles.skillLv}>+{lv}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

// ───────────── 하단 탭 ─────────────

export function TabBar({ active, onPress, bottomPad }: { active: TabId | null; onPress: (id: TabId) => void; bottomPad: number }) {
  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPad, height: TAB_BAR_H + bottomPad }]}>
      {TABS.map((t) => (
        <Pressable key={t.id} onPress={() => onPress(t.id)} accessibilityRole="tab" style={[styles.tab, active === t.id && styles.tabActive]}>
          <Text style={styles.tabEmoji}>{t.emoji}</Text>
          <Text style={[styles.tabLabel, active === t.id && { color: colors.gold }]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ───────────── 아래에서 올라오는 창 (맵 절반 높이). 열려 있어도 전투는 뒤에서 계속된다 ─────────────

export function Sheet({
  open,
  title,
  height,
  bottom,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  height: number;
  bottom: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const slide = useRef(new Animated.Value(0)).current; // 0 = 닫힘(아래로 숨음), 1 = 열림
  useEffect(() => {
    Animated.timing(slide, { toValue: open ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [open]);
  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[
        styles.sheet,
        {
          height,
          bottom,
          opacity: slide.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
        },
      ]}
    >
      <View style={styles.sheetHead}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" hitSlop={10} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.sheetBody}>{children}</ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { height: SKILL_DOCK_H, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  skill: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(139, 107, 255, 0.85)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  skillUlt: { backgroundColor: 'rgba(194, 65, 12, 0.9)', borderColor: colors.gold, width: 56, height: 56, borderRadius: 28 },
  skillEmoji: { fontSize: 24 },
  cdFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 6, 25, 0.7)' },
  cdText: { position: 'absolute', color: '#fff', fontWeight: '900', fontSize: 16 },
  skillLv: { position: 'absolute', top: 1, right: 6, color: colors.gold, fontSize: 10, fontWeight: '900' },

  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(14, 10, 30, 0.96)', borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  tabActive: { backgroundColor: 'rgba(255, 213, 74, 0.08)' },
  tabEmoji: { fontSize: 22 },
  tabLabel: { color: colors.subText, fontSize: 11, fontWeight: '800', marginTop: 2 },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelLight },
  closeText: { color: colors.text, fontWeight: '900' },
  sheetBody: { padding: 12, paddingTop: 0, paddingBottom: 24 },
});
