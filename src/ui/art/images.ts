import { ImageSourcePropType } from 'react-native';

import { SkillId } from '../../game/types';

/**
 * PNG 그림 (직접 그린 일러스트). 여기 등록한 이름은 벡터 그림 대신 PNG로 그린다.
 * 등록하지 않은 이름은 지금처럼 벡터 그림(art/*.tsx)으로 그린다 → 하나씩 바꿔 가도 된다.
 *
 * - 파일은 assets/sprites/에 넣는다. 크기·비율은 assets/sprites/README.md 표를 따른다.
 * - React Native는 require()에 변수를 못 쓴다(빌드할 때 파일을 묶어야 해서). 그래서 한 줄씩 직접 적는다.
 * - weapon: 제우스·포세이돈처럼 공격할 때 무기를 휘두르는 캐릭터는, 무기와 무기를 쥔 팔만 따로 그린 PNG를
 *   같은 크기의 캔버스로 넣으면 그 부분만 회전한다. 없으면 몸 그림 하나로 (휘두르기 없이) 그린다.
 *
 * 예)
 *   zeus: {
 *     body: require('../../../assets/sprites/zeus.png'),
 *     weapon: require('../../../assets/sprites/zeus_weapon.png'),
 *   },
 *   slime: { body: require('../../../assets/sprites/slime.png') },
 */
export interface ImageArt {
  body: ImageSourcePropType;
  weapon?: ImageSourcePropType;
}

export const IMAGE_ART: Record<string, ImageArt> = {
  // 도트 그림 (tools/pixel/*.py로 만든다. 다시 만들려면: python3 tools/pixel/heroes.py 등)
  baby: { body: require('../../../assets/sprites/baby.png') },
  teen: { body: require('../../../assets/sprites/teen.png') },
  adult: { body: require('../../../assets/sprites/adult.png') },
  cloud: { body: require('../../../assets/sprites/cloud.png') },
  shark: { body: require('../../../assets/sprites/shark.png') },
  slime: { body: require('../../../assets/sprites/slime.png') },
  bat: { body: require('../../../assets/sprites/bat.png') },
  skeleton: { body: require('../../../assets/sprites/skeleton.png') },
  ghost: { body: require('../../../assets/sprites/ghost.png') },
  cyclops: { body: require('../../../assets/sprites/cyclops.png') },
  heracles: { body: require('../../../assets/sprites/heracles.png') },
  gaia: { body: require('../../../assets/sprites/gaia.png') },
  hermes: { body: require('../../../assets/sprites/hermes.png') },
  giant_spear: { body: require('../../../assets/sprites/giant_spear.png') },
  giant_rock: { body: require('../../../assets/sprites/giant_rock.png') },
  polybotes: { body: require('../../../assets/sprites/polybotes.png') },
  porphyrion: { body: require('../../../assets/sprites/porphyrion.png') },
  typhoeus: { body: require('../../../assets/sprites/typhoeus.png') },
  zeus: {
    body: require('../../../assets/sprites/zeus.png'),
    weapon: require('../../../assets/sprites/zeus_weapon.png'),
  },
  poseidon: {
    body: require('../../../assets/sprites/poseidon.png'),
    weapon: require('../../../assets/sprites/poseidon_weapon.png'),
  },
};

/**
 * 배경 PNG (맵 전체 한 장). 등록하지 않은 테마는 지금처럼 SVG 배경으로 그린다.
 * 맵은 화면보다 넓어서(가로 2.4화면) 카메라가 따라가며 일부만 보인다. 크기는 assets/sprites/README.md 참고.
 * 예) zeus: require('../../../assets/sprites/bg_zeus.png'),
 */
export const BACKGROUND_IMAGES: Partial<Record<'zeus' | 'poseidon' | 'earth', ImageSourcePropType>> = {
  earth: require('../../../assets/sprites/bg_earth.png'),
  zeus: require('../../../assets/sprites/bg_zeus.png'),
  poseidon: require('../../../assets/sprites/bg_poseidon.png'),
};

/** 스킬 버튼 아이콘 (도트 그림, tools/pixel/skill_icons.py로 만든다). 없는 스킬은 이모지로 보여 준다 */
export const SKILL_ICONS: Partial<Record<SkillId, ImageSourcePropType>> = {
  baby_star: require('../../../assets/icons/baby_star.png'),
  baby_halo: require('../../../assets/icons/baby_halo.png'),
  baby_feather: require('../../../assets/icons/baby_feather.png'),
  teen_slash: require('../../../assets/icons/teen_slash.png'),
  teen_dash: require('../../../assets/icons/teen_dash.png'),
  teen_laurel: require('../../../assets/icons/teen_laurel.png'),
  adult_whirl: require('../../../assets/icons/adult_whirl.png'),
  adult_shield: require('../../../assets/icons/adult_shield.png'),
  adult_meteor: require('../../../assets/icons/adult_meteor.png'),
  zeus_bolt: require('../../../assets/icons/zeus_bolt.png'),
  zeus_storm: require('../../../assets/icons/zeus_storm.png'),
  zeus_judgment: require('../../../assets/icons/zeus_judgment.png'),
  poseidon_wave: require('../../../assets/icons/poseidon_wave.png'),
  poseidon_trident: require('../../../assets/icons/poseidon_trident.png'),
  poseidon_kraken: require('../../../assets/icons/poseidon_kraken.png'),
  zeus_gigas: require('../../../assets/icons/zeus_gigas.png'),
  poseidon_nisyros: require('../../../assets/icons/poseidon_nisyros.png'),
};

/** 레이드 배경 (화면에 고정된 한 장, tools/pixel/ui_icons.py로 만든다) */
export const RAID_BACKGROUNDS: Record<'gigantomachy' | 'typhoeus', ImageSourcePropType> = {
  gigantomachy: require('../../../assets/sprites/bg_raid_giganto.png'),
  typhoeus: require('../../../assets/sprites/bg_raid_typhoeus.png'),
};

/** UI 도트 아이콘 (하단 탭, 재화, 자동 이동) */
export const UI_ICONS = {
  tab_content: require('../../../assets/ui/tab_content.png'),
  tab_weapon: require('../../../assets/ui/tab_weapon.png'),
  tab_power: require('../../../assets/ui/tab_power.png'),
  tab_skill: require('../../../assets/ui/tab_skill.png'),
  gold: require('../../../assets/ui/gold.png'),
  diamond: require('../../../assets/ui/diamond.png'),
  coin: require('../../../assets/ui/coin.png'),
  auto: require('../../../assets/ui/auto.png'),
} satisfies Record<string, ImageSourcePropType>;
export type UiIconName = keyof typeof UI_ICONS;
