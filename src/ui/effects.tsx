import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Polyline, RadialGradient, Stop } from 'react-native-svg';

import { FX, FxName } from './art/fx';
import { PixelSprite } from './PixelSprite';

/*
 * 전투 이펙트 모음. 모든 이펙트는 같은 규칙을 따른다:
 *   1) 화면에 추가되는 순간(mount) 스스로 애니메이션을 시작하고
 *   2) 끝나면 onDone()을 불러서 목록에서 빠진다.
 *
 * 모양은 SVG(벡터 그래픽)로 그린다: 곡선(초승달 참격, 파도, 촉수), 그라데이션, 빛 번짐(glow).
 * 움직임은 SVG를 감싼 Animated.View의 transform/opacity로만 준다.
 * → SVG 자체는 한 번만 그리고, 움직임은 네이티브 드라이버가 60fps로 처리해서 가볍다.
 */
const ND = Platform.OS !== 'web';

export type EffectSpec =
  | { kind: 'damage'; x: number; y: number; text: string; color: string; size: number; crit: boolean }
  | { kind: 'crescent'; x: number; y: number; angle: number; radius: number; color: string; flip?: boolean }
  | { kind: 'burst'; x: number; y: number; color: string; size: number; spikes?: number }
  | { kind: 'glow'; x: number; y: number; color: string; size: number }
  | { kind: 'rays'; x: number; y: number; color: string; size: number; count?: number }
  | { kind: 'speedlines'; width: number; height: number; x: number; y: number; color: string }
  | { kind: 'groundRing'; x: number; y: number; color: string; size: number }
  | { kind: 'debris'; x: number; y: number; color: string; count: number; power: number }
  | { kind: 'smoke'; x: number; y: number; count: number }
  | { kind: 'orb'; fromX: number; fromY: number; toX: number; toY: number; color: string }
  | { kind: 'bolt'; width: number; height: number; x: number; toY: number; color: string; thick: number; branches?: number }
  | { kind: 'wave'; width: number; height: number; bottom: number }
  | { kind: 'tentacle'; x: number; bottom: number; height: number; tilt: number }
  | { kind: 'thrust'; fromX: number; toX: number; y: number; color: string }
  | { kind: 'ghost'; x: number; bottom: number; sprite: string; scale: number; color: string; dx: number }
  | { kind: 'banner'; text: string; color: string; big: boolean }
  | { kind: 'toast'; text: string; color: string; bottom?: number }
  | { kind: 'arrow'; fromX: number; fromY: number; toX: number; toY: number; color: string }
  | { kind: 'island'; x: number; toY: number; size: number }
  | { kind: 'breath'; fromX: number; toX: number; y: number; height: number }
  | { kind: 'zap'; width: number; height: number; fromX: number; fromY: number; toX: number; toY: number; color: string; thick: number }
  | { kind: 'ripple'; x: number; y: number; size: number; color: string }
  /**
   * 도트 이펙트 애니메이션 (assets/fx/*.png 가로 띠 한 장 = 프레임 여러 개).
   * x, y: 놓을 위치 (anchor가 bottom이면 아래 가운데, 아니면 한가운데) / width: 화면에서의 폭(pt)
   * fromX, fromY: 있으면 그 자리에서 (x, y)까지 날아가며 재생한다 (유성 같은 투사체)
   */
  | { kind: 'fx'; name: FxName; x: number; y: number; width: number; anchor?: 'center' | 'bottom'; duration?: number; flip?: boolean; rotate?: number; fromX?: number; fromY?: number };

export type Effect = EffectSpec & { id: number };

export function EffectView({ effect, onDone }: { effect: Effect; onDone: (id: number) => void }) {
  const done = () => onDone(effect.id);
  const e = effect;
  switch (e.kind) {
    case 'damage':
      return <DamageNumber {...e} onDone={done} />;
    case 'crescent':
      return <Crescent {...e} onDone={done} />;
    case 'burst':
      return <Burst {...e} onDone={done} />;
    case 'glow':
      return <Glow {...e} onDone={done} />;
    case 'rays':
      return <Rays {...e} onDone={done} />;
    case 'speedlines':
      return <SpeedLines {...e} onDone={done} />;
    case 'groundRing':
      return <GroundRing {...e} onDone={done} />;
    case 'debris':
      return <Debris {...e} onDone={done} />;
    case 'smoke':
      return <Smoke {...e} onDone={done} />;
    case 'orb':
      return <Orb {...e} onDone={done} />;
    case 'bolt':
      return <Bolt {...e} onDone={done} />;
    case 'wave':
      return <Wave {...e} onDone={done} />;
    case 'tentacle':
      return <Tentacle {...e} onDone={done} />;
    case 'thrust':
      return <Thrust {...e} onDone={done} />;
    case 'ghost':
      return <Ghost {...e} onDone={done} />;
    case 'banner':
      return <Banner {...e} onDone={done} />;
    case 'toast':
      return <Toast {...e} onDone={done} />;
    case 'arrow':
      return <Arrow {...e} onDone={done} />;
    case 'island':
      return <Island {...e} onDone={done} />;
    case 'breath':
      return <Breath {...e} onDone={done} />;
    case 'zap':
      return <Zap {...e} onDone={done} />;
    case 'ripple':
      return <Ripple {...e} onDone={done} />;
    case 'fx':
      return <SpriteFx {...e} onDone={done} />;
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

/** 이펙트마다 겹치지 않는 SVG 그라데이션 id */
let gradientSeq = 0;
function useGradientId(prefix: string) {
  return useMemo(() => `${prefix}${gradientSeq++}`, []);
}

/** (x, y)를 중심으로 size×size 상자에 놓는 스타일 */
function centered(x: number, y: number, size: number) {
  return { position: 'absolute' as const, left: x - size / 2, top: y - size / 2, width: size, height: size };
}

// ───────────── 데미지 숫자: 크게 튀어나왔다가 떠오르며 사라진다. 치명타는 부르르 떨린다 ─────────────

function DamageNumber({ x, y, text, color, size, crit, onDone }: { x: number; y: number; text: string; color: string; size: number; crit: boolean; onDone: () => void }) {
  const p = useProgress(800, onDone, Easing.linear);
  return (
    <Animated.Text
      style={[
        styles.damage,
        {
          left: x - 90,
          top: y,
          color,
          fontSize: size,
          opacity: p.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: p.interpolate({ inputRange: [0, 0.15, 1], outputRange: [10, -8, -60] }) },
            // 치명타는 좌우로 부르르
            { translateX: crit ? p.interpolate({ inputRange: [0, 0.05, 0.1, 0.15, 0.2, 1], outputRange: [0, -5, 5, -3, 0, 0] }) : 0 },
            { scale: p.interpolate({ inputRange: [0, 0.1, 0.22, 1], outputRange: [0.3, crit ? 1.8 : 1.4, 1, 0.85] }) },
          ],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

// ───────────── 초승달 참격: 검기가 호를 그리며 휘둘러지고, 끝으로 갈수록 가늘어진다 ─────────────

function Crescent({ x, y, angle, radius, color, flip, onDone }: { x: number; y: number; angle: number; radius: number; color: string; flip?: boolean; onDone: () => void }) {
  const p = useProgress(320, onDone, Easing.out(Easing.cubic));
  const gid = useGradientId('cr');
  const size = radius * 2.6;
  const c = size / 2;
  // 바깥 호(반지름 R)와 더 평평한 안쪽 호(반지름 R2)로 만든 초승달. 양 끝이 뾰족하다.
  const R = radius;
  const R2 = radius * 1.35;
  const a = (70 * Math.PI) / 180;
  const p1 = { x: c + R * Math.cos(-a), y: c + R * Math.sin(-a) };
  const p2 = { x: c + R * Math.cos(a), y: c + R * Math.sin(a) };
  const d = `M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y} A ${R2} ${R2} 0 0 0 ${p1.x} ${p1.y} Z`;
  const sweep = flip ? -1 : 1;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        centered(x, y, size),
        {
          opacity: p.interpolate({ inputRange: [0, 0.08, 0.55, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { rotate: p.interpolate({ inputRange: [0, 1], outputRange: [`${angle - 70 * sweep}deg`, `${angle + 20 * sweep}deg`] }) },
            { scaleY: flip ? -1 : 1 },
            { scale: p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 1.05, 1.2] }) },
          ],
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.45" stopColor={color} stopOpacity="0.9" />
            <Stop offset="0.75" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>
        {/* 빛 번짐: 같은 모양을 두꺼운 반투명 테두리로 한 번 더 */}
        <Path d={d} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={10} strokeLinejoin="round" />
        <Path d={d} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

// ───────────── 충돌 폭발: 뾰족한 별 모양이 순식간에 터졌다 사라진다 ─────────────

function Burst({ x, y, color, size, spikes = 10, onDone }: { x: number; y: number; color: string; size: number; spikes?: number; onDone: () => void }) {
  const p = useProgress(300, onDone, Easing.out(Easing.quad));
  const star = (outer: number, inner: number) => {
    const c = size / 2;
    const pts: string[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer * (0.75 + ((i * 37) % 10) / 40) : inner;
      const t = (Math.PI * i) / spikes;
      pts.push(`${c + r * Math.cos(t)},${c + r * Math.sin(t)}`);
    }
    return pts.join(' ');
  };
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        centered(x, y, size),
        {
          opacity: p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1, 0] }),
          transform: [
            { scale: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.15, 1, 1.25] }) },
            { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] }) },
          ],
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Polygon points={star(size / 2, size / 6)} fill={color} opacity={0.85} />
        <Polygon points={star(size / 3.2, size / 10)} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

// ───────────── 빛 번짐: 가운데가 밝고 바깥으로 갈수록 투명한 원 ─────────────

function Glow({ x, y, color, size, onDone }: { x: number; y: number; color: string; size: number; onDone: () => void }) {
  const p = useProgress(380, onDone, Easing.out(Easing.quad));
  const gid = useGradientId('gl');
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        centered(x, y, size),
        {
          opacity: p.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.3] }) }],
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="0.3" stopColor={color} stopOpacity="0.8" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

// ───────────── 광선: 가운데에서 사방으로 뻗어나가는 가는 빛줄기 ─────────────

function Rays({ x, y, color, size, count = 14, onDone }: { x: number; y: number; color: string; size: number; count?: number; onDone: () => void }) {
  const p = useProgress(450, onDone, Easing.out(Easing.cubic));
  const rays = useMemo(() => {
    const c = size / 2;
    return Array.from({ length: count }, (_, i) => {
      const t = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const len = c * (0.6 + Math.random() * 0.4);
      const w = 0.05 + Math.random() * 0.04;
      // 가운데에서 바깥으로 가늘어지는 삼각형
      return `${c + Math.cos(t - w) * 10},${c + Math.sin(t - w) * 10} ${c + Math.cos(t) * len},${c + Math.sin(t) * len} ${c + Math.cos(t + w) * 10},${c + Math.sin(t + w) * 10}`;
    });
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        centered(x, y, size),
        {
          opacity: p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
          transform: [
            { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) },
            { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '12deg'] }) },
          ],
        },
      ]}
    >
      <Svg width={size} height={size}>
        {rays.map((pts, i) => (
          <Polygon key={i} points={pts} fill={i % 3 === 0 ? '#FFFFFF' : color} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ───────────── 집중선: 만화처럼 화면 가장자리에서 한 점으로 모이는 선 ─────────────

function SpeedLines({ width, height, x, y, color, onDone }: { width: number; height: number; x: number; y: number; color: string; onDone: () => void }) {
  const p = useProgress(520, onDone, Easing.linear);
  const lines = useMemo(() => {
    const far = Math.hypot(width, height);
    return Array.from({ length: 34 }, () => {
      const t = Math.random() * Math.PI * 2;
      const inner = 70 + Math.random() * 60;
      const w = 0.008 + Math.random() * 0.012;
      return `${x + Math.cos(t - w) * far},${y + Math.sin(t - w) * far} ${x + Math.cos(t) * inner},${y + Math.sin(t) * inner} ${x + Math.cos(t + w) * far},${y + Math.sin(t + w) * far}`;
    });
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: p.interpolate({ inputRange: [0, 0.1, 0.3, 0.45, 0.7, 1], outputRange: [0, 0.9, 0.5, 0.9, 0.6, 0] }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] }) }],
        },
      ]}
    >
      <Svg width={width} height={height}>
        {lines.map((pts, i) => (
          <Polygon key={i} points={pts} fill={i % 4 === 0 ? color : '#FFFFFF'} opacity={0.7} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ───────────── 바닥 충격파: 납작한 타원 고리가 바닥을 따라 퍼진다 ─────────────

function GroundRing({ x, y, color, size, onDone }: { x: number; y: number; color: string; size: number; onDone: () => void }) {
  const p = useProgress(450, onDone, Easing.out(Easing.cubic));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x - size / 2, top: y - size * 0.15, width: size, height: size * 0.3 },
        {
          opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.4] }) }],
        },
      ]}
    >
      <Svg width={size} height={size * 0.3}>
        <Ellipse cx={size / 2} cy={size * 0.15} rx={size / 2 - 6} ry={size * 0.15 - 4} fill="none" stroke={color} strokeWidth={8} strokeOpacity={0.4} />
        <Ellipse cx={size / 2} cy={size * 0.15} rx={size / 2 - 6} ry={size * 0.15 - 4} fill="none" stroke="#FFFFFF" strokeWidth={2.5} />
      </Svg>
    </Animated.View>
  );
}

// ───────────── 파편: 위로 튀었다가 중력에 따라 포물선으로 떨어지며 회전한다 ─────────────

function Debris({ x, y, color, count, power, onDone }: { x: number; y: number; color: string; count: number; power: number; onDone: () => void }) {
  const p = useProgress(650, onDone, Easing.linear);
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const vx = (Math.random() - 0.5) * 2 * power;
        const vy = -(0.4 + Math.random() * 0.9) * power; // 위로 튄다
        const g = power * 1.6; // 중력
        // 포물선 y(t) = vy·t + g·t² 을 5개 지점으로 근사
        const ys = [0, 0.25, 0.5, 0.75, 1].map((t) => vy * t + g * t * t);
        return { vx, ys, size: 3 + Math.random() * 6, spin: (Math.random() - 0.5) * 720, white: i % 3 === 0 };
      }),
    [],
  );
  return (
    <>
      {parts.map((d, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: d.size,
            height: d.size,
            backgroundColor: d.white ? '#FFFFFF' : color,
            opacity: p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, d.vx] }) },
              { translateY: p.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: d.ys }) },
              { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${d.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </>
  );
}

// ───────────── 연기: 회색 구름이 부풀며 올라가 흩어진다 ─────────────

function Smoke({ x, y, count, onDone }: { x: number; y: number; count: number; onDone: () => void }) {
  const p = useProgress(800, onDone, Easing.out(Easing.quad));
  const puffs = useMemo(
    () => Array.from({ length: count }, () => ({ dx: (Math.random() - 0.5) * 120, dy: -20 - Math.random() * 50, size: 30 + Math.random() * 30 })),
    [],
  );
  return (
    <>
      {puffs.map((s, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            ...centered(x, y, s.size),
            borderRadius: s.size / 2,
            backgroundColor: 'rgba(200, 200, 215, 0.5)',
            opacity: p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] }),
            transform: [
              { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, s.dx] }) },
              { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, s.dy] }) },
              { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }) },
            ],
          }}
        />
      ))}
    </>
  );
}

// ───────────── 기본 공격: 빛나는 구슬이 꼬리를 남기며 날아간다 ─────────────

function Orb({ fromX, fromY, toX, toY, color, onDone }: { fromX: number; fromY: number; toX: number; toY: number; color: string; onDone: () => void }) {
  const p = useProgress(160, onDone, Easing.in(Easing.quad));
  const gid = useGradientId('orb');
  const trail = [0, 0.12, 0.24]; // 앞 구슬, 꼬리 1, 꼬리 2 (조금씩 늦게 따라온다)
  return (
    <>
      {trail.map((lag, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            ...centered(fromX, fromY, 22 - i * 5),
            opacity: (1 - i * 0.35) as number,
            transform: [
              { translateX: p.interpolate({ inputRange: [0, lag, 1], outputRange: [0, 0, (toX - fromX) * (1 - lag)] }) },
              { translateY: p.interpolate({ inputRange: [0, lag, 1], outputRange: [0, 0, (toY - fromY) * (1 - lag)] }) },
            ],
          }}
        >
          <Svg width={22 - i * 5} height={22 - i * 5}>
            <Defs>
              <RadialGradient id={`${gid}-${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="0.45" stopColor={color} stopOpacity="1" />
                <Stop offset="1" stopColor={color} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={(22 - i * 5) / 2} cy={(22 - i * 5) / 2} r={(22 - i * 5) / 2} fill={`url(#${gid}-${i})`} />
          </Svg>
        </Animated.View>
      ))}
    </>
  );
}

// ───────────── 번개: 가지를 치며 내리꽂히는 지그재그 빛줄기. 두 번 깜빡인다 ─────────────

function Bolt({ width, height, x, toY, color, thick, branches = 2, onDone }: { width: number; height: number; x: number; toY: number; color: string; thick: number; branches?: number; onDone: () => void }) {
  const p = useProgress(340, onDone, Easing.linear);
  const paths = useMemo(() => {
    const steps = 9;
    const main: { x: number; y: number }[] = [{ x: x + (Math.random() - 0.5) * 40, y: -10 }];
    for (let i = 1; i <= steps; i++) main.push({ x: i === steps ? x : x + (Math.random() - 0.5) * 56, y: (toY / steps) * i });
    const toStr = (pts: { x: number; y: number }[]) => pts.map((q) => `${q.x},${q.y}`).join(' ');
    // 중간 지점에서 옆으로 갈라지는 가지
    const extra = Array.from({ length: branches }, () => {
      const start = main[2 + Math.floor(Math.random() * (steps - 4))];
      const dir = Math.random() < 0.5 ? -1 : 1;
      const pts = [start];
      for (let j = 1; j <= 3; j++) pts.push({ x: start.x + dir * j * (14 + Math.random() * 12), y: start.y + j * (18 + Math.random() * 14) });
      return toStr(pts);
    });
    return { main: toStr(main), extra };
  }, []);
  const opacity = p.interpolate({ inputRange: [0, 0.1, 0.2, 0.32, 0.6, 1], outputRange: [1, 0.15, 1, 1, 0.6, 0] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width={width} height={height}>
        <G strokeLinejoin="round" strokeLinecap="round" fill="none">
          {/* 바깥 빛 → 색 → 하얀 심지 순서로 세 겹 */}
          <Polyline points={paths.main} stroke={color} strokeOpacity={0.3} strokeWidth={thick * 3.2} />
          {paths.extra.map((b, i) => (
            <Polyline key={`g${i}`} points={b} stroke={color} strokeOpacity={0.25} strokeWidth={thick * 1.8} />
          ))}
          <Polyline points={paths.main} stroke={color} strokeWidth={thick} />
          {paths.extra.map((b, i) => (
            <Polyline key={`c${i}`} points={b} stroke={color} strokeWidth={thick * 0.5} />
          ))}
          <Polyline points={paths.main} stroke="#FFFFFF" strokeWidth={thick * 0.4} />
        </G>
      </Svg>
    </Animated.View>
  );
}

// ───────────── 해일: 말려 올라간 파도 머리와 흰 물거품이 화면을 휩쓴다 ─────────────

function Wave({ width, height, bottom, onDone }: { width: number; height: number; bottom: number; onDone: () => void }) {
  const p = useProgress(700, onDone, Easing.inOut(Easing.quad));
  const gid = useGradientId('wv');
  const w = width * 0.95;
  const h = height;
  // 왼쪽 아래에서 시작해 오른쪽 위로 솟구친 뒤 앞으로 말려 내려오는 파도 모양
  const back = `M0 ${h} L0 ${h * 0.55} C ${w * 0.3} ${h * 0.45}, ${w * 0.55} ${h * 0.02}, ${w * 0.8} ${h * 0.05} C ${w * 0.97} ${h * 0.08}, ${w} ${h * 0.32}, ${w * 0.9} ${h * 0.4} C ${w * 0.84} ${h * 0.3}, ${w * 0.78} ${h * 0.33}, ${w * 0.8} ${h * 0.48} L ${w} ${h} Z`;
  const front = `M0 ${h} L0 ${h * 0.75} C ${w * 0.3} ${h * 0.68}, ${w * 0.5} ${h * 0.35}, ${w * 0.72} ${h * 0.38} C ${w * 0.8} ${h * 0.4}, ${w * 0.83} ${h * 0.55}, ${w * 0.78} ${h * 0.62} L ${w * 0.95} ${h} Z`;
  const crest = `M ${w * 0.35} ${h * 0.3} C ${w * 0.55} ${h * 0.02}, ${w * 0.8} ${h * 0.02}, ${w * 0.93} ${h * 0.2}`;
  const bubbles = useMemo(
    () => Array.from({ length: 12 }, () => ({ cx: w * (0.4 + Math.random() * 0.55), cy: h * (0.02 + Math.random() * 0.25), r: 2 + Math.random() * 5 })),
    [],
  );
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        bottom,
        width: w,
        height: h,
        opacity: p.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.9, width * 0.75] }) },
          { scaleY: p.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.55, 1.12, 0.8] }) },
        ],
      }}
    >
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8BE9FF" />
            <Stop offset="0.5" stopColor="#1E8FD8" />
            <Stop offset="1" stopColor="#0B3D91" />
          </LinearGradient>
        </Defs>
        <Path d={back} fill={`url(#${gid})`} />
        <Path d={front} fill="#4FC3F7" opacity={0.85} />
        <Path d={crest} fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" opacity={0.95} />
        {bubbles.map((b, i) => (
          <Circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="#FFFFFF" opacity={0.9} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ───────────── 크라켄 촉수: 휘어진 촉수가 땅에서 솟아 내리치고 다시 들어간다 ─────────────

function Tentacle({ x, bottom, height, tilt, onDone }: { x: number; bottom: number; height: number; tilt: number; onDone: () => void }) {
  const p = useProgress(520, onDone, Easing.linear);
  const gid = useGradientId('tt');
  const w = 70;
  const h = height;
  const dir = tilt > 0 ? -1 : 1;
  // 아래는 굵고 위로 갈수록 가늘어지는, S자로 휜 촉수
  const d = `M ${w / 2 - 20} ${h}
    C ${w / 2 - 22} ${h * 0.6}, ${w / 2 + dir * 22} ${h * 0.45}, ${w / 2 + dir * 10} ${h * 0.12}
    Q ${w / 2 + dir * 6} 0, ${w / 2 - dir * 4} ${h * 0.06}
    C ${w / 2 + dir * 2} ${h * 0.4}, ${w / 2 + 22} ${h * 0.6}, ${w / 2 + 20} ${h} Z`;
  const suckers = Array.from({ length: 6 }, (_, i) => {
    const t = 0.25 + i * 0.12;
    return { cx: w / 2 + dir * (8 - i * 1.5) * (1 - t), cy: h * (1 - t) + 8, r: 5 - i * 0.5 };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - w / 2,
        bottom,
        width: w,
        height: h,
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 0.16, 0.25, 0.72, 1], outputRange: [h, -14, 0, 0, h] }) },
          { rotate: p.interpolate({ inputRange: [0, 0.16, 0.3, 0.5, 1], outputRange: [`${tilt * 2.5}deg`, `${-tilt * 1.5}deg`, `${tilt * 0.6}deg`, '0deg', `${tilt}deg`] }) },
        ],
      }}
    >
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#5B1F80" />
            <Stop offset="0.5" stopColor="#B05CE0" />
            <Stop offset="1" stopColor="#5B1F80" />
          </LinearGradient>
        </Defs>
        <Path d={d} fill={`url(#${gid})`} stroke="#3A0F55" strokeWidth={3} />
        {suckers.map((s, i) => (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#F0C8FF" stroke="#8A3FB8" strokeWidth={1.5} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// ───────────── 삼지창 찌르기: 끝이 뾰족한 빛의 창이 연달아 꽂힌다 ─────────────

function Thrust({ fromX, toX, y, color, onDone }: { fromX: number; toX: number; y: number; color: string; onDone: () => void }) {
  const p = useProgress(260, onDone, Easing.out(Easing.cubic));
  const gid = useGradientId('th');
  // 왼쪽으로 찌를 때(toX < fromX)는 상자를 toX~fromX에 놓고 좌우로 뒤집는다 (폭이 음수가 되지 않게)
  const dir = toX >= fromX ? 1 : -1;
  const len = Math.max(1, Math.abs(toX - fromX));
  const h = 18;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: Math.min(fromX, toX),
        top: y - h / 2,
        width: len,
        height: h,
        opacity: p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-len * 0.6 * dir, 0] }) },
          { scaleX: p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.2 * dir, dir, dir] }) },
        ],
      }}
    >
      <Svg width={len} height={h}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.7" stopColor={color} stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Polygon points={`0,${h * 0.35} ${len - 22},${h * 0.2} ${len},${h / 2} ${len - 22},${h * 0.8} 0,${h * 0.65}`} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

// ───────────── 잔상: 돌진할 때 신의 모습이 색 실루엣으로 남았다 사라진다 ─────────────

function Ghost({ x, bottom, sprite, scale, color, dx, onDone }: { x: number; bottom: number; sprite: string; scale: number; color: string; dx: number; onDone: () => void }) {
  const p = useProgress(260, onDone, Easing.out(Easing.quad));
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        bottom,
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
        transform: [{ translateX: dx }],
      }}
    >
      <PixelSprite name={sprite} scale={scale} tint={color} />
    </Animated.View>
  );
}

// ───────────── 스킬 이름 배너: 빛나는 띠가 휙 지나가고 글자가 쾅 박힌다 ─────────────

function Banner({ text, color, big, onDone }: { text: string; color: string; big: boolean; onDone: () => void }) {
  const p = useProgress(big ? 1350 : 900, onDone, Easing.linear);
  const gid = useGradientId('bn');
  return (
    <View pointerEvents="none" style={styles.bannerWrap}>
      {/* 뒤에서 가로로 휙 지나가는 빛의 띠 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: big ? 64 : 48,
          opacity: p.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 0.9, 0.7, 0] }),
          transform: [
            { translateX: p.interpolate({ inputRange: [0, 0.12, 1], outputRange: [-400, 0, 0] }) },
            { scaleY: p.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0.2, 1, 1, 0.1] }) },
            { skewX: '-20deg' },
          ],
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={color} stopOpacity="0" />
              <Stop offset="0.5" stopColor={color} stopOpacity="0.55" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d="M0 0 H2000 V200 H0 Z" fill={`url(#${gid})`} />
        </Svg>
      </Animated.View>
      <Animated.Text
        style={[
          styles.bannerText,
          {
            color: '#FFFFFF',
            fontSize: big ? 36 : 28,
            textShadowColor: color,
            opacity: p.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { scale: p.interpolate({ inputRange: [0, 0.1, 0.18, 1], outputRange: [2.4, 0.92, 1, 1.04] }) },
              { translateX: p.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 0, 30] }) },
              { skewX: '-10deg' },
            ],
          },
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

// ───────────── 작은 알림 (무기 획득 등) ─────────────

function Toast({ text, color, bottom, onDone }: { text: string; color: string; bottom?: number; onDone: () => void }) {
  const p = useProgress(1800, onDone, Easing.linear);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          borderColor: color,
          ...(bottom !== undefined && { bottom }),
          opacity: p.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: p.interpolate({ inputRange: [0, 0.08, 1], outputRange: [10, 0, 0] }) }],
        },
      ]}
    >
      <Text style={[styles.toastText, { color }]} numberOfLines={2}>
        {text}
      </Text>
    </Animated.View>
  );
}

// ───────────── 지지직 번개: 두 점 사이를 지그재그로 잇는다 (제우스 자동 공격과 그 범위 피해) ─────────────

function Zap({
  width,
  height,
  fromX,
  fromY,
  toX,
  toY,
  color,
  thick,
  onDone,
}: {
  width: number;
  height: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  thick: number;
  onDone: () => void;
}) {
  const p = useProgress(220, onDone, Easing.linear);
  const points = useMemo(() => {
    // 선분을 7조각으로 나누고, 중간 점들을 선에 수직인 방향으로 무작위로 흔든다
    const len = Math.hypot(toX - fromX, toY - fromY) || 1;
    const nx = -(toY - fromY) / len;
    const ny = (toX - fromX) / len;
    const n = 7;
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * Math.min(26, len * 0.25);
      return `${fromX + (toX - fromX) * t + nx * j},${fromY + (toY - fromY) * t + ny * j}`;
    }).join(' ');
  }, []);
  // 번쩍 → 살짝 꺼짐 → 다시 번쩍 → 사라짐 (번개다운 깜빡임)
  const opacity = p.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 1], outputRange: [1, 0.25, 1, 0.9, 0] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width={width} height={height}>
        <G strokeLinejoin="round" strokeLinecap="round" fill="none">
          <Polyline points={points} stroke={color} strokeOpacity={0.35} strokeWidth={thick * 3} />
          <Polyline points={points} stroke={color} strokeWidth={thick} />
          <Polyline points={points} stroke="#FFFFFF" strokeWidth={thick * 0.4} />
        </G>
      </Svg>
    </Animated.View>
  );
}

// ───────────── 파도 물결: 맞은 자리에서 물 고리 3겹이 차례로 퍼진다 (포세이돈 자동 공격) ─────────────

function Ripple({ x, y, size, color, onDone }: { x: number; y: number; size: number; color: string; onDone: () => void }) {
  const p = useProgress(650, onDone, Easing.out(Easing.quad));
  const h = size * 0.45; // 옆에서 본 바닥이라 납작한 타원
  return (
    <>
      {[0, 1, 2].map((i) => {
        const start = i * 0.18; // 고리마다 조금씩 늦게 출발
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - h / 2,
              width: size,
              height: h,
              opacity: p.interpolate({ inputRange: [0, start, start + 0.1, 1], outputRange: [0, 0, 0.9 - i * 0.2, 0], extrapolate: 'clamp' }),
              transform: [{ scale: p.interpolate({ inputRange: [0, start, 1], outputRange: [0.1, 0.1, 1 - i * 0.12], extrapolate: 'clamp' }) }],
            }}
          >
            <Svg width={size} height={h}>
              <Ellipse cx={size / 2} cy={h / 2} rx={size / 2 - 4} ry={h / 2 - 3} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={7} strokeOpacity={0.85} />
              <Ellipse cx={size / 2} cy={h / 2} rx={size / 2 - 4} ry={h / 2 - 3} fill="none" stroke="#FFFFFF" strokeWidth={2.5} />
            </Svg>
          </Animated.View>
        );
      })}
    </>
  );
}

// ───────────── 헤라클레스의 화살: 빛꼬리를 끌며 일직선으로 날아가 꽂힌다 ─────────────

function Arrow({ fromX, fromY, toX, toY, color, onDone }: { fromX: number; fromY: number; toX: number; toY: number; color: string; onDone: () => void }) {
  const p = useProgress(220, onDone, Easing.in(Easing.quad));
  const gid = useGradientId('ar');
  const len = Math.hypot(toX - fromX, toY - fromY);
  const angle = (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI;
  const A = 44; // 화살(빛꼬리 포함) 길이
  const h = 12;
  // RN의 rotate는 상자 가운데를 축으로 돈다 → 출발점과 도착점의 한가운데에 상자를 놓고 돌린 뒤,
  // 상자 안에서 화살을 왼쪽 끝 → 오른쪽 끝으로 움직인다 (회전된 좌표계 안에서의 이동)
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: (fromX + toX) / 2 - len / 2, top: (fromY + toY) / 2 - h / 2, width: len, height: h, transform: [{ rotate: `${angle}deg` }] }}
    >
      <Animated.View
        style={{
          width: A,
          height: h,
          opacity: p.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0.3] }),
          transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, len - A] }) }],
        }}
      >
        <Svg width={A} height={h}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={color} stopOpacity="0" />
              <Stop offset="1" stopColor={color} stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          <Polygon points={`0,${h / 2 - 1} ${A - 10},${h / 2 - 3} ${A - 10},${h / 2 + 3} 0,${h / 2 + 1}`} fill={`url(#${gid})`} />
          <Polyline points={`10,${h / 2} ${A - 8},${h / 2}`} stroke="#7A4A26" strokeWidth={2.5} />
          <Polygon points={`10,${h / 2} 4,1 8,${h / 2} 4,${h - 1}`} fill="#FFFFFF" />
          <Polygon points={`${A - 10},1 ${A},${h / 2} ${A - 10},${h - 1}`} fill="#EEF3FB" stroke={color} strokeWidth={1} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ───────────── 니시로스 투척: 뜯겨 나온 섬(풀 덮인 바위)이 하늘에서 떨어져 내리꽂힌다 ─────────────

function Island({ x, toY, size, onDone }: { x: number; toY: number; size: number; onDone: () => void }) {
  const p = useProgress(650, onDone, Easing.linear);
  const w = size;
  const h = size * 0.8;
  // 위는 평평한 풀밭, 아래는 뾰족하게 뜯겨 나간 바위
  const rock = `0,${h * 0.28} ${w * 0.12},${h * 0.18} ${w * 0.88},${h * 0.16} ${w},${h * 0.3} ${w * 0.84},${h * 0.62} ${w * 0.62},${h * 0.7} ${w * 0.5},${h} ${w * 0.36},${h * 0.72} ${w * 0.16},${h * 0.6}`;
  const grass = `0,${h * 0.28} ${w * 0.12},${h * 0.12} ${w * 0.3},${h * 0.06} ${w * 0.6},${h * 0.05} ${w * 0.88},${h * 0.1} ${w},${h * 0.3} ${w * 0.5},${h * 0.36}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: toY - h * 0.75,
        width: w,
        height: h,
        // 0~0.6: 가속하며 떨어짐 / 0.6~1: 박힌 채로 조금 가라앉으며 사라짐
        opacity: p.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 1], outputRange: [-toY - h, -toY * 0.86 - h * 0.8, -toY * 0.5 - h * 0.4, 0, 14] }) },
          { rotate: p.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['-24deg', '6deg', '6deg'] }) },
        ],
      }}
    >
      <Svg width={w} height={h}>
        <Polygon points={rock} fill="#7A5A3E" stroke="#1C1430" strokeWidth={3} strokeLinejoin="round" />
        <Polyline points={`${w * 0.3},${h * 0.35} ${w * 0.38},${h * 0.52} ${w * 0.34},${h * 0.62}`} stroke="#4A3423" strokeWidth={3} fill="none" />
        <Polyline points={`${w * 0.66},${h * 0.32} ${w * 0.6},${h * 0.5}`} stroke="#4A3423" strokeWidth={3} fill="none" />
        <Polygon points={grass} fill="#5CC46B" stroke="#1C1430" strokeWidth={3} strokeLinejoin="round" />
        <Ellipse cx={w * 0.7} cy={h * 0.02} rx={w * 0.09} ry={h * 0.09} fill="#2F8A45" stroke="#1C1430" strokeWidth={2} />
        <Ellipse cx={w * 0.28} cy={h * 0.05} rx={w * 0.07} ry={h * 0.07} fill="#2F8A45" stroke="#1C1430" strokeWidth={2} />
      </Svg>
    </Animated.View>
  );
}

// ───────────── 불길 브레스: 괴물의 입에서 원뿔 모양 불길이 신을 향해 뿜어져 나온다 ─────────────

function Breath({ fromX, toX, y, height, onDone }: { fromX: number; toX: number; y: number; height: number; onDone: () => void }) {
  const p = useProgress(950, onDone, Easing.linear);
  const gid = useGradientId('br');
  const len = fromX - toX;
  const h = height;
  // 오른쪽 끝(입)을 기준으로 왼쪽으로 늘어나야 한다. scaleX는 가운데 기준이라 translateX로 보정한다.
  const scale = p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.05, 1, 1] });
  const shift = p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [len * 0.475, 0, 0] });
  const flames = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const fx = len * (0.1 + i * 0.12);
        const r = h * (0.18 + (1 - i / 7) * 0.2);
        return { cx: fx, cy: h / 2 + (Math.random() - 0.5) * h * 0.4, r };
      }),
    [],
  );
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: toX,
        top: y - h / 2,
        width: len,
        height: h,
        opacity: p.interpolate({ inputRange: [0, 0.1, 0.3, 0.4, 0.5, 0.75, 1], outputRange: [0, 1, 0.8, 1, 0.85, 1, 0] }),
        transform: [{ translateX: shift }, { scaleX: scale }],
      }}
    >
      <Svg width={len} height={h}>
        <Defs>
          <LinearGradient id={gid} x1="1" y1="0" x2="0" y2="0">
            <Stop offset="0" stopColor="#FFF27A" stopOpacity="1" />
            <Stop offset="0.35" stopColor="#FF7A1F" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#B8323A" stopOpacity="0.15" />
          </LinearGradient>
        </Defs>
        <Polygon points={`${len},${h * 0.42} 0,0 0,${h} ${len},${h * 0.58}`} fill={`url(#${gid})`} />
        {flames.map((f, i) => (
          <Circle key={i} cx={f.cx} cy={f.cy} r={f.r} fill={i % 2 ? '#FF7A1F' : '#FFB347'} fillOpacity={0.55} />
        ))}
        <Polygon points={`${len},${h * 0.47} ${len * 0.2},${h * 0.3} ${len * 0.2},${h * 0.7} ${len},${h * 0.53}`} fill="#FFF6B0" fillOpacity={0.7} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  damage: {
    position: 'absolute',
    width: 180,
    textAlign: 'center',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 0,
  },
  bannerWrap: { position: 'absolute', top: 120, left: 0, right: 0, height: 64, alignItems: 'center', justifyContent: 'center' },
  bannerText: {
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
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
    maxWidth: '92%',
  },
  toastText: { fontWeight: '800', fontSize: 13, textAlign: 'center' },
});

// ───────────── 도트 이펙트: 가로 띠 이미지를 한 칸씩 넘겨 보여 준다 (플립북) ─────────────

function SpriteFx({
  name,
  x,
  y,
  width,
  anchor = 'center',
  duration = 380,
  flip,
  rotate = 0,
  fromX,
  fromY,
  onDone,
}: {
  name: FxName;
  x: number;
  y: number;
  width: number;
  anchor?: 'center' | 'bottom';
  duration?: number;
  flip?: boolean;
  rotate?: number;
  fromX?: number;
  fromY?: number;
  onDone: () => void;
}) {
  const sheet = FX[name];
  const p = useProgress(duration, onDone, Easing.linear);
  const w = width;
  const h = (width * sheet.fh) / sheet.fw;
  const n = sheet.frames;
  // 진행값 0~1을 프레임 번호로: 각 구간 안에서는 같은 칸에 멈춰 있다가 경계에서 다음 칸으로 (계단 모양)
  const input: number[] = [];
  const output: number[] = [];
  for (let i = 0; i < n; i++) {
    input.push(i / n, (i + 1) / n - 0.0001);
    output.push(-i * w, -i * w);
  }
  const frameX = p.interpolate({ inputRange: input, outputRange: output });
  const left = x - w / 2;
  const top = anchor === 'bottom' ? y - h : y - h / 2;
  const moving = fromX !== undefined && fromY !== undefined;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: w,
        height: h,
        overflow: 'hidden',
        transform: [
          ...(moving
            ? [
                { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [fromX! - x, 0] }) },
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [fromY! - y, 0] }) },
              ]
            : []),
          { rotate: `${rotate}deg` },
          { scaleX: flip ? -1 : 1 },
        ],
      }}
    >
      <Animated.Image source={sheet.source} style={{ width: w * n, height: h, transform: [{ translateX: frameX }] }} resizeMode="stretch" />
    </Animated.View>
  );
}
