import { HEROES_ART } from './heroes';
import { ArtDef } from './kit';
import { MONSTER_ART } from './monsters';
import { POSEIDON_ART } from './poseidon';
import { RAID_ART } from './raid';
import { ZEUS_ART } from './zeus';

/** 이름 → 벡터 그림. 여기 없는 이름은 예전 픽셀 그림(sprites.ts)으로 그린다 */
export const VECTOR_ART: Record<string, ArtDef> = {
  ...HEROES_ART,
  ...MONSTER_ART,
  ...RAID_ART,
  // 제우스·포세이돈 치비 일러스트 (heroes.tsx의 예전 그림을 덮어쓴다)
  ...ZEUS_ART,
  ...POSEIDON_ART,
};
