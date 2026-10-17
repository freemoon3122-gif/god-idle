import { memo } from 'react';
import { View } from 'react-native';

import { PALETTE, SPRITES } from './sprites';

interface Props {
  name: string;
  scale: number; // 픽셀 한 칸의 크기(pt)
  /** 지정하면 모든 픽셀을 이 색 하나로 칠한다 (맞았을 때 하얗게 번쩍이는 실루엣용) */
  tint?: string;
}

/**
 * 문자열 픽셀 아트를 화면에 그린다.
 * 같은 색이 이어지는 칸은 하나의 View로 합쳐서(Run-Length Encoding) View 개수를 줄인다.
 * memo: props가 같으면 다시 그리지 않는다. 게임은 0.1초마다 화면을 갱신하므로 중요하다.
 */
export const PixelSprite = memo(function PixelSprite({ name, scale, tint }: Props) {
  const rows = SPRITES[name] ?? [];
  const width = Math.max(...rows.map((r) => r.length));

  return (
    <View style={{ width: width * scale }}>
      {rows.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row', height: scale }}>
          {runs(row.padEnd(width, '.')).map(([ch, len], i) => (
            <View
              key={i}
              style={{ width: len * scale, height: scale, backgroundColor: ch === '.' ? 'transparent' : (tint ?? PALETTE[ch]) }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

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
