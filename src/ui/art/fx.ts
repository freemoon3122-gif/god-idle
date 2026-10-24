// 자동 생성 (tools/pixel/effects.py) — 직접 고치지 말 것
import { ImageSourcePropType } from 'react-native';

/** 도트 이펙트 한 종류: 가로 띠 이미지 + 프레임 수 + 한 프레임의 원본 크기(px) */
export interface FxSheet {
  source: ImageSourcePropType;
  frames: number;
  fw: number;
  fh: number;
}

export type FxName = 'bolt' | 'slash_cyan' | 'slash_orange' | 'slash_green' | 'slash_gold' | 'hit' | 'explosion' | 'splash' | 'wave' | 'star' | 'meteor' | 'feather' | 'leaf' | 'tornado' | 'shockwave' | 'holy' | 'tentacle' | 'dash' | 'aura_gold' | 'aura_blue';

export const FX: Record<FxName, FxSheet> = {
  bolt: { source: require('../../../assets/fx/bolt.png'), frames: 6, fw: 24, fh: 96 },
  slash_cyan: { source: require('../../../assets/fx/slash_cyan.png'), frames: 6, fw: 48, fh: 48 },
  slash_orange: { source: require('../../../assets/fx/slash_orange.png'), frames: 6, fw: 48, fh: 48 },
  slash_green: { source: require('../../../assets/fx/slash_green.png'), frames: 6, fw: 48, fh: 48 },
  slash_gold: { source: require('../../../assets/fx/slash_gold.png'), frames: 6, fw: 48, fh: 48 },
  hit: { source: require('../../../assets/fx/hit.png'), frames: 5, fw: 32, fh: 32 },
  explosion: { source: require('../../../assets/fx/explosion.png'), frames: 7, fw: 48, fh: 48 },
  splash: { source: require('../../../assets/fx/splash.png'), frames: 6, fw: 48, fh: 48 },
  wave: { source: require('../../../assets/fx/wave.png'), frames: 6, fw: 96, fh: 48 },
  star: { source: require('../../../assets/fx/star.png'), frames: 5, fw: 32, fh: 32 },
  meteor: { source: require('../../../assets/fx/meteor.png'), frames: 4, fw: 24, fh: 24 },
  feather: { source: require('../../../assets/fx/feather.png'), frames: 6, fw: 32, fh: 32 },
  leaf: { source: require('../../../assets/fx/leaf.png'), frames: 6, fw: 32, fh: 32 },
  tornado: { source: require('../../../assets/fx/tornado.png'), frames: 6, fw: 40, fh: 56 },
  shockwave: { source: require('../../../assets/fx/shockwave.png'), frames: 6, fw: 64, fh: 24 },
  holy: { source: require('../../../assets/fx/holy.png'), frames: 6, fw: 48, fh: 48 },
  tentacle: { source: require('../../../assets/fx/tentacle.png'), frames: 6, fw: 32, fh: 96 },
  dash: { source: require('../../../assets/fx/dash.png'), frames: 5, fw: 64, fh: 24 },
  aura_gold: { source: require('../../../assets/fx/aura_gold.png'), frames: 6, fw: 48, fh: 48 },
  aura_blue: { source: require('../../../assets/fx/aura_blue.png'), frames: 6, fw: 48, fh: 48 },
};
