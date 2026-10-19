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
      {tongue && <Path d="M24 10 C34 12 46 14 56 12 L64 6 M56 12 L64 18" stroke={p.fill('#E5484D')} strokeWidth={3.5 / s} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
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
      <Tube p={p} d="M96 182 C60 188 22 202 22 230 C22 252 40 260 62 254" w={26} {...G_SNAKE} />
      <Tube p={p} d="M104 182 C140 188 178 202 178 230 C178 252 160 260 138 254" w={26} {...G_SNAKE} />
      <SerpentHead p={p} x={64} y={252} s={0.62} rot={-12} skin="#6E9E4E" dark="#2F4F24" />
      <SerpentHead p={p} x={136} y={252} s={0.62} rot={12} flip skin="#6E9E4E" dark="#2F4F24" />
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
};

// 큰 보스들은 아래에서 이어서 추가
Object.assign(RAID_ART, {} as Record<string, ArtDef>);
export type _Unused = ReactNode;
