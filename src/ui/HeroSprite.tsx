import { memo } from 'react';
import { View } from 'react-native';

import { PixelSprite, spriteSize } from './PixelSprite';

/**
 * 신 + 탈것을 한 덩어리로 그린다.
 * - 제우스는 구름 위에 서 있고, 포세이돈은 상어를 타고 있다.
 * - 탈것을 신보다 나중에(위에) 그려서 다리 쪽을 가린다 → 구름에 발이 잠기고, 상어 등에 올라탄 것처럼 보인다.
 */
interface MountInfo {
  mount: string;
  overlap: number; // 신의 아래쪽 몇 칸이 탈것에 가려지는지
  heroX: number; // 탈것 기준 신의 가로 위치 (칸)
}

const MOUNTS: Record<string, MountInfo> = {
  zeus: { mount: 'cloud', overlap: 5, heroX: 5 },
  poseidon: { mount: 'shark', overlap: 12, heroX: 4 },
};

/** 탈것을 타면 땅에서 이만큼(배율 1 기준 칸) 떠 있다 */
export const FLOAT_CELLS = 3;

export function heroLayout(name: string, scale: number) {
  const hero = spriteSize(name, scale);
  const info = MOUNTS[name];
  if (!info) return { w: hero.w, h: hero.h, heroLeft: 0, mount: null as string | null, mountTop: 0, floating: false };
  const mount = spriteSize(info.mount, scale);
  const heroLeft = info.heroX * scale;
  const mountTop = hero.h - info.overlap * scale;
  return {
    w: Math.max(mount.w, heroLeft + hero.w),
    h: mountTop + mount.h,
    heroLeft,
    mount: info.mount,
    mountTop,
    floating: true,
  };
}

export const HeroSprite = memo(function HeroSprite({ name, scale, tint }: { name: string; scale: number; tint?: string }) {
  const layout = heroLayout(name, scale);
  if (!layout.mount) return <PixelSprite name={name} scale={scale} tint={tint} />;
  return (
    <View style={{ width: layout.w, height: layout.h }}>
      <View style={{ position: 'absolute', left: layout.heroLeft, top: 0 }}>
        <PixelSprite name={name} scale={scale} tint={tint} />
      </View>
      <View style={{ position: 'absolute', left: 0, top: layout.mountTop }}>
        <PixelSprite name={layout.mount} scale={scale} tint={tint} />
      </View>
    </View>
  );
});
