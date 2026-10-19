import { Circle, Ellipse, G, Path } from 'react-native-svg';

import { ArtDef, Ball, Shape, Shine, VGrad } from './kit';

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
};
