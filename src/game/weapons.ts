import { GodId } from './types';

/**
 * 무기 시스템. 몬스터를 잡으면 일정 확률로 무기가 떨어진다.
 * - 같은 무기 3개를 합치면 다음 등급 무기 1개가 나온다 (등급업).
 * - 초월 무기는 등급업이 없고, 초월 무기 1개를 재료로 써서만 강화할 수 있다.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legend' | 'transcendent';

export const RARITY_INFO: Record<Rarity, { name: string; color: string; weight: number }> = {
  // weight: 무기가 떨어졌을 때 그 등급이 나올 상대 확률
  common: { name: '커먼', color: '#B8B8C8', weight: 70 },
  rare: { name: '레어', color: '#4C9DFF', weight: 22 },
  epic: { name: '에픽', color: '#B26BFF', weight: 6 },
  legend: { name: '레전드', color: '#FFB020', weight: 1.8 },
  transcendent: { name: '초월', color: '#FF4D8D', weight: 0.2 },
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legend', 'transcendent'];

export type WeaponId =
  | 'wood_stick'
  | 'stone_dagger'
  | 'old_staff'
  | 'steel_sword'
  | 'silver_bow'
  | 'bronze_spear'
  | 'flame_sword'
  | 'frost_axe'
  | 'storm_staff'
  | 'hades_scythe'
  | 'artemis_bow'
  | 'heracles_club'
  | 'poseidon_trident'
  | 'zeus_thunderbolt';

export interface WeaponInfo {
  id: WeaponId;
  name: string;
  emoji: string;
  rarity: Rarity;
  power: number; // 공격력 배율
  owner?: GodId; // 초월 무기: 주인 신이 들면 위력 ×1.5
  description: string;
}

export const OWNER_BONUS = 1.5;
export const FUSE_COST = 3; // 등급업에 필요한 같은 무기 개수
export const ENHANCE_BONUS = 0.2; // 초월 무기 강화 1단계당 +20%

export const WEAPONS: Record<WeaponId, WeaponInfo> = {
  wood_stick: { id: 'wood_stick', name: '나무 막대', emoji: '🪵', rarity: 'common', power: 1.1, description: '그냥 막대기다.' },
  stone_dagger: { id: 'stone_dagger', name: '돌 단검', emoji: '🔪', rarity: 'common', power: 1.2, description: '돌을 갈아 만들었다.' },
  old_staff: { id: 'old_staff', name: '낡은 지팡이', emoji: '🦯', rarity: 'common', power: 1.3, description: '할아버지의 지팡이.' },
  steel_sword: { id: 'steel_sword', name: '강철 검', emoji: '🗡️', rarity: 'rare', power: 1.5, description: '대장장이의 역작.' },
  silver_bow: { id: 'silver_bow', name: '은빛 활', emoji: '🏹', rarity: 'rare', power: 1.65, description: '달빛을 머금은 활.' },
  bronze_spear: { id: 'bronze_spear', name: '청동 창', emoji: '🔱', rarity: 'rare', power: 1.8, description: '스파르타 전사의 창.' },
  flame_sword: { id: 'flame_sword', name: '화염검', emoji: '🔥', rarity: 'epic', power: 2.5, description: '헤파이스토스의 대장간에서 태어났다.' },
  frost_axe: { id: 'frost_axe', name: '서리 도끼', emoji: '🪓', rarity: 'epic', power: 2.75, description: '얼어붙은 북쪽 땅의 도끼.' },
  storm_staff: { id: 'storm_staff', name: '폭풍의 지팡이', emoji: '🌪️', rarity: 'epic', power: 3, description: '바람의 신 아이올로스의 지팡이.' },
  hades_scythe: { id: 'hades_scythe', name: '하데스의 낫', emoji: '💀', rarity: 'legend', power: 5, description: '저승의 왕이 쓰던 낫.' },
  artemis_bow: { id: 'artemis_bow', name: '아르테미스의 활', emoji: '🌙', rarity: 'legend', power: 5.5, description: '사냥의 여신의 활. 빗나가는 법이 없다.' },
  heracles_club: { id: 'heracles_club', name: '헤라클레스의 곤봉', emoji: '🏏', rarity: 'legend', power: 6, description: '12과업을 함께한 곤봉.' },
  poseidon_trident: {
    id: 'poseidon_trident',
    name: '포세이돈의 삼지창',
    emoji: '🔱',
    rarity: 'transcendent',
    power: 12,
    owner: 'poseidon',
    description: '바다를 가르고 대지를 흔드는 창. 포세이돈이 들면 ×1.5',
  },
  zeus_thunderbolt: {
    id: 'zeus_thunderbolt',
    name: '제우스의 번개',
    emoji: '⚡',
    rarity: 'transcendent',
    power: 12,
    owner: 'zeus',
    description: '키클롭스가 만든 신들의 왕의 번개. 제우스가 들면 ×1.5',
  },
};

export const WEAPON_LIST: WeaponInfo[] = Object.values(WEAPONS);

/** 몬스터를 잡았을 때 무기가 떨어질 확률 */
export function dropChance(isBoss: boolean): number {
  return isBoss ? 0.2 : 0.02;
}

/** 실제 공격력 배율 = 기본 배율 × (1 + 강화 보너스) × (주인 보너스) */
export function weaponPower(id: WeaponId, enhance: number, god: GodId | null): number {
  const w = WEAPONS[id];
  const owner = w.owner && w.owner === god ? OWNER_BONUS : 1;
  return w.power * (1 + enhance * ENHANCE_BONUS) * owner;
}

/** 다음 등급. 초월이면 null (등급업 불가) */
export function nextRarity(r: Rarity): Rarity | null {
  const i = RARITY_ORDER.indexOf(r);
  return i < RARITY_ORDER.length - 1 ? RARITY_ORDER[i + 1] : null;
}

export function randomWeaponOf(rarity: Rarity, rng: () => number): WeaponId {
  const pool = WEAPON_LIST.filter((w) => w.rarity === rarity);
  return pool[Math.floor(rng() * pool.length)].id;
}

/**
 * 무기 드롭 굴리기. 떨어지지 않으면 null.
 * 스테이지가 높을수록 레전드·초월 확률이 조금씩 오른다.
 */
export function rollWeaponDrop(wave: number, isBoss: boolean, rng: () => number): WeaponId | null {
  if (rng() >= dropChance(isBoss)) return null;

  const highBonus = 1 + wave / 1000; // wave = 스테이지 번호 (예전 웨이브 200마다 +1)
  const weights = RARITY_ORDER.map((r) => RARITY_INFO[r].weight * (r === 'legend' || r === 'transcendent' ? highBonus : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  let rarity: Rarity = 'common';
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    roll -= weights[i];
    if (roll < 0) {
      rarity = RARITY_ORDER[i];
      break;
    }
  }

  return randomWeaponOf(rarity, rng);
}
