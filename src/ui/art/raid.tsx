import { ReactNode } from 'react';
import { Circle, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { ArtDef, Ball, LW, Paint, Shape, Shine, VGrad } from './kit';

/*
 * 레이드 보스·거인 (카툰 일러스트).
 * 좌표는 칸×10 단위. 큰 레이드 보스로도, 필드 몬스터(약 55pt)로도 쓰이므로 실루엣이 단순하고 굵게.
 */

// ───────────── 공용 도우미 ─────────────

/** 좌우 뒤집기: 경로의 모든 (x y) 좌표를 axis 기준으로 반사 (M/L/C/Q/Z 절대좌표 경로 전용) */
function mx(d: string, axis: number): string {
  return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (_, x, y) => `${2 * axis - Number(x)} ${y}`);
}

/**
 * 외곽선 있는 굵은 관(뱀 몸통·팔·목).
 * 외곽선 색으로 두껍게 한 번 → 몸 색으로 한 번 → 무늬 띠 → 그림자/하이라이트 순서로 겹쳐 그린다.
 */
function Tube({ p, d, w, color, dark, light, band, lw = LW }: { p: Paint; d: string; w: number; color: string; dark?: string; light?: string; band?: string; lw?: number }) {
  const s = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const o = w * 0.17;
  return (
    <G>
      <Path d={d} stroke={p.line} strokeWidth={w + lw * 2} {...s} />
      <Path d={d} stroke={p.fill(color)} strokeWidth={w} {...s} />
      {!p.tinted && dark && <Path d={d} stroke={p.fill(dark)} strokeWidth={w * 0.36} transform={`translate(${o} ${o})`} {...s} />}
      {!p.tinted && band && <Path d={d} stroke={p.fill(band)} strokeWidth={w * 0.62} strokeDasharray={`${w * 0.28} ${w * 0.5}`} {...s} strokeLinecap="butt" />}
      {!p.tinted && light && <Path d={d} stroke={p.fill(light)} strokeWidth={w * 0.2} opacity={0.75} transform={`translate(${-o} ${-o})`} {...s} />}
    </G>
  );
}

/**
 * 뱀 머리. 기본은 +x(오른쪽)를 보고, flip이면 왼쪽을 본다.
 * rot: 돌리는 각도(도). flip일 때 +는 왼쪽 위, 아닐 때 -가 오른쪽 위.
 */
function SerpentHead({ p, x, y, s = 1, rot = 0, flip = false, skin, dark, eye = '#FF2E2E', tongue = true, horns = false }: {
  p: Paint; x: number; y: number; s?: number; rot?: number; flip?: boolean; skin: string; dark: string; eye?: string; tongue?: boolean; horns?: boolean;
}) {
  const lw = LW / s;
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`}>
      {horns && <Shape p={p} d="M-8 -12 L-30 -26 L-14 -6 Z M2 -16 L-12 -36 L12 -18 Z" fill={p.fill('#3A2030')} lw={lw * 0.8} />}
      {/* 아래턱 */}
      <Shape p={p} d="M-12 6 C4 12 22 12 44 18 C40 26 16 28 -6 20 Z" fill={p.fill(dark)} lw={lw} />
      {/* 벌린 입속 */}
      <Path d="M10 6 L50 2 L42 18 C30 16 18 12 10 6 Z" fill={p.fill('#3A0F2E')} />
      {tongue && <Path d="M30 11 C38 12 44 13 50 12 L56 8 M50 12 L56 16" stroke={p.fill('#E5484D')} strokeWidth={3.5 / s} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
      {/* 송곳니 */}
      <Path d="M38 3 L41 12 L45 2 Z M26 5 L28 11 L31 4 Z" fill={p.fill('#F4F1E6')} />
      {/* 위턱 + 머리 */}
      <Shape p={p} d="M-16 4 C-18 -16 4 -26 24 -20 C38 -16 50 -8 56 0 C44 4 24 6 8 8 C-2 10 -10 10 -16 4 Z" fill={p.fill(skin)} lw={lw} />
      {!p.tinted && <Path d="M-6 -12 C6 -20 22 -18 34 -12" stroke={p.fill('#FFFFFF')} strokeWidth={3 / s} opacity={0.35} fill="none" strokeLinecap="round" />}
      {/* 눈썹 뿔 + 빛나는 눈 */}
      <Shape p={p} d="M2 -14 L24 -12 L6 -22 Z" fill={p.fill(dark)} lw={lw * 0.7} />
      <Ellipse cx={14} cy={-8} rx={6} ry={4.2} fill={p.fill(eye)} stroke={p.line} strokeWidth={lw * 0.55} />
      <Circle cx={15.5} cy={-9} r={1.6} fill={p.fill('#FFF6D0')} />
      <Circle cx={48} cy={-3} r={1.6} fill={p.line} />
    </G>
  );
}

/** 빛나는 눈 (뒤에 은은한 빛 번짐) */
function GlowEye({ p, cx, cy, rx, ry, color, core, rot = 0 }: { p: Paint; cx: number; cy: number; rx: number; ry: number; color: string; core: string; rot?: number }) {
  return (
    <G transform={`rotate(${rot} ${cx} ${cy})`}>
      {!p.tinted && <Ellipse cx={cx} cy={cy} rx={rx * 1.9} ry={ry * 2.1} fill={p.fill(color)} opacity={0.28} />}
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.fill(color)} stroke={p.line} strokeWidth={4} />
      <Ellipse cx={cx + rx * 0.1} cy={cy} rx={rx * 0.45} ry={ry * 0.55} fill={p.fill(core)} />
    </G>
  );
}

// ───────────── 기간테스(거인 병사) 공용 몸 ─────────────
// 좌표 기준: 몸 중심 x=100, 머리 위 y≈8, 뱀 다리 끝 y≈272 (giant_spear 기준, 투석병은 아래로 옮겨 씀)

const G_SKIN = { light: '#CDD88E', base: '#8F9A5B', dark: '#4A552A' };
const G_SNAKE = { color: '#5E8C43', dark: '#2F4F24', light: '#A6D27A', band: '#3D6430' };

function gigasDefs(id: string, hair: [string, string]) {
  return (
    <>
      <Ball id={`${id}-skin`} light={G_SKIN.light} base={G_SKIN.base} dark={G_SKIN.dark} />
      <VGrad id={`${id}-torso`} from="#B4C07A" to="#5E6936" />
      <VGrad id={`${id}-hair`} from={hair[0]} to={hair[1]} />
      <VGrad id={`${id}-mouth`} from="#3A0F2E" to="#120612" />
      <VGrad id={`${id}-belt`} from="#A86A38" to="#5A3418" />
      <Ball id={`${id}-hip`} light="#8CC068" base="#4F7A3A" dark="#2A4420" />
    </>
  );
}

/** 뱀 다리 두 개 + 엉덩이 */
function gigasLegs(p: Paint, id: string) {
  return (
    <G>
      <Tube p={p} d="M96 182 C60 188 18 200 20 232 C22 258 46 264 62 252" w={26} {...G_SNAKE} />
      <Tube p={p} d="M104 182 C140 188 182 200 180 232 C178 258 154 264 138 252" w={26} {...G_SNAKE} />
      <SerpentHead p={p} x={60} y={250} s={0.74} rot={-50} skin="#86BC5E" dark="#3D6430" />
      <SerpentHead p={p} x={140} y={250} s={0.74} rot={50} flip skin="#86BC5E" dark="#3D6430" />
      <Shape p={p} d="M50 180 C50 166 150 166 150 180 C150 196 128 200 100 200 C72 200 50 196 50 180 Z" fill={p.grad(`${id}-hip`)} />
    </G>
  );
}

/** 근육질 몸통 + 허리띠 */
function gigasTorso(p: Paint, id: string, strap: boolean) {
  return (
    <G>
      <Shape p={p} d="M34 116 C60 104 140 104 166 116 C180 122 182 140 172 150 C166 160 160 168 152 176 L48 176 C40 168 34 160 28 150 C18 140 20 122 34 116 Z" fill={p.grad(`${id}-torso`)} />
      {/* 가슴·복근 */}
      <Path d="M58 132 Q78 146 97 134 M103 134 Q122 146 142 132 M100 138 L100 166 M86 152 L96 153 M104 153 L114 152 M88 164 L96 165 M104 165 L112 164" stroke={p.fill(G_SKIN.dark)} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Shine p={p} cx={66} cy={124} rx={16} ry={6} opacity={0.35} />
      {strap && <Tube p={p} d="M44 118 L150 174" w={10} color="#8A552B" dark="#5A3418" lw={4} />}
      <Shape p={p} d="M44 164 L156 164 L158 184 L42 184 Z" fill={p.grad(`${id}-belt`)} lw={6} />
      <Circle cx={100} cy={174} r={7} fill={p.fill('#D9A441')} stroke={p.line} strokeWidth={4} />
      {/* 가죽 앞가리개 */}
      <Shape p={p} d="M82 184 L118 184 L114 206 L100 200 L86 206 Z" fill={p.fill('#7A4A26')} lw={5} />
    </G>
  );
}

/** 거인 얼굴 (중심 x=100). 험상궂은 눈썹, 빨간 눈, 아랫니 송곳니 */
function gigasHead(p: Paint, id: string) {
  return (
    <G>
      {/* 뒷머리 갈기 */}
      <Shape p={p} d="M100 6 C120 4 140 8 152 18 C168 16 182 30 176 46 C188 56 184 74 170 82 C168 66 160 56 150 52 L50 52 C40 56 32 66 30 82 C16 74 12 56 24 46 C18 30 32 16 48 18 C60 8 80 4 100 6 Z" fill={p.grad(`${id}-hair`)} />
      {/* 뾰족 귀 */}
      <Shape p={p} d="M54 62 L28 48 L34 74 C38 84 48 86 54 82 Z" fill={p.fill(G_SKIN.base)} lw={6} />
      <Shape p={p} d={mx('M54 62 L28 48 L34 74 C38 84 48 86 54 82 Z', 100)} fill={p.fill(G_SKIN.base)} lw={6} />
      {/* 얼굴 */}
      <Shape p={p} d="M50 46 C50 22 74 14 100 14 C126 14 150 22 150 46 L152 78 C152 100 130 112 100 112 C70 112 48 100 48 78 Z" fill={p.grad(`${id}-skin`)} />
      <Path d="M56 92 C66 106 82 110 100 110 C118 110 134 106 144 92 C136 102 120 106 100 106 C80 106 64 102 56 92 Z" fill={p.fill(G_SKIN.dark)} />
      {/* 앞머리 */}
      <Shape p={p} d="M46 58 L48 36 C56 20 78 12 100 12 C122 12 144 20 152 36 L154 58 L140 44 L132 56 L120 40 L110 52 L100 36 L90 52 L80 40 L68 56 L60 44 Z" fill={p.grad(`${id}-hair`)} lw={6} />
      {/* 눈구멍 + 빛나는 눈 */}
      <Ellipse cx={77} cy={74} rx={14} ry={9} fill={p.fill('#2A1238')} />
      <Ellipse cx={123} cy={74} rx={14} ry={9} fill={p.fill('#2A1238')} />
      <GlowEye p={p} cx={78} cy={75} rx={8} ry={5.5} color="#FF2E2E" core="#FFD0C0" rot={12} />
      <GlowEye p={p} cx={122} cy={75} rx={8} ry={5.5} color="#FF2E2E" core="#FFD0C0" rot={-12} />
      {/* 험상궂은 눈썹 */}
      <Shape p={p} d="M56 58 C70 56 84 60 98 70 L95 76 C82 70 68 68 58 68 Z" fill={p.grad(`${id}-hair`)} lw={5} />
      <Shape p={p} d={mx('M56 58 C70 56 84 60 98 70 L95 76 C82 70 68 68 58 68 Z', 100)} fill={p.grad(`${id}-hair`)} lw={5} />
      {/* 코 */}
      <Path d="M92 76 C90 82 86 86 90 89 C95 92 105 92 110 89 C114 86 110 82 108 76" stroke={p.line} strokeWidth={4} fill="none" strokeLinecap="round" />
      {/* 입 + 이빨 + 아래 송곳니 */}
      <Shape p={p} d="M66 93 Q100 89 134 93 Q128 109 100 109 Q72 109 66 93 Z" fill={p.grad(`${id}-mouth`)} lw={5} />
      <Path d="M72 94 L77 100 L83 93 L89 100 L95 92 L100 99 L105 92 L111 100 L117 93 L123 100 L128 94 Z" fill={p.fill('#F4F1E6')} />
      <Shape p={p} d="M74 107 L77 88 L86 105 Z" fill={p.fill('#F4F1E6')} lw={4} />
      <Shape p={p} d="M126 107 L123 88 L114 105 Z" fill={p.fill('#F4F1E6')} lw={4} />
      <Shine p={p} cx={70} cy={34} rx={12} ry={5} opacity={0.4} />
    </G>
  );
}

/** 가리비 껍데기 방패 (폴리보테스 왼손). 경첩 (55,226)에서 부채꼴로 퍼진 물결 테두리 + 골 */
const SHELL = (() => {
  const cx = 55, cy = 226, rx = 48, ry = 84, n = 7;
  const pt = (deg: number, k: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(cx + rx * k * Math.cos(a)).toFixed(1)} ${(cy + ry * k * Math.sin(a)).toFixed(1)}`;
  };
  const ang = (i: number) => 200 + (140 * i) / n;
  let outline = `M${cx} ${cy} L${pt(ang(0), 1)}`;
  let ribs = '';
  for (let i = 0; i < n; i++) {
    outline += ` Q${pt((ang(i) + ang(i + 1)) / 2, 1.13)} ${pt(ang(i + 1), 1)}`;
    if (i > 0) ribs += ` M${cx} ${cy - 6} L${pt(ang(i), 0.9)}`;
  }
  return { outline: outline + ' Z', ribs };
})();

// ───────────── 그림들 ─────────────

export const RAID_ART: Record<string, ArtDef> = {
  // 기간테스 창병: 갈기머리 거인, 뱀 다리, 오른쪽에 커다란 창
  giant_spear: {
    w: 24,
    h: 28,
    defs: () => (
      <>
        {gigasDefs('giant_spear', ['#6E4626', '#24140A'])}
        <VGrad id="giant_spear-blade" from="#FFFFFF" mid="#C6D0E4" to="#7584A6" />
        <LinearGradient id="giant_spear-wood" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#B07A44" />
          <Stop offset="1" stopColor="#5E3A1C" />
        </LinearGradient>
      </>
    ),
    draw: (p) => (
      <G>
        {/* 창 (몸 뒤) */}
        <Shape p={p} d="M211 54 L223 54 L223 276 L211 276 Z" fill={p.grad('giant_spear-wood')} lw={6} />
        <Shape p={p} d="M217 4 C232 22 234 42 217 62 C200 42 202 22 217 4 Z" fill={p.grad('giant_spear-blade')} lw={6} />
        <Path d="M217 14 L217 54" stroke={p.fill('#7584A6')} strokeWidth={3} />
        <Shine p={p} cx={211} cy={30} rx={3} ry={10} opacity={0.8} rotate={10} />
        <Shape p={p} d="M209 60 L225 60 L225 70 L209 70 Z" fill={p.fill('#5A3418')} lw={5} />
        <Shape p={p} d="M224 66 C236 72 238 86 232 98 C228 88 224 80 219 74 Z" fill={p.fill('#E5484D')} lw={4} />
        {gigasLegs(p, 'giant_spear')}
        {/* 왼팔 (축 늘어뜨림) */}
        <Tube p={p} d="M32 128 C22 146 18 158 22 172" w={26} color={G_SKIN.base} dark={G_SKIN.dark} light={G_SKIN.light} />
        {gigasTorso(p, 'giant_spear', true)}
        <Shape p={p} d="M8 176 C8 164 18 158 26 160 C36 162 38 174 34 184 C30 192 14 192 8 176 Z" fill={p.grad('giant_spear-skin')} lw={6} />
        {/* 오른팔: 창을 움켜쥠 */}
        <Tube p={p} d="M164 128 C182 142 196 146 210 138" w={24} color={G_SKIN.base} dark={G_SKIN.dark} light={G_SKIN.light} />
        <Ellipse cx={34} cy={124} rx={22} ry={20} fill={p.grad('giant_spear-skin')} stroke={p.line} strokeWidth={LW} />
        <Ellipse cx={166} cy={124} rx={22} ry={20} fill={p.grad('giant_spear-skin')} stroke={p.line} strokeWidth={LW} />
        <Shape p={p} d="M204 128 C206 118 230 118 232 128 L232 148 C230 158 206 158 204 148 Z" fill={p.grad('giant_spear-skin')} lw={6} />
        <Path d="M206 136 L230 136 M206 145 L230 145" stroke={p.line} strokeWidth={3.5} strokeLinecap="round" />
        {gigasHead(p, 'giant_spear')}
      </G>
    ),
  },

  // 기간테스 투석병: 머리 위로 큰 바위를 번쩍 든 거인
  giant_rock: {
    w: 22,
    h: 33,
    defs: () => (
      <>
        {gigasDefs('giant_rock', ['#A8743E', '#4A2A12'])}
        <Ball id="giant_rock-stone" light="#E4E4F0" base="#8A8AA0" dark="#3A3C4A" />
      </>
    ),
    draw: (p) => (
      <G>
        <G transform="translate(0 52)">
          {gigasLegs(p, 'giant_rock')}
          {/* 두 팔을 번쩍 들어 올림 */}
          <Tube p={p} d="M36 126 C14 104 12 66 26 22" w={26} color={G_SKIN.base} dark={G_SKIN.dark} light={G_SKIN.light} />
          <Tube p={p} d="M164 126 C186 104 188 66 174 22" w={26} color={G_SKIN.base} dark={G_SKIN.dark} light={G_SKIN.light} />
          {gigasTorso(p, 'giant_rock', false)}
          <Ellipse cx={36} cy={122} rx={22} ry={20} fill={p.grad('giant_rock-skin')} stroke={p.line} strokeWidth={LW} />
          <Ellipse cx={164} cy={122} rx={22} ry={20} fill={p.grad('giant_rock-skin')} stroke={p.line} strokeWidth={LW} />
          {gigasHead(p, 'giant_rock')}
        </G>
        {/* 바위 */}
        <Shape p={p} d="M22 46 C14 24 40 8 76 10 C98 2 140 4 162 12 C188 16 202 34 194 52 C190 70 160 76 120 74 C80 78 32 72 22 46 Z" fill={p.grad('giant_rock-stone')} />
        <Path d="M96 14 L104 30 L96 42 M140 46 L156 40 L166 52 M52 54 L66 46" stroke={p.line} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M40 60 C70 70 130 72 180 58" stroke={p.fill('#3A3C4A')} strokeWidth={5} opacity={p.tinted ? 1 : 0.5} fill="none" strokeLinecap="round" />
        <Ellipse cx={130} cy={22} rx={14} ry={6} fill={p.fill('#6CA048')} opacity={p.tinted ? 1 : 0.8} />
        <Ellipse cx={58} cy={26} rx={9} ry={4} fill={p.fill('#6CA048')} opacity={p.tinted ? 1 : 0.8} />
        <Shine p={p} cx={60} cy={30} rx={22} ry={8} opacity={0.45} />
        {/* 바위를 움켜쥔 손 */}
        <Shape p={p} d="M10 70 C6 56 18 50 30 54 C44 58 44 74 36 82 C28 90 14 86 10 70 Z" fill={p.grad('giant_rock-skin')} lw={6} />
        <Shape p={p} d={mx('M10 70 C6 56 18 50 30 54 C44 58 44 74 36 82 C28 90 14 86 10 70 Z', 102)} fill={p.grad('giant_rock-skin')} lw={6} />
        <Path d="M18 60 L30 62 M16 70 L30 71 M168 62 L180 60 M172 71 L186 70" stroke={p.line} strokeWidth={3.5} strokeLinecap="round" />
        {/* 떨어지는 돌 부스러기 */}
        <Shape p={p} d="M200 74 L210 70 L214 80 L204 84 Z" fill={p.fill('#8A8AA0')} lw={4} />
        <Shape p={p} d="M6 96 L14 92 L16 100 L8 103 Z" fill={p.fill('#8A8AA0')} lw={4} />
      </G>
    ),
  },
  // 거인의 왕 포르피리온: 왕관, 풍성한 수염, 붉은 망토, 황금 어깨갑옷, 거대한 양날 도끼
  porphyrion: {
    w: 37,
    h: 34,
    defs: () => (
      <>
        <Ball id="porphyrion-skin" light="#C8D488" base="#86915A" dark="#434E26" />
        <VGrad id="porphyrion-torso" from="#ADBA74" to="#56602F" />
        <VGrad id="porphyrion-hair" from="#6A4224" to="#1E0F06" />
        <VGrad id="porphyrion-gold" from="#FFF3A6" mid="#FFD54A" to="#B07A12" />
        <Ball id="porphyrion-plate" light="#FFF6C0" base="#F2C23A" dark="#94600E" />
        <VGrad id="porphyrion-cape" from="#E8505A" to="#6E1020" />
        <VGrad id="porphyrion-blade" from="#FFFFFF" mid="#C6D0E4" to="#6E7C9E" />
        <VGrad id="porphyrion-mouth" from="#3A0F2E" to="#120612" />
        <Ball id="porphyrion-hip" light="#8CC068" base="#4F7A3A" dark="#2A4420" />
        <LinearGradient id="porphyrion-wood" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#B07A44" />
          <Stop offset="1" stopColor="#4E2E14" />
        </LinearGradient>
      </>
    ),
    draw: (p) => (
      <G>
        {/* 양날 도끼 (몸 뒤) */}
        <Shape p={p} d="M279 70 L291 70 L291 304 L279 304 Z" fill={p.grad('porphyrion-wood')} lw={6} />
        <Circle cx={285} cy={308} r={9} fill={p.grad('porphyrion-gold')} stroke={p.line} strokeWidth={5} />
        <Shape p={p} d="M285 4 L295 38 L275 38 Z" fill={p.grad('porphyrion-blade')} lw={6} />
        <Shape p={p} d="M292 30 C326 16 360 44 360 68 C360 92 326 118 292 104 C300 80 300 54 292 30 Z" fill={p.grad('porphyrion-blade')} />
        <Shape p={p} d="M278 40 C254 32 226 50 224 68 C226 86 254 102 278 94 C272 76 272 58 278 40 Z" fill={p.grad('porphyrion-blade')} />
        {!p.tinted && <Path d="M326 30 C352 46 354 88 326 106 M246 44 C230 56 230 80 246 92" stroke={p.fill('#FFFFFF')} strokeWidth={4} opacity={0.7} fill="none" strokeLinecap="round" />}
        <Shape p={p} d="M272 30 L298 30 L298 106 L272 106 Z" fill={p.grad('porphyrion-gold')} lw={6} />
        <Circle cx={285} cy={68} r={7} fill={p.fill('#FF2E2E')} stroke={p.line} strokeWidth={4} />
        {/* 붉은 망토 */}
        <Shape p={p} d="M54 146 L246 146 C266 180 272 220 270 264 C256 254 244 268 228 258 L72 258 C56 268 44 254 30 264 C28 220 34 180 54 146 Z" fill={p.grad('porphyrion-cape')} />
        {/* 뒷머리 갈기 */}
        <Shape p={p} d="M150 22 C192 20 228 38 234 76 C242 110 238 140 224 160 L76 160 C62 140 58 110 66 76 C72 38 108 20 150 22 Z" fill={p.grad('porphyrion-hair')} />
        {/* 뱀 다리 */}
        <Tube p={p} d="M126 246 C84 252 38 266 38 298 C38 324 66 332 84 316" w={32} {...G_SNAKE} />
        <Tube p={p} d={mx('M126 246 C84 252 38 266 38 298 C38 324 66 332 84 316', 150)} w={32} {...G_SNAKE} />
        <SerpentHead p={p} x={82} y={314} s={0.92} rot={-50} skin="#86BC5E" dark="#3D6430" />
        <SerpentHead p={p} x={218} y={314} s={0.92} rot={50} flip skin="#86BC5E" dark="#3D6430" />
        <Shape p={p} d="M84 246 C84 230 216 230 216 246 C216 264 186 270 150 270 C114 270 84 264 84 246 Z" fill={p.grad('porphyrion-hip')} />
        {/* 팔 */}
        <Tube p={p} d="M50 170 C40 190 36 204 38 222" w={30} color="#86915A" dark="#434E26" light="#C8D488" />
        <Tube p={p} d="M248 168 C264 188 276 192 284 178" w={30} color="#86915A" dark="#434E26" light="#C8D488" />
        {/* 몸통 */}
        <Shape p={p} d="M58 150 C100 138 200 138 242 150 C258 160 258 186 246 198 C240 210 232 220 222 230 L78 230 C68 220 60 210 54 198 C42 186 42 160 58 150 Z" fill={p.grad('porphyrion-torso')} />
        <Path d="M150 186 L150 206 M132 196 L145 197 M155 197 L168 196" stroke={p.fill('#434E26')} strokeWidth={4} strokeLinecap="round" fill="none" />
        {/* 황금 허리띠 + 붉은 앞가리개 */}
        <Shape p={p} d="M100 228 L200 228 L194 262 L172 252 L150 266 L128 252 L106 262 Z" fill={p.grad('porphyrion-cape')} lw={6} />
        <Shape p={p} d="M70 206 L230 206 L226 232 L74 232 Z" fill={p.grad('porphyrion-gold')} lw={6} />
        <Path d="M96 219 L96 219 M120 219 L120 219 M180 219 L180 219 M204 219 L204 219" stroke={p.fill('#94600E')} strokeWidth={7} strokeLinecap="round" />
        <Shape p={p} d="M150 206 L164 219 L150 234 L136 219 Z" fill={p.fill('#6FE3FF')} lw={5} />
        <Shine p={p} cx={146} cy={214} rx={4} ry={2.5} opacity={0.9} />
        {/* 주먹 */}
        <Shape p={p} d="M20 230 C20 216 32 210 42 212 C54 214 58 228 52 240 C46 250 26 248 20 230 Z" fill={p.grad('porphyrion-skin')} lw={6} />
        <Shape p={p} d="M270 166 C272 154 298 154 300 166 L300 190 C298 200 272 200 270 190 Z" fill={p.grad('porphyrion-skin')} lw={6} />
        <Path d="M272 174 L298 174 M272 183 L298 183" stroke={p.line} strokeWidth={3.5} strokeLinecap="round" />
        {/* 황금 어깨갑옷 */}
        <Shape p={p} d="M40 134 L30 112 L54 128 Z M66 130 L66 106 L80 132 Z" fill={p.grad('porphyrion-gold')} lw={5} />
        <Shape p={p} d={mx('M40 134 L30 112 L54 128 Z M66 130 L66 106 L80 132 Z', 150)} fill={p.grad('porphyrion-gold')} lw={5} />
        <Shape p={p} d="M20 172 C14 146 40 128 66 132 C90 136 100 156 94 174 C72 168 44 168 20 172 Z" fill={p.grad('porphyrion-plate')} />
        <Shape p={p} d={mx('M20 172 C14 146 40 128 66 132 C90 136 100 156 94 174 C72 168 44 168 20 172 Z', 150)} fill={p.grad('porphyrion-plate')} />
        <Circle cx={60} cy={154} r={7} fill={p.fill('#E5484D')} stroke={p.line} strokeWidth={4} />
        <Circle cx={240} cy={154} r={7} fill={p.fill('#E5484D')} stroke={p.line} strokeWidth={4} />
        <Shine p={p} cx={44} cy={146} rx={10} ry={5} opacity={0.6} />
        {/* 머리 */}
        <Shape p={p} d="M92 76 L62 58 L70 90 C74 100 86 102 92 98 Z" fill={p.fill('#86915A')} lw={6} />
        <Shape p={p} d={mx('M92 76 L62 58 L70 90 C74 100 86 102 92 98 Z', 150)} fill={p.fill('#86915A')} lw={6} />
        <Shape p={p} d="M90 60 C90 38 116 30 150 30 C184 30 210 38 210 60 L212 92 C212 116 186 128 150 128 C114 128 88 116 88 92 Z" fill={p.grad('porphyrion-skin')} />
        <Ellipse cx={126} cy={82} rx={15} ry={9} fill={p.fill('#2A1238')} />
        <Ellipse cx={174} cy={82} rx={15} ry={9} fill={p.fill('#2A1238')} />
        <GlowEye p={p} cx={127} cy={83} rx={9} ry={6} color="#FF2E2E" core="#FFD0C0" rot={12} />
        <GlowEye p={p} cx={173} cy={83} rx={9} ry={6} color="#FF2E2E" core="#FFD0C0" rot={-12} />
        <Shape p={p} d="M102 66 C118 62 136 68 148 78 L145 85 C132 78 118 76 104 76 Z" fill={p.grad('porphyrion-hair')} lw={5} />
        <Shape p={p} d={mx('M102 66 C118 62 136 68 148 78 L145 85 C132 78 118 76 104 76 Z', 150)} fill={p.grad('porphyrion-hair')} lw={5} />
        <Path d="M142 84 C140 90 136 94 140 97 C145 100 155 100 160 97 C164 94 160 90 158 84" stroke={p.line} strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* 풍성한 수염 */}
        <Shape p={p} d="M90 94 C96 112 110 120 122 118 C134 120 142 116 150 118 C158 116 166 120 178 118 C190 120 204 112 210 94 C218 122 214 152 200 170 C190 182 182 174 172 188 C164 178 158 194 150 182 C142 194 136 178 128 188 C118 174 110 182 100 170 C86 152 82 122 90 94 Z" fill={p.grad('porphyrion-hair')} />
        {!p.tinted && <Path d="M112 136 C114 150 118 160 122 168 M136 140 C136 154 138 166 140 176 M164 140 C164 154 162 166 160 176 M188 136 C186 150 182 160 178 168" stroke={p.fill('#8A5A32')} strokeWidth={3} opacity={0.8} fill="none" strokeLinecap="round" />}
        <Shape p={p} d="M124 106 Q150 102 176 106 Q170 124 150 124 Q130 124 124 106 Z" fill={p.grad('porphyrion-mouth')} lw={5} />
        <Path d="M130 107 L135 114 L140 106 L145 114 L150 105 L155 114 L160 106 L165 114 L170 107 Z" fill={p.fill('#F4F1E6')} />
        <Shape p={p} d="M116 104 C128 94 142 96 150 101 C158 96 172 94 184 104 C176 110 162 108 150 105 C138 108 124 110 116 104 Z" fill={p.grad('porphyrion-hair')} lw={5} />
        {/* 왕관 */}
        <Shape p={p} d="M102 56 L98 18 L116 34 L127 10 L139 32 L150 6 L161 32 L173 10 L184 34 L202 18 L198 56 Z" fill={p.grad('porphyrion-gold')} />
        {[98, 127, 150, 173, 202].map((x, i) => (
          <Circle key={i} cx={x} cy={[18, 10, 6, 10, 18][i]} r={5} fill={p.fill('#FFF27A')} stroke={p.line} strokeWidth={4} />
        ))}
        <Shape p={p} d="M100 42 C130 38 170 38 200 42 L200 58 C170 54 130 54 100 58 Z" fill={p.fill('#C9971C')} lw={5} />
        <Ellipse cx={150} cy={49} rx={8} ry={7} fill={p.fill('#FF2E2E')} stroke={p.line} strokeWidth={4} />
        <Circle cx={122} cy={50} r={5} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={3.5} />
        <Circle cx={178} cy={50} r={5} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={3.5} />
        <Shine p={p} cx={116} cy={30} rx={4} ry={10} opacity={0.6} rotate={20} />
      </G>
    ),
  },

  // 바다의 거인 폴리보테스: 푸른 피부, 해초 머리, 산호 왕관, 지느러미 귀, 가리비 방패
  polybotes: {
    w: 28,
    h: 32,
    defs: () => (
      <>
        <Ball id="polybotes-skin" light="#A6D4F4" base="#4F86B8" dark="#22436A" />
        <VGrad id="polybotes-torso" from="#82B4DE" to="#2A527C" />
        <VGrad id="polybotes-weed" from="#5CB04A" to="#1A521C" />
        <Ball id="polybotes-shell" light="#FFE6EC" base="#FF9FB0" dark="#C0506C" />
        <VGrad id="polybotes-mouth" from="#0F2A3A" to="#060E16" />
        <VGrad id="polybotes-belt" from="#8AA6C0" to="#3E5772" />
        <Ball id="polybotes-hip" light="#5E8EC4" base="#2F5A85" dark="#16305A" />
      </>
    ),
    draw: (p) => (
      <G>
        {/* 뒷머리 (해초) */}
        <Shape p={p} d="M150 34 C186 32 214 44 220 70 C228 92 222 112 232 136 C220 132 216 142 208 134 L92 134 C84 142 80 132 68 136 C78 112 72 92 80 70 C86 44 114 32 150 34 Z" fill={p.grad('polybotes-weed')} />
        {/* 뱀 다리 (짙은 바다색) */}
        <Tube p={p} d="M120 228 C82 236 46 248 46 276 C46 300 72 306 88 294" w={28} color="#2F5A85" dark="#16305A" light="#6E9CD0" band="#1E4272" />
        <Tube p={p} d={mx('M120 228 C82 236 46 248 46 276 C46 300 72 306 88 294', 145)} w={28} color="#2F5A85" dark="#16305A" light="#6E9CD0" band="#1E4272" />
        <SerpentHead p={p} x={86} y={292} s={0.8} rot={-50} skin="#4F86B8" dark="#1B3C85" />
        <SerpentHead p={p} x={204} y={292} s={0.8} rot={50} flip skin="#4F86B8" dark="#1B3C85" />
        <Shape p={p} d="M80 224 C80 208 210 208 210 224 C210 242 180 248 145 248 C110 248 80 242 80 224 Z" fill={p.grad('polybotes-hip')} />
        {/* 팔 */}
        <Tube p={p} d="M58 158 C46 172 46 182 52 194" w={26} color="#4F86B8" dark="#22436A" />
        <Tube p={p} d="M232 158 C246 176 250 192 248 208" w={26} color="#4F86B8" dark="#22436A" light="#A6D4F4" />
        {/* 몸통 */}
        <Shape p={p} d="M56 146 C92 132 198 132 234 146 C250 154 252 178 242 190 C236 200 230 208 222 216 L68 216 C60 208 54 200 48 190 C38 178 40 154 56 146 Z" fill={p.grad('polybotes-torso')} />
        <Path d="M104 162 Q124 176 142 164 M148 164 Q166 176 186 162 M145 168 L145 194 M132 182 L141 183 M149 183 L158 182" stroke={p.fill('#22436A')} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Ellipse cx={58} cy={150} rx={22} ry={20} fill={p.grad('polybotes-skin')} stroke={p.line} strokeWidth={LW} />
        <Ellipse cx={232} cy={150} rx={22} ry={20} fill={p.grad('polybotes-skin')} stroke={p.line} strokeWidth={LW} />
        {/* 어깨의 따개비 + 늘어진 해초 */}
        <Circle cx={222} cy={142} r={5} fill={p.fill('#E8E2D0')} stroke={p.line} strokeWidth={3} />
        <Circle cx={236} cy={136} r={4} fill={p.fill('#E8E2D0')} stroke={p.line} strokeWidth={3} />
        <Tube p={p} d="M208 136 C220 152 236 146 244 164 C250 176 242 186 250 200" w={8} color="#3E9A3A" lw={4} />
        {/* 상어가죽 허리띠 + 상어 이빨 장식 */}
        <Shape p={p} d="M66 194 L224 194 L222 218 L68 218 Z" fill={p.grad('polybotes-belt')} lw={6} />
        <Path d={Array.from({ length: 8 }, (_, i) => `M${84 + i * 18} 200 L${90 + i * 18} 214 L${96 + i * 18} 200 Z`).join(' ')} fill={p.fill('#F4F1E6')} stroke={p.line} strokeWidth={2.5} strokeLinejoin="round" />
        {/* 오른 주먹 */}
        <Shape p={p} d="M232 216 C232 204 242 198 252 200 C264 202 266 216 260 226 C254 234 236 232 232 216 Z" fill={p.grad('polybotes-skin')} lw={6} />
        {/* 가리비 방패 */}
        <Shape p={p} d={SHELL.outline} fill={p.grad('polybotes-shell')} />
        <Path d={SHELL.ribs} stroke={p.fill('#B5475A')} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Shape p={p} d="M36 220 L74 220 L70 236 L40 236 Z" fill={p.fill('#E07890')} lw={5} />
        <Shine p={p} cx={36} cy={168} rx={12} ry={6} opacity={0.6} rotate={-50} />
        {/* 지느러미 귀 */}
        <Shape p={p} d="M94 80 L60 62 L70 78 L58 88 L72 94 L64 106 L94 102 Z" fill={p.fill('#3E78AE')} lw={5} />
        <Shape p={p} d={mx('M94 80 L60 62 L70 78 L58 88 L72 94 L64 106 L94 102 Z', 150)} fill={p.fill('#3E78AE')} lw={5} />
        {/* 얼굴 */}
        <Shape p={p} d="M92 66 C92 46 118 40 150 40 C182 40 208 46 208 66 L210 96 C210 118 184 128 150 128 C116 128 90 118 90 96 Z" fill={p.grad('polybotes-skin')} />
        <Path d="M100 96 Q107 102 104 110 M108 94 Q115 100 112 108 M200 96 Q193 102 196 110 M192 94 Q185 100 188 108" stroke={p.fill('#22436A')} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        <Ellipse cx={126} cy={86} rx={15} ry={9} fill={p.fill('#0F1E30')} />
        <Ellipse cx={174} cy={86} rx={15} ry={9} fill={p.fill('#0F1E30')} />
        <GlowEye p={p} cx={127} cy={87} rx={9} ry={6} color="#6FE3FF" core="#F0FFFF" rot={12} />
        <GlowEye p={p} cx={173} cy={87} rx={9} ry={6} color="#6FE3FF" core="#F0FFFF" rot={-12} />
        <Shape p={p} d="M102 70 C118 66 136 72 148 82 L145 89 C132 82 118 80 104 80 Z" fill={p.fill('#1E3A60')} lw={5} />
        <Shape p={p} d={mx('M102 70 C118 66 136 72 148 82 L145 89 C132 82 118 80 104 80 Z', 150)} fill={p.fill('#1E3A60')} lw={5} />
        <Path d="M144 94 L141 101 M156 94 L159 101" stroke={p.line} strokeWidth={4} strokeLinecap="round" />
        {/* 상어 이빨 입 */}
        <Shape p={p} d="M116 106 Q150 102 184 106 Q178 126 150 126 Q122 126 116 106 Z" fill={p.grad('polybotes-mouth')} lw={5} />
        <Path d="M122 107 L127 115 L133 106 L139 115 L145 105 L150 114 L155 105 L161 115 L167 106 L173 115 L178 107 Z" fill={p.fill('#F4F1E6')} />
        <Path d="M128 124 L133 116 L138 124 Z M162 124 L167 116 L172 124 Z" fill={p.fill('#F4F1E6')} />
        {/* 해초 턱수염 + 앞머리 */}
        <Shape p={p} d="M124 124 C128 138 136 134 140 146 C146 136 154 136 160 146 C164 134 172 138 176 124 C166 130 134 130 124 124 Z" fill={p.grad('polybotes-weed')} lw={5} />
        <Shape p={p} d="M88 78 C90 56 114 42 150 42 C186 42 210 56 212 78 C204 70 198 74 192 62 C184 70 174 64 166 58 C158 66 146 64 138 58 C130 66 122 64 114 62 C106 72 96 68 88 78 Z" fill={p.grad('polybotes-weed')} lw={6} />
        <Tube p={p} d="M80 128 C70 142 84 152 72 170" w={8} color="#3E9A3A" lw={4} />
        <Tube p={p} d={mx('M80 128 C70 142 84 152 72 170', 150)} w={8} color="#3E9A3A" lw={4} />
        {/* 산호 왕관 */}
        <Tube p={p} d="M150 44 L150 12 M150 30 L136 18 M150 22 L162 10 M124 48 L116 26 L106 14 M117 30 L128 16 M176 48 L184 26 L194 14 M183 30 L172 16" w={9} color="#E5484D" dark="#A0283A" light="#FFB0B0" lw={5} />
        <Shine p={p} cx={112} cy={56} rx={10} ry={4} opacity={0.35} />
      </G>
    ),
  },

  // 티포에우스: 여러 뱀 머리가 솟은 폭풍의 거신. 뿔, 불타는 눈, 불을 머금은 아가리, 황금 배비늘, 똬리 꼬리
  typhoeus: {
    w: 45,
    h: 38,
    defs: () => (
      <>
        <Ball id="typhoeus-head" light="#F08088" base="#A83A46" dark="#4A1220" />
        <VGrad id="typhoeus-torso" from="#C44E5A" to="#4E1624" />
        <VGrad id="typhoeus-gold" from="#FFF3A6" mid="#FFD54A" to="#B07A12" />
        <VGrad id="typhoeus-horn" from="#F0EEF6" mid="#A8A8BC" to="#3E3E52" />
        <VGrad id="typhoeus-mouth" from="#5A0F1E" to="#1A0408" />
        <LinearGradient id="typhoeus-fire" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#FFF27A" />
          <Stop offset="0.5" stopColor="#FFB030" />
          <Stop offset="1" stopColor="#FF4A1F" />
        </LinearGradient>
      </>
    ),
    draw: (p) => {
      const neck = { color: '#A83A46', dark: '#561A28', light: '#F08088', band: '#7A2232' };
      // 왼쪽 목 세 개 (오른쪽은 좌우 반사)
      const necks: { d: string; w: number; x: number; y: number; rot: number; s: number }[] = [
        { d: 'M150 200 C110 204 54 204 56 172 C58 152 70 142 62 130', w: 26, x: 62, y: 130, rot: 34, s: 1.1 },
        { d: 'M160 190 C130 172 98 156 100 120 C101 104 98 94 90 84', w: 24, x: 90, y: 84, rot: 52, s: 1.05 },
        { d: 'M178 180 C162 152 146 126 146 100 C146 88 142 78 136 70', w: 22, x: 136, y: 70, rot: 72, s: 0.92 },
      ];
      const heads = (side: 'L' | 'R'): ReactNode =>
        necks.map((n, i) => (
          <G key={side + i}>
            <Tube p={p} d={side === 'L' ? n.d : mx(n.d, 225)} w={n.w} {...neck} />
            <SerpentHead p={p} x={side === 'L' ? n.x : 450 - n.x} y={n.y} s={n.s} rot={side === 'L' ? n.rot : -n.rot} flip={side === 'L'} skin="#D04A56" dark="#6A1E2E" eye="#FFC23A" horns tongue={false} />
          </G>
        ));
      return (
        <G>
          {/* 똬리 꼬리 */}
          <Tube p={p} d="M200 262 C120 262 34 276 34 318 C34 354 130 364 230 362 C330 360 412 346 412 312 C412 290 400 272 384 262" w={46} {...neck} />
          <Tube p={p} d="M386 264 C376 256 368 248 360 240" w={30} {...neck} />
          <Shape p={p} d="M372 254 C362 238 350 226 334 216 C358 214 380 224 392 244 Z" fill={p.fill('#561A28')} lw={6} />
          {/* 뱀 목·머리들 */}
          {heads('L')}
          {heads('R')}
          {/* 몸통 + 황금 배비늘 */}
          <Shape p={p} d="M118 186 C160 166 290 166 332 186 C352 196 356 222 342 238 C332 252 318 262 302 272 L148 272 C132 262 118 252 108 238 C94 222 98 196 118 186 Z" fill={p.grad('typhoeus-torso')} />
          <Path d="M124 214 Q132 222 140 214 M120 232 Q128 240 136 232 M310 214 Q318 222 326 214 M314 232 Q322 240 330 232" stroke={p.fill('#4A1220')} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          {/* 팔 */}
          <Tube p={p} d="M132 200 C100 204 74 218 68 246" w={34} {...neck} band={undefined} />
          <Tube p={p} d={mx('M132 200 C100 204 74 218 68 246', 225)} w={34} {...neck} band={undefined} />
          <Shape p={p} d="M182 182 L268 182 C276 212 272 246 262 274 L188 274 C178 246 174 212 182 182 Z" fill={p.grad('typhoeus-gold')} />
          <Path d="M180 206 C205 214 245 214 270 206 M180 230 C205 238 245 238 270 230 M184 254 C206 262 244 262 266 254" stroke={p.fill('#9A6A10')} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Shine p={p} cx={198} cy={196} rx={10} ry={5} opacity={0.6} />
          {/* 발톱 손 */}
          <Shape p={p} d="M46 256 L36 278 L54 266 Z M60 266 L58 290 L70 270 Z M76 266 L86 286 L86 262 Z" fill={p.fill('#F4F1E6')} lw={4} />
          <Shape p={p} d={mx('M46 256 L36 278 L54 266 Z M60 266 L58 290 L70 270 Z M76 266 L86 286 L86 262 Z', 225)} fill={p.fill('#F4F1E6')} lw={4} />
          <Shape p={p} d="M42 250 C40 232 58 226 72 230 C90 234 94 252 84 264 C74 274 46 270 42 250 Z" fill={p.grad('typhoeus-head')} lw={6} />
          <Shape p={p} d={mx('M42 250 C40 232 58 226 72 230 C90 234 94 252 84 264 C74 274 46 270 42 250 Z', 225)} fill={p.grad('typhoeus-head')} lw={6} />
          {/* 뿔 */}
          <Shape p={p} d="M188 84 C168 70 160 46 172 16 C180 42 192 56 208 68 Z" fill={p.grad('typhoeus-horn')} />
          <Shape p={p} d={mx('M188 84 C168 70 160 46 172 16 C180 42 192 56 208 68 Z', 225)} fill={p.grad('typhoeus-horn')} />
          {/* 볼 지느러미 */}
          <Shape p={p} d="M156 108 L118 94 L140 120 L112 130 L146 140 L124 158 L164 156 Z" fill={p.fill('#561A28')} lw={6} />
          <Shape p={p} d={mx('M156 108 L118 94 L140 120 L112 130 L146 140 L124 158 L164 156 Z', 225)} fill={p.fill('#561A28')} lw={6} />
          {/* 큰 머리 */}
          <Shape p={p} d="M212 66 L225 38 L238 66 Z" fill={p.fill('#561A28')} lw={6} />
          <Shape p={p} d="M150 112 C146 84 176 62 225 62 C274 62 304 84 300 112 C306 134 296 152 286 162 C270 178 250 184 225 184 C200 184 180 178 164 162 C154 152 144 134 150 112 Z" fill={p.grad('typhoeus-head')} />
          <Shine p={p} cx={190} cy={78} rx={16} ry={6} opacity={0.45} />
          <Ellipse cx={194} cy={110} rx={21} ry={12} fill={p.fill('#2E0C16')} transform="rotate(15 194 110)" />
          <Ellipse cx={256} cy={110} rx={21} ry={12} fill={p.fill('#2E0C16')} transform="rotate(-15 256 110)" />
          <GlowEye p={p} cx={195} cy={111} rx={13} ry={8} color="#FF7A1F" core="#FFF27A" rot={15} />
          <GlowEye p={p} cx={255} cy={111} rx={13} ry={8} color="#FF7A1F" core="#FFF27A" rot={-15} />
          <Shape p={p} d="M166 88 C184 84 204 92 218 106 L213 113 C200 104 184 100 168 100 Z" fill={p.fill('#2E0C16')} lw={5} />
          <Shape p={p} d={mx('M166 88 C184 84 204 92 218 106 L213 113 C200 104 184 100 168 100 Z', 225)} fill={p.fill('#2E0C16')} lw={5} />
          <Ellipse cx={214} cy={130} rx={4} ry={3} fill={p.line} />
          <Ellipse cx={236} cy={130} rx={4} ry={3} fill={p.line} />
          {/* 불을 머금은 아가리 */}
          <Shape p={p} d="M174 140 C200 134 250 134 276 140 C272 168 252 180 225 180 C198 180 178 168 174 140 Z" fill={p.grad('typhoeus-mouth')} />
          <Path d="M194 174 C190 160 202 154 208 146 C214 156 220 152 225 142 C230 152 236 154 242 146 C248 156 260 162 256 174 C246 180 204 180 194 174 Z" fill={p.grad('typhoeus-fire')} />
          <Path d="M180 141 L188 158 L196 139 L204 150 L212 138 L218 148 L225 137 L232 148 L238 138 L246 150 L254 139 L262 158 L270 141 Z" fill={p.fill('#F4F1E6')} />
          <Shape p={p} d="M196 176 L200 156 L209 173 Z" fill={p.fill('#F4F1E6')} lw={4} />
          <Shape p={p} d={mx('M196 176 L200 156 L209 173 Z', 225)} fill={p.fill('#F4F1E6')} lw={4} />
          {/* 불티 */}
          {!p.tinted && [[150, 26, 5], [300, 30, 4], [20, 220, 5], [430, 210, 5], [120, 290, 4], [340, 296, 4]].map(([x, y, r], i) => (
            <Circle key={i} cx={x} cy={y} r={r} fill={p.fill(i % 2 ? '#FFF27A' : '#FF7A1F')} opacity={0.85} />
          ))}
        </G>
      );
    },
  },
};
