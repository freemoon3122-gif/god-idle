import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { SKILLS } from '../game/balance';
import { availableSkills, canCast, skillCooldown, skillLevel } from '../game/engine';
import { GameState, SkillId } from '../game/types';
import { SKILL_ICONS, UI_ICONS, UiIconName } from './art/images';
import { colors } from './theme';

const ND = Platform.OS !== 'web';

/**
 * 전체 화면 게임의 겹쳐 그리는 UI(HUD).
 *   - SkillDock: 맵 아래쪽의 동그란 스킬 버튼 (7개가 넘으면 두 줄)
 *   - TabBar: 맨 아래 탭 4개 (컨텐츠 / 무기강화 / 힘강화 / 스킬강화)
 *   - Sheet: 탭을 누르면 아래에서 올라오는 맵 절반 높이의 창
 */

export const SKILL_DOCK_H = 64; // 스킬 버튼 한 줄일 때의 높이
const DOCK_GAP = 6;
const DOCK_PAD = 8;
const MAX_PER_ROW = 7;

/**
 * 스킬 버튼 배치: 스킬이 최대 13개(단계마다 3개 × 4 + 레이드 보상)까지 늘어나므로
 * 7개가 넘으면 두 줄로 나누고, 화면 폭에 맞춰 버튼 크기를 줄인다 (최대 50pt).
 */
export function skillDockLayout(count: number, screenW: number) {
  const rows = count > MAX_PER_ROW ? 2 : 1;
  const perRow = Math.max(1, Math.ceil(count / rows));
  const size = Math.min(50, Math.floor((screenW - DOCK_PAD * 2 - DOCK_GAP * (perRow - 1)) / perRow));
  const height = rows === 1 ? SKILL_DOCK_H : rows * size + DOCK_GAP + DOCK_PAD * 2;
  return { rows, perRow, size, height };
}
export const TAB_BAR_H = 58;

export type TabId = 'content' | 'weapon' | 'power' | 'skill';
export const TABS: { id: TabId; emoji: string; icon: UiIconName; label: string }[] = [
  { id: 'content', emoji: '🗺️', icon: 'tab_content', label: '컨텐츠' },
  { id: 'weapon', emoji: '⚔️', icon: 'tab_weapon', label: '무기강화' },
  { id: 'power', emoji: '💪', icon: 'tab_power', label: '힘강화' },
  { id: 'skill', emoji: '📈', icon: 'tab_skill', label: '스킬강화' },
];

// ───────────── 스킬 버튼: 쿨타임 동안은 아래에서부터 차오르는 어두운 막 ─────────────

export function SkillDock({ state, onCast }: { state: GameState; onCast: (id: SkillId) => void }) {
  const { width } = useWindowDimensions();
  const skills = availableSkills(state);
  const { perRow, size, height } = skillDockLayout(skills.length, width);
  if (!skills.length) return <View style={{ height: SKILL_DOCK_H }} pointerEvents="none" />;
  // 한 줄에 perRow개씩 끊어서 줄마다 가운데 정렬
  const rows: SkillId[][] = [];
  for (let i = 0; i < skills.length; i += perRow) rows.push(skills.slice(i, i + perRow));
  return (
    <View style={[styles.dock, { height }]} pointerEvents="box-none">
      {rows.map((row, r) => (
        <View key={r} style={styles.dockRow} pointerEvents="box-none">
          {row.map((id) => {
            const skill = SKILLS[id];
            const cd = state.skillCooldowns[id] ?? 0;
            const ready = canCast(state, id);
            const lv = skillLevel(state, id);
            return (
              <Pressable
                key={id}
                onPress={() => onCast(id)}
                disabled={!ready}
                accessibilityRole="button"
                accessibilityLabel={skill.name}
                style={({ pressed }) => [
                  styles.skill,
                  { width: size, height: size, borderRadius: size / 2 },
                  skill.ultimate && styles.skillUlt,
                  pressed && { transform: [{ scale: 0.9 }] },
                ]}
              >
                <SkillIcon id={id} size={size * 0.78} />
                {!ready && (
                  <>
                    <View style={[styles.cdFill, { height: `${(cd / skillCooldown(state, id)) * 100}%` }]} />
                    <Text style={[styles.cdText, { fontSize: size * 0.32 }]}>{Math.ceil(cd / 1000)}</Text>
                  </>
                )}
                {lv > 0 && <Text style={styles.skillLv}>+{lv}</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** UI 도트 아이콘 (탭·재화·자동 이동) */
export function UiIcon({ name, size }: { name: UiIconName; size: number }) {
  return <Image source={UI_ICONS[name]} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** 스킬 아이콘: 도트 그림이 있으면 그림, 없으면 이모지 (스킬 버튼·스킬 강화 창에서 같이 쓴다) */
export function SkillIcon({ id, size }: { id: SkillId; size: number }) {
  const icon = SKILL_ICONS[id];
  if (icon) return <Image source={icon} style={{ width: size, height: size }} resizeMode="contain" />;
  return <Text style={{ fontSize: size * 0.6 }}>{SKILLS[id].emoji}</Text>;
}

// ───────────── 🤖 자동 이동 켜기/끄기 (스킬 버튼 줄 오른쪽 위) ─────────────

export function AutoMoveButton({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="자동 이동"
      style={({ pressed }) => [styles.auto, on && styles.autoOn, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <UiIcon name="auto" size={18} />
      <Text style={[styles.autoText, on && { color: colors.gold }]}>{on ? '자동 ON' : '자동 OFF'}</Text>
    </Pressable>
  );
}

// ───────────── 하단 탭 ─────────────

export function TabBar({ active, onPress, bottomPad }: { active: TabId | null; onPress: (id: TabId) => void; bottomPad: number }) {
  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPad, height: TAB_BAR_H + bottomPad }]}>
      {TABS.map((t) => (
        <Pressable key={t.id} onPress={() => onPress(t.id)} accessibilityRole="tab" style={[styles.tab, active === t.id && styles.tabActive]}>
          <UiIcon name={t.icon} size={26} />
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
  dock: { justifyContent: 'center', alignItems: 'center', gap: DOCK_GAP, paddingHorizontal: DOCK_PAD },
  dockRow: { flexDirection: 'row', justifyContent: 'center', gap: DOCK_GAP },
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
  skillUlt: { backgroundColor: 'rgba(194, 65, 12, 0.9)', borderColor: colors.gold, borderWidth: 2.5 },
  cdFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 6, 25, 0.7)' },
  cdText: { position: 'absolute', color: '#fff', fontWeight: '900', fontSize: 16 },
  skillLv: { position: 'absolute', top: 1, right: 6, color: colors.gold, fontSize: 10, fontWeight: '900' },

  auto: {
    position: 'absolute',
    right: 10,
    top: -48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(14, 10, 30, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  autoOn: { borderColor: colors.gold, backgroundColor: 'rgba(60, 44, 10, 0.85)' },
  autoText: { color: colors.subText, fontWeight: '900', fontSize: 12 },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(14, 10, 30, 0.96)', borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  tabActive: { backgroundColor: 'rgba(255, 213, 74, 0.08)' },
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
