import { Circle, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { ArtDef, Ball, Paint, Shape, Shine, VGrad } from './kit';

/*
 * 포세이돈 (프리미엄 3D 장난감 느낌의 치비 일러스트).
 * - 26×26칸 (viewBox 260×260). 오른쪽을 보고 상어를 탄다 → 아래 8칸쯤은 상어에 가려진다.
 * - 삼지창 든 팔(화면 오른쪽)은 weapon 층에 따로 그려서 어깨(pivot)를 축으로 휘두른다.
 * - 물방울 구슬은 화면 왼쪽 손에 든다.
 * - 그라데이션 id는 모두 'pos2-'로 시작한다.
 */

/** 외곽선 두께: 화면에서 작게(약 80pt) 보여도 또렷하게 */
const OL = 6;

/** 공통 색 */
const C = {
  eyeDark: '#0B3340',
  brow: '#8E9BAE',
  blush: '#FF9EAE',
  mouth: '#B5475A',
  gem: '#3FD9C9',
  strand: '#BFD3E2',
  tealLine: '#13707A',
  goldLine: '#B07A12',
};

/** 외곽선 있는 굵은 선 (팔, 금속 고리): 짙은 선 위에 색 선을 한 번 더 */
function Tube({ p, d, color, w, lw = OL }: { p: Paint; d: string; color: string; w: number; lw?: number }) {
  return (
    <G>
      <Path d={d} fill="none" stroke={p.line} strokeWidth={w + lw * 2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );
}

/** 옷 주름·머릿결 같은 부드러운 안쪽 선 (실루엣 모드에서는 안 그림) */
function Soft({ p, d, color, w = 3.5, opacity = 1 }: { p: Paint; d: string; color: string; w?: number; opacity?: number }) {
  if (p.tinted) return null;
  return <Path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
}

/** 반짝이는 큰 청록 눈: 홍채 그라데이션 + 짙은 눈동자 + 큰 흰 하이라이트 */
function Eye({ p, cx, cy }: { p: Paint; cx: number; cy: number }) {
  const rx = 13;
  const ry = 16;
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.grad('pos2-iris')} stroke={p.line} strokeWidth={4} />
      <Ellipse cx={cx + 1} cy={cy + 1} rx={7} ry={9} fill={p.fill(C.eyeDark)} />
      {/* 윗눈꺼풀 (굵은 속눈썹 선) */}
      <Path d={`M${cx - rx - 3} ${cy - 6} Q${cx} ${cy - ry - 8} ${cx + rx + 3} ${cy - 6}`} fill="none" stroke={p.line} strokeWidth={6} strokeLinecap="round" />
      {!p.tinted && (
        <>
          <Ellipse cx={cx - 4} cy={cy - 6} rx={6} ry={7} fill="#FFFFFF" />
          <Circle cx={cx + 5} cy={cy + 7} r={3} fill="#FFFFFF" opacity={0.9} />
          <Path d={`M${cx - 8} ${cy + 9} Q${cx} ${cy + 15} ${cx + 8} ${cy + 9}`} fill="none" stroke="#9FFFF0" strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
        </>
      )}
    </G>
  );
}

/** 볼터치 (실루엣 모드에서는 안 그림) */
function Blush({ p, cx, cy }: { p: Paint; cx: number; cy: number }) {
  if (p.tinted) return null;
  return <Ellipse cx={cx} cy={cy} rx={11} ry={6} fill={C.blush} opacity={0.7} />;
}

/** 금 어깨받이 (둥근 판 두 겹): 무기 층에서 돌아도 어색하지 않게 축 가운데에 둥글게 그린다 */
function Pauldron({ p, cx, cy, flip = false }: { p: Paint; cx: number; cy: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <G transform={`translate(${cx} ${cy}) scale(${s} 1)`}>
      <Shape p={p} d="M-20 4 C-22 -12 -8 -20 4 -18 C16 -16 22 -6 20 6 C14 2 6 2 0 6 C-6 2 -14 2 -20 4 Z" fill={p.grad('pos2-gold')} lw={5} />
      <Shape p={p} d="M-16 8 C-12 2 -4 2 0 8 C4 2 12 2 18 10 C14 18 6 20 0 18 C-8 20 -14 16 -16 8 Z" fill={p.grad('pos2-gold')} lw={5} />
      <Shine p={p} cx={-6} cy={-10} rx={7} ry={3} opacity={0.75} />
    </G>
  );
}

export const POSEIDON_ART: Record<string, ArtDef> = {
  poseidon: {
    w: 26,
    h: 26,
    defs: () => (
      <>
        <Ball id="pos2-skin" light="#FFF3EA" base="#FFDCC6" dark="#E9A98C" />
        {/* 뒷머리: 위·오른쪽은 흰색, 왼쪽 아래(뒤로 흩날리는 끝)는 청록 */}
        <LinearGradient id="pos2-hairback" x1="0.85" y1="0.05" x2="0.1" y2="0.95">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.4" stopColor="#F1F6F9" />
          <Stop offset="0.58" stopColor="#B8F0EA" />
          <Stop offset="0.8" stopColor="#3FC4C0" />
          <Stop offset="1" stopColor="#127F8C" />
        </LinearGradient>
        <VGrad id="pos2-hair" from="#FFFFFF" mid="#F3F7FA" to="#C9D7E3" />
        <VGrad id="pos2-beard" from="#FFFFFF" mid="#F2F6F9" to="#BCCCDA" />
        <VGrad id="pos2-teal" from="#6FE0D8" mid="#26A9AE" to="#106277" />
        <VGrad id="pos2-sash" from="#5FD8D2" mid="#2BB0B2" to="#157A86" />
        <VGrad id="pos2-gold" from="#FFF4B0" mid="#F5C843" to="#B8811A" />
        <VGrad id="pos2-toga" from="#FFFFFF" mid="#F4F7FB" to="#C3D0DE" />
        <VGrad id="pos2-iris" from="#0F5E66" mid="#20B3A7" to="#7FF0DC" />
        <Ball id="pos2-gem" light="#D8FFF8" base="#3FD9C9" dark="#0F7D84" />
        <LinearGradient id="pos2-shaft" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#7FE6DE" />
          <Stop offset="0.45" stopColor="#2AAFB2" />
          <Stop offset="1" stopColor="#0F6575" />
        </LinearGradient>
        <RadialGradient id="pos2-orb" cx="0.4" cy="0.38" r="0.68" fx="0.35" fy="0.3">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.35" stopColor="#C8F7FA" />
          <Stop offset="0.75" stopColor="#5CCFE0" />
          <Stop offset="1" stopColor="#1E8FB4" />
        </RadialGradient>
        <RadialGradient id="pos2-glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#9FF6FF" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#9FF6FF" stopOpacity="0" />
        </RadialGradient>
      </>
    ),
    draw: (p) => (
      <G>
        {/* ── 망토 (몸 뒤, 뒤쪽=왼쪽으로 펄럭임) ── */}
        <Shape
          p={p}
          d="M92 150 C64 160 40 196 26 236 Q40 230 50 240 Q62 230 74 242 Q88 232 100 240 L168 240 Q180 234 192 240 C190 206 184 172 164 150 Z"
          fill={p.grad('pos2-teal')}
          lw={OL}
        />
        <Soft p={p} d="M70 178 Q56 206 48 232 M88 176 Q78 206 74 234" color="#0E5868" w={4} opacity={0.6} />
        <Soft p={p} d="M60 178 Q48 196 40 220" color="#A8F2EC" w={3.5} opacity={0.7} />

        {/* ── 뒷머리 (흰 머리, 끝은 청록으로 물들며 뒤로 흩날림) ── */}
        <Shape
          p={p}
          d="M84 160 C70 180 42 182 30 166 C12 166 4 146 14 132 C0 120 4 94 22 90 C12 70 28 48 52 48 C58 26 90 12 114 18 C134 4 172 8 182 26 C206 28 220 52 208 68 C224 82 220 106 206 114 C220 128 212 150 196 152 L176 150 Z"
          fill={p.grad('pos2-hairback')}
          lw={OL}
        />
        {/* 뒤로 흩날리는 청록 머리끝 컬 */}
        <Shape p={p} d="M34 150 C20 158 12 172 18 182 C24 176 32 174 40 176 C50 172 56 164 56 156 Z" fill={p.grad('pos2-teal')} lw={5} />
        <Shape p={p} d="M24 120 C10 122 2 134 6 146 C12 138 20 136 28 138 Z" fill={p.grad('pos2-teal')} lw={5} />
        <Shape p={p} d="M200 128 C212 134 216 148 208 160 C204 152 198 148 190 148 Z" fill={p.grad('pos2-teal')} lw={5} />
        <Soft p={p} d="M42 96 Q30 112 42 130 M58 66 Q42 92 54 120 M62 50 Q80 34 104 30 M186 40 Q204 54 196 74 M194 84 Q206 98 196 112" color={C.strand} w={4} />
        <Soft p={p} d="M24 140 Q36 146 34 160 M30 110 Q40 116 38 126" color="#0F7480" w={3.5} opacity={0.6} />

        {/* ── 다리 + 금 샌들 (상어에 거의 가려짐) ── */}
        {[104, 144].map((x) => (
          <G key={x}>
            <Shape p={p} d={`M${x - 10} 226 L${x - 10} 248 L${x + 10} 248 L${x + 10} 226 Z`} fill={p.grad('pos2-skin')} lw={OL} />
            <Shape p={p} d={`M${x - 14} 246 Q${x} 240 ${x + 16} 246 Q${x + 24} 252 ${x + 18} 257 L${x - 14} 257 Q${x - 18} 252 ${x - 14} 246 Z`} fill={p.grad('pos2-skin')} lw={OL} />
            <Path d={`M${x - 15} 254 L${x + 20} 254`} stroke={p.fill('#E5A92A')} strokeWidth={5} strokeLinecap="round" />
            <Path d={`M${x - 10} 236 L${x + 10} 236 M${x - 10} 244 L${x + 10} 244`} stroke={p.fill('#E5A92A')} strokeWidth={4} />
          </G>
        ))}

        {/* ── 토가 치마 (청록 단) ── */}
        <Shape
          p={p}
          d="M80 200 Q128 212 176 200 L184 232 Q170 240 158 234 Q144 242 128 236 Q112 242 98 234 Q84 240 70 232 Z"
          fill={p.grad('pos2-toga')}
          lw={OL}
        />
        <Path d="M72 228 Q84 234 98 228 Q112 236 128 230 Q144 236 158 228 Q170 234 183 228" fill="none" stroke={p.fill('#2BB0B2')} strokeWidth={5} strokeLinecap="round" />
        <Soft p={p} d="M100 212 Q98 222 102 230 M126 214 L126 230 M152 212 Q156 222 152 228" color="#B7C6D6" w={3.5} />
        {/* 오른쪽 허리에 늘어진 청록 띠 자락 */}
        <Shape p={p} d="M158 204 Q170 206 178 202 L184 230 Q176 236 166 230 Z" fill={p.grad('pos2-sash')} lw={5} />

        {/* ── 몸통 (흰 토가) ── */}
        <Shape p={p} d="M88 152 Q128 142 168 152 Q178 178 178 206 L78 206 Q78 178 88 152 Z" fill={p.grad('pos2-toga')} lw={OL} />
        {/* 왼쪽 어깨에서 오른쪽 허리로 가는 청록 띠 */}
        <Shape p={p} d="M84 152 L104 146 L178 192 L178 204 L164 204 Z" fill={p.grad('pos2-sash')} lw={5} />
        <Soft p={p} d="M100 152 L160 194" color="#9FF0E8" w={3} opacity={0.8} />
        <Soft p={p} d="M96 176 Q104 188 100 198" color="#B7C6D6" w={3.5} />

        {/* 수염 아래 그림자 (입체감) */}
        <Soft p={p} d="M94 184 Q128 200 166 182" color="#9FB1C4" w={8} opacity={0.55} />
        {/* ── 금 허리띠 + 조개 버클 ── */}
        <Shape p={p} d="M78 194 Q128 204 178 194 L180 208 Q128 220 76 208 Z" fill={p.grad('pos2-gold')} lw={5} />
        <Path d="M106 198 L114 205 L106 212 L98 205 Z" fill={p.grad('pos2-gem')} stroke={p.line} strokeWidth={3.5} strokeLinejoin="round" />
        <Shape p={p} d="M128 218 L112 204 C112 190 144 190 144 204 Z" fill={p.grad('pos2-gold')} lw={5} />
        <Path d="M128 216 L118 198 M128 216 L124 194 M128 216 L132 194 M128 216 L138 198" stroke={p.fill(C.goldLine)} strokeWidth={2.5} strokeLinecap="round" fill="none" />
        <Shine p={p} cx={120} cy={198} rx={4} ry={2} opacity={0.8} />

        {/* ── 화면 왼쪽 팔: 물방울 구슬을 든 손 ── */}
        <Tube p={p} d="M90 160 Q72 172 64 184 Q58 186 52 180" color={p.fill("#FFD8C0")} w={20} />
        {/* 금 팔찌 */}
        <Path d="M70 172 L60 188" stroke={p.line} strokeWidth={17} strokeLinecap="round" />
        <Path d="M70 172 L60 188" stroke={p.grad('pos2-gold')} strokeWidth={9} strokeLinecap="round" />
        {!p.tinted && <Path d="M70 172 L66 178" stroke="#FFF7C8" strokeWidth={3} strokeLinecap="round" />}
        <Pauldron p={p} cx={92} cy={154} flip />
        {/* 빛 번짐 */}
        {!p.tinted && <Circle cx={44} cy={150} r={42} fill="url(#pos2-glow)" />}
        {/* 물방울 구슬 */}
        <Circle cx={44} cy={150} r={25} fill={p.grad('pos2-orb')} stroke={p.line} strokeWidth={5} />
        {!p.tinted && (
          <>
            <Path d="M24 156 Q32 146 42 154 Q52 162 62 150" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
            <Path d="M28 164 Q38 158 46 164 Q54 170 60 162" fill="none" stroke="#2AA6C8" strokeWidth={3.5} strokeLinecap="round" opacity={0.8} />
            <Ellipse cx={36} cy={138} rx={8} ry={5} fill="#FFFFFF" opacity={0.9} transform="rotate(-30 36 138)" />
            <Circle cx={56} cy={140} r={2.5} fill="#FFFFFF" opacity={0.9} />
          </>
        )}
        {/* 구슬을 받친 손 */}
        <Shape p={p} d="M24 166 Q22 186 42 190 Q60 192 66 176 Q62 170 56 172 Q53 165 47 168 Q42 163 36 168 Q30 162 24 166 Z" fill={p.grad('pos2-skin')} lw={5} />
        <Shape p={p} d="M58 178 Q72 170 70 156 Q62 156 58 166 Z" fill={p.grad('pos2-skin')} lw={4} />
        <Soft p={p} d="M36 170 L37 176 M47 171 L47 177" color="#D89478" w={2.5} />

        {/* ── 화면 오른쪽 위팔 (팔꿈치까지): 아래팔·주먹·삼지창은 weapon 층 ── */}
        <Tube p={p} d="M168 160 Q182 170 188 186" color={p.fill("#FFD8C0")} w={20} />
        <Pauldron p={p} cx={170} cy={156} />

        {/* ── 머리 ── */}
        {/* 얼굴 */}
        <Ellipse cx={126} cy={98} rx={60} ry={53} fill={p.grad('pos2-skin')} stroke={p.line} strokeWidth={OL} />
        {/* 옆머리 (볼 옆으로 흘러내림) */}
        <Shape p={p} d="M70 70 C60 92 62 118 72 132 C78 120 80 104 82 88 Z" fill={p.grad('pos2-hair')} lw={5} />
        <Shape p={p} d="M182 70 C192 92 190 118 180 132 C174 120 172 104 170 88 Z" fill={p.grad('pos2-hair')} lw={5} />
        {/* 앞머리 (흰색 물결) */}
        <Shape
          p={p}
          d="M64 84 C58 56 80 36 108 34 L148 34 C176 36 194 56 188 84 C182 74 174 68 164 68 C164 76 158 80 150 82 C148 72 142 66 132 64 C128 72 118 76 106 76 C110 70 110 64 106 60 C94 66 82 70 74 84 Q70 80 64 84 Z"
          fill={p.grad('pos2-hair')}
          lw={OL}
        />
        <Soft p={p} d="M86 62 Q98 50 116 50 M150 50 Q168 52 178 66" color={C.strand} w={3.5} />
        <Shine p={p} cx={100} cy={46} rx={14} ry={4} opacity={0.9} rotate={-12} />

        {/* 금관 (가운데 큰 뿔 + 청록 보석) */}
        <Shape
          p={p}
          d="M74 54 L68 32 L90 42 L94 18 L112 36 L126 4 L140 36 L158 18 L162 42 L184 32 L178 54 Q126 40 74 54 Z"
          fill={p.grad('pos2-gold')}
          lw={OL}
        />
        <Shape p={p} d="M72 52 Q126 38 180 52 L180 62 Q126 48 72 62 Z" fill={p.grad('pos2-gold')} lw={5} />
        <Path d="M126 26 L135 40 L126 54 L117 40 Z" fill={p.grad('pos2-gem')} stroke={p.line} strokeWidth={4} strokeLinejoin="round" />
        <Circle cx={95} cy={44} r={4.5} fill={p.grad('pos2-gem')} stroke={p.line} strokeWidth={3} />
        <Circle cx={157} cy={44} r={4.5} fill={p.grad('pos2-gem')} stroke={p.line} strokeWidth={3} />
        <Shine p={p} cx={122} cy={20} rx={2.5} ry={8} opacity={0.85} rotate={20} />
        <Shine p={p} cx={92} cy={30} rx={2} ry={5} opacity={0.7} rotate={10} />
        {!p.tinted && <Path d="M124 34 L128 40" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />}

        {/* 결연한 눈썹 (가운데로 내려옴) */}
        <Shape p={p} d="M84 84 Q98 76 118 86 L116 94 Q100 86 86 92 Z" fill={p.fill(C.brow)} lw={4} />
        <Shape p={p} d="M134 86 Q154 76 170 84 L168 92 Q154 86 136 94 Z" fill={p.fill(C.brow)} lw={4} />
        {/* 눈 */}
        <Eye p={p} cx={103} cy={110} />
        <Eye p={p} cx={150} cy={110} />
        <Blush p={p} cx={84} cy={128} />
        <Blush p={p} cx={170} cy={128} />
        {/* 볼·코의 부드러운 반사광 */}
        <Shine p={p} cx={170} cy={116} rx={5} ry={2.5} opacity={0.55} rotate={-20} />
        <Shine p={p} cx={86} cy={74} rx={6} ry={2.5} opacity={0.4} rotate={-30} />
        {/* 코 */}
        <Path d="M124 124 Q130 128 128 132" fill="none" stroke={p.fill('#D28A6E')} strokeWidth={3.5} strokeLinecap="round" />

        {/* 풍성한 흰 수염 (몽실몽실 물결) */}
        <Shape
          p={p}
          d="M72 120 C66 148 78 170 94 176 C98 188 112 190 118 182 C124 194 140 194 144 182 C152 190 166 186 166 174 C182 166 190 144 182 120 C172 136 154 142 128 142 C102 142 84 136 72 120 Z"
          fill={p.grad('pos2-beard')}
          lw={OL}
        />
        <Soft p={p} d="M100 152 Q104 164 102 172 M128 156 L128 180 M156 152 Q152 164 154 172 M86 146 Q88 158 94 166 M170 146 Q168 158 162 166" color="#B7C9D8" w={3.5} />
        <Soft p={p} d="M176 132 Q178 150 166 168" color="#FFFFFF" w={3} opacity={0.9} />
        {/* 입 (콧수염 아래 살짝) */}
        <Path d="M120 146 Q128 152 136 146 Z" fill={p.fill(C.mouth)} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
        {/* 콧수염 (양쪽으로 말려 올라감) */}
        <Shape p={p} d="M128 132 C118 126 104 128 96 136 C88 138 84 134 84 130 C80 140 90 148 102 146 C114 146 124 142 128 138 Z" fill={p.grad('pos2-hair')} lw={5} />
        <Shape p={p} d="M128 132 C138 126 152 128 160 136 C168 138 172 134 172 130 C176 140 166 148 154 146 C142 146 132 142 128 138 Z" fill={p.grad('pos2-hair')} lw={5} />
        <Shine p={p} cx={110} cy={134} rx={6} ry={2} opacity={0.9} rotate={-10} />
      </G>
    ),
    // 삼지창 든 아래팔 (화면 오른쪽): 팔꿈치를 축으로 앞(오른쪽)으로 휘두른다
    weapon: {
      pivot: [188, 186],
      draw: (p) => (
        <G>
          {/* 아래팔 (팔꿈치 → 주먹) + 금 팔찌 */}
          <Tube p={p} d="M188 186 Q198 182 208 176" color={p.fill("#FFD8C0")} w={20} />
          <Path d="M196 172 L201 188" stroke={p.line} strokeWidth={18} strokeLinecap="round" />
          <Path d="M196 172 L201 188" stroke={p.grad('pos2-gold')} strokeWidth={10} strokeLinecap="round" />
          {!p.tinted && <Path d="M196 173 L197 177" stroke="#FFF7C8" strokeWidth={3} strokeLinecap="round" />}
          {/* 삼지창 자루 (청록) + 금 고리 */}
          <Shape p={p} d="M208 80 L220 80 L220 238 L208 238 Z" fill={p.grad('pos2-shaft')} lw={5} />
          <Shape p={p} d="M205 234 L223 234 L221 248 Q214 254 207 248 Z" fill={p.grad('pos2-gold')} lw={5} />
          <Shape p={p} d="M204 120 L224 120 L224 130 L204 130 Z" fill={p.grad('pos2-gold')} lw={4} />
          <Shine p={p} cx={211} cy={100} rx={1.8} ry={12} opacity={0.6} rotate={0} />
          {/* 삼지창 머리 (금, 세 갈래 창날) */}
          <G transform="translate(2 5)">
            <Shape
              p={p}
              d="M180 48 L180 30 L172 33 L184 4 L196 33 L190 30 L190 48 Q192 62 206 64 L206 30 L199 33 L212 0 L225 33 L218 30 L218 64 Q232 62 234 48 L234 30 L228 33 L240 4 L252 33 L244 30 L244 48 Q244 76 222 82 L202 82 Q180 76 180 48 Z"
              fill={p.grad('pos2-gold')}
              lw={5}
            />
            <Shape p={p} d="M200 80 L224 80 L222 92 L202 92 Z" fill={p.grad('pos2-gold')} lw={4} />
            <Path d="M212 60 L220 71 L212 82 L204 71 Z" fill={p.grad('pos2-gem')} stroke={p.line} strokeWidth={3.5} strokeLinejoin="round" />
            <Shine p={p} cx={184} cy={20} rx={1.6} ry={7} opacity={0.8} rotate={0} />
            <Shine p={p} cx={210} cy={18} rx={1.8} ry={9} opacity={0.8} rotate={0} />
            <Shine p={p} cx={238} cy={20} rx={1.6} ry={7} opacity={0.8} rotate={0} />
          </G>
          {/* 자루를 꽉 쥔 주먹 (손가락이 앞으로 감싼다) */}
          <Shape p={p} d="M204 168 Q204 160 212 160 L222 160 Q230 161 230 170 L230 182 Q230 190 221 190 L210 190 Q203 189 203 181 Z" fill={p.grad('pos2-skin')} lw={OL} />
          <Path d="M214 170 L229 170 M214 180 L229 180" fill="none" stroke={p.fill('#C98468')} strokeWidth={3} strokeLinecap="round" />
          {/* 엄지 */}
          <Shape p={p} d="M202 166 Q206 158 216 160 Q220 164 214 168 Q208 170 202 166 Z" fill={p.grad('pos2-skin')} lw={4} />
          <Shine p={p} cx={210} cy={164} rx={4} ry={2} opacity={0.6} rotate={-10} />
        </G>
      ),
    },
  },
};

