import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

/*
 * 전투 이펙트 모음. 모든 이펙트는 같은 규칙을 따른다:
 *   1) 화면에 추가되는 순간(mount) 스스로 애니메이션을 시작하고
 *   2) 끝나면 onDone()을 불러서 목록에서 빠진다.
 * Animated는 게임 루프(0.05초)와 상관없이 60fps로 부드럽게 움직인다.
 * useNativeDriver: 애니메이션 계산을 JS가 아니라 네이티브(UI 스레드)에서 해서 버벅이지 않는다. (웹은 미지원)
 */
const ND = Platform.OS !== 'web';

export type EffectSpec =
  | { kind: 'damage'; x: number; y: number; text: string; color: string; size: number }
  | { kind: 'slash'; x: number; y: number; angle: number; length: number; color: string }
  | { kind: 'sparks'; x: number; y: number; color: string; count: number; power: number }
  | { kind: 'ring'; x: number; y: number; color: string; size: number }
  | { kind: 'orb'; fromX: number; fromY: number; toX: number; toY: number; color: string }
  | { kind: 'bolt'; x: number; toY: number; color: string; thick: number }
  | { kind: 'wave'; width: number; height: number; bottom: number }
  | { kind: 'tentacle'; x: number; bottom: number; height: number; tilt: number }
  | { kind: 'thrust'; fromX: number; toX: number; y: number; color: string }
  | { kind: 'banner'; text: string; color: string; big: boolean }
  | { kind: 'toast'; text: string; color: string };

export type Effect = EffectSpec & { id: number };

export function EffectView({ effect, onDone }: { effect: Effect; onDone: (id: number) => void }) {
  const done = () => onDone(effect.id);
  switch (effect.kind) {
    case 'damage':
      return <DamageNumber {...effect} onDone={done} />;
    case 'slash':
      return <Slash {...effect} onDone={done} />;
    case 'sparks':
      return <Sparks {...effect} onDone={done} />;
    case 'ring':
      return <Ring {...effect} onDone={done} />;
    case 'orb':
      return <Orb {...effect} onDone={done} />;
    case 'bolt':
      return <Bolt {...effect} onDone={done} />;
    case 'wave':
      return <Wave {...effect} onDone={done} />;
    case 'tentacle':
      return <Tentacle {...effect} onDone={done} />;
    case 'thrust':
      return <Thrust {...effect} onDone={done} />;
    case 'banner':
      return <Banner {...effect} onDone={done} />;
    case 'toast':
      return <Toast {...effect} onDone={done} />;
  }
}

/** 0 → 1로 가는 진행값 하나를 만들고 mount 때 재생한다 */
function useProgress(duration: number, onDone: () => void, easing = Easing.out(Easing.quad)) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration, easing, useNativeDriver: ND }).start(onDone);
  }, []);
  return p;
}

// ───────────── 데미지 숫자: 튀어오르며 커졌다가 떠오르며 사라진다 ─────────────

function DamageNumber({ x, y, text, color, size, onDone }: { x: number; y: number; text: string; color: string; size: number; onDone: () => void }) {
  const p = useProgress(750, onDone, Easing.linear);
  return (
    <Animated.Text
      style={[
        styles.damage,
        {
          left: x - 80,
          top: y,
          color,
          fontSize: size,
          opacity: p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -55] }) },
            { scale: p.interpolate({ inputRange: [0, 0.12, 0.25, 1], outputRange: [0.4, 1.45, 1, 0.9] }) },
          ],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

// ───────────── 참격: 빛나는 칼날 궤적이 순식간에 그어지고 사라진다 ─────────────

function Slash({ x, y, angle, length, color, onDone }: { x: number; y: number; angle: number; length: number; color: string; onDone: () => void }) {
  const p = useProgress(260, onDone);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - length / 2,
        top: y - 6,
        width: length,
        height: 12,
        opacity: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1, 1, 0] }),
        transform: [
          { rotate: `${angle}deg` },
          // 처음 25% 동안 0 → 1로 길게 그어지고, 이후 얇아지며 사라진다
          { scaleX: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.05, 1, 1.15] }) },
          { scaleY: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [1.6, 1, 0.15] }) },
        ],
      }}
    >
      <View style={[styles.slashGlow, { backgroundColor: color, shadowColor: color }]} />
      <View style={styles.slashCore} />
    </Animated.View>
  );
}

// ───────────── 파편: 사방으로 튀는 픽셀 조각 ─────────────

function Sparks({ x, y, color, count, power, onDone }: { x: number; y: number; color: string; count: number; power: number; onDone: () => void }) {
  const p = useProgress(420, onDone, Easing.out(Easing.cubic));
  const dirs = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const a = Math.random() * Math.PI * 2;
        const d = (0.5 + Math.random() * 0.8) * power;
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - power * 0.2, size: 4 + Math.random() * 5 };
      }),
    [],
  );
  return (
    <>
      {dirs.map((d, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: d.size,
            height: d.size,
            backgroundColor: i % 3 === 0 ? '#FFFFFF' : color,
            opacity: p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, d.dx] }) },
              { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, d.dy] }) },
              { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
            ],
          }}
        />
      ))}
    </>
  );
}

// ───────────── 충격파 링 ─────────────

function Ring({ x, y, color, size, onDone }: { x: number; y: number; color: string; size: number; onDone: () => void }) {
  const p = useProgress(360, onDone, Easing.out(Easing.cubic));
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 4,
        borderColor: color,
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.6] }) }],
      }}
    />
  );
}

// ───────────── 기본 공격 구슬 ─────────────

function Orb({ fromX, fromY, toX, toY, color, onDone }: { fromX: number; fromY: number; toX: number; toY: number; color: string; onDone: () => void }) {
  const p = useProgress(150, onDone, Easing.in(Easing.quad));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          left: fromX - 7,
          top: fromY - 7,
          backgroundColor: color,
          shadowColor: color,
          transform: [
            { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, toX - fromX] }) },
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, toY - fromY] }) },
            { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.2] }) },
          ],
        },
      ]}
    />
  );
}

// ───────────── 번개: 하늘에서 지그재그로 내리꽂히며 번쩍인다 ─────────────

function Bolt({ x, toY, color, thick, onDone }: { x: number; toY: number; color: string; thick: number; onDone: () => void }) {
  const p = useProgress(320, onDone, Easing.linear);
  // 지그재그 꺾은선: 위에서 아래로 내려가며 좌우로 흔들린다
  const segments = useMemo(() => {
    const pts: { x: number; y: number }[] = [{ x: x + (Math.random() - 0.5) * 30, y: -20 }];
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      pts.push({ x: x + (i === steps ? 0 : (Math.random() - 0.5) * 46), y: (toY / steps) * i });
    }
    return pts.slice(1).map((b, i) => {
      const a = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, len, angle };
    });
  }, []);
  // 깜빡깜빡: 켜짐 → 흐려짐 → 다시 켜짐 → 사라짐
  const opacity = p.interpolate({ inputRange: [0, 0.12, 0.22, 0.34, 1], outputRange: [1, 0.25, 1, 1, 0] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.cx - s.len / 2,
            top: s.cy - thick / 2,
            width: s.len + thick,
            height: thick,
            backgroundColor: color,
            borderRadius: thick / 2,
            shadowColor: color,
            shadowOpacity: 1,
            shadowRadius: 14,
            transform: [{ rotate: `${s.angle}deg` }],
          }}
        >
          <View style={{ position: 'absolute', left: 2, right: 2, top: thick * 0.3, bottom: thick * 0.3, backgroundColor: '#FFFFFF', borderRadius: thick }} />
        </View>
      ))}
    </Animated.View>
  );
}

// ───────────── 해일: 화면 왼쪽에서 오른쪽으로 거대한 파도가 휩쓸고 지나간다 ─────────────

function Wave({ width, height, bottom, onDone }: { width: number; height: number; bottom: number; onDone: () => void }) {
  const p = useProgress(650, onDone, Easing.inOut(Easing.quad));
  const w = width * 0.9;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        bottom,
        width: w,
        height,
        opacity: p.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.95, 0.95, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-w, width] }) },
          { scaleY: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.15, 0.7] }) },
        ],
      }}
    >
      <View style={[styles.waveBody, { borderTopRightRadius: height }]} />
      <View style={[styles.waveFoam, { borderTopRightRadius: height }]} />
    </Animated.View>
  );
}

// ───────────── 크라켄 촉수: 땅속에서 솟구쳐 내리치고 다시 들어간다 ─────────────

function Tentacle({ x, bottom, height, tilt, onDone }: { x: number; bottom: number; height: number; tilt: number; onDone: () => void }) {
  const p = useProgress(480, onDone, Easing.linear);
  const suckers = Math.floor(height / 26);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - 18,
        bottom,
        width: 36,
        height,
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 0.18, 0.7, 1], outputRange: [height, -10, 0, height] }) },
          { rotate: p.interpolate({ inputRange: [0, 0.18, 0.4, 1], outputRange: [`${tilt * 2}deg`, `${-tilt}deg`, `${tilt * 0.5}deg`, `${tilt}deg`] }) },
        ],
      }}
    >
      <View style={styles.tentacle}>
        {Array.from({ length: suckers }, (_, i) => (
          <View key={i} style={[styles.sucker, { top: 18 + i * 26 }]} />
        ))}
      </View>
    </Animated.View>
  );
}

// ───────────── 삼지창 난무: 빛줄기가 연달아 찔러 들어간다 ─────────────

function Thrust({ fromX, toX, y, color, onDone }: { fromX: number; toX: number; y: number; color: string; onDone: () => void }) {
  const p = useProgress(240, onDone, Easing.out(Easing.quad));
  const len = toX - fromX;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: fromX,
        top: y - 4,
        width: len,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 1,
        shadowRadius: 10,
        opacity: p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-len / 2, 0] }) },
          { scaleX: p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.1, 1, 1] }) },
        ],
      }}
    />
  );
}

// ───────────── 스킬 이름 배너: 오른쪽에서 튀어나와 잠깐 머물다 사라진다 ─────────────

function Banner({ text, color, big, onDone }: { text: string; color: string; big: boolean; onDone: () => void }) {
  const p = useProgress(big ? 1300 : 850, onDone, Easing.linear);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          opacity: p.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: p.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [140, 0, 0, -40] }) },
            { scale: p.interpolate({ inputRange: [0, 0.12, 0.2, 1], outputRange: [1.6, 0.95, 1, 1] }) },
            { skewX: '-8deg' },
          ],
        },
      ]}
    >
      <Text style={[styles.bannerText, { color, fontSize: big ? 34 : 26, textShadowColor: color }]}>{text}</Text>
    </Animated.View>
  );
}

// ───────────── 작은 알림 (무기 획득 등) ─────────────

function Toast({ text, color, onDone }: { text: string; color: string; onDone: () => void }) {
  const p = useProgress(1800, onDone, Easing.linear);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          borderColor: color,
          opacity: p.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: p.interpolate({ inputRange: [0, 0.08, 1], outputRange: [-10, 0, 0] }) }],
        },
      ]}
    >
      <Text style={[styles.toastText, { color }]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  damage: {
    position: 'absolute',
    width: 160,
    textAlign: 'center',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  slashGlow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 6, opacity: 0.85, shadowOpacity: 1, shadowRadius: 16 },
  slashCore: { position: 'absolute', left: 6, right: 6, top: 4, bottom: 4, borderRadius: 3, backgroundColor: '#FFFFFF' },
  orb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, shadowOpacity: 1, shadowRadius: 8 },
  waveBody: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#1E8FD8', borderTopLeftRadius: 30 },
  waveFoam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: '#E6FBFF',
    borderTopLeftRadius: 30,
    opacity: 0.9,
  },
  tentacle: {
    flex: 1,
    backgroundColor: '#8A3FB8',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 3,
    borderColor: '#4E1F6E',
  },
  sucker: { position: 'absolute', left: 9, width: 12, height: 12, borderRadius: 6, backgroundColor: '#E7B6FF' },
  banner: { position: 'absolute', top: 128, left: 0, right: 0, alignItems: 'center' },
  bannerText: {
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  toast: {
    position: 'absolute',
    bottom: 42,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 6, 25, 0.85)',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  toastText: { fontWeight: '800', fontSize: 13 },
});
