import { Circle, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { ArtDef, Ball, LW, Paint, Shape, Shine, VGrad } from './kit';

/*
 * 제우스 치비 일러스트 (3D 장난감 느낌).
 * - 크기 27×26칸 (viewBox 270×260). 아래 5칸은 구름에 가려진다.
 * - 오른쪽을 본다. 번개를 든 팔은 weapon 층에 따로 그려서 어깨(pivot)를 축으로 휘두른다.
 * - 모든 색은 p.fill / p.grad / p.line 을 거친다 (맞았을 때 하얀 실루엣이 되도록).
 */

const EYE_DARK = '#1E2A55';
const BLUSH = '#FF9C9C';
const GOLD_LINE = '#B07A12';
const HAIR_SHADE = '#C9D0E4';
const SKIN_SHADE = '#E9A88A';

type Pt = [number, number];

/** 점들을 따라 바깥으로 볼록한 호를 이어 붙인다 → 몽실몽실한 머리카락·수염 테두리 */
function bumps(pts: Pt[], bulge = 0.62): string {
  let d = '';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const r = Math.hypot(x1 - x0, y1 - y0) * bulge;
    d += ` A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

/** 타원 둘레의 점들 (각도는 도, 화면 좌표라 270° = 맨 위) */
function arcPts(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

const f = (n: number) => n.toFixed(1);

/** 월계수 잎 하나: (x, y)에서 angle 방향으로 뻗은 아몬드 모양 */
function leafPath(x: number, y: number, angle: number, len: number, wid: number): string {
  const a = (angle * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const tx = x + ux * len;
  const ty = y + uy * len;
  const mx = x + ux * len * 0.5;
  const my = y + uy * len * 0.5;
  // 옆으로 볼록하게 (법선 방향)
  const nx = -uy * wid;
  const ny = ux * wid;
  return `M${f(x)} ${f(y)} Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)} Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)} Z`;
}

/** 부드러운 안쪽 선 (주름, 머리결). 실루엣 모드에서는 생략 */
function Soft({ p, d, color, w = 4, opacity = 1 }: { p: Paint; d: string; color: string; w?: number; opacity?: number }) {
  if (p.tinted) return null;
  return <Path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
}

/** 반투명 그림자 덩어리 (입체감). 실루엣 모드에서는 생략 */
function Tone({ p, d, color, opacity = 0.35 }: { p: Paint; d: string; color: string; opacity?: number }) {
  if (p.tinted) return null;
  return <Path d={d} fill={color} opacity={opacity} />;
}

/** 네 갈래 반짝이 별 (장식) */
function Sparkle({ p, x, y, r, color = '#FFF7B0' }: { p: Paint; x: number; y: number; r: number; color?: string }) {
  if (p.tinted) return null;
  const k = r * 0.25;
  return <Path d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`} fill={color} />;
}

/** 크고 반짝이는 파란 눈 */
function Eye({ p, cx, cy, rx, ry }: { p: Paint; cx: number; cy: number; rx: number; ry: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.fill(EYE_DARK)} stroke={p.line} strokeWidth={3} />
      <Ellipse cx={cx} cy={cy + ry * 0.12} rx={rx * 0.8} ry={ry * 0.8} fill={p.grad('zeus2-iris')} />
      <Ellipse cx={cx} cy={cy + ry * 0.1} rx={rx * 0.42} ry={ry * 0.45} fill={p.fill(EYE_DARK)} />
      {/* 큰 하이라이트 + 작은 하이라이트 (흰자처럼 보이도록 fill로 칠한다) */}
      <Ellipse cx={cx - rx * 0.32} cy={cy - ry * 0.38} rx={rx * 0.38} ry={ry * 0.34} fill={p.fill('#FFFFFF')} />
      <Circle cx={cx + rx * 0.38} cy={cy + ry * 0.42} r={rx * 0.17} fill={p.fill('#FFFFFF')} />
    </G>
  );
}

// ── 좌표 (viewBox 단위) ──────────────────────────────────────────
// 얼굴 중심. 오른쪽을 보도록 이목구비를 살짝 오른쪽으로 민다
const FX = 120;
const FY = 100;
/** 번개 든 팔의 어깨 (회전 축) */
const PIVOT: Pt = [182, 162];

// 뒷머리: 위쪽 반원을 따라 몽실몽실
const HAIR_BACK = (() => {
  const pts = arcPts(FX - 1, 88, 80, 72, 150, 390, 10);
  return `M${f(pts[0][0])} ${f(pts[0][1])}${bumps(pts, 0.56)} Q${FX} 176 ${f(pts[0][0])} ${f(pts[0][1])} Z`;
})();

// 수염: 볼에서 시작해 가슴까지, 아래 테두리가 몽실몽실
const BEARD = (() => {
  const pts: Pt[] = [
    [174, 98],
    [180, 122],
    [172, 146],
    [158, 168],
    [144, 184],
    [121, 190],
    [98, 184],
    [80, 168],
    [66, 146],
    [62, 122],
    [68, 98],
  ];
  return `M${pts[0][0]} ${pts[0][1]}${bumps(pts, 0.62)} C76 116 90 128 104 126 Q${FX} 122 136 126 C152 128 166 116 174 98 Z`;
})();

// 월계관 잎: 관자놀이(아래) → 정수리 쪽(위)으로 휘는 줄기를 따라 좌우 번갈아 붙인다. 오른쪽은 거울
const LAUREL: string[] = [];
const LAUREL_SHINE: Pt[] = [];
(() => {
  const stem = (t: number, m: number): [Pt, number] => {
    // 2차 베지어: (70,106) → (60,70) → (88,44)
    const P0: Pt = [70, 106];
    const P1: Pt = [60, 70];
    const P2: Pt = [88, 44];
    const x = (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0];
    const y = (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1];
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    return [[m < 0 ? 2 * FX - x : x, y], m < 0 ? 180 - a : a];
  };
  for (const m of [1, -1]) {
    const leaves: [number, number][] = [
      [0.02, -42],
      [0.24, 42],
      [0.46, -42],
      [0.68, 42],
      [0.9, -8],
    ];
    for (const [t, off] of leaves) {
      const [pt, a] = stem(t, m);
      const ang = a + off * m;
      LAUREL.push(leafPath(pt[0], pt[1], ang, 29, 16));
      const r = (ang * Math.PI) / 180;
      LAUREL_SHINE.push([pt[0] + Math.cos(r) * 11 + Math.sin(r) * 3, pt[1] + Math.sin(r) * 11 - Math.cos(r) * 3]);
    }
  }
})();

export const ZEUS_ART: Record<string, ArtDef> = {
  zeus: {
    w: 27,
    h: 26,
    defs: () => (
      <>
        <Ball id="zeus2-skin" light="#FFEADC" base="#FFD7C0" dark="#EBA383" />
        <RadialGradient id="zeus2-hair" cx="0.4" cy="0.3" r="0.8" fx="0.35" fy="0.2">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor="#F1F3F9" />
          <Stop offset="1" stopColor="#B9C2DA" />
        </RadialGradient>
        <VGrad id="zeus2-beard" from="#FFFFFF" mid="#F2F4FA" to="#BFC8DE" />
        <VGrad id="zeus2-white" from="#FFFFFF" mid="#F3F5FA" to="#C8D0E4" />
        <LinearGradient id="zeus2-cape" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F6F8FD" />
          <Stop offset="0.6" stopColor="#DCE2F0" />
          <Stop offset="1" stopColor="#A9B4D2" />
        </LinearGradient>
        <VGrad id="zeus2-gold" from="#FFF3A6" mid="#F6C640" to="#B67E14" />
        <LinearGradient id="zeus2-leaf" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF0A0" />
          <Stop offset="0.5" stopColor="#EDB938" />
          <Stop offset="1" stopColor="#A86E10" />
        </LinearGradient>
        <RadialGradient id="zeus2-iris" cx="0.5" cy="0.75" r="0.75">
          <Stop offset="0" stopColor="#9EE0FF" />
          <Stop offset="0.5" stopColor="#3E95E6" />
          <Stop offset="1" stopColor="#1C4C9E" />
        </RadialGradient>
        <VGrad id="zeus2-bolt" from="#FFFFE6" mid="#FFE650" to="#FFAC1C" />
        <VGrad id="zeus2-sandal" from="#B87A46" mid="#93592D" to="#5E3518" />
        <RadialGradient id="zeus2-glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFF6A0" stopOpacity={0.75} />
          <Stop offset="0.55" stopColor="#FFE866" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FFE866" stopOpacity={0} />
        </RadialGradient>
        {/* 테두리 빛 (rim light): 가장자리 쪽이 밝게 */}
        <RadialGradient id="zeus2-rim" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.55} />
        </RadialGradient>
      </>
    ),

    // ── 몸 (번개 든 팔은 weapon 층) ──────────────────────────────
    draw: (p) => (
      <G>
        {/* 망토 (몸 뒤, 왼쪽 뒤로 펄럭임) */}
        <Shape
          p={p}
          d="M84 150 C58 160 40 186 30 214 C24 230 26 240 34 236 C42 246 52 236 58 244 C68 250 76 240 84 246 L150 226 L156 152 Z"
          fill={p.grad('zeus2-cape')}
        />
        <Tone p={p} d="M84 150 C58 160 40 186 30 214 C24 230 26 240 34 236 C40 210 56 180 90 160 Z" color="#FFFFFF" opacity={0.6} />
        <Soft p={p} d="M70 172 Q54 200 44 228 M86 182 Q76 206 70 238" color="#AEB9D6" w={5} opacity={0.8} />

        {/* 짧은 다리 + 갈색 끈 샌들 (대부분 구름에 가려짐) */}
        <Shape p={p} d="M96 214 L94 240 Q104 244 112 240 L112 214 Z" fill={p.grad('zeus2-skin')} lw={6} />
        <Shape p={p} d="M130 214 L130 240 Q140 244 148 240 L146 214 Z" fill={p.grad('zeus2-skin')} lw={6} />
        <Path d="M94 228 L112 232 M95 236 L112 222" stroke={p.fill('#7A4522')} strokeWidth={4} strokeLinecap="round" />
        <Path d="M130 232 L147 228 M130 222 L147 236" stroke={p.fill('#7A4522')} strokeWidth={4} strokeLinecap="round" />
        <Shape p={p} d="M86 246 Q86 236 102 236 Q118 236 118 246 Q118 254 102 254 Q86 254 86 246 Z" fill={p.grad('zeus2-sandal')} lw={6} />
        <Shape p={p} d="M124 246 Q124 236 140 236 Q158 236 158 246 Q158 254 140 254 Q124 254 124 246 Z" fill={p.grad('zeus2-sandal')} lw={6} />

        {/* 토가 치마: 아래로 퍼지고 금색 단 */}
        <Shape p={p} d="M84 184 L160 184 L170 220 Q150 228 126 224 Q100 230 76 220 Z" fill={p.grad('zeus2-white')} />
        <Path d="M78 214 Q100 222 126 218 Q150 222 168 214" stroke={p.fill('#E9B83A')} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Tone p={p} d="M146 196 L160 186 L170 220 Q158 226 146 224 Z" color="#9AA6C6" opacity={0.35} />
        <Soft p={p} d="M100 194 Q98 208 96 220 M122 194 L124 220 M144 194 Q148 206 150 218" color="#C3CCE2" w={4} />

        {/* 상체 (드러난 오른쪽 가슴은 피부, 왼쪽 어깨는 토가) */}
        <Shape p={p} d="M86 150 Q124 136 172 146 Q190 150 190 164 Q184 178 168 182 L166 190 Q124 198 80 190 Z" fill={p.grad('zeus2-skin')} />
        <Shape p={p} d="M80 152 Q90 142 104 146 L164 186 L166 192 Q124 200 80 192 Z" fill={p.grad('zeus2-white')} />
        <Path d="M100 148 L162 186" stroke={p.fill('#E9B83A')} strokeWidth={5} strokeLinecap="round" />
        <Soft p={p} d="M96 160 Q112 172 118 190 M90 172 Q100 182 102 192" color="#C3CCE2" w={4} />

        {/* 금 벨트 + 둥근 버클 */}
        <Shape p={p} d="M78 184 Q122 194 166 184 L168 198 Q122 208 76 198 Z" fill={p.grad('zeus2-gold')} lw={5} />
        <Ellipse cx={124} cy={196} rx={14} ry={11} fill={p.grad('zeus2-gold')} stroke={p.line} strokeWidth={5} />
        <Ellipse cx={124} cy={196} rx={6} ry={4.5} fill="none" stroke={p.fill(GOLD_LINE)} strokeWidth={3} />
        <Shine p={p} cx={118} cy={191} rx={4} ry={2} opacity={0.9} rotate={-20} />

        {/* 반대쪽 팔: 허리에 주먹, 금 팔찌 */}
        <Shape p={p} d="M86 152 Q66 156 62 178 Q60 190 70 196 L84 190 Q78 178 90 172 Z" fill={p.grad('zeus2-skin')} />
        <Shape p={p} d="M62 172 Q72 168 84 172 L84 186 Q72 182 62 186 Z" fill={p.grad('zeus2-gold')} lw={5} />
        <Circle cx={76} cy={196} r={11} fill={p.grad('zeus2-skin')} stroke={p.line} strokeWidth={LW - 1} />
        <Path d="M74 190 Q80 192 82 198" stroke={p.line} strokeWidth={3} fill="none" strokeLinecap="round" />
        {/* 금 어깨 장식 */}
        <Shape p={p} d="M70 158 Q72 140 92 140 Q104 142 106 152 Q92 156 78 166 Q70 166 70 158 Z" fill={p.grad('zeus2-gold')} lw={5} />
        <Shine p={p} cx={86} cy={146} rx={7} ry={2.5} opacity={0.9} rotate={-12} />

        {/* ── 머리 ── */}
        {/* 풍성한 뒷머리 */}
        <Shape p={p} d={HAIR_BACK} fill={p.grad('zeus2-hair')} />
        <Shape p={p} d="M58 106 C44 118 40 138 48 156 C52 146 58 144 64 148 C62 138 66 128 74 124 Z" fill={p.grad('zeus2-hair')} />
        <Shape p={p} d="M182 106 C196 118 200 138 192 156 C188 146 182 144 176 148 C178 138 174 128 166 124 Z" fill={p.grad('zeus2-hair')} />
        <Shine p={p} cx={92} cy={22} rx={16} ry={5} opacity={0.9} rotate={-14} />
        <Soft p={p} d="M50 78 Q56 66 66 60 M182 58 Q192 66 194 78" color={HAIR_SHADE} w={4} opacity={0.8} />
        <Shape p={p} d="M104 22 C102 8 116 0 128 6 C120 8 118 14 122 20 Z" fill={p.grad('zeus2-hair')} lw={5} />
        {/* 얼굴 */}
        <Ellipse cx={FX} cy={FY} rx={54} ry={48} fill={p.grad('zeus2-skin')} stroke={p.line} strokeWidth={LW} />
        {/* 앞머리 그림자 (이마) */}
        <Tone p={p} d={`M70 78 Q${FX} 66 170 78 L170 86 Q${FX} 74 70 86 Z`} color={SKIN_SHADE} opacity={0.35} />
        {/* 앞머리: 이마 위로 휘날리는 머리 다발 */}
        <Shape
          p={p}
          d="M62 98 C52 60 80 32 118 32 C154 32 182 54 180 98 C178 82 166 72 152 76 C146 66 134 62 122 70 C112 60 96 62 90 74 C76 72 64 82 62 98 Z"
          fill={p.grad('zeus2-hair')}
        />
        <Soft p={p} d="M100 50 Q112 54 118 64 M138 50 Q148 56 150 66" color={HAIR_SHADE} w={4} opacity={0.8} />
        <Shine p={p} cx={100} cy={46} rx={14} ry={5} opacity={0.85} rotate={-10} />

        {/* 월계관: 양쪽 관자놀이에서 정수리 쪽으로 뻗은 통통한 금 잎 */}
        {LAUREL.map((d, i) => (
          <Path key={i} d={d} fill={p.grad('zeus2-leaf')} stroke={p.line} strokeWidth={4} strokeLinejoin="round" />
        ))}
        {!p.tinted && LAUREL_SHINE.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={2.4} fill="#FFFFFF" opacity={0.85} />)}

        {/* 화난 듯 귀여운 굵은 흰 눈썹 (가운데로 내려감) */}
        <Shape p={p} d="M74 84 Q76 72 88 74 Q98 70 104 78 Q112 82 110 90 Q104 94 98 90 Q88 84 80 92 Q72 92 74 84 Z" fill={p.grad('zeus2-white')} lw={5} />
        <Shape p={p} d="M168 84 Q166 72 154 74 Q144 70 138 78 Q130 82 132 90 Q138 94 144 90 Q154 84 162 92 Q170 92 168 84 Z" fill={p.grad('zeus2-white')} lw={5} />

        {/* 눈 */}
        <Eye p={p} cx={97} cy={106} rx={13} ry={15} />
        <Eye p={p} cx={145} cy={106} rx={13} ry={15} />
        {/* 볼터치 */}
        {!p.tinted && <Ellipse cx={78} cy={125} rx={11} ry={7} fill={BLUSH} opacity={0.75} />}
        {!p.tinted && <Ellipse cx={164} cy={125} rx={11} ry={7} fill={BLUSH} opacity={0.75} />}

        {/* 큰 수염 */}
        <Shape p={p} d={BEARD} fill={p.grad('zeus2-beard')} />
        <Soft p={p} d="M88 148 Q96 160 90 172 M110 152 Q116 166 108 180 M134 152 Q128 166 136 180 M154 146 Q146 158 152 170" color={HAIR_SHADE} w={4} opacity={0.85} />
        {/* 수염 아래쪽 그림자 + 위쪽 하이라이트 (부드러운 입체감) */}
        <Tone p={p} d="M70 150 Q80 176 100 184 Q121 192 142 184 Q162 176 170 150 Q150 176 121 178 Q92 176 70 150 Z" color="#9AA6C6" opacity={0.3} />
        <Shine p={p} cx={78} cy={136} rx={5} ry={10} opacity={0.6} rotate={20} />
        {/* 입 (콧수염 아래 살짝) */}
        <Path d="M112 142 Q121 138 130 142" stroke={p.line} strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* 콧수염: 양쪽으로 말린 두 덩어리 */}
        <Shape
          p={p}
          d="M121 124 C110 116 92 118 84 128 C78 136 84 146 94 142 C104 146 114 140 121 134 C128 140 138 146 148 142 C158 146 164 136 158 128 C150 118 132 116 121 124 Z"
          fill={p.grad('zeus2-white')}
          lw={5}
        />
        <Shine p={p} cx={100} cy={126} rx={7} ry={2.5} opacity={0.9} rotate={-15} />
        {/* 코 */}
        <Ellipse cx={121} cy={120} rx={7} ry={5} fill={p.grad('zeus2-skin')} stroke={p.line} strokeWidth={4} />
        <Shine p={p} cx={70} cy={70} rx={6} ry={2} opacity={0.6} rotate={-60} />
      </G>
    ),

    // ── 번개 든 팔 (어깨를 축으로 휘두른다) ─────────────────────
    weapon: {
      pivot: PIVOT,
      draw: (p) => (
        <G>
          {!p.tinted && <Circle cx={222} cy={92} r={42} fill="url(#zeus2-glow)" />}
          {/* 위팔 + 아래팔 (팔꿈치에서 꺾여 위로) */}
          <Path d="M182 162 L202 174 L212 128" stroke={p.line} strokeWidth={31} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M182 162 L202 174 L212 128" stroke={p.fill('#FFD9C2')} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Soft p={p} d="M186 172 L200 182" color={SKIN_SHADE} w={5} opacity={0.6} />
          {/* 금 팔찌 */}
          <Path d="M199 160 L207 141" stroke={p.line} strokeWidth={31} strokeLinecap="butt" />
          <Path d="M199.5 158 L206.5 143" stroke={p.grad('zeus2-gold')} strokeWidth={24} strokeLinecap="butt" />
          {/* 번개 */}
          <Shape p={p} d="M222 22 L256 26 L236 68 L256 70 L200 168 L214 108 L196 106 Z" fill={p.grad('zeus2-bolt')} lw={6} />
          <Shine p={p} cx={232} cy={34} rx={9} ry={3} opacity={0.95} rotate={-62} />
          <Path d="M226 30 L246 32 L232 66" stroke={p.fill('#FFFFFF')} strokeWidth={3} fill="none" opacity={p.tinted ? 0 : 0.7} strokeLinecap="round" />
          {/* 주먹 (번개를 꽉 쥠) */}
          <Ellipse cx={213} cy={122} rx={16} ry={14} fill={p.grad('zeus2-skin')} stroke={p.line} strokeWidth={LW - 1} />
          <Path d="M203 116 Q213 112 223 116 M202 124 Q212 121 222 124" stroke={p.line} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* 둥근 맨 어깨 (회전해도 모양이 같아서 관절이 티 나지 않는다) */}
          <Circle cx={PIVOT[0]} cy={PIVOT[1]} r={15} fill={p.grad('zeus2-skin')} stroke={p.line} strokeWidth={LW - 1} />
          {!p.tinted && <Ellipse cx={PIVOT[0] - 4} cy={PIVOT[1] - 6} rx={6} ry={3} fill="#FFFFFF" opacity={0.55} transform={`rotate(-25 ${PIVOT[0] - 4} ${PIVOT[1] - 6})`} />}
          <Sparkle p={p} x={262} y={92} r={8} />
          <Sparkle p={p} x={190} y={36} r={7} />
          <Sparkle p={p} x={246} y={140} r={6} />
        </G>
      ),
    },
  },
};
