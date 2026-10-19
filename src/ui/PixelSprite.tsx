import { memo } from 'react';
import Svg, { Defs, Rect } from 'react-native-svg';

import { VECTOR_ART } from './art';
import { makePaint } from './art/kit';

import { OUTLINE, PALETTE, SPRITES } from './sprites';

interface Props {
  name: string;
  scale: number; // 픽셀 한 칸의 크기(pt)
  /** 지정하면 모든 픽셀(외곽선 포함)을 이 색 하나로 칠한다 (맞았을 때 하얗게 번쩍이는 실루엣, 잔상용) */
  tint?: string;
}

const OUTLINE_CHAR = '#';
const SEAM = 0.5; // 틈 메우기용 겹침

/**
 * 문자열 픽셀 아트를 화면에 그린다.
 * - 외곽선 자동 생성: 그림 둘레의 빈 칸 중 그림과 맞닿은 칸을 짙은 색으로 칠한다.
 *   (그림 데이터에는 외곽선이 없어서 수정이 쉽고, 몬스터·신 모두 같은 두께로 또렷해진다)
 * - 같은 색이 이어지는 칸은 하나의 사각형으로 합쳐서(Run-Length Encoding) 그릴 개수를 줄인다.
 * - memo: props가 같으면 다시 그리지 않는다. 게임은 0.05초마다 화면을 갱신하므로 중요하다.
 */
export const PixelSprite = memo(function PixelSprite({ name, scale, tint }: Props) {
  // 카툰 일러스트(벡터)가 있으면 그걸 그린다. 크기는 픽셀 그림과 같다 (좌표 = 칸 × 10)
  const art = VECTOR_ART[name];
  if (art) {
    const paint = makePaint(tint);
    return (
      <Svg width={art.w * scale} height={art.h * scale} viewBox={`0 0 ${art.w * 10} ${art.h * 10}`}>
        {!tint && art.defs && <Defs>{art.defs()}</Defs>}
        {art.draw(paint)}
      </Svg>
    );
  }
  const rows = outlined(name);
  const width = rows[0]?.length ?? 0;

  // SVG 한 장에 사각형(Rect)으로 그린다. 사각형마다 0.5pt씩 겹치게 그려서, 캐릭터가 소수점 위치로
  // 움직일 때 경계가 흐리게(안티앨리어싱) 처리되며 생기는 틈(줄무늬)을 메운다.
  return (
    <Svg width={width * scale} height={rows.length * scale}>
      {rows.map((row, y) => {
        let x = 0;
        return runs(row).map(([ch, len], i) => {
          const rx = x;
          x += len;
          if (ch === '.') return null;
          return <Rect key={`${y}-${i}`} x={rx * scale} y={y * scale} width={len * scale + SEAM} height={scale + SEAM} fill={colorOf(ch, tint)} />;
        });
      })}
    </Svg>
  );
});

/** 외곽선까지 포함한 스프라이트 크기 (칸 수 × scale) */
export function spriteSize(name: string, scale: number) {
  const art = VECTOR_ART[name];
  if (art) return { w: art.w * scale, h: art.h * scale };
  const rows = outlined(name);
  return { w: (rows[0]?.length ?? 0) * scale, h: rows.length * scale };
}

function colorOf(ch: string, tint?: string): string {
  if (ch === '.') return 'transparent';
  if (tint) return tint;
  return ch === OUTLINE_CHAR ? OUTLINE : (PALETTE[ch] ?? 'transparent');
}

/** 외곽선을 붙인 결과는 스프라이트마다 한 번만 계산해서 기억해 둔다 (캐시) */
const cache = new Map<string, string[]>();

function outlined(name: string): string[] {
  const hit = cache.get(name);
  if (hit) return hit;

  const src = SPRITES[name] ?? [];
  const w = Math.max(0, ...src.map((r) => r.length)) + 2;
  const h = src.length + 2;
  // 사방으로 1칸씩 여백을 둔 격자
  const grid = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (y > 0 && y < h - 1 && x > 0 && x < w - 1 ? (src[y - 1][x - 1] ?? '.') : '.')),
  );
  const filled = (y: number, x: number) => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== '.' && grid[y][x] !== OUTLINE_CHAR;
  const out = grid.map((row, y) =>
    row
      .map((ch, x) => (ch === '.' && (filled(y - 1, x) || filled(y + 1, x) || filled(y, x - 1) || filled(y, x + 1)) ? OUTLINE_CHAR : ch))
      .join(''),
  );
  cache.set(name, out);
  return out;
}

/** "..yyy." → [['.',2], ['y',3], ['.',1]] */
function runs(row: string): [string, number][] {
  const out: [string, number][] = [];
  for (const ch of row) {
    const last = out[out.length - 1];
    if (last && last[0] === ch) last[1]++;
    else out.push([ch, 1]);
  }
  return out;
}
