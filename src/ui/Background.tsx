import { memo } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

/**
 * 맵 배경. 맵 전체 크기(화면보다 넓다)로 한 번 그려 두고, 카메라가 움직이면 통째로 밀어서 보여 준다.
 *   - zeus: 구름 위 올림포스 신전 (대리석 바닥, 신전 기둥, 금빛 장식)
 *   - poseidon: 바닷속 궁전 (모래 바닥, 산호·해초, 궁전 실루엣, 물방울)
 *   - earth: 신이 되기 전, 숲 속 초원
 * 같은 모양이 매번 달라지지 않게 무작위 대신 고정된 수열(seeded)로 장식 위치를 정한다.
 */
export type BgTheme = 'zeus' | 'poseidon' | 'earth';

/** 하늘(화면에 고정) 색: 위 → 아래 */
export const SKY: Record<BgTheme, [string, string]> = {
  zeus: ['#141838', '#4B4D9A'],
  poseidon: ['#031B33', '#0A4C6B'],
  earth: ['#1F2E6E', '#5E7FD0'],
};

/** 맵 위쪽 가장자리에 붙는 원경(신전 기둥, 궁전, 나무)의 높이 */
export const BACKDROP_H = 150;

/** 0~1 사이의 고정된 "무작위" 수 (같은 i면 항상 같은 값) */
function rand(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const FieldBackground = memo(function FieldBackground({ theme, w, h }: { theme: BgTheme; w: number; h: number }) {
  // 전체 높이 = 원경(위) + 바닥(아래, 신과 몬스터가 다니는 곳)
  const H = BACKDROP_H + h;
  return (
    <Svg width={w} height={H}>
      {theme === 'zeus' ? <Olympus w={w} h={h} /> : theme === 'poseidon' ? <Undersea w={w} h={h} /> : <Meadow w={w} h={h} />}
    </Svg>
  );
});

// ───────────── 제우스: 구름 위 올림포스 ─────────────

function Olympus({ w, h }: { w: number; h: number }) {
  const top = BACKDROP_H; // 바닥이 시작하는 높이
  const tile = 64;
  const cols = Math.ceil(w / 140);
  return (
    <G>
      <Defs>
        <LinearGradient id="zFloor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7C78AE" />
          <Stop offset="1" stopColor="#9C97C8" />
        </LinearGradient>
        <LinearGradient id="zCol" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#B9B3DA" />
          <Stop offset="0.5" stopColor="#ECE8FA" />
          <Stop offset="1" stopColor="#A49ECB" />
        </LinearGradient>
      </Defs>
      {/* 먼 구름 */}
      {Array.from({ length: Math.ceil(w / 90) }, (_, i) => (
        <Ellipse key={`c${i}`} cx={i * 90 + rand(i) * 40} cy={30 + rand(i + 50) * 40} rx={60 + rand(i + 9) * 40} ry={18 + rand(i + 3) * 10} fill="#FFFFFF" opacity={0.12} />
      ))}
      {/* 신전: 지붕 들보 + 기둥 */}
      <Rect x={0} y={20} width={w} height={14} fill="#D8D2F0" />
      <Rect x={0} y={34} width={w} height={6} fill="#C9971C" />
      {Array.from({ length: cols }, (_, i) => {
        const x = 40 + i * 140;
        return (
          <G key={`p${i}`}>
            <Rect x={x - 4} y={40} width={44} height={10} fill="#E3DDF5" />
            <Rect x={x} y={50} width={36} height={top - 62} fill="url(#zCol)" />
            {[8, 16, 24].map((d) => (
              <Line key={d} x1={x + d + 2} y1={52} x2={x + d + 2} y2={top - 14} stroke="#A6A0CC" strokeWidth={1.5} />
            ))}
            <Rect x={x - 6} y={top - 14} width={48} height={14} fill="#CFC9EA" />
          </G>
        );
      })}
      {/* 대리석 바닥: 타일 + 금 테두리 */}
      <Rect x={0} y={top} width={w} height={h} fill="url(#zFloor)" />
      {Array.from({ length: Math.ceil(w / tile) + 1 }, (_, i) => (
        <Line key={`v${i}`} x1={i * tile} y1={top} x2={i * tile} y2={top + h} stroke="#6E6A9E" strokeWidth={1.5} opacity={0.6} />
      ))}
      {Array.from({ length: Math.ceil(h / tile) + 1 }, (_, i) => (
        <Line key={`h${i}`} x1={0} y1={top + i * tile} x2={w} y2={top + i * tile} stroke="#6E6A9E" strokeWidth={1.5} opacity={0.6} />
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <Rect
          key={`t${i}`}
          x={Math.floor((rand(i + 100) * w) / tile) * tile}
          y={top + Math.floor((rand(i + 200) * h) / tile) * tile}
          width={tile}
          height={tile}
          fill="#B4AFDB"
          opacity={0.35}
        />
      ))}
      <Rect x={0} y={top} width={w} height={6} fill="#C9971C" />
      {/* 금빛 번개 문양 (바닥 군데군데) */}
      {Array.from({ length: Math.ceil(w / 320) }, (_, i) => {
        const cx = 160 + i * 320;
        const cy = top + h * (0.3 + rand(i + 7) * 0.4);
        return <Polygon key={`b${i}`} points={`${cx},${cy - 22} ${cx - 10},${cy + 2} ${cx},${cy + 2} ${cx - 6},${cy + 24} ${cx + 12},${cy - 4} ${cx + 2},${cy - 4} ${cx + 8},${cy - 22}`} fill="#FFD54A" opacity={0.35} />;
      })}
      {/* 바닥 앞쪽 끝: 구름 위에 떠 있다 */}
      {Array.from({ length: Math.ceil(w / 50) }, (_, i) => (
        <Circle key={`f${i}`} cx={i * 50 + rand(i + 30) * 20} cy={top + h + 6} r={26 + rand(i + 40) * 14} fill="#FFFFFF" opacity={0.9} />
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
          <Stop offset="0" stopColor="#5E6E5A" />
          <Stop offset="1" stopColor="#8A7D58" />
        </LinearGradient>
      </Defs>
      {/* 위에서 비치는 빛줄기 */}
      {Array.from({ length: Math.ceil(w / 160) }, (_, i) => {
        const x = i * 160 + rand(i) * 60;
        return <Polygon key={`r${i}`} points={`${x},0 ${x + 40},0 ${x + 110},${top + h} ${x + 30},${top + h}`} fill="#BFF4FF" opacity={0.05} />;
      })}
      {/* 궁전 실루엣: 기둥과 둥근 지붕 */}
      {Array.from({ length: Math.ceil(w / 300) }, (_, i) => {
        const x = 40 + i * 300;
        return (
          <G key={`pal${i}`} opacity={0.75}>
            <Rect x={x} y={70} width={170} height={top - 70} fill="#0B3B52" />
            <Path d={`M ${x + 30} 70 A 55 50 0 0 1 ${x + 140} 70 Z`} fill="#0D4660" />
            <Rect x={x + 78} y={10} width={14} height={30} fill="#0D4660" />
            <Polygon points={`${x + 85},0 ${x + 72},14 ${x + 98},14`} fill="#2BB3A3" opacity={0.6} />
            {[12, 52, 92, 132].map((d) => (
              <Rect key={d} x={x + d} y={84} width={14} height={top - 84} fill="#155A75" />
            ))}
          </G>
        );
      })}
      {/* 모래 바닥 + 물결 무늬 */}
      <Rect x={0} y={top} width={w} height={h} fill="url(#pSand)" />
      {Array.from({ length: 26 }, (_, i) => {
        const x = rand(i + 300) * w;
        const y = top + 20 + rand(i + 400) * (h - 30);
        return <Path key={`w${i}`} d={`M ${x} ${y} q 15 -8 30 0 t 30 0 t 30 0`} stroke="#9C8E66" strokeWidth={2} fill="none" opacity={0.6} />;
      })}
      {/* 해초: 바닥에서 위로 흔들리는 듯한 곡선 */}
      {Array.from({ length: Math.ceil(w / 70) }, (_, i) => {
        const x = i * 70 + rand(i + 500) * 40;
        const y = top + 10 + rand(i + 600) * (h - 20);
        const len = 50 + rand(i + 700) * 50;
        return (
          <Path
            key={`k${i}`}
            d={`M ${x} ${y} q -12 ${-len / 3} 0 ${(-len * 2) / 3} q 12 ${-len / 6} 0 ${-len / 3}`}
            stroke={i % 2 ? '#2E8B57' : '#3FAE6B'}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
        );
      })}
      {/* 산호: 가지 몇 개를 뻗은 모양 */}
      {Array.from({ length: Math.ceil(w / 140) }, (_, i) => {
        const x = 50 + i * 140 + rand(i + 800) * 50;
        const y = top + 30 + rand(i + 900) * (h - 40);
        const c = ['#E8607E', '#F29A4A', '#B86BFF'][i % 3];
        return (
          <G key={`co${i}`} opacity={0.9}>
            <Path d={`M ${x} ${y} l 0 -26 M ${x} ${y - 12} l -12 -14 M ${x} ${y - 18} l 12 -14 M ${x - 12} ${y - 26} l -4 -8 M ${x + 12} ${y - 32} l 4 -8`} stroke={c} strokeWidth={6} strokeLinecap="round" />
          </G>
        );
      })}
      {/* 조개와 돌 */}
      {Array.from({ length: 18 }, (_, i) => (
        <Ellipse key={`s${i}`} cx={rand(i + 1000) * w} cy={top + 20 + rand(i + 1100) * (h - 30)} rx={8 + rand(i) * 8} ry={5 + rand(i + 1) * 4} fill={i % 3 ? '#4E5A4E' : '#F2D7C9'} opacity={0.8} />
      ))}
      {/* 물방울 */}
      {Array.from({ length: 30 }, (_, i) => (
        <Circle key={`bu${i}`} cx={rand(i + 1200) * w} cy={rand(i + 1300) * (top + h)} r={2 + rand(i + 1400) * 5} stroke="#CFFAFF" strokeWidth={1.5} fill="none" opacity={0.35} />
      ))}
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
          <Stop offset="0" stopColor="#3C6B3C" />
          <Stop offset="1" stopColor="#5A8C46" />
        </LinearGradient>
      </Defs>
      {/* 먼 언덕과 나무 */}
      <Path d={`M 0 ${top} ${Array.from({ length: Math.ceil(w / 120) + 1 }, (_, i) => `Q ${i * 120 + 60} ${top - 70 - rand(i) * 40} ${(i + 1) * 120} ${top}`).join(' ')} Z`} fill="#24452C" />
      {Array.from({ length: Math.ceil(w / 55) }, (_, i) => {
        const x = i * 55 + rand(i + 50) * 30;
        const y = top - 10 - rand(i + 60) * 30;
        return (
          <G key={`tr${i}`}>
            <Rect x={x - 4} y={y} width={8} height={top - y} fill="#4A3423" />
            <Circle cx={x} cy={y - 14} r={20 + rand(i + 70) * 10} fill={i % 2 ? '#2F7A3E' : '#276B36'} />
          </G>
        );
      })}
      {/* 풀밭 + 흙길 + 풀숲 + 꽃 */}
      <Rect x={0} y={top} width={w} height={h} fill="url(#eGrass)" />
      <Path d={`M 0 ${top + h * 0.55} C ${w * 0.25} ${top + h * 0.35}, ${w * 0.5} ${top + h * 0.75}, ${w} ${top + h * 0.5} L ${w} ${top + h * 0.62} C ${w * 0.5} ${top + h * 0.87}, ${w * 0.25} ${top + h * 0.47}, 0 ${top + h * 0.67} Z`} fill="#7A6A44" opacity={0.55} />
      {Array.from({ length: 60 }, (_, i) => {
        const x = rand(i + 2000) * w;
        const y = top + 10 + rand(i + 2100) * (h - 15);
        return <Path key={`g${i}`} d={`M ${x} ${y} l -4 -10 M ${x} ${y} l 0 -13 M ${x} ${y} l 4 -10`} stroke="#2E5A2A" strokeWidth={2} strokeLinecap="round" />;
      })}
      {Array.from({ length: 40 }, (_, i) => (
        <Circle key={`fl${i}`} cx={rand(i + 2200) * w} cy={top + 10 + rand(i + 2300) * (h - 15)} r={3} fill={['#FFD54A', '#FF9FB0', '#FFFFFF'][i % 3]} />
      ))}
    </G>
  );
}
