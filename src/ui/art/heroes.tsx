import { Circle, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { ArtDef, Ball, LW, Paint, Shape, Shine, VGrad } from './kit';

/*
 * 신 캐릭터 + 탈것 (카툰 일러스트).
 * 크기(칸)는 예전 픽셀 그림과 똑같다 → HeroSprite의 탈것 겹침(heroX, overlap)을 그대로 쓴다.
 * 좌표는 칸 × 10 (예: 24칸 = 240).
 */

const EYE = '#2A2240';
const BLUSH = '#FF9FB0';

/** 반짝이는 큰 눈: 짙은 타원 + 흰 하이라이트 두 개 */
function Eye({ p, cx, cy, rx, ry }: { p: Paint; cx: number; cy: number; rx: number; ry: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.fill(EYE)} />
      <Circle cx={cx - rx * 0.3} cy={cy - ry * 0.35} r={rx * 0.42} fill={p.fill('#FFFFFF')} />
      <Circle cx={cx + rx * 0.35} cy={cy + ry * 0.35} r={rx * 0.2} fill={p.fill('#FFFFFF')} />
    </G>
  );
}

/** 볼터치 (실루엣 모드에서는 안 그림) */
function Blush({ p, cx, cy, rx = 11, ry = 6 }: { p: Paint; cx: number; cy: number; rx?: number; ry?: number }) {
  if (p.tinted) return null;
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={BLUSH} opacity={0.75} />;
}

/** 네 갈래 반짝이 별 (장식이라 실루엣 모드에서는 안 그림) */
function Sparkle({ p, x, y, r, color = '#FFF7B0' }: { p: Paint; x: number; y: number; r: number; color?: string }) {
  if (p.tinted) return null;
  const k = r * 0.28;
  return <Path d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`} fill={color} />;
}

/** 외곽선 있는 굵은 선 (금속 고리, 머리 컬 등): 짙은 선 위에 색 선을 한 번 더 */
function Stroke({ p, d, color, w }: { p: Paint; d: string; color: string; w: number }) {
  return (
    <G>
      <Path d={d} fill="none" stroke={p.line} strokeWidth={w + LW} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </G>
  );
}

/** 옷 주름 같은 부드러운 안쪽 선 */
function Soft({ p, d, color, w = 4 }: { p: Paint; d: string; color: string; w?: number }) {
  if (p.tinted) return null;
  return <Path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
}

/** 공통 그라데이션 색 */
const SKIN = { light: '#FFF1E6', base: '#FFDDC4', dark: '#EBAE8C' };
const GOLD = { from: '#FFF27A', mid: '#FFD54A', to: '#C9971C' };
const ROBE = { from: '#FFFFFF', mid: '#F4F7FD', to: '#BCC8E6' };

export const HEROES_ART: Record<string, ArtDef> = {
  // 아기 신: 갈색 머리, 금빛 후광, 작은 흰 날개, 흰 토가와 금 허리띠
  baby: {
    w: 24,
    h: 24,
    defs: () => (
      <>
        <Ball id="baby-skin" {...SKIN} />
        <VGrad id="baby-hair" from="#B07A40" to="#5E3A1C" />
        <VGrad id="baby-halo" {...GOLD} />
        <VGrad id="baby-toga" {...ROBE} />
        <VGrad id="baby-gold" {...GOLD} />
        <VGrad id="baby-wing" from="#FFFFFF" to="#C4D0EC" />
      </>
    ),
    draw: (p) => (
      <G>
        {/* 날개 (몸 뒤) */}
        {[0, 1].map((i) => (
          <G key={i} transform={i ? 'translate(240 0) scale(-1 1)' : undefined}>
            <Shape p={p} d="M88 152 C66 128 32 124 12 138 C6 146 12 154 22 154 C12 162 18 172 30 170 C24 180 36 188 48 180 C60 186 76 176 88 166 Z" fill={p.grad('baby-wing')} />
            <Soft p={p} d="M28 156 Q54 152 76 150 M46 172 Q64 166 80 158" color="#B9C6E4" />
            <Shine p={p} cx={40} cy={140} rx={12} ry={5} opacity={0.8} rotate={-10} />
          </G>
        ))}
        {/* 다리 + 금 샌들 */}
        <Shape p={p} d="M100 186 L100 214 L116 214 L116 186 Z" fill={p.grad('baby-skin')} />
        <Shape p={p} d="M124 186 L124 214 L140 214 L140 186 Z" fill={p.grad('baby-skin')} />
        <Shape p={p} d="M92 226 Q92 210 108 210 Q122 210 122 224 Q122 232 106 232 Q92 232 92 226 Z" fill={p.grad('baby-gold')} />
        <Shape p={p} d="M148 226 Q148 210 132 210 Q118 210 118 224 Q118 232 134 232 Q148 232 148 226 Z" fill={p.grad('baby-gold')} />
        {/* 팔 */}
        {[0, 1].map((i) => (
          <G key={i} transform={i ? 'translate(240 0) scale(-1 1)' : undefined}>
            <Shape p={p} d="M86 150 Q62 158 62 184 Q64 196 76 192 Q80 176 92 166 Z" fill={p.grad('baby-skin')} />
          </G>
        ))}
        {/* 토가 + 금 허리띠 */}
        <Shape p={p} d="M82 146 Q120 130 158 146 L168 200 Q120 212 72 200 Z" fill={p.grad('baby-toga')} />
        <Soft p={p} d="M90 148 Q116 176 156 158 M100 192 L104 204 M138 192 L136 204" color="#C9D3EC" w={5} />
        <Shape p={p} d="M77 168 Q120 180 163 168 L165 182 Q120 194 75 182 Z" fill={p.grad('baby-gold')} lw={5} />
        <Circle cx={120} cy={182} r={7} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={4} />
        {/* 머리 */}
        <Ellipse cx={120} cy={100} rx={66} ry={57} fill={p.grad('baby-skin')} stroke={p.line} strokeWidth={LW} />
        <Shape p={p} d="M54 104 C46 56 80 32 120 32 C160 32 194 56 186 104 C180 94 176 86 170 78 C162 88 148 90 136 80 C128 90 112 90 104 80 C94 90 80 88 72 78 C66 86 60 94 54 104 Z" fill={p.grad('baby-hair')} />
        <Stroke p={p} d="M114 36 C106 20 124 12 132 22 C136 28 128 34 122 30" color="#8B5A2B" w={6} />
        <Shine p={p} cx={92} cy={52} rx={18} ry={7} opacity={0.45} />
        {/* 얼굴 */}
        <Eye p={p} cx={96} cy={112} rx={11} ry={14} />
        <Eye p={p} cx={144} cy={112} rx={11} ry={14} />
        <Blush p={p} cx={76} cy={132} />
        <Blush p={p} cx={164} cy={132} />
        <Shape p={p} d="M109 132 Q120 146 131 132 Q120 136 109 132 Z" fill={p.fill('#B5475A')} lw={4} />
        <Shine p={p} cx={80} cy={78} rx={10} ry={5} opacity={0.35} />
        {/* 금빛 후광 */}
        <Ellipse cx={120} cy={20} rx={46} ry={11} fill="none" stroke={p.line} strokeWidth={8 + LW} />
        <Ellipse cx={120} cy={20} rx={46} ry={11} fill="none" stroke={p.grad('baby-halo')} strokeWidth={8} />
        <Shine p={p} cx={96} cy={13} rx={10} ry={2.5} opacity={0.9} rotate={-8} />
      </G>
    ),
  },

  // 소년 신: 월계관, 흰 튜닉에 파란 띠, 금 허리띠, 오른쪽 위로 검을 치켜듦
  teen: {
    w: 30,
    h: 24,
    defs: () => (
      <>
        <Ball id="teen-skin" {...SKIN} />
        <VGrad id="teen-hair" from="#B07A40" to="#5E3A1C" />
        <VGrad id="teen-tunic" {...ROBE} />
        <VGrad id="teen-gold" {...GOLD} />
        <VGrad id="teen-sash" from="#7FB0FF" to="#2D5FC0" />
        <VGrad id="teen-leaf" from="#8EE07A" to="#2F8A45" />
        <VGrad id="teen-blade" from="#FFFFFF" to="#93A3C2" />
        <VGrad id="teen-grip" from="#9A6236" to="#5A3418" />
      </>
    ),
    draw: (p) => (
      <G>
        {/* 다리 + 샌들 */}
        <Shape p={p} d="M76 204 L76 222 L92 222 L92 204 Z" fill={p.grad('teen-skin')} />
        <Shape p={p} d="M108 204 L108 222 L124 222 L124 204 Z" fill={p.grad('teen-skin')} />
        <Shape p={p} d="M68 228 Q68 214 84 214 Q98 214 98 226 Q98 232 82 232 Q68 232 68 228 Z" fill={p.grad('teen-gold')} />
        <Shape p={p} d="M132 228 Q132 214 116 214 Q102 214 102 226 Q102 232 118 232 Q132 232 132 228 Z" fill={p.grad('teen-gold')} />
        {/* 왼팔 (내려놓음) */}
        <Shape p={p} d="M62 150 Q38 160 36 186 Q38 198 50 194 Q54 176 68 166 Z" fill={p.grad('teen-skin')} />
        {/* 튜닉 치마 (주름) */}
        <Shape p={p} d="M54 180 L146 180 L156 210 Q100 220 44 210 Z" fill={p.grad('teen-tunic')} />
        <Soft p={p} d="M70 190 L66 210 M90 192 L88 214 M110 192 L112 214 M130 190 L134 210" color="#C9D3EC" w={5} />
        {/* 튜닉 윗옷 */}
        <Shape p={p} d="M58 146 Q100 130 142 146 L148 186 Q100 196 52 186 Z" fill={p.grad('teen-tunic')} />
        {/* 파란 띠 (왼쪽 어깨 → 오른쪽 허리) */}
        <Shape p={p} d="M60 144 L80 138 L144 178 L126 186 Z" fill={p.grad('teen-sash')} lw={5} />
        {/* 금 허리띠 */}
        <Shape p={p} d="M52 174 Q100 186 148 174 L150 188 Q100 200 50 188 Z" fill={p.grad('teen-gold')} lw={5} />
        <Circle cx={100} cy={188} r={6} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={4} />
        {/* 오른팔 (검 쥔 손) */}
        <Shape p={p} d="M136 148 Q158 144 172 148 L176 164 Q156 170 138 168 Z" fill={p.grad('teen-skin')} />
        {/* 검: 손잡이 → 손 → 날 → 코등이 */}
        <Shape p={p} d="M186 142 L192 148 L170 170 L164 164 Z" fill={p.grad('teen-grip')} lw={5} />
        <Circle cx={163} cy={171} r={7} fill={p.grad('teen-gold')} stroke={p.line} strokeWidth={5} />
        <Shape p={p} d="M180 134 L282 18 Q294 8 290 24 L192 146 Z" fill={p.grad('teen-blade')} />
        <Soft p={p} d="M190 136 L280 26" color="#93A3C2" w={3} />
        <Shine p={p} cx={250} cy={58} rx={12} ry={2.5} opacity={0.9} rotate={-50} />
        <Circle cx={176} cy={156} r={13} fill={p.grad('teen-skin')} stroke={p.line} strokeWidth={LW} />
        <Shape p={p} d="M170 124 L176 120 L204 150 L198 156 Z" fill={p.grad('teen-gold')} lw={5} />
        {/* 목 + 머리 */}
        <Shape p={p} d="M88 128 L88 144 L112 144 L112 128 Z" fill={p.grad('teen-skin')} />
        <Ellipse cx={100} cy={84} rx={64} ry={56} fill={p.grad('teen-skin')} stroke={p.line} strokeWidth={LW} />
        <Shape p={p} d="M36 92 C28 44 62 18 100 18 C140 18 172 44 164 92 C158 80 152 72 146 64 C136 74 122 74 112 64 C104 74 88 74 80 64 C70 72 58 72 52 64 C46 72 40 82 36 92 Z" fill={p.grad('teen-hair')} />
        <Shine p={p} cx={74} cy={36} rx={18} ry={7} opacity={0.45} />
        {/* 월계관: 이마를 두르는 줄기 + 양옆 잎 */}
        <Stroke p={p} d="M40 74 Q100 48 160 74" color="#2F8A45" w={4} />
        {[0, 1].map((i) => (
          <G key={i} transform={i ? 'translate(200 0) scale(-1 1)' : undefined}>
            <Shape p={p} d="M44 74 Q22 74 12 60 Q34 56 44 74 Z" fill={p.grad('teen-leaf')} lw={5} />
            <Shape p={p} d="M46 64 Q30 52 30 34 Q50 42 46 64 Z" fill={p.grad('teen-leaf')} lw={5} />
            <Shape p={p} d="M58 56 Q50 38 58 22 Q72 38 58 56 Z" fill={p.grad('teen-leaf')} lw={5} />
            <Shape p={p} d="M42 84 Q20 90 6 80 Q26 70 42 84 Z" fill={p.grad('teen-leaf')} lw={5} />
          </G>
        ))}
        {/* 얼굴: 자신감 있는 눈썹과 미소 */}
        <Path d="M64 82 Q76 76 88 80 M112 80 Q124 76 136 82" stroke={p.line} strokeWidth={6} strokeLinecap="round" fill="none" />
        <Eye p={p} cx={76} cy={100} rx={10} ry={13} />
        <Eye p={p} cx={124} cy={100} rx={10} ry={13} />
        <Blush p={p} cx={58} cy={118} />
        <Blush p={p} cx={142} cy={118} />
        <Shape p={p} d="M88 118 Q100 132 112 118 Q100 122 88 118 Z" fill={p.fill('#B5475A')} lw={4} />
      </G>
    ),
  },

  // 성인 신: 청동 투구와 가슴갑옷, 붉은 망토, 둥근 방패, 긴 검
  adult: {
    w: 36,
    h: 26,
    defs: () => (
      <>
        <Ball id="adult-skin" {...SKIN} />
        <Ball id="adult-bronze" light="#FFEFA8" base="#E3A93E" dark="#8F5A14" />
        <VGrad id="adult-helm" from="#FFD98A" mid="#D98E36" to="#7E4A12" />
        <VGrad id="adult-cape" from="#F0555A" to="#8C1F2A" />
        <VGrad id="adult-plume" from="#FF6A6A" to="#A82630" />
        <VGrad id="adult-leather" from="#9A6236" to="#5A3418" />
        <VGrad id="adult-blade" from="#FFFFFF" to="#93A3C2" />
        <VGrad id="adult-gold" {...GOLD} />
        <Ball id="adult-shield" light="#FFF0B0" base="#E0A53A" dark="#7A4A10" />
        <Ball id="adult-shield-in" light="#FF8080" base="#D8323A" dark="#7A1420" />
      </>
    ),
    draw: (p) => (
      <G>
        {/* 붉은 망토 (몸 뒤, 오른쪽으로 펄럭임) */}
        <Shape p={p} d="M96 132 Q160 120 214 134 Q238 180 240 228 Q224 218 212 230 Q198 218 184 230 Q170 216 158 226 L150 150 Z" fill={p.grad('adult-cape')} />
        <Soft p={p} d="M206 150 Q222 186 224 216 M190 160 Q200 190 198 220" color="#7A1420" w={5} />
        {/* 다리 + 청동 정강이받이 */}
        <Shape p={p} d="M94 206 L94 230 L112 230 L112 206 Z" fill={p.grad('adult-skin')} />
        <Shape p={p} d="M156 206 L156 230 L174 230 L174 206 Z" fill={p.grad('adult-skin')} />
        <Shape p={p} d="M84 252 L88 226 Q102 220 116 226 L118 252 Z" fill={p.grad('adult-helm')} />
        <Shape p={p} d="M152 252 L152 226 Q166 220 180 226 L186 252 Z" fill={p.grad('adult-helm')} />
        {/* 가죽 치마 (줄무늬) */}
        <Shape p={p} d="M88 180 L182 180 L190 212 Q135 220 80 212 Z" fill={p.grad('adult-leather')} />
        <Path d="M100 186 L98 214 M116 186 L115 216 M135 186 L135 217 M154 186 L155 216 M170 186 L172 214" stroke={p.line} strokeWidth={4} strokeLinecap="round" />
        {/* 가슴갑옷 (근육 모양) */}
        <Shape p={p} d="M84 132 Q135 116 186 132 L190 186 Q135 198 80 186 Z" fill={p.grad('adult-bronze')} />
        <Path d="M100 148 Q116 162 133 150 M137 150 Q154 162 170 148 M135 160 L135 180" stroke={p.fill('#8F5A14')} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Shine p={p} cx={106} cy={142} rx={12} ry={5} opacity={0.6} />
        <Shape p={p} d="M80 178 Q135 190 190 178 L191 192 Q135 204 79 192 Z" fill={p.grad('adult-gold')} lw={5} />
        {/* 오른팔 (검 쥔 손) */}
        <Shape p={p} d="M176 136 Q202 140 210 160 L198 172 Q188 158 174 156 Z" fill={p.grad('adult-skin')} />
        {/* 긴 검 */}
        <Shape p={p} d="M222 156 L228 162 L198 192 L192 186 Z" fill={p.grad('adult-leather')} lw={5} />
        <Circle cx={190} cy={194} r={8} fill={p.grad('adult-gold')} stroke={p.line} strokeWidth={5} />
        <Shape p={p} d="M212 148 L338 16 Q352 4 348 22 L226 160 Z" fill={p.grad('adult-blade')} />
        <Soft p={p} d="M222 150 L338 26" color="#93A3C2" w={3} />
        <Shine p={p} cx={300} cy={62} rx={14} ry={2.5} opacity={0.9} rotate={-47} />
        <Circle cx={208} cy={172} r={14} fill={p.grad('adult-skin')} stroke={p.line} strokeWidth={LW} />
        <Shape p={p} d="M200 138 L207 133 L240 166 L234 172 Z" fill={p.grad('adult-gold')} lw={5} />
        {/* 둥근 방패 (앞쪽 왼편) */}
        <Circle cx={52} cy={172} r={46} fill={p.grad('adult-shield')} stroke={p.line} strokeWidth={LW} />
        <Circle cx={52} cy={172} r={30} fill={p.grad('adult-shield-in')} stroke={p.line} strokeWidth={5} />
        <Path d="M52 146 L58 164 L76 164 L62 176 L68 194 L52 183 L36 194 L42 176 L28 164 L46 164 Z" fill={p.grad('adult-gold')} stroke={p.line} strokeWidth={4} strokeLinejoin="round" />
        <Shine p={p} cx={32} cy={144} rx={14} ry={6} opacity={0.6} rotate={-40} />
        {/* 머리 */}
        <Ellipse cx={128} cy={94} rx={58} ry={52} fill={p.grad('adult-skin')} stroke={p.line} strokeWidth={LW} />
        {/* 투구: 볏 → 둥근 몸체(볼 가리개) → 금 테 */}
        <Shape p={p} d="M76 62 C68 20 110 2 150 6 C188 10 210 32 206 60 C198 48 186 42 174 42 C160 32 140 30 124 36 C106 38 90 48 76 62 Z" fill={p.grad('adult-plume')} />
        <Soft p={p} d="M92 40 Q120 16 160 18 M118 24 Q150 14 190 34" color="#FF9A9A" w={3} />
        <Shape p={p} d="M64 124 C52 60 84 30 128 30 C172 30 204 60 192 124 L176 128 C178 108 174 94 168 86 Q128 74 88 86 C82 94 78 108 80 128 Z" fill={p.grad('adult-helm')} />
        <Shape p={p} d="M84 84 Q128 70 172 84 L170 94 Q128 82 86 94 Z" fill={p.grad('adult-gold')} lw={5} />
        <Shine p={p} cx={96} cy={50} rx={16} ry={7} opacity={0.6} />
        {/* 얼굴: 용맹한 눈썹 */}
        <Path d="M96 96 L116 101 M160 96 L140 101" stroke={p.line} strokeWidth={6} strokeLinecap="round" />
        <Eye p={p} cx={108} cy={110} rx={9} ry={11} />
        <Eye p={p} cx={148} cy={110} rx={9} ry={11} />
        <Blush p={p} cx={94} cy={126} rx={9} ry={5} />
        <Blush p={p} cx={162} cy={126} rx={9} ry={5} />
        <Path d="M118 130 Q128 138 140 130" stroke={p.line} strokeWidth={5} strokeLinecap="round" fill="none" />
      </G>
    ),
  },

  cloud: {
    w: 36,
    h: 12,
    defs: () => (
      <>
        <VGrad id="cloud-body" from="#FFFFFF" mid="#F3F6FD" to="#B9C6E4" />
      </>
    ),
    draw: (p) => (
      <G>
        <Shape
          p={p}
          d="M30 92 C6 92 4 60 30 56 C26 30 58 18 78 34 C88 6 134 4 146 28 C160 16 186 20 192 38 C204 8 252 8 262 38 C280 24 312 34 308 58 C336 56 346 90 322 94 Q176 106 30 92 Z"
          fill={p.grad('cloud-body')}
        />
        <Soft p={p} d="M48 80 Q70 70 92 80 M130 84 Q160 72 190 84 M232 80 Q256 70 282 80" color="#C9D3EC" w={5} />
        <Shine p={p} cx={110} cy={26} rx={22} ry={7} opacity={0.9} rotate={-8} />
        <Shine p={p} cx={226} cy={28} rx={18} ry={6} opacity={0.9} rotate={-8} />
        <Shine p={p} cx={40} cy={64} rx={10} ry={4} opacity={0.8} rotate={-20} />
        <Sparkle p={p} x={50} y={108} r={8} color="#FFE45C" />
        <Sparkle p={p} x={130} y={112} r={6} color="#FFE45C" />
        <Sparkle p={p} x={206} y={108} r={8} color="#FFE45C" />
        <Sparkle p={p} x={290} y={110} r={6} color="#FFE45C" />
      </G>
    ),
  },

  // 포세이돈의 상어: 오른쪽을 보고, 푸른 회색 등, 흰 배, 등지느러미, 이빨
  shark: {
    w: 44,
    h: 18,
    defs: () => (
      <>
        <VGrad id="shark-back" from="#9DBBD8" mid="#5B7A99" to="#3E5772" />
        <VGrad id="shark-belly" from="#FFFFFF" to="#C9D3EC" />
        <VGrad id="shark-mouth" from="#5A1E3A" to="#1C0A18" />
      </>
    ),
    draw: (p) => (
      <G>
        {/* 가슴·배 지느러미 */}
        <Shape p={p} d="M150 136 Q160 172 190 176 Q188 150 184 134 Z" fill={p.grad('shark-back')} />
        <Shape p={p} d="M262 136 Q272 168 300 172 Q298 150 294 134 Z" fill={p.grad('shark-back')} />
        {/* 등지느러미 */}
        <Shape p={p} d="M256 46 Q284 30 292 6 Q312 30 346 46 Z" fill={p.grad('shark-back')} />
        {/* 꼬리 */}
        <Shape p={p} d="M86 90 Q50 66 12 26 Q20 76 30 98 Q20 124 14 154 Q52 124 88 112 Z" fill={p.grad('shark-back')} />
        {/* 몸통 */}
        <Shape p={p} d="M66 100 C110 58 200 38 290 40 C362 42 410 64 428 92 Q434 110 420 122 C360 148 230 152 150 138 C108 130 82 116 66 100 Z" fill={p.grad('shark-back')} />
        {/* 흰 배 */}
        <Shape p={p} d="M92 114 Q200 120 300 112 Q360 108 418 118 C356 146 230 152 150 138 C122 134 104 124 92 114 Z" fill={p.grad('shark-belly')} lw={5} />
        <Shine p={p} cx={200} cy={58} rx={44} ry={7} opacity={0.5} rotate={-6} />
        <Shine p={p} cx={300} cy={26} rx={3} ry={9} opacity={0.6} rotate={35} />
        {/* 아가미 */}
        <Path d="M318 74 Q312 90 318 104 M332 72 Q326 88 332 102 M346 72 Q340 86 346 100" stroke={p.fill('#2F4560')} strokeWidth={4} strokeLinecap="round" fill="none" />
        {/* 벌린 입 + 이빨 */}
        <Shape p={p} d="M356 110 Q392 102 426 100 Q420 128 388 128 Q366 126 356 110 Z" fill={p.grad('shark-mouth')} lw={5} />
        <Path d="M364 110 L370 120 L376 108 L382 120 L388 106 L394 119 L400 105 L406 118 L412 104 L418 116 L424 102 Z" fill={p.fill('#FFFFFF')} />
        <Path d="M376 127 L382 118 L388 128 M398 127 L404 118 L410 125" stroke={p.fill('#FFFFFF')} strokeWidth={4} strokeLinejoin="round" fill="none" />
        {/* 눈 + 매서운 눈썹 */}
        <Ellipse cx={378} cy={80} rx={10} ry={11} fill={p.fill('#FFFFFF')} stroke={p.line} strokeWidth={5} />
        <Circle cx={381} cy={81} r={6} fill={p.fill(EYE)} />
        <Circle cx={379} cy={78} r={2.5} fill={p.fill('#FFFFFF')} />
        <Path d="M362 66 L392 72" stroke={p.line} strokeWidth={6} strokeLinecap="round" />
      </G>
    ),
  },
};
