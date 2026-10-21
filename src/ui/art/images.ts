import { ImageSourcePropType } from 'react-native';

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

export const IMAGE_ART: Record<string, ImageArt> = {};

/**
 * 배경 PNG (맵 전체 한 장). 등록하지 않은 테마는 지금처럼 SVG 배경으로 그린다.
 * 맵은 화면보다 넓어서(가로 2.4화면) 카메라가 따라가며 일부만 보인다. 크기는 assets/sprites/README.md 참고.
 * 예) zeus: require('../../../assets/sprites/bg_zeus.png'),
 */
export const BACKGROUND_IMAGES: Partial<Record<'zeus' | 'poseidon' | 'earth', ImageSourcePropType>> = {};
