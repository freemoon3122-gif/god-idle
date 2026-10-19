import { Circle, Ellipse, G, Path } from 'react-native-svg';

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
        <VGrad id="adult-helm" from="#FFE48A" mid="#E0A53A" to="#9A6418" />
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
        <Shape p={p} d="M84 44 C84 14 130 4 192 12 C206 14 208 30 196 34 C150 28 120 30 102 50 Z" fill={p.grad('adult-plume')} />
        <Soft p={p} d="M110 26 Q140 16 180 18 M100 38 Q130 26 170 26" color="#FF9A9A" w={3} />
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

  // 제우스: 흰 머리와 큰 수염, 금관, 흰·금 옷, 빛나는 번개 (아래 5칸은 구름에 가려진다)
  zeus: {
    w: 27,
    h: 26,
    defs: () => (
      <>
        <Ball id="zeus-skin" {...SKIN} />
        <VGrad id="zeus-hair" from="#FFFFFF" mid="#F2F4FA" to="#AEB8D2" />
        <VGrad id="zeus-robe" {...ROBE} />
        <VGrad id="zeus-gold" {...GOLD} />
        <VGrad id="zeus-sash" from="#7FB0FF" to="#2D5FC0" />
        <VGrad id="zeus-bolt" from="#FFFDE0" mid="#FFE45C" to="#FFA51F" />
      </>
    ),
    draw: (p) => (
      <G>
        {/* 번개 뒤 후광 */}
        {!p.tinted && <Ellipse cx={222} cy={76} rx={46} ry={72} fill="#FFF27A" opacity={0.25} transform="rotate(35 222 76)" />}
        {/* 다리 + 샌들 (구름에 가려짐) */}
        <Shape p={p} d="M76 222 L76 244 L92 244 L92 222 Z" fill={p.grad('zeus-skin')} />
        <Shape p={p} d="M118 222 L118 244 L134 244 L134 222 Z" fill={p.grad('zeus-skin')} />
        <Shape p={p} d="M68 250 Q68 236 84 236 Q98 236 98 248 Q98 254 82 254 Q68 254 68 250 Z" fill={p.grad('zeus-gold')} />
        <Shape p={p} d="M142 250 Q142 236 126 236 Q112 236 112 248 Q112 254 128 254 Q142 254 142 250 Z" fill={p.grad('zeus-gold')} />
        {/* 왼팔 */}
        <Shape p={p} d="M52 152 Q30 162 28 190 Q30 202 42 198 Q46 180 60 170 Z" fill={p.grad('zeus-skin')} />
        {/* 옷 */}
        <Shape p={p} d="M48 196 L162 196 L170 232 Q105 242 40 232 Z" fill={p.grad('zeus-robe')} />
        <Soft p={p} d="M66 206 L62 232 M88 206 L86 236 M122 206 L124 236 M144 206 L148 232" color="#C9D3EC" w={5} />
        <Shape p={p} d="M50 150 Q105 128 160 150 L166 200 Q105 212 44 200 Z" fill={p.grad('zeus-robe')} />
        <Shape p={p} d="M52 148 L72 142 L162 192 L142 200 Z" fill={p.grad('zeus-sash')} lw={5} />
        <Shape p={p} d="M44 188 Q105 202 166 188 L168 204 Q105 218 42 204 Z" fill={p.grad('zeus-gold')} lw={5} />
        <Circle cx={105} cy={205} r={7} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={4} />
        {/* 오른팔 (번개를 치켜듦) */}
        <Shape p={p} d="M148 146 Q170 140 182 120 L198 128 Q190 160 160 170 Z" fill={p.grad('zeus-skin')} />
        {/* 번개 */}
        <Shape p={p} d="M232 6 L264 8 L236 56 L258 58 L182 152 L206 92 L184 90 Z" fill={p.grad('zeus-bolt')} />
        <Shine p={p} cx={240} cy={20} rx={10} ry={3} opacity={0.9} rotate={-60} />
        <Sparkle p={p} x={262} y={78} r={9} />
        <Sparkle p={p} x={172} y={60} r={7} />
        <Sparkle p={p} x={250} y={130} r={6} />
        <Circle cx={194} cy={122} r={13} fill={p.grad('zeus-skin')} stroke={p.line} strokeWidth={LW} />
        {/* 풍성한 머리 (머리 뒤) */}
        <Shape p={p} d="M44 118 C22 98 32 60 56 56 C58 32 88 22 105 32 C122 22 152 32 154 56 C178 60 188 98 166 118 Z" fill={p.grad('zeus-hair')} />
        <Ellipse cx={105} cy={94} rx={48} ry={46} fill={p.grad('zeus-skin')} stroke={p.line} strokeWidth={LW} />
        {/* 앞머리 */}
        <Shape p={p} d="M58 86 C56 60 80 48 105 48 C130 48 154 60 152 86 C144 78 136 72 128 74 C120 66 110 66 104 72 C96 66 86 66 80 74 C72 72 64 78 58 86 Z" fill={p.grad('zeus-hair')} />
        {/* 금관 */}
        <Shape p={p} d="M64 58 L60 28 L80 42 L92 14 L105 38 L118 14 L130 42 L150 28 L146 58 Q105 48 64 58 Z" fill={p.grad('zeus-gold')} />
        <Circle cx={60} cy={26} r={5} fill={p.fill('#FFF27A')} stroke={p.line} strokeWidth={4} />
        <Circle cx={92} cy={12} r={5} fill={p.fill('#FFF27A')} stroke={p.line} strokeWidth={4} />
        <Circle cx={118} cy={12} r={5} fill={p.fill('#FFF27A')} stroke={p.line} strokeWidth={4} />
        <Circle cx={150} cy={26} r={5} fill={p.fill('#FFF27A')} stroke={p.line} strokeWidth={4} />
        <Circle cx={105} cy={48} r={6} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={4} />
        <Shine p={p} cx={78} cy={46} rx={8} ry={3} opacity={0.8} />
        {/* 큰 수염 (가슴까지) */}
        <Shape p={p} d="M58 108 C52 146 70 172 84 178 Q92 192 102 182 Q110 194 118 182 Q128 192 134 176 C150 166 160 142 152 108 C140 118 130 124 105 124 C80 124 70 118 58 108 Z" fill={p.grad('zeus-hair')} />
        <Soft p={p} d="M84 140 Q90 156 88 168 M105 144 L105 172 M126 140 Q120 156 122 168" color="#C4CCE0" w={4} />
        {/* 얼굴: 굵은 흰 눈썹, 콧수염 */}
        <Shape p={p} d="M66 88 Q82 74 98 84 Q84 90 68 94 Z" fill={p.grad('zeus-hair')} lw={5} />
        <Shape p={p} d="M144 88 Q128 74 112 84 Q126 90 142 94 Z" fill={p.grad('zeus-hair')} lw={5} />
        <Eye p={p} cx={86} cy={102} rx={8} ry={11} />
        <Eye p={p} cx={124} cy={102} rx={8} ry={11} />
        <Blush p={p} cx={70} cy={116} rx={8} ry={5} />
        <Blush p={p} cx={140} cy={116} rx={8} ry={5} />
        <Shape p={p} d="M98 130 Q105 140 112 130 Z" fill={p.fill('#B5475A')} lw={4} />
        <Shape p={p} d="M76 126 Q90 110 105 120 Q120 110 134 126 Q120 130 105 124 Q90 130 76 126 Z" fill={p.grad('zeus-hair')} lw={5} />
      </G>
    ),
  },

  // 포세이돈: 청록 머리와 수염, 금관, 푸른 바다 갑옷, 황금 삼지창 (아래 12칸은 상어에 가려진다)
  poseidon: {
    w: 26,
    h: 26,
    defs: () => (
      <>
        <Ball id="poseidon-skin" {...SKIN} />
        <VGrad id="poseidon-hair" from="#6FE8D8" mid="#2BB3A3" to="#11665D" />
        <VGrad id="poseidon-gold" {...GOLD} />
        <Ball id="poseidon-armor" light="#8FC0FF" base="#2D5FC0" dark="#16306E" />
      </>
    ),
    draw: (p) => (
      <G>
        {/* 삼지창 자루 */}
        <Shape p={p} d="M53 60 L67 60 L67 254 L53 254 Z" fill={p.grad('poseidon-gold')} />
        {/* 다리 (상어에 가려짐) */}
        <Shape p={p} d="M128 216 L128 244 L146 244 L146 216 Z" fill={p.grad('poseidon-skin')} />
        <Shape p={p} d="M178 216 L178 244 L196 244 L196 216 Z" fill={p.grad('poseidon-skin')} />
        {/* 바다 갑옷 (비늘 무늬) */}
        <Shape p={p} d="M96 150 Q165 130 234 150 L240 222 Q165 236 90 222 Z" fill={p.grad('poseidon-armor')} />
        {!p.tinted && (
          <Path
            d="M104 196 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 M114 212 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0"
            stroke="#8FC0FF"
            strokeWidth={3.5}
            fill="none"
            opacity={0.7}
          />
        )}
        <Shape p={p} d="M92 178 Q165 194 238 178 L239 192 Q165 208 91 192 Z" fill={p.grad('poseidon-gold')} lw={5} />
        <Circle cx={165} cy={195} r={7} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={4} />
        {/* 오른팔 */}
        <Shape p={p} d="M222 150 Q246 158 248 186 Q246 198 234 194 Q232 176 218 168 Z" fill={p.grad('poseidon-skin')} />
        {/* 왼팔 → 삼지창 쥔 손 */}
        <Shape p={p} d="M108 150 Q84 146 68 150 L66 166 Q90 170 108 170 Z" fill={p.grad('poseidon-skin')} />
        <Circle cx={62} cy={158} r={13} fill={p.grad('poseidon-skin')} stroke={p.line} strokeWidth={LW} />
        {/* 조개 어깨받이 */}
        {[0, 1].map((i) => (
          <G key={i} transform={i ? 'translate(330 0) scale(-1 1)' : undefined}>
            <Shape p={p} d="M90 168 Q86 140 112 136 Q132 138 130 160 Q112 156 90 168 Z" fill={p.grad('poseidon-gold')} lw={5} />
          </G>
        ))}
        {/* 삼지창 머리 */}
        <Shape p={p} d="M12 8 L28 22 L28 38 Q60 54 92 38 L92 22 L108 8 L108 46 Q92 70 68 70 L52 70 Q28 70 12 46 Z" fill={p.grad('poseidon-gold')} />
        <Shape p={p} d="M60 2 L72 22 L67 60 L53 60 L48 22 Z" fill={p.grad('poseidon-gold')} />
        <Circle cx={60} cy={74} r={7} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={4} />
        <Shine p={p} cx={56} cy={22} rx={3} ry={10} opacity={0.8} rotate={0} />
        {/* 물결치는 머리 (머리 뒤) */}
        <Shape p={p} d="M104 124 C84 102 94 52 122 42 C138 24 194 24 208 42 C236 52 246 102 226 124 C238 138 232 150 220 146 L110 146 C98 150 92 138 104 124 Z" fill={p.grad('poseidon-hair')} />
        <Ellipse cx={165} cy={94} rx={50} ry={46} fill={p.grad('poseidon-skin')} stroke={p.line} strokeWidth={LW} />
        {/* 앞머리 */}
        <Shape p={p} d="M116 88 C114 60 138 46 165 46 C192 46 216 60 214 88 C206 78 196 72 186 78 C178 68 162 68 154 78 C144 70 126 74 116 88 Z" fill={p.grad('poseidon-hair')} />
        <Shine p={p} cx={142} cy={58} rx={12} ry={5} opacity={0.5} />
        {/* 금관 */}
        <Shape p={p} d="M124 56 L122 26 L142 40 L152 14 L165 36 L178 14 L188 40 L208 26 L206 56 Q165 46 124 56 Z" fill={p.grad('poseidon-gold')} />
        <Circle cx={165} cy={46} r={6} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={4} />
        <Circle cx={140} cy={48} r={4} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={3} />
        <Circle cx={190} cy={48} r={4} fill={p.fill('#6FE3FF')} stroke={p.line} strokeWidth={3} />
        {/* 수염 (물결 끝) */}
        <Shape p={p} d="M118 108 C112 146 126 170 140 176 Q148 190 158 180 Q166 192 174 180 Q184 190 192 176 C206 170 220 146 212 108 C200 118 190 124 165 124 C140 124 130 118 118 108 Z" fill={p.grad('poseidon-hair')} />
        <Soft p={p} d="M146 140 Q152 156 150 168 M165 144 L165 172 M184 140 Q178 156 180 168" color="#16756B" w={4} />
        {/* 얼굴 */}
        <Path d="M128 88 Q140 80 156 88 M174 88 Q190 80 202 88" stroke={p.fill('#16756B')} strokeWidth={8} strokeLinecap="round" fill="none" />
        <Eye p={p} cx={146} cy={102} rx={8} ry={11} />
        <Eye p={p} cx={184} cy={102} rx={8} ry={11} />
        <Blush p={p} cx={130} cy={116} rx={8} ry={5} />
        <Blush p={p} cx={200} cy={116} rx={8} ry={5} />
        <Shape p={p} d="M158 130 Q165 140 172 130 Z" fill={p.fill('#B5475A')} lw={4} />
        <Shape p={p} d="M136 126 Q150 110 165 120 Q180 110 194 126 Q180 130 165 124 Q150 130 136 126 Z" fill={p.grad('poseidon-hair')} lw={5} />
      </G>
    ),
  },

  // 제우스의 구름: 몽실몽실한 흰 구름 + 아래에 금빛 반짝이
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
        <Shape p={p} d="M150 128 Q160 168 190 172 Q186 146 182 126 Z" fill={p.grad('shark-back')} />
        <Shape p={p} d="M262 126 Q272 162 298 166 Q296 142 292 124 Z" fill={p.grad('shark-back')} />
        {/* 등지느러미 */}
        <Shape p={p} d="M232 60 Q252 34 262 6 Q280 30 312 58 Z" fill={p.grad('shark-back')} />
        {/* 꼬리 */}
        <Shape p={p} d="M84 88 Q50 66 12 30 Q22 76 30 96 Q20 120 14 150 Q52 120 86 108 Z" fill={p.grad('shark-back')} />
        {/* 몸통 */}
        <Shape p={p} d="M70 96 C120 66 200 50 290 52 C360 54 410 72 434 96 Q440 110 426 118 C360 138 230 140 150 126 C110 120 84 110 70 96 Z" fill={p.grad('shark-back')} />
        {/* 흰 배 */}
        <Shape p={p} d="M96 108 Q200 112 300 106 Q360 104 420 114 C350 136 230 140 150 126 C124 122 106 116 96 108 Z" fill={p.grad('shark-belly')} lw={5} />
        <Shine p={p} cx={210} cy={68} rx={40} ry={7} opacity={0.5} rotate={-6} />
        <Shine p={p} cx={256} cy={22} rx={3} ry={10} opacity={0.6} rotate={30} />
        {/* 아가미 */}
        <Path d="M318 74 Q312 90 318 104 M332 72 Q326 88 332 102 M346 72 Q340 86 346 100" stroke={p.fill('#2F4560')} strokeWidth={4} strokeLinecap="round" fill="none" />
        {/* 벌린 입 + 이빨 */}
        <Shape p={p} d="M360 110 Q396 102 432 102 Q426 128 392 128 Q370 126 360 110 Z" fill={p.grad('shark-mouth')} lw={5} />
        <Path d="M368 110 L374 120 L380 108 L386 120 L392 106 L398 119 L404 105 L410 118 L416 104 L422 116 L428 103 Z" fill={p.fill('#FFFFFF')} />
        <Path d="M380 127 L386 118 L392 128 M402 127 L408 118 L414 125" stroke={p.fill('#FFFFFF')} strokeWidth={4} strokeLinejoin="round" fill="none" />
        {/* 눈 + 매서운 눈썹 */}
        <Ellipse cx={384} cy={82} rx={10} ry={11} fill={p.fill('#FFFFFF')} stroke={p.line} strokeWidth={5} />
        <Circle cx={387} cy={83} r={6} fill={p.fill(EYE)} />
        <Circle cx={385} cy={80} r={2.5} fill={p.fill('#FFFFFF')} />
        <Path d="M368 68 L398 74" stroke={p.line} strokeWidth={6} strokeLinecap="round" />
      </G>
    ),
  },
};
