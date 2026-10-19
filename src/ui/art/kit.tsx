import { ReactNode } from 'react';
import { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

/**
 * 카툰 일러스트(벡터) 그림 도구.
 *
 * 그림 하나 = ArtDef. 좌표는 "칸 × 10" 단위다.
 *   예) 예전 픽셀 그림이 24×24칸이면 viewBox는 0 0 240 240.
 *   → 예전 픽셀 그림과 크기·발 위치가 똑같아서, 화면 배치 코드(탈것 겹침, 체력바 위치)를 그대로 쓴다.
 *
 * 색은 꼭 p.fill(...)/p.stroke(...)를 거친다. 맞았을 때 하얗게 번쩍이는 실루엣(tint)을 만들 때
 * 모든 색이 tint 한 색으로 바뀌어야 하기 때문이다. (Java로 치면 색을 직접 쓰지 않고 Paint 객체에게 물어보는 것)
 */
export interface Paint {
  /** 실루엣 모드면 tint, 아니면 color 그대로 */
  fill: (color: string) => string;
  /** 그라데이션 칠하기: 실루엣 모드면 tint, 아니면 url(#id) */
  grad: (id: string) => string;
  /** 외곽선 색 */
  line: string;
  /** 실루엣 모드인지 (하이라이트 같은 장식은 생략) */
  tinted: boolean;
}

export interface ArtDef {
  /** 크기 (칸). 예전 픽셀 그림의 외곽선 포함 크기와 같게 */
  w: number;
  h: number;
  /** 그라데이션 정의 (실루엣 모드에서는 쓰지 않는다) */
  defs?: () => ReactNode;
  draw: (p: Paint) => ReactNode;
  /**
   * 따로 움직이는 무기 층 (번개, 삼지창). 몸 위에 겹쳐 그리고, 공격할 때 pivot(어깨)을 축으로 휘두른다.
   * 무기를 쥔 팔·손도 이 층에 그려야 휘두를 때 팔이 함께 따라온다. 좌표계는 몸과 같다.
   */
  weapon?: {
    draw: (p: Paint) => ReactNode;
    /** 회전 축 (viewBox 단위, 보통 무기 든 팔의 어깨) */
    pivot: [number, number];
  };
}

export const LINE = '#1C1430';
/** 외곽선 두께 (viewBox 단위). 캐릭터가 작게 그려져도 또렷하도록 두껍게 */
export const LW = 7;

export function makePaint(tint?: string): Paint {
  return {
    fill: (c) => tint ?? c,
    grad: (id) => (tint ? tint : `url(#${id})`),
    line: tint ?? LINE,
    tinted: !!tint,
  };
}

/** 위(밝음) → 아래(어두움) 세로 그라데이션 */
export function VGrad({ id, from, to, mid }: { id: string; from: string; to: string; mid?: string }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor={from} />
      <Stop offset="0.5" stopColor={mid ?? mixHalf(from, to)} />
      <Stop offset="1" stopColor={to} />
    </LinearGradient>
  );
}

/** 왼쪽 위에서 빛이 오는 둥근 입체감 (구·몸통용) */
export function Ball({ id, light, base, dark }: { id: string; light: string; base: string; dark: string }) {
  return (
    <RadialGradient id={id} cx="0.35" cy="0.3" r="0.75" fx="0.3" fy="0.25">
      <Stop offset="0" stopColor={light} />
      <Stop offset="0.45" stopColor={base} />
      <Stop offset="1" stopColor={dark} />
    </RadialGradient>
  );
}

/** 반짝이는 하이라이트 (실루엣 모드에서는 안 그림) */
export function Shine({ p, cx, cy, rx, ry, opacity = 0.7, rotate = -25 }: { p: Paint; cx: number; cy: number; rx: number; ry: number; opacity?: number; rotate?: number }) {
  if (p.tinted) return null;
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#FFFFFF" opacity={opacity} transform={`rotate(${rotate} ${cx} ${cy})`} />;
}

/** 외곽선 있는 도형 */
export function Shape({ p, d, fill, lw = LW }: { p: Paint; d: string; fill: string; lw?: number }) {
  return <Path d={d} fill={fill} stroke={p.line} strokeWidth={lw} strokeLinejoin="round" strokeLinecap="round" />;
}

export { Defs };

/** 두 색(#RRGGBB)의 중간색 */
function mixHalf(a: string, b: string): string {
  const n = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round((n(a, i) + n(b, i)) / 2).toString(16).padStart(2, '0')).join('');
}
