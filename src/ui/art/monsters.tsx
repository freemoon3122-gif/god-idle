import { Circle, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { ArtDef, Ball, Paint, Shape, Shine, VGrad } from './kit';

/** 뼈다귀/막대: 굵은 외곽선 위에 속 색을 한 번 더 그어서 "외곽선 있는 선"을 만든다 */
function Stick({ p, d, color, w = 8, lw = 6 }: { p: Paint; d: string; color: string; w?: number; lw?: number }) {
  return (
    <>
      <Path d={d} stroke={p.line} strokeWidth={w + lw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

/** 빛나는 빨간 눈 (주변에 은은한 빛 번짐) */
function RedEye({ p, cx, cy, r }: { p: Paint; cx: number; cy: number; r: number }) {
  return (
    <>
      {!p.tinted && <Circle cx={cx} cy={cy} r={r * 2} fill="#FF2E2E" opacity={0.28} />}
      <Circle cx={cx} cy={cy} r={r} fill={p.fill('#FF2E2E')} stroke={p.line} strokeWidth={4} />
      <Circle cx={cx + r * 0.3} cy={cy - r * 0.3} r={r * 0.35} fill={p.fill('#FFE0E0')} />
    </>
  );
}

/** 귀여운 아군 눈 (까만 눈동자 + 반짝이) */
function CuteEye({ p, cx, cy, rx, ry, iris = '#2A2240' }: { p: Paint; cx: number; cy: number; rx: number; ry: number; iris?: string }) {
  return (
    <>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.fill(iris)} stroke={p.line} strokeWidth={3} />
      {!p.tinted && <Circle cx={cx - rx * 0.3} cy={cy - ry * 0.35} r={rx * 0.42} fill="#FFFFFF" />}
      {!p.tinted && <Circle cx={cx + rx * 0.35} cy={cy + ry * 0.35} r={rx * 0.2} fill="#FFFFFF" opacity={0.8} />}
    </>
  );
}

/** 박쥐 날개 한 쪽 (왼쪽 기준, 오른쪽은 뒤집어서 쓴다) */
function BatWing({ p }: { p: Paint }) {
  return (
    <G>
      <Shape p={p} d="M104 60 Q62 30 14 8 Q4 52 14 98 Q28 84 42 102 Q52 86 66 110 Q80 94 104 112 Z" fill={p.grad('bat-wing')} />
      {/* 날개 뼈 */}
      <Path d="M102 64 Q60 36 16 12 M102 72 Q50 70 16 94 M102 82 Q66 84 42 100 M102 92 Q80 98 66 108" stroke={p.fill('#A07CE8')} strokeWidth={4} strokeLinecap="round" fill="none" />
      {/* 날개 끝 발톱 */}
      <Shape p={p} d="M14 8 Q8 2 4 6 Q10 8 12 14 Z" fill={p.fill('#F4F1E6')} lw={3} />
    </G>
  );
}

/** 필드 몬스터 (카툰 일러스트) */
export const MONSTER_ART: Record<string, ArtDef> = {
  // 독 슬라임: 반투명 젤리 몸, 빛나는 빨간 눈, 이빨 가득한 입, 흘러내리는 독
  slime: {
    w: 26,
    h: 21,
    defs: () => (
      <>
        <Ball id="slime-body" light="#D8FF9A" base="#6CC24A" dark="#22661F" />
        <VGrad id="slime-mouth" from="#3A0F2E" to="#120612" />
      </>
    ),
    draw: (p) => (
      <G>
        <Shape p={p} d="M20 180 C10 120 50 30 130 22 C210 30 250 120 240 180 C246 200 220 204 200 196 C190 210 170 210 160 198 C140 208 120 208 100 198 C88 210 66 210 58 196 C40 204 14 200 20 180 Z" fill={p.grad('slime-body')} />
        <Shine p={p} cx={80} cy={62} rx={30} ry={14} />
        <Shine p={p} cx={120} cy={44} rx={9} ry={6} opacity={0.5} />
        {/* 화난 눈썹 + 빛나는 눈 */}
        <Path d="M56 86 L104 104" stroke={p.line} strokeWidth={9} strokeLinecap="round" />
        <Path d="M204 86 L156 104" stroke={p.line} strokeWidth={9} strokeLinecap="round" />
        <Ellipse cx={84} cy={112} rx={15} ry={12} fill={p.fill('#FF2E2E')} stroke={p.line} strokeWidth={5} />
        <Ellipse cx={176} cy={112} rx={15} ry={12} fill={p.fill('#FF2E2E')} stroke={p.line} strokeWidth={5} />
        <Circle cx={88} cy={109} r={4} fill={p.fill('#FFE0E0')} />
        <Circle cx={180} cy={109} r={4} fill={p.fill('#FFE0E0')} />
        {/* 이빨 가득한 입 */}
        <Shape p={p} d="M58 138 Q130 128 202 138 Q196 178 130 180 Q64 178 58 138 Z" fill={p.grad('slime-mouth')} lw={6} />
        <Path d="M66 140 L76 156 L86 140 L96 156 L106 139 L116 156 L126 138 L136 156 L146 138 L156 156 L166 139 L176 156 L186 140 L196 154 Z" fill={p.fill('#F4F1E6')} />
        <Path d="M78 177 L88 164 L98 178 M150 178 L160 164 L170 177" stroke={p.fill('#F4F1E6')} strokeWidth={6} strokeLinejoin="round" fill="none" />
        {/* 흘러내리는 독 방울 */}
        <Shape p={p} d="M34 190 Q30 206 38 210 Q46 206 42 190 Z" fill={p.fill('#B8F27C')} lw={4} />
        <Shape p={p} d="M222 188 Q218 204 226 208 Q234 204 230 188 Z" fill={p.fill('#B8F27C')} lw={4} />
      </G>
    ),
  },

  // 흡혈 박쥐: 활짝 편 보라 날개, 뾰족 귀, 빛나는 빨간 눈, 송곳니
  bat: {
    w: 26,
    h: 16,
    defs: () => (
      <>
        <Ball id="bat-body" light="#C29CFF" base="#7A4FC8" dark="#36186E" />
        <VGrad id="bat-wing" from="#6A3AAE" to="#24103A" />
        <VGrad id="bat-mouth" from="#3A0F2E" to="#120612" />
      </>
    ),
    draw: (p) => (
      <G>
        <BatWing p={p} />
        <G transform="translate(260 0) scale(-1 1)">
          <BatWing p={p} />
        </G>
        {/* 발 */}
        <Shape p={p} d="M116 134 L112 150 L120 144 L124 152 L126 136 Z" fill={p.fill('#F4F1E6')} lw={4} />
        <Shape p={p} d="M144 134 L148 150 L140 144 L136 152 L134 136 Z" fill={p.fill('#F4F1E6')} lw={4} />
        {/* 몸통 + 뾰족 귀 */}
        <Shape p={p} d="M98 72 Q96 50 104 38 L100 8 L124 32 Q130 30 136 32 L160 8 L156 38 Q164 50 162 72 Q168 118 130 142 Q92 118 98 72 Z" fill={p.grad('bat-body')} />
        <Path d="M106 34 L104 18 L118 32 Z M154 34 L156 18 L142 32 Z" fill={p.fill('#3A1E6E')} />
        {/* 배 털 */}
        <Path d="M112 112 L118 118 L124 112 L130 120 L136 112 L142 118 L148 112 Q146 132 130 138 Q114 132 112 112 Z" fill={p.fill('#A27AE8')} />
        <Shine p={p} cx={112} cy={54} rx={10} ry={6} opacity={0.6} />
        {/* 화난 눈썹 + 빛나는 눈 */}
        <Path d="M100 64 L124 76 M160 64 L136 76" stroke={p.line} strokeWidth={8} strokeLinecap="round" />
        <RedEye p={p} cx={115} cy={84} r={9} />
        <RedEye p={p} cx={145} cy={84} r={9} />
        {/* 송곳니 입 */}
        <Shape p={p} d="M114 98 Q130 94 146 98 Q142 116 130 118 Q118 116 114 98 Z" fill={p.grad('bat-mouth')} lw={4} />
        <Path d="M117 99 L121 113 L126 99 Z M143 99 L139 113 L134 99 Z" fill={p.fill('#F4F1E6')} stroke={p.line} strokeWidth={2} strokeLinejoin="round" />
      </G>
    ),
  },

  // 해골 전사: 뿔 달린 녹슨 투구, 갈비뼈, 왼손엔 나무 방패, 오른손엔 녹슨 칼
  skeleton: {
    w: 22,
    h: 24,
    defs: () => (
      <>
        <Ball id="skeleton-bone" light="#FFFDF2" base="#E6DFC8" dark="#A59B80" />
        <VGrad id="skeleton-iron" from="#9DA2B4" mid="#6F7385" to="#41434F" />
        <VGrad id="skeleton-wood" from="#A8703E" mid="#7A4A26" to="#4A2A14" />
        <LinearGradient id="skeleton-blade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#F4F7FF" />
          <Stop offset="0.5" stopColor="#C9D2E6" />
          <Stop offset="1" stopColor="#7E8CAA" />
        </LinearGradient>
        <VGrad id="skeleton-gold" from="#FFE27A" to="#B07F14" />
      </>
    ),
    draw: (p) => {
      const bone = p.fill('#E6DFC8');
      return (
        <G>
          {/* 칼 (뒤쪽에 세워 듦) */}
          <Shape p={p} d="M190 26 L202 44 L202 154 L178 154 L178 44 Z" fill={p.grad('skeleton-blade')} />
          <Path d="M190 46 L190 146" stroke={p.fill('#93A3C2')} strokeWidth={4} strokeLinecap="round" />
          <Path d="M202 80 L196 86 L202 92 M178 118 L184 124 L178 130" fill={p.fill('#A0552E')} stroke={p.fill('#A0552E')} strokeWidth={3} />
          <Shape p={p} d="M184 166 L196 166 L196 188 L184 188 Z" fill={p.grad('skeleton-wood')} lw={5} />
          <Shape p={p} d="M164 152 L216 152 L214 166 L166 166 Z" fill={p.grad('skeleton-gold')} lw={6} />
          <Circle cx={190} cy={194} r={7} fill={p.fill('#E0B43A')} stroke={p.line} strokeWidth={5} />
          {/* 다리뼈 + 녹슨 장화 */}
          <Stick p={p} d="M78 192 L76 220" color={bone} />
          <Stick p={p} d="M120 192 L122 220" color={bone} />
          <Shape p={p} d="M58 216 L92 216 Q96 232 90 234 L56 234 Q52 226 58 216 Z" fill={p.grad('skeleton-iron')} lw={6} />
          <Shape p={p} d="M106 216 L140 216 Q146 226 142 234 L108 234 Q102 232 106 216 Z" fill={p.grad('skeleton-iron')} lw={6} />
          {/* 갈비뼈 */}
          <Shape p={p} d="M60 138 L134 138 L128 182 L66 182 Z" fill={p.fill('#2A1238')} />
          <Path d="M66 152 Q97 144 128 152 M68 164 Q97 156 126 164 M70 175 Q97 168 124 175" stroke={bone} strokeWidth={6} strokeLinecap="round" fill="none" />
          <Path d="M97 134 L97 184" stroke={bone} strokeWidth={8} strokeLinecap="round" />
          {/* 녹슨 어깨 갑옷 + 허리띠 */}
          <Shape p={p} d="M48 132 Q97 118 146 132 L142 148 Q97 138 52 148 Z" fill={p.grad('skeleton-iron')} lw={6} />
          <Circle cx={62} cy={138} r={3} fill={p.fill('#A0552E')} />
          <Circle cx={132} cy={138} r={3} fill={p.fill('#A0552E')} />
          <Shape p={p} d="M60 178 L134 178 L138 194 L56 194 Z" fill={p.grad('skeleton-iron')} lw={6} />
          <Shape p={p} d="M90 180 L104 180 L104 192 L90 192 Z" fill={p.grad('skeleton-gold')} lw={3} />
          {/* 오른팔 → 칼자루 */}
          <Stick p={p} d="M138 150 Q158 170 180 176" color={bone} w={9} />
          <Shape p={p} d="M180 167 L199 167 Q203 176 199 185 L180 185 Q175 176 180 167 Z" fill={bone} lw={5} />
          <Path d="M181 173 L198 173 M181 179 L198 179" stroke={p.line} strokeWidth={2.5} strokeLinecap="round" />
          {/* 왼팔 → 방패 */}
          <Stick p={p} d="M56 150 Q44 160 34 156" color={bone} w={9} />
          <Shape p={p} d="M6 128 Q26 116 48 128 L46 168 Q28 190 8 170 Z" fill={p.grad('skeleton-wood')} />
          <Path d="M20 124 L20 180 M34 122 L34 182" stroke={p.fill('#4A2A14')} strokeWidth={3} />
          <Path d="M8 146 Q27 140 47 146" stroke={p.fill('#6F7385')} strokeWidth={7} fill="none" />
          <Circle cx={27} cy={130} r={4} fill={p.fill('#FFD54A')} stroke={p.line} strokeWidth={2.5} />
          <Circle cx={27} cy={162} r={4} fill={p.fill('#FFD54A')} stroke={p.line} strokeWidth={2.5} />
          <Shine p={p} cx={16} cy={134} rx={5} ry={3} opacity={0.4} />
          {/* 목뼈 */}
          <Stick p={p} d="M97 120 L97 132" color={bone} w={10} />
          {/* 해골 */}
          <Shape p={p} d="M46 78 Q44 58 64 56 L150 56 Q170 58 168 78 L168 100 Q168 116 150 116 L64 116 Q46 116 46 100 Z" fill={p.grad('skeleton-bone')} />
          <Shape p={p} d="M68 110 L146 110 L140 128 L74 128 Z" fill={p.grad('skeleton-bone')} lw={6} />
          <Path d="M70 117 L144 117 M84 112 L84 126 M96 112 L96 127 M108 112 L108 127 M120 112 L120 127 M132 112 L132 126" stroke={p.line} strokeWidth={3} />
          {/* 화난 눈구멍 + 빨간 눈 */}
          <Path d="M58 78 L100 90 Q102 106 82 108 Q58 106 58 78 Z" fill={p.fill('#2A1238')} />
          <Path d="M156 78 L114 90 Q112 106 132 108 Q156 106 156 78 Z" fill={p.fill('#2A1238')} />
          <RedEye p={p} cx={82} cy={97} r={7} />
          <RedEye p={p} cx={132} cy={97} r={7} />
          <Path d="M107 98 L101 110 L113 110 Z" fill={p.fill('#2A1238')} />
          {/* 금 간 자국 */}
          <Path d="M150 60 L144 70 L150 76" stroke={p.fill('#8A7F66')} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* 뿔 투구 */}
          <Shape p={p} d="M54 44 Q32 34 34 4 Q46 22 66 30 Z" fill={p.fill('#C8C8D8')} lw={6} />
          <Shape p={p} d="M160 44 Q182 34 180 4 Q168 22 148 30 Z" fill={p.fill('#C8C8D8')} lw={6} />
          <Shape p={p} d="M38 74 Q36 20 107 18 Q178 20 176 74 Q107 60 38 74 Z" fill={p.grad('skeleton-iron')} />
          <Path d="M107 20 L107 64" stroke={p.fill('#41434F')} strokeWidth={5} />
          <Path d="M42 70 Q107 56 172 70" stroke={p.fill('#41434F')} strokeWidth={5} fill="none" />
          <Circle cx={60} cy={58} r={3.5} fill={p.fill('#C8C8D8')} />
          <Circle cx={154} cy={58} r={3.5} fill={p.fill('#C8C8D8')} />
          {!p.tinted && <Ellipse cx={138} cy={38} rx={9} ry={6} fill="#A0552E" opacity={0.7} />}
          {!p.tinted && <Ellipse cx={66} cy={50} rx={6} ry={4} fill="#A0552E" opacity={0.7} />}
          <Shine p={p} cx={74} cy={32} rx={16} ry={7} opacity={0.5} />
          <Shine p={p} cx={80} cy={70} rx={10} ry={4} opacity={0.5} rotate={-10} />
        </G>
      );
    },
  },

  // 원령: 반투명 보랏빛 유령, 너덜너덜 흩날리는 꼬리, 갈퀴 손, 찢어진 입
  ghost: {
    w: 20,
    h: 22,
    defs: () => (
      <>
        <Ball id="ghost-body" light="#D6CCFF" base="#7C6FA8" dark="#34405E" />
        <LinearGradient id="ghost-tail" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3E5772" stopOpacity={0} />
          <Stop offset="1" stopColor="#2A3A55" stopOpacity={0.9} />
        </LinearGradient>
        <VGrad id="ghost-mouth" from="#2A1238" to="#0E0616" />
        <VGrad id="ghost-claw" from="#F2F0FF" to="#A9A4C8" />
      </>
    ),
    draw: (p) => {
      const body = 'M100 12 C42 12 12 48 12 96 L14 126 Q30 136 40 150 Q44 180 28 212 Q56 200 70 186 Q76 204 90 212 Q92 192 100 184 Q108 192 110 212 Q124 204 130 186 Q144 200 172 212 Q156 180 160 150 Q170 136 186 126 L188 96 C188 48 158 12 100 12 Z';
      return (
        <G opacity={p.tinted ? 1 : 0.86}>
          {/* 흐릿한 잔상 */}
          {!p.tinted && <Path d={body} fill="#9C8FD8" opacity={0.25} transform="translate(100 110) scale(1.06) translate(-100 -110)" />}
          <Shape p={p} d={body} fill={p.grad('ghost-body')} />
          {!p.tinted && <Path d="M24 150 Q60 140 100 144 Q140 140 176 150 Q156 180 172 212 Q144 200 130 186 Q124 204 110 212 Q108 192 100 184 Q92 192 90 212 Q76 204 70 186 Q56 200 28 212 Q44 180 24 150 Z" fill="url(#ghost-tail)" />}
          {/* 몸에 감도는 연기 무늬 */}
          <Path d="M50 160 Q60 150 72 158 M124 162 Q138 150 150 160 M86 176 Q100 166 112 176" stroke={p.fill('#B2A6E6')} strokeWidth={4} strokeLinecap="round" fill="none" opacity={p.tinted ? 1 : 0.6} />
          <Shine p={p} cx={60} cy={36} rx={22} ry={10} opacity={0.55} />
          <Shine p={p} cx={92} cy={24} rx={7} ry={4} opacity={0.4} />
          {/* 갈퀴 손 */}
          {[0, 1].map((i) => (
            <G key={i} transform={i ? 'translate(200 0) scale(-1 1)' : undefined}>
              <Shape p={p} d="M44 120 Q22 118 12 136 Q22 148 40 146 Z" fill={p.grad('ghost-body')} lw={6} />
              <Shape p={p} d="M14 134 Q2 148 6 170 Q12 154 22 144 Z" fill={p.grad('ghost-claw')} lw={4} />
              <Shape p={p} d="M22 140 Q14 156 20 176 Q24 158 31 146 Z" fill={p.grad('ghost-claw')} lw={4} />
              <Shape p={p} d="M31 143 Q28 156 34 170 Q36 156 40 146 Z" fill={p.grad('ghost-claw')} lw={4} />
            </G>
          ))}
          {/* 화난 눈구멍 + 빨간 눈 */}
          <Path d="M28 50 L80 66 Q82 88 58 90 Q30 88 28 50 Z" fill={p.fill('#1E0C2A')} stroke={p.line} strokeWidth={3} />
          <Path d="M172 50 L120 66 Q118 88 142 90 Q170 88 172 50 Z" fill={p.fill('#1E0C2A')} stroke={p.line} strokeWidth={3} />
          <RedEye p={p} cx={58} cy={76} r={8} />
          <RedEye p={p} cx={142} cy={76} r={8} />
          {/* 찢어진 입 */}
          <Shape p={p} d="M38 102 Q100 94 162 102 Q158 134 100 138 Q42 134 38 102 Z" fill={p.grad('ghost-mouth')} lw={6} />
          <Path d="M44 104 L52 118 L62 102 L72 118 L82 100 L92 118 L100 99 L108 118 L118 100 L128 118 L138 102 L148 118 L156 103 Z" fill={p.fill('#EDEAF8')} />
          <Path d="M62 133 L72 122 L82 135 M118 135 L128 122 L138 133" stroke={p.fill('#EDEAF8')} strokeWidth={6} strokeLinejoin="round" fill="none" />
        </G>
      );
    },
  },

  // 키클롭스: 갈색 피부 외눈 거인, 이마의 금빛 뿔, 굵은 일자 눈썹, 가시 박힌 몽둥이
  cyclops: {
    w: 25,
    h: 26,
    defs: () => (
      <>
        <Ball id="cyclops-skin" light="#E8AE7E" base="#B87A4E" dark="#6A3E22" />
        <VGrad id="cyclops-cloth" from="#9A6236" mid="#7A4A26" to="#4A2A14" />
        <VGrad id="cyclops-wood" from="#A8703E" mid="#7A4A26" to="#4A2A14" />
        <VGrad id="cyclops-gold" from="#FFE27A" to="#B07F14" />
        <Ball id="cyclops-iris" light="#FF8A7A" base="#FF2E2E" dark="#8A0E14" />
        <VGrad id="cyclops-mouth" from="#5A1424" to="#1A0610" />
        <VGrad id="cyclops-foot" from="#4A2A5A" to="#1E0C2A" />
      </>
    ),
    draw: (p) => {
      const skin = p.grad('cyclops-skin');
      const shade = p.fill('#8E5A37');
      return (
        <G>
          {/* 몽둥이 손잡이 + 머리 (가시) */}
          <Shape p={p} d="M214 190 L238 190 L232 254 L222 254 Z" fill={p.grad('cyclops-wood')} />
          <Path d="M200 146 L184 140 L198 162 Z M210 112 L204 94 L222 108 Z M238 108 L246 92 L246 118 Z M244 150 L248 152 L244 168 Z M196 182 L184 186 L200 192 Z" fill={p.fill('#C8C8D8')} stroke={p.line} strokeWidth={4} strokeLinejoin="round" />
          <Shape p={p} d="M200 200 Q182 150 200 120 Q222 94 242 116 Q254 150 242 200 Q222 212 200 200 Z" fill={p.grad('cyclops-wood')} />
          <Path d="M212 130 Q218 150 214 176 M230 128 Q236 150 230 182" stroke={p.fill('#4A2A14')} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          <Path d="M196 184 Q222 192 246 182" stroke={p.fill('#6F7385')} strokeWidth={8} fill="none" />
          <Path d="M196 184 Q222 192 246 182" stroke={p.line} strokeWidth={2} fill="none" transform="translate(0 5)" />
          <Shine p={p} cx={210} cy={126} rx={8} ry={4} opacity={0.4} />
          {/* 다리 + 발 */}
          <Shape p={p} d="M52 206 L86 206 L84 240 L50 240 Z" fill={skin} />
          <Shape p={p} d="M126 206 L160 206 L162 240 L128 240 Z" fill={skin} />
          <Shape p={p} d="M32 234 L88 234 Q92 250 82 254 L30 254 Q24 244 32 234 Z" fill={p.grad('cyclops-foot')} />
          <Shape p={p} d="M124 234 L180 234 Q188 244 182 254 L130 254 Q120 250 124 234 Z" fill={p.grad('cyclops-foot')} />
          {/* 몸통 */}
          <Shape p={p} d="M24 162 Q28 138 62 136 L150 136 Q184 138 188 162 L182 198 L30 198 Z" fill={skin} />
          <Path d="M70 164 Q88 176 104 166 M108 166 Q124 176 142 164 M106 178 L106 184" stroke={shade} strokeWidth={4} strokeLinecap="round" fill="none" />
          {/* 왼팔 (주먹) */}
          <Shape p={p} d="M34 148 Q8 156 8 188 L10 204 Q20 220 34 210 L38 192 Q42 172 48 162 Z" fill={skin} />
          <Path d="M14 200 Q24 204 32 200" stroke={shade} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* 오른팔 → 몽둥이 쥔 손 */}
          <Shape p={p} d="M176 148 Q198 154 208 184 L214 196 L198 206 L190 190 Q182 174 168 164 Z" fill={skin} />
          <Shape p={p} d="M206 194 Q226 188 238 200 Q240 214 226 218 Q208 220 204 208 Z" fill={skin} lw={6} />
          <Path d="M214 200 L214 214 M224 198 L224 216" stroke={shade} strokeWidth={3} strokeLinecap="round" />
          {/* 허리 가죽 천 + 금 장식 */}
          <Shape p={p} d="M36 184 L176 184 L172 214 L132 208 L116 222 L98 208 L42 214 Z" fill={p.grad('cyclops-cloth')} />
          {[64, 92, 124, 152].map((x) => (
            <Circle key={x} cx={x} cy={196} r={5} fill={p.grad('cyclops-gold')} stroke={p.line} strokeWidth={3} />
          ))}
          {/* 금빛 뿔 */}
          <Shape p={p} d="M96 34 Q100 12 112 4 Q120 18 122 34 Z" fill={p.grad('cyclops-gold')} lw={6} />
          {/* 머리 */}
          <Shape p={p} d="M40 82 Q40 28 108 26 Q176 28 176 82 L176 118 Q176 148 108 150 Q40 148 40 118 Z" fill={skin} />
          <Shine p={p} cx={74} cy={44} rx={20} ry={8} opacity={0.45} />
          {/* 큰 외눈 */}
          <Ellipse cx={108} cy={106} rx={38} ry={22} fill={p.fill('#F4F1E6')} stroke={p.line} strokeWidth={6} />
          {!p.tinted && <Circle cx={108} cy={106} r={24} fill="#FF2E2E" opacity={0.25} />}
          <Circle cx={108} cy={106} r={15} fill={p.grad('cyclops-iris')} stroke={p.line} strokeWidth={4} />
          <Ellipse cx={108} cy={106} rx={4} ry={10} fill={p.fill('#1E0C2A')} />
          <Circle cx={113} cy={100} r={4} fill={p.fill('#FFE0E0')} />
          {/* 화난 일자 눈썹 */}
          <Shape p={p} d="M52 62 L108 82 L164 62 L166 76 L108 96 L50 76 Z" fill={p.fill('#2A1238')} lw={4} />
          {/* 볼 주름 */}
          <Path d="M56 112 Q60 124 70 128 M160 112 Q156 124 146 128" stroke={shade} strokeWidth={4} strokeLinecap="round" fill="none" />
          {/* 엄니 난 입 */}
          <Shape p={p} d="M70 128 Q108 120 146 128 Q142 146 108 146 Q74 146 70 128 Z" fill={p.grad('cyclops-mouth')} lw={5} />
          <Path d="M74 129 L80 137 L88 127 L96 136 L104 126 L112 136 L120 126 L128 136 L136 127 L142 134 Z" fill={p.fill('#F4F1E6')} />
          <Shape p={p} d="M76 146 L80 128 L88 144 Z" fill={p.fill('#F4F1E6')} lw={3} />
          <Shape p={p} d="M140 146 L136 128 L128 144 Z" fill={p.fill('#F4F1E6')} lw={3} />
        </G>
      );
    },
  },

  // 헤라클레스 (아군): 사자 가죽을 뒤집어쓴 영웅, 갈색 수염, 오른손에 활
  heracles: {
    w: 22,
    h: 21,
    defs: () => (
      <>
        <Ball id="heracles-pelt" light="#F6CF73" base="#D9A441" dark="#8A5E1A" />
        <VGrad id="heracles-muzzle" from="#B8862E" to="#7E5418" />
        <Ball id="heracles-skin" light="#FFF0E2" base="#FFDDC4" dark="#E0A07E" />
        <VGrad id="heracles-beard" from="#A06A34" to="#5E3A1C" />
        <VGrad id="heracles-leather" from="#9A6236" to="#4A2A14" />
        <VGrad id="heracles-kilt" from="#D9A441" to="#9C6F23" />
      </>
    ),
    draw: (p) => {
      const skin = p.grad('heracles-skin');
      const wood = p.fill('#8A552A');
      return (
        <G>
          {/* 활 (그리스식 겹굽이 활) + 활시위 */}
          <Path d="M170 30 L170 180" stroke={p.fill('#F4F1E6')} strokeWidth={3} />
          <Stick p={p} d="M170 30 Q206 38 198 74 Q192 94 182 104 Q192 116 198 136 Q206 172 170 180" color={wood} w={9} />
          <Path d="M174 34 Q196 40 194 66" stroke={p.fill('#C08A50')} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* 다리 + 샌들 */}
          <Shape p={p} d="M38 164 L58 164 L58 192 L38 192 Z" fill={skin} />
          <Shape p={p} d="M82 164 L102 164 L102 192 L82 192 Z" fill={skin} />
          <Shape p={p} d="M28 188 L60 188 L62 202 L26 202 Z" fill={p.grad('heracles-leather')} lw={6} />
          <Shape p={p} d="M80 188 L112 188 L114 202 L78 202 Z" fill={p.grad('heracles-leather')} lw={6} />
          {/* 몸통 */}
          <Shape p={p} d="M36 106 L106 106 L110 152 L32 152 Z" fill={skin} />
          <Path d="M52 122 Q62 128 70 122 Q78 128 90 122" stroke={p.fill('#E0A07E')} strokeWidth={4} fill="none" strokeLinecap="round" />
          {/* 사자 가죽 치마 */}
          <Shape p={p} d="M30 146 L112 146 L116 170 L102 164 L92 172 L80 164 L70 172 L60 164 L48 172 L38 164 L26 170 Z" fill={p.grad('heracles-kilt')} />
          <Shape p={p} d="M30 138 L112 138 L112 150 L30 150 Z" fill={p.grad('heracles-leather')} lw={5} />
          <Shape p={p} d="M64 136 L78 136 L78 152 L64 152 Z" fill={p.fill('#FFD54A')} lw={3} />
          {/* 왼팔 */}
          <Shape p={p} d="M22 108 Q6 118 8 140 L10 148 Q22 152 28 144 L32 120 Z" fill={skin} />
          {/* 오른팔 → 활 손잡이 */}
          <Shape p={p} d="M100 104 L172 96 L176 112 L104 122 Z" fill={skin} />
          <Shape p={p} d="M170 92 Q188 90 190 104 Q190 118 172 116 Z" fill={skin} lw={6} />
          {/* 어깨에 걸친 사자 앞발 */}
          <Shape p={p} d="M8 98 Q30 94 44 110 L38 134 Q24 138 14 128 Q6 116 8 98 Z" fill={p.grad('heracles-pelt')} />
          <Shape p={p} d="M98 110 Q112 94 134 98 Q136 116 128 128 Q118 136 104 132 Z" fill={p.grad('heracles-pelt')} />
          <Path d="M16 128 L18 136 M24 132 L26 140 M120 130 L122 138 M128 124 L132 132" stroke={p.fill('#F4F1E6')} strokeWidth={3} strokeLinecap="round" />
          {/* 사자 귀 */}
          <Circle cx={52} cy={18} r={11} fill={p.grad('heracles-pelt')} stroke={p.line} strokeWidth={6} />
          <Circle cx={92} cy={18} r={11} fill={p.grad('heracles-pelt')} stroke={p.line} strokeWidth={6} />
          <Circle cx={52} cy={19} r={5} fill={p.fill('#9C6F23')} />
          <Circle cx={92} cy={19} r={5} fill={p.fill('#9C6F23')} />
          {/* 갈기 */}
          <Shape p={p} d="M12 58 Q8 22 40 16 Q72 6 104 16 Q134 22 130 58 L132 92 Q134 116 120 122 L22 122 Q8 116 10 92 Z" fill={p.grad('heracles-pelt')} />
          <Path d="M16 70 Q20 80 16 90 M126 70 Q122 80 126 90 M20 100 Q24 108 22 116 M122 100 Q118 108 120 116" stroke={p.fill('#9C6F23')} strokeWidth={4} strokeLinecap="round" fill="none" />
          {/* 얼굴 */}
          <Shape p={p} d="M30 50 L112 50 L112 82 Q112 104 71 106 Q30 104 30 82 Z" fill={skin} />
          {/* 수염 */}
          <Shape p={p} d="M28 74 Q30 112 71 114 Q112 112 114 74 Q106 92 94 86 Q82 96 71 92 Q60 96 48 86 Q36 92 28 74 Z" fill={p.grad('heracles-beard')} />
          <Path d="M62 96 Q71 102 80 96" stroke={p.fill('#B5475A')} strokeWidth={4} strokeLinecap="round" fill="none" />
          {/* 눈 + 눈썹 */}
          <CuteEye p={p} cx={52} cy={68} rx={7} ry={9} />
          <CuteEye p={p} cx={90} cy={68} rx={7} ry={9} />
          <Path d="M42 54 L60 52 M82 52 L100 54" stroke={p.fill('#5E3A1C')} strokeWidth={5} strokeLinecap="round" />
          {!p.tinted && <Ellipse cx={40} cy={80} rx={6} ry={3.5} fill="#FF9FB0" opacity={0.7} />}
          {!p.tinted && <Ellipse cx={102} cy={80} rx={6} ry={3.5} fill="#FF9FB0" opacity={0.7} />}
          {/* 사자 윗턱 (이마를 덮는 주둥이 + 송곳니) */}
          <Path d="M34 42 L40 58 L46 42 Z M50 44 L54 56 L58 44 Z M84 44 L88 56 L92 44 Z M96 42 L102 58 L108 42 Z" fill={p.fill('#F4F1E6')} stroke={p.line} strokeWidth={2.5} strokeLinejoin="round" />
          <Shape p={p} d="M24 32 Q71 14 118 32 L116 46 Q71 36 26 46 Z" fill={p.grad('heracles-muzzle')} lw={6} />
          <Path d="M48 30 L58 34 M94 30 L84 34" stroke={p.line} strokeWidth={4} strokeLinecap="round" />
          <Ellipse cx={71} cy={28} rx={8} ry={5} fill={p.fill('#3A2414')} />
          <Shine p={p} cx={40} cy={26} rx={10} ry={4} opacity={0.5} />
        </G>
      );
    },
  },

  // 가이아 (아군, 대화창 초상화): 꽃 핀 초록 머리, 흙빛 피부, 다정한 미소, 초록 옷
  gaia: {
    w: 17,
    h: 15,
    defs: () => (
      <>
        <Ball id="gaia-hair" light="#A8F08A" base="#5CC46B" dark="#246B34" />
        <Ball id="gaia-skin" light="#E2A878" base="#B87A4E" dark="#7E4E2C" />
        <VGrad id="gaia-robe" from="#4FA046" mid="#2E7A2A" to="#1A4A1A" />
        <VGrad id="gaia-gold" from="#FFE27A" to="#B07F14" />
      </>
    ),
    draw: (p) => (
      <G>
        {/* 뒷머리 (어깨까지 덮는 풍성한 잎 머리) */}
        <Shape p={p} d="M14 140 Q2 96 12 52 Q22 12 85 8 Q148 12 158 52 Q168 96 156 140 Q140 146 130 136 L40 136 Q30 146 14 140 Z" fill={p.grad('gaia-hair')} />
        {/* 옷 */}
        <Shape p={p} d="M22 146 Q28 116 60 110 L110 110 Q142 116 148 146 Z" fill={p.grad('gaia-robe')} />
        <Path d="M70 112 L85 132 L100 112" stroke={p.fill('#8AD06A')} strokeWidth={4} fill="none" strokeLinejoin="round" />
        <Circle cx={85} cy={130} r={7} fill={p.grad('gaia-gold')} stroke={p.line} strokeWidth={4} />
        {/* 얼굴 */}
        <Shape p={p} d="M38 46 L132 46 L132 86 Q130 112 85 114 Q40 112 38 86 Z" fill={p.grad('gaia-skin')} />
        {/* 앞머리 */}
        <Shape p={p} d="M28 56 Q40 26 85 28 Q130 26 142 56 Q128 46 114 58 Q100 44 85 58 Q70 44 56 58 Q42 46 28 56 Z" fill={p.grad('gaia-hair')} lw={6} />
        {/* 어깨 위로 흘러내린 머리칼 */}
        <Shape p={p} d="M30 80 Q26 112 18 140 Q34 136 40 120 Q42 100 40 84 Z" fill={p.grad('gaia-hair')} lw={5} />
        <Shape p={p} d="M140 80 Q144 112 152 140 Q136 136 130 120 Q128 100 130 84 Z" fill={p.grad('gaia-hair')} lw={5} />
        {/* 잎사귀 + 꽃 화관 */}
        <Shape p={p} d="M60 14 Q72 0 84 12 Q72 18 60 14 Z" fill={p.fill('#2F8A45')} lw={4} />
        <Shape p={p} d="M110 14 Q98 0 86 12 Q98 18 110 14 Z" fill={p.fill('#2F8A45')} lw={4} />
        <Shape p={p} d="M20 40 Q22 22 38 22 Q34 36 20 40 Z" fill={p.fill('#2F8A45')} lw={4} />
        <Shape p={p} d="M150 40 Q148 22 132 22 Q136 36 150 40 Z" fill={p.fill('#2F8A45')} lw={4} />
        {[
          [48, 24],
          [124, 24],
          [85, 16],
        ].map(([x, y]) => (
          <G key={x}>
            {[0, 72, 144, 216, 288].map((a) => (
              <Circle key={a} cx={x + 6 * Math.cos((a * Math.PI) / 180)} cy={y + 6 * Math.sin((a * Math.PI) / 180)} r={5} fill={p.fill('#FF9FB0')} stroke={p.line} strokeWidth={2.5} />
            ))}
            <Circle cx={x} cy={y} r={3.5} fill={p.fill('#FFD54A')} />
          </G>
        ))}
        <Shine p={p} cx={40} cy={44} rx={9} ry={4} opacity={0.4} />
        {/* 다정한 눈 + 속눈썹 */}
        <CuteEye p={p} cx={62} cy={72} rx={7} ry={9} iris="#2A5A2A" />
        <CuteEye p={p} cx={108} cy={72} rx={7} ry={9} iris="#2A5A2A" />
        <Path d="M52 62 Q62 56 72 62 M98 62 Q108 56 118 62" stroke={p.fill('#2A1238')} strokeWidth={4} strokeLinecap="round" fill="none" />
        {!p.tinted && <Ellipse cx={50} cy={88} rx={7} ry={4} fill="#FF9FB0" opacity={0.55} />}
        {!p.tinted && <Ellipse cx={120} cy={88} rx={7} ry={4} fill="#FF9FB0" opacity={0.55} />}
        <Path d="M82 82 Q85 86 88 82" stroke={p.fill('#7E4E2C')} strokeWidth={3} strokeLinecap="round" fill="none" />
        {/* 미소 */}
        <Shape p={p} d="M72 92 Q85 96 98 92 Q96 104 85 104 Q74 104 72 92 Z" fill={p.fill('#B8323A')} lw={3.5} />
      </G>
    ),
  },

  // 헤르메스 (아군, 대화창 초상화): 날개 달린 금빛 모자, 갈색 머리, 활짝 웃는 얼굴, 파란 망토
  hermes: {
    w: 21,
    h: 15,
    defs: () => (
      <>
        <Ball id="hermes-hat" light="#FFF0A0" base="#FFD54A" dark="#B07F14" />
        <VGrad id="hermes-brim" from="#E8B830" to="#9C6F14" />
        <VGrad id="hermes-wing" from="#FFFFFF" to="#B9C6E4" />
        <Ball id="hermes-skin" light="#FFF0E2" base="#FFDDC4" dark="#E0A07E" />
        <VGrad id="hermes-hair" from="#A06A34" to="#5E3A1C" />
        <VGrad id="hermes-tunic" from="#FFFFFF" to="#C2CCE4" />
        <VGrad id="hermes-cape" from="#6AA2FF" to="#2D5FC0" />
      </>
    ),
    draw: (p) => {
      // 날개 한 쪽 (왼쪽 기준, 105를 축으로 뒤집어 오른쪽)
      const wing = (
        <G>
          <Shape p={p} d="M62 40 Q36 36 10 6 Q14 22 22 28 Q8 28 6 36 Q18 42 28 42 Q20 48 22 54 Q42 54 62 48 Z" fill={p.grad('hermes-wing')} lw={6} />
          <Path d="M58 42 Q38 38 20 26 M56 46 Q38 46 18 38" stroke={p.fill('#B9C6E4')} strokeWidth={3} strokeLinecap="round" fill="none" />
        </G>
      );
      return (
        <G>
          {wing}
          <G transform="translate(210 0) scale(-1 1)">{wing}</G>
          {/* 옷: 흰 튜닉 + 파란 망토 */}
          <Shape p={p} d="M30 146 Q34 122 70 116 L140 116 Q176 122 180 146 Z" fill={p.grad('hermes-tunic')} />
          <Shape p={p} d="M28 146 Q30 124 64 116 L76 120 Q60 132 62 146 Z" fill={p.grad('hermes-cape')} lw={6} />
          <Shape p={p} d="M182 146 Q180 124 146 116 L134 120 Q150 132 148 146 Z" fill={p.grad('hermes-cape')} lw={6} />
          <Circle cx={68} cy={124} r={6} fill={p.fill('#FFD54A')} stroke={p.line} strokeWidth={3.5} />
          <Circle cx={142} cy={124} r={6} fill={p.fill('#FFD54A')} stroke={p.line} strokeWidth={3.5} />
          {/* 뒷머리 */}
          <Shape p={p} d="M46 52 L164 52 L164 98 Q152 98 150 84 L60 84 Q58 98 46 98 Z" fill={p.grad('hermes-hair')} />
          {/* 얼굴 */}
          <Shape p={p} d="M58 54 L152 54 L152 90 Q150 118 105 120 Q60 118 58 90 Z" fill={p.grad('hermes-skin')} />
          {/* 앞머리 */}
          <Path d="M58 56 L152 56 L150 66 Q138 60 130 68 Q118 58 106 66 Q94 58 82 68 Q72 60 60 68 Z" fill={p.grad('hermes-hair')} stroke={p.line} strokeWidth={4} strokeLinejoin="round" />
          {/* 눈 + 볼 + 웃는 입 */}
          <CuteEye p={p} cx={80} cy={80} rx={8} ry={10} />
          <CuteEye p={p} cx={130} cy={80} rx={8} ry={10} />
          {!p.tinted && <Ellipse cx={68} cy={96} rx={7} ry={4} fill="#FF9FB0" opacity={0.75} />}
          {!p.tinted && <Ellipse cx={142} cy={96} rx={7} ry={4} fill="#FF9FB0" opacity={0.75} />}
          <Shape p={p} d="M94 94 Q105 92 116 94 Q114 108 105 108 Q96 108 94 94 Z" fill={p.fill('#B5475A')} lw={3.5} />
          <Path d="M98 103 Q105 99 112 103" stroke={p.fill('#FF9FB0')} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* 날개 모자 */}
          <Shape p={p} d="M60 46 Q62 12 105 10 Q148 12 150 46 Z" fill={p.grad('hermes-hat')} />
          <Shape p={p} d="M40 46 Q105 36 170 46 Q174 58 154 58 L56 58 Q36 58 40 46 Z" fill={p.grad('hermes-brim')} />
          <Shine p={p} cx={82} cy={24} rx={14} ry={6} opacity={0.6} />
        </G>
      );
    },
  },
};
