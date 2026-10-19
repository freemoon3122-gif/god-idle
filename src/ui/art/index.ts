import { HEROES_ART } from './heroes';
import { ArtDef } from './kit';
import { MONSTER_ART } from './monsters';
import { RAID_ART } from './raid';

/** 이름 → 벡터 그림. 여기 없는 이름은 예전 픽셀 그림(sprites.ts)으로 그린다 */
export const VECTOR_ART: Record<string, ArtDef> = {
  ...HEROES_ART,
  ...MONSTER_ART,
  ...RAID_ART,
};
