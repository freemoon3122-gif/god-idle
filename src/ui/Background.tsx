import { memo } from 'react';
import { Image } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BACKGROUND_IMAGES } from './art/images';

/**
 * 맵 배경 (카툰 일러스트). 맵 전체 크기(화면보다 넓다)로 한 번 그려 두고, 카메라가 움직이면 통째로 밀어서 보여 준다.
 *   - zeus: 구름 위 올림포스 신전 (금빛 햇살, 신전 지붕과 세로 홈이 파인 기둥, 광택 나는 대리석 바닥)
 *   - poseidon: 바닷속 궁전 (빛줄기, 둥근 지붕 궁전, 일렁이는 물빛 무늬, 산호·해초·조개)
 *   - earth: 신이 되기 전, 숲 속 초원 (겹겹이 언덕, 입체감 있는 나무, 흙길, 꽃)
 * 원근감: 멀수록 흐리고 푸르게(공기 원근법), 가까울수록 진하고 또렷하게.
 * 같은 모양이 매번 달라지지 않게 무작위 대신 고정된 수열(seeded)로 장식 위치를 정한다.
 * 그리는 개수는 폰에서도 부담 없도록 수백 개 이하로 유지한다 (memo라 처음 한 번만 그린다).
 */
export type BgTheme = 'zeus' | 'poseidon' | 'earth';

/** 하늘(화면에 고정) 색: 위 → 아래 */
export const SKY: Record<BgTheme, [string, string]> = {
  zeus: ['#1B1F4F', '#6A6BC0'],
  poseidon: ['#02142A', '#0B5878'],
  earth: ['#22397F', '#78A8DC'],
};

/** 맵 위쪽 가장자리에 붙는 원경(신전 기둥, 궁전, 나무)의 높이 */
export const BACKDROP_H = 150;

const LINE = '#1C1430';

/** 0~1 사이의 고정된 "무작위" 수 (같은 i면 항상 같은 값) */
function rand(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 0..n-1 */
const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

export const FieldBackground = memo(function FieldBackground({ theme, w, h }: { theme: BgTheme; w: number; h: number }) {
  // 전체 높이 = 원경(위) + 바닥(아래, 신과 몬스터가 다니는 곳)
  const H = BACKDROP_H + h;
  // PNG 배경이 등록돼 있으면 그걸 맵 크기에 맞춰 깐다 (cover: 비율이 조금 달라도 빈틈 없이 채우고 넘치는 부분은 잘린다)
  const image = BACKGROUND_IMAGES[theme];
  if (image) return <Image source={image} style={{ width: w, height: H }} resizeMode="cover" />;
  return (
    <Svg width={w} height={H}>
      {theme === 'zeus' ? <Olympus w={w} h={h} /> : theme === 'poseidon' ? <Undersea w={w} h={h} /> : <Meadow w={w} h={h} />}
    </Svg>
  );
});

/** 뭉게구름 한 덩이: 원 여러 개를 겹치고 아래를 평평하게. 위는 밝고 아래는 그늘 */
function Cloud({ x, y, s, fill, shade, opacity = 1 }: { x: number; y: number; s: number; fill: string; shade: string; opacity?: number }) {
  return (
    <G opacity={opacity}>
      <Ellipse cx={x} cy={y + 10 * s} rx={62 * s} ry={16 * s} fill={shade} />
      <Circle cx={x - 34 * s} cy={y} r={20 * s} fill={fill} />
      <Circle cx={x - 8 * s} cy={y - 12 * s} r={28 * s} fill={fill} />
      <Circle cx={x + 24 * s} cy={y - 4 * s} r={22 * s} fill={fill} />
      <Circle cx={x + 46 * s} cy={y + 4 * s} r={14 * s} fill={fill} />
      <Ellipse cx={x + 4 * s} cy={y + 8 * s} rx={56 * s} ry={12 * s} fill={fill} />
    </G>
  );
}

// ───────────── 제우스: 구름 위 올림포스 ─────────────

function Olympus({ w, h }: { w: number; h: number }) {
  const top = BACKDROP_H; // 바닥이 시작하는 높이
  const spacing = 150;
  const cols = Math.ceil(w / spacing) + 1;
  const colW = 34;
  const tile = 70;
  return (
    <G>
      <Defs>
        <RadialGradient id="zSun" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFF4C2" stopOpacity="0.9" />
          <Stop offset="0.35" stopColor="#FFD54A" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#FFD54A" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="zFloor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8D88C4" />
          <Stop offset="0.5" stopColor="#B3AEDD" />
          <Stop offset="1" stopColor="#D2CEF0" />
        </LinearGradient>
        {/* 기둥: 왼쪽 빛, 가운데 밝음, 오른쪽 그늘 → 둥근 원기둥처럼 */}
        <LinearGradient id="zCol" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#A69FD0" />
          <Stop offset="0.3" stopColor="#FFFFFF" />
          <Stop offset="0.65" stopColor="#DCD6F2" />
          <Stop offset="1" stopColor="#8E87BE" />
        </LinearGradient>
        <LinearGradient id="zGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF0A0" />
          <Stop offset="0.5" stopColor="#FFC93C" />
          <Stop offset="1" stopColor="#B97F10" />
        </LinearGradient>
        <LinearGradient id="zRoof" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F4F1FF" />
          <Stop offset="1" stopColor="#BDB6E2" />
        </LinearGradient>
        <LinearGradient id="zCarpet" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7A1F3D" />
          <Stop offset="1" stopColor="#B8325A" />
        </LinearGradient>
        <LinearGradient id="zRefl" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* 금빛 햇살과 빛줄기 */}
      {range(Math.ceil(w / 600)).map((i) => {
        const cx = 260 + i * 600;
        return (
          <G key={`sun${i}`}>
            {range(7).map((k) => {
              const a = (-80 + k * 26) * (Math.PI / 180);
              return (
                <Polygon
                  key={k}
                  points={`${cx},20 ${cx + Math.cos(a - 0.06) * 420},${20 + Math.sin(a - 0.06) * -420} ${cx + Math.cos(a + 0.06) * 420},${20 + Math.sin(a + 0.06) * -420}`}
                  fill="#FFE9A0"
                  opacity={0.07}
                />
              );
            })}
            <Circle cx={cx} cy={20} r={140} fill="url(#zSun)" />
          </G>
        );
      })}

      {/* 먼 구름 (흐릿하게) */}
      {range(Math.ceil(w / 130)).map((i) => (
        <Cloud key={`fc${i}`} x={i * 130 + rand(i) * 50} y={40 + rand(i + 50) * 30} s={0.7 + rand(i + 9) * 0.4} fill="#C9C6F2" shade="#8F8BCB" opacity={0.35} />
      ))}

      {/* 신전 지붕(삼각 박공) + 들보 */}
      {range(Math.ceil(w / 600)).map((i) => {
        const cx = 300 + i * 600;
        return <Polygon key={`ped${i}`} points={`${cx - 260},26 ${cx},-14 ${cx + 260},26`} fill="url(#zRoof)" stroke="#8E87BE" strokeWidth={2} />;
      })}
      <Rect x={0} y={24} width={w} height={14} fill="url(#zRoof)" />
      <Rect x={0} y={38} width={w} height={7} fill="url(#zGold)" />
      {/* 들보의 장식 무늬 (그리스 문양 느낌의 네모 블록) */}
      {range(Math.ceil(w / 24)).map((i) => (
        <Rect key={`tri${i}`} x={i * 24 + 4} y={27} width={10} height={8} fill="#A9A2D3" opacity={0.7} />
      ))}

      {/* 기둥: 기둥머리 → 세로 홈이 파인 몸통 → 받침 */}
      {range(cols).map((i) => {
        const x = 30 + i * spacing;
        const colTop = 56;
        const colBot = top - 12;
        return (
          <G key={`p${i}`}>
            <Rect x={x - 8} y={45} width={colW + 16} height={6} rx={2} fill="url(#zGold)" />
            <Path d={`M ${x - 6} ${colTop} Q ${x + colW / 2} ${colTop - 10} ${x + colW + 6} ${colTop} L ${x + colW} ${colTop + 6} L ${x} ${colTop + 6} Z`} fill="#E9E5FA" />
            <Rect x={x} y={colTop + 6} width={colW} height={colBot - colTop - 6} fill="url(#zCol)" />
            {[7, 13, 19, 25].map((d) => (
              <Line key={d} x1={x + d + 1} y1={colTop + 10} x2={x + d + 1} y2={colBot - 4} stroke="#9C95C8" strokeWidth={1.4} opacity={0.65} />
            ))}
            <Rect x={x - 6} y={colBot} width={colW + 12} height={6} fill="#E3DEF6" />
            <Rect x={x - 9} y={colBot + 6} width={colW + 18} height={6} fill="#C3BCE4" />
            {/* 기둥 사이 금빛 화분(향로) */}
            {i % 2 === 0 && (
              <G>
                <Path d={`M ${x + spacing / 2 - 10} ${top - 22} L ${x + spacing / 2 + 10} ${top - 22} L ${x + spacing / 2 + 6} ${top - 8} L ${x + spacing / 2 - 6} ${top - 8} Z`} fill="url(#zGold)" stroke={LINE} strokeWidth={1.5} />
                <Ellipse cx={x + spacing / 2} cy={top - 30} rx={6} ry={10} fill="#FFB347" opacity={0.85} />
                <Ellipse cx={x + spacing / 2} cy={top - 28} rx={3} ry={6} fill="#FFF3B0" />
              </G>
            )}
          </G>
        );
      })}

      {/* 광택 나는 대리석 바닥 (멀수록 어둡고, 가까울수록 밝다) */}
      <Rect x={0} y={top} width={w} height={h} fill="url(#zFloor)" />
      {/* 바닥에 비친 기둥 그림자(반사) */}
      {range(cols).map((i) => (
        <Rect key={`rf${i}`} x={30 + i * spacing} y={top} width={colW} height={h * 0.45} fill="url(#zRefl)" />
      ))}
      {/* 대리석 타일: 가로줄은 멀수록 촘촘하게(원근감) */}
      {range(Math.ceil(w / tile) + 1).map((i) => (
        <Line key={`v${i}`} x1={i * tile} y1={top} x2={i * tile} y2={top + h} stroke="#FFFFFF" strokeWidth={1.2} opacity={0.25} />
      ))}
      {range(8).map((i) => {
        const y = top + h * Math.pow((i + 1) / 8, 1.4);
        return <Line key={`h${i}`} x1={0} y1={y} x2={w} y2={y} stroke="#FFFFFF" strokeWidth={1.2} opacity={0.25} />;
      })}
      {/* 대리석 결 */}
      {range(Math.ceil(w / 60)).map((i) => {
        const x = rand(i + 100) * w;
        const y = top + 10 + rand(i + 200) * (h - 20);
        return <Path key={`vein${i}`} d={`M ${x} ${y} q 14 -6 26 2 t 24 -4`} stroke="#8079B4" strokeWidth={1} fill="none" opacity={0.35} />;
      })}
      {/* 가운데 붉은 융단 (얇게) + 금 테두리 */}
      <Rect x={0} y={top + h * 0.5} width={w} height={h * 0.09} fill="url(#zCarpet)" opacity={0.55} />
      <Rect x={0} y={top + h * 0.5} width={w} height={2} fill="#FFD54A" opacity={0.8} />
      <Rect x={0} y={top + h * 0.59 - 2} width={w} height={2} fill="#FFD54A" opacity={0.8} />
      {range(Math.ceil(w / 90)).map((i) => {
        const cx = 45 + i * 90;
        const cy = top + h * 0.545;
        return <Polygon key={`dia${i}`} points={`${cx},${cy - 6} ${cx + 6},${cy} ${cx},${cy + 6} ${cx - 6},${cy}`} fill="#FFD54A" opacity={0.5} />;
      })}
      {/* 바닥 위쪽 끝 금테 */}
      <Rect x={0} y={top} width={w} height={6} fill="url(#zGold)" />
      {/* 금빛 번개 문양 */}
      {range(Math.ceil(w / 320)).map((i) => {
        const cx = 160 + i * 320;
        const cy = top + h * (0.2 + rand(i + 7) * 0.12);
        return (
          <Polygon
            key={`b${i}`}
            points={`${cx},${cy - 22} ${cx - 10},${cy + 2} ${cx},${cy + 2} ${cx - 6},${cy + 24} ${cx + 12},${cy - 4} ${cx + 2},${cy - 4} ${cx + 8},${cy - 22}`}
            fill="#FFD54A"
            opacity={0.4}
          />
        );
      })}
      {/* 반짝이는 별빛 */}
      {range(24).map((i) => {
        const x = rand(i + 500) * w;
        const y = rand(i + 600) * (top + h * 0.9);
        const r = 2 + rand(i + 700) * 3;
        return <Path key={`sp${i}`} d={`M ${x} ${y - r * 2} L ${x + r * 0.5} ${y} L ${x} ${y + r * 2} L ${x - r * 0.5} ${y} Z M ${x - r * 2} ${y} L ${x} ${y + r * 0.5} L ${x + r * 2} ${y} L ${x} ${y - r * 0.5} Z`} fill="#FFF6C8" opacity={0.6} />;
      })}
      {/* 바닥 앞쪽 끝: 구름 위에 떠 있다 */}
      {range(Math.ceil(w / 90) + 1).map((i) => (
        <Cloud key={`f${i}`} x={i * 90 + rand(i + 30) * 30} y={top + h + 4} s={0.9 + rand(i + 40) * 0.4} fill="#FFFFFF" shade="#C9C4EE" />
      ))}
    </G>
  );
}

// ───────────── 포세이돈: 바닷속 궁전 ─────────────

function Undersea({ w, h }: { w: number; h: number }) {
  const top = BACKDROP_H;
  return (
    <G>
      <Defs>
        <LinearGradient id="pSand" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3E6A72" />
          <Stop offset="0.4" stopColor="#8C9A7C" />
          <Stop offset="1" stopColor="#D8C38E" />
        </LinearGradient>
        <LinearGradient id="pRay" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D8FBFF" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#D8FBFF" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="pPalace" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0E4D66" />
          <Stop offset="0.35" stopColor="#1C7A92" />
          <Stop offset="1" stopColor="#0A3A50" />
        </LinearGradient>
        <LinearGradient id="pDome" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5FE0D2" />
          <Stop offset="1" stopColor="#13756E" />
        </LinearGradient>
        <LinearGradient id="pKelp" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7FE08A" />
          <Stop offset="1" stopColor="#1F6B3A" />
        </LinearGradient>
        <RadialGradient id="pGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#7FF5FF" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#7FF5FF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* 위에서 비치는 빛줄기 */}
      {range(Math.ceil(w / 140)).map((i) => {
        const x = i * 140 + rand(i) * 60;
        const wd = 30 + rand(i + 5) * 40;
        return <Polygon key={`r${i}`} points={`${x},0 ${x + wd},0 ${x + wd + 120},${top + h} ${x + 60},${top + h}`} fill="url(#pRay)" />;
      })}

      {/* 먼 바위산 실루엣 */}
      <Path
        d={`M 0 ${top} ${range(Math.ceil(w / 90) + 1).map((i) => `L ${i * 90 + 45} ${top - 30 - rand(i + 20) * 50} L ${(i + 1) * 90} ${top - 10 - rand(i + 21) * 20}`).join(' ')} L ${w} ${top} Z`}
        fill="#06324A"
        opacity={0.8}
      />

      {/* 궁전: 기둥이 늘어선 본채 + 청록 둥근 지붕 + 첨탑 + 빛나는 창 */}
      {range(Math.ceil(w / 320)).map((i) => {
        const x = 40 + i * 320;
        const bw = 200;
        return (
          <G key={`pal${i}`}>
            <Circle cx={x + bw / 2} cy={70} r={110} fill="url(#pGlow)" />
            <Rect x={x} y={66} width={bw} height={top - 66} fill="url(#pPalace)" />
            <Path d={`M ${x + 40} 66 A 60 56 0 0 1 ${x + bw - 40} 66 Z`} fill="url(#pDome)" stroke="#0A3A50" strokeWidth={2} />
            <Path d={`M ${x + 58} 52 A 40 30 0 0 1 ${x + 96} 30`} stroke="#B8FFF6" strokeWidth={3} fill="none" opacity={0.6} />
            <Rect x={x + bw / 2 - 5} y={2} width={10} height={20} fill="#13756E" />
            <Polygon points={`${x + bw / 2},-14 ${x + bw / 2 - 9},4 ${x + bw / 2 + 9},4`} fill="#FFD54A" />
            {/* 작은 탑 둘 */}
            {[-28, bw + 4].map((dx) => (
              <G key={dx}>
                <Rect x={x + dx} y={80} width={24} height={top - 80} fill="#0C4560" />
                <Path d={`M ${x + dx - 2} 80 Q ${x + dx + 12} 50 ${x + dx + 26} 80 Z`} fill="url(#pDome)" />
              </G>
            ))}
            {[16, 56, 96, 136, 176].map((d) => (
              <G key={d}>
                <Rect x={x + d} y={84} width={10} height={top - 84} fill="#2A93A8" opacity={0.7} />
                <Rect x={x + d + 2} y={84} width={3} height={top - 84} fill="#9AF0FF" opacity={0.35} />
              </G>
            ))}
            {[34, 74, 114, 154].map((d) => (
              <Path key={`win${d}`} d={`M ${x + d} ${top - 20} L ${x + d} ${top - 46} A 7 7 0 0 1 ${x + d + 14} ${top - 46} L ${x + d + 14} ${top - 20} Z`} fill="#FFE58A" opacity={0.75} />
            ))}
          </G>
        );
      })}

      {/* 모래 바닥 */}
      <Rect x={0} y={top} width={w} height={h} fill="url(#pSand)" />
      {/* 일렁이는 물빛 무늬(코스틱): 밝은 그물 모양 곡선 */}
      {range(Math.ceil((w * h) / 9000)).map((i) => {
        const x = rand(i + 300) * w;
        const y = top + 10 + rand(i + 400) * (h - 20);
        const s = 0.7 + rand(i + 450) * 0.8;
        return (
          <Path
            key={`ca${i}`}
            d={`M ${x} ${y} q ${10 * s} ${-8 * s} ${22 * s} ${-2 * s} q ${12 * s} ${8 * s} ${24 * s} 0 M ${x + 8 * s} ${y + 10 * s} q ${12 * s} ${-6 * s} ${22 * s} ${2 * s}`}
            stroke="#E8FFF6"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            opacity={0.22}
          />
        );
      })}

      {/* 해초: 두꺼운 잎이 위로 흔들리는 모양 */}
      {range(Math.ceil(w / 60)).map((i) => {
        const x = i * 60 + rand(i + 500) * 40;
        const y = top + 8 + rand(i + 600) * (h * 0.5);
        const len = 50 + rand(i + 700) * 60;
        const sway = (rand(i + 710) - 0.5) * 30;
        return (
          <G key={`k${i}`}>
            <Path
              d={`M ${x - 5} ${y} C ${x - 18 + sway} ${y - len * 0.35}, ${x + 14 + sway} ${y - len * 0.65}, ${x + sway} ${y - len} C ${x + 10 + sway} ${y - len * 0.6}, ${x - 6 + sway} ${y - len * 0.3}, ${x + 5} ${y} Z`}
              fill="url(#pKelp)"
              stroke="#0F3D24"
              strokeWidth={1.5}
            />
            <Path d={`M ${x} ${y} C ${x - 8 + sway} ${y - len * 0.35}, ${x + 8 + sway} ${y - len * 0.65}, ${x + sway} ${y - len}`} stroke="#B8FFB8" strokeWidth={1.2} fill="none" opacity={0.45} />
          </G>
        );
      })}

      {/* 산호: 가지를 뻗은 모양 + 밝은 끝 */}
      {range(Math.ceil(w / 120)).map((i) => {
        const x = 40 + i * 120 + rand(i + 800) * 50;
        const y = top + h * (0.3 + rand(i + 900) * 0.65);
        const [c, tip] = [
          ['#E8607E', '#FFB3C4'],
          ['#F29A4A', '#FFD3A0'],
          ['#B86BFF', '#E3C4FF'],
        ][i % 3];
        const d = `M ${x} ${y} L ${x} ${y - 30} M ${x} ${y - 12} L ${x - 14} ${y - 28} M ${x} ${y - 20} L ${x + 14} ${y - 36} M ${x - 14} ${y - 28} L ${x - 18} ${y - 40} M ${x + 14} ${y - 36} L ${x + 18} ${y - 46} M ${x} ${y - 30} L ${x + 4} ${y - 42}`;
        return (
          <G key={`co${i}`}>
            <Path d={d} stroke={LINE} strokeWidth={10} strokeLinecap="round" opacity={0.6} />
            <Path d={d} stroke={c} strokeWidth={7} strokeLinecap="round" />
            {[
              [x - 18, y - 40],
              [x + 18, y - 46],
              [x + 4, y - 42],
            ].map(([tx, ty], k) => (
              <Circle key={k} cx={tx} cy={ty} r={3} fill={tip} />
            ))}
          </G>
        );
      })}

      {/* 조개·소라와 돌 */}
      {range(Math.ceil(w / 55)).map((i) => {
        const x = rand(i + 1000) * w;
        const y = top + 20 + rand(i + 1100) * (h - 30);
        if (i % 3 === 0) {
          // 부채꼴 조개
          return (
            <G key={`s${i}`}>
              <Path d={`M ${x - 10} ${y} A 10 9 0 0 1 ${x + 10} ${y} L ${x + 3} ${y + 4} L ${x - 3} ${y + 4} Z`} fill="#F7D9CC" stroke={LINE} strokeWidth={1.5} />
              {[-6, -2, 2, 6].map((d) => (
                <Line key={d} x1={x} y1={y + 3} x2={x + d} y2={y - 6} stroke="#D49A8A" strokeWidth={1} />
              ))}
            </G>
          );
        }
        return (
          <G key={`s${i}`}>
            <Ellipse cx={x} cy={y} rx={10 + rand(i) * 8} ry={6 + rand(i + 1) * 4} fill="#4E6460" />
            <Ellipse cx={x - 3} cy={y - 2} rx={5 + rand(i) * 3} ry={2} fill="#9FB8B0" opacity={0.6} />
          </G>
        );
      })}

      {/* 물방울: 테두리 + 반짝임 */}
      {range(36).map((i) => {
        const x = rand(i + 1200) * w;
        const y = rand(i + 1300) * (top + h);
        const r = 2 + rand(i + 1400) * 6;
        return (
          <G key={`bu${i}`} opacity={0.5}>
            <Circle cx={x} cy={y} r={r} stroke="#CFFAFF" strokeWidth={1.4} fill="#CFFAFF" fillOpacity={0.08} />
            <Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.25} fill="#FFFFFF" />
          </G>
        );
      })}
    </G>
  );
}

// ───────────── 신이 되기 전: 숲 속 초원 ─────────────

function Meadow({ w, h }: { w: number; h: number }) {
  const top = BACKDROP_H;
  return (
    <G>
      <Defs>
        <LinearGradient id="eGrass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4F8A3E" />
          <Stop offset="0.5" stopColor="#6DAA48" />
          <Stop offset="1" stopColor="#8CC654" />
        </LinearGradient>
        <LinearGradient id="eFar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7FA7C9" />
          <Stop offset="1" stopColor="#6C9A9A" />
        </LinearGradient>
        <LinearGradient id="eMid" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4F8F5A" />
          <Stop offset="1" stopColor="#3B7046" />
        </LinearGradient>
        <RadialGradient id="eLeaf" cx="0.35" cy="0.3" r="0.75">
          <Stop offset="0" stopColor="#8FD86A" />
          <Stop offset="0.5" stopColor="#3E9A45" />
          <Stop offset="1" stopColor="#1F5A2C" />
        </RadialGradient>
        <LinearGradient id="ePath" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C7A26A" />
          <Stop offset="1" stopColor="#A9824C" />
        </LinearGradient>
        <RadialGradient id="eSun" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFFBE0" stopOpacity="0.8" />
          <Stop offset="1" stopColor="#FFFBE0" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* 햇빛 + 흰 구름 */}
      {range(Math.ceil(w / 700)).map((i) => (
        <Circle key={`sun${i}`} cx={200 + i * 700} cy={10} r={120} fill="url(#eSun)" />
      ))}
      {range(Math.ceil(w / 220)).map((i) => (
        <Cloud key={`cl${i}`} x={60 + i * 220 + rand(i) * 80} y={22 + rand(i + 3) * 18} s={0.5 + rand(i + 4) * 0.3} fill="#FFFFFF" shade="#D6E6F7" opacity={0.85} />
      ))}

      {/* 먼 언덕(푸르스름) → 가까운 언덕(초록): 공기 원근법 */}
      <Path d={`M 0 ${top} ${range(Math.ceil(w / 160) + 1).map((i) => `Q ${i * 160 + 80} ${top - 95 - rand(i) * 30} ${(i + 1) * 160} ${top - 40}`).join(' ')} L ${w} ${top} Z`} fill="url(#eFar)" />
      <Path d={`M 0 ${top} ${range(Math.ceil(w / 110) + 1).map((i) => `Q ${i * 110 + 55} ${top - 55 - rand(i + 30) * 25} ${(i + 1) * 110} ${top - 15}`).join(' ')} L ${w} ${top} Z`} fill="url(#eMid)" />

      {/* 나무: 줄기 + 세 덩이 잎(입체 그라데이션) + 외곽선 */}
      {range(Math.ceil(w / 70)).map((i) => {
        const x = i * 70 + rand(i + 50) * 30;
        const y = top - 4 - rand(i + 60) * 18;
        const r = 18 + rand(i + 70) * 10;
        return (
          <G key={`tr${i}`}>
            <Path d={`M ${x - 5} ${top + 4} L ${x - 3} ${y - r * 0.4} L ${x + 3} ${y - r * 0.4} L ${x + 5} ${top + 4} Z`} fill="#6B4528" stroke={LINE} strokeWidth={1.5} />
            <Circle cx={x - r * 0.55} cy={y - r * 0.6} r={r * 0.75} fill="url(#eLeaf)" stroke={LINE} strokeWidth={1.5} />
            <Circle cx={x + r * 0.55} cy={y - r * 0.55} r={r * 0.7} fill="url(#eLeaf)" stroke={LINE} strokeWidth={1.5} />
            <Circle cx={x} cy={y - r * 1.05} r={r * 0.85} fill="url(#eLeaf)" stroke={LINE} strokeWidth={1.5} />
            <Ellipse cx={x - r * 0.3} cy={y - r * 1.4} rx={r * 0.3} ry={r * 0.15} fill="#D8FFB0" opacity={0.5} />
          </G>
        );
      })}

      {/* 풀밭 */}
      <Rect x={0} y={top} width={w} height={h} fill="url(#eGrass)" />
      {/* 나무 그늘 */}
      <Rect x={0} y={top} width={w} height={14} fill="#1F4A24" opacity={0.25} />
      {/* 햇빛 얼룩 */}
      {range(Math.ceil(w / 160)).map((i) => (
        <Ellipse key={`lp${i}`} cx={rand(i + 1500) * w} cy={top + h * (0.2 + rand(i + 1600) * 0.7)} rx={50 + rand(i + 1700) * 40} ry={14 + rand(i + 1800) * 10} fill="#C8F07A" opacity={0.18} />
      ))}

      {/* 흙길: 가장자리를 진하게 */}
      <Path
        d={`M 0 ${top + h * 0.55} C ${w * 0.25} ${top + h * 0.35}, ${w * 0.5} ${top + h * 0.75}, ${w} ${top + h * 0.5} L ${w} ${top + h * 0.63} C ${w * 0.5} ${top + h * 0.88}, ${w * 0.25} ${top + h * 0.48}, 0 ${top + h * 0.68} Z`}
        fill="url(#ePath)"
        stroke="#7E5E34"
        strokeWidth={3}
        opacity={0.9}
      />
      {range(Math.ceil(w / 45)).map((i) => {
        const t = rand(i + 1900);
        const x = t * w;
        // 길 위 대략적인 위치에 조약돌
        const yMid = top + h * (0.6 + 0.08 * Math.sin(t * Math.PI * 2));
        return <Ellipse key={`pb${i}`} cx={x} cy={yMid + (rand(i + 1950) - 0.5) * h * 0.06} rx={4 + rand(i) * 3} ry={2.5} fill="#E2CDA0" opacity={0.8} />;
      })}

      {/* 풀숲: 진한 잎 + 밝은 잎 끝 */}
      {range(Math.ceil((w * h) / 3400)).map((i) => {
        const x = rand(i + 2000) * w;
        const y = top + 12 + rand(i + 2100) * (h - 16);
        return (
          <G key={`g${i}`}>
            <Path d={`M ${x - 7} ${y} Q ${x - 8} ${y - 10} ${x - 4} ${y - 15} Q ${x - 3} ${y - 6} ${x} ${y} Q ${x + 1} ${y - 12} ${x + 4} ${y - 18} Q ${x + 5} ${y - 7} ${x + 7} ${y} Z`} fill="#2F6A2A" />
            <Path d={`M ${x + 4} ${y - 18} Q ${x + 3} ${y - 12} ${x + 2} ${y - 7}`} stroke="#A8E070" strokeWidth={1.2} fill="none" />
          </G>
        );
      })}
      {/* 꽃: 꽃잎 다섯 장 + 노란 가운데 */}
      {range(Math.ceil(w / 22)).map((i) => {
        const x = rand(i + 2200) * w;
        const y = top + 12 + rand(i + 2300) * (h - 16);
        const c = ['#FFFFFF', '#FF9FB0', '#B7A6FF', '#FFE070'][i % 4];
        return (
          <G key={`fl${i}`}>
            {range(5).map((k) => {
              const a = (k / 5) * Math.PI * 2;
              return <Circle key={k} cx={x + Math.cos(a) * 3.2} cy={y + Math.sin(a) * 3.2} r={2.6} fill={c} />;
            })}
            <Circle cx={x} cy={y} r={2} fill="#FFB020" />
          </G>
        );
      })}
    </G>
  );
}
