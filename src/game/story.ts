import { GODS } from './balance';
import { GodId, RaidEvent, RaidId } from './types';

/**
 * 레이드 컷신 대사. 레이드 진행 중 특정 순간(입장, 보스 등장, 힘줄 절단...)에 화면 아래 대화창으로 보여준다.
 * sprite가 null이면 나레이션(해설)이다.
 */
export interface StoryLine {
  sprite: string | null;
  speaker: string;
  text: string;
}

const NARRATION = (text: string): StoryLine => ({ sprite: null, speaker: '', text });

/** 받침 있는 이름 뒤에는 '은', 없으면 '는' (포세이돈은 / 제우스는) */
function topic(name: string): string {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return name + (code >= 0 && code % 28 !== 0 ? '은' : '는');
}

export function storyFor(event: RaidEvent, raid: RaidId, god: GodId | null): StoryLine[] | null {
  const g = god ?? 'zeus';
  const name = GODS[g].name;
  const me = (text: string): StoryLine => ({ sprite: g, speaker: name, text });
  const gaia = (text: string): StoryLine => ({ sprite: 'gaia', speaker: '가이아', text });
  const heracles = (text: string): StoryLine => ({ sprite: 'heracles', speaker: '헤라클레스', text });
  const typhoeus = (text: string): StoryLine => ({ sprite: 'typhoeus', speaker: '티포에우스', text });
  const hermes = (text: string): StoryLine => ({ sprite: 'hermes', speaker: '헤르메스', text });

  if (raid === 'gigantomachy') {
    switch (event) {
      case 'intro':
        return [
          NARRATION('티탄과의 전쟁에서 자식들이 패하자, 대지의 여신 가이아가 분노했다.'),
          gaia('내 아이들 기간테스여! 올림포스를 무너뜨려라! 신의 힘만으로는 결코 너희를 죽일 수 없다!'),
          NARRATION('뱀의 다리를 가진 거인족 기간테스는 신의 손으로는 죽지 않는다. 그래서 신들은 인간 영웅을 불렀다.'),
          heracles('제 화살로 놈들에게 「필멸의 표식」을 새기겠습니다! 표식이 빛날 때 공격하세요!'),
          NARRATION('거인들은 끝없이 몰려온다. 90초 동안 최대한 많은 피해를 입혀라!'),
          me(g === 'zeus' ? '좋다, 헤라클레스. 올림포스의 이름으로!' : '바다의 힘을 보여 주마. 가자, 헤라클레스!'),
        ];
      case 'boss':
        return g === 'poseidon'
          ? [
              { sprite: 'polybotes', speaker: '폴리보테스', text: '바다의 신이여, 바다에서는 내가 너보다 강하다! 잡을 수 있으면 잡아 봐라!' },
              NARRATION('폴리보테스가 바다를 건너 코스 섬으로 달아났다!'),
              me('도망쳐 봐야 소용없다. 섬째로 묻어 주마!'),
            ]
          : [
              { sprite: 'porphyrion', speaker: '포르피리온', text: '나는 거인의 왕 포르피리온! 올림포스를 부수고 헤라를 내 신부로 삼겠다!' },
              me('감히 내 아내를...! 번개를 받아라!'),
              heracles('제가 표식을 새기는 순간을 노리세요!'),
            ];
      case 'clear':
        return g === 'poseidon'
          ? [
              NARRATION('포세이돈은 코스 섬의 한 조각을 뜯어내 폴리보테스에게 던졌다.'),
              NARRATION('거인을 깔아뭉갠 그 바위가 바로 오늘날의 「니시로스 섬」이다.'),
              heracles('오늘은 여기까지! 내일 다시 거인들을 막으러 와 주세요!'),
            ]
          : [
              NARRATION('제우스의 번개가 포르피리온을 꿰뚫고, 헤라클레스의 화살이 마지막 숨을 끊었다.'),
              heracles('오늘은 여기까지! 내일 다시 거인들을 막으러 와 주세요!'),
            ];
      default:
        return null;
    }
  }

  switch (event) {
    case 'intro':
      return [
        NARRATION('기간테스마저 쓰러지자, 가이아는 타르타로스와 함께 마지막 괴물을 낳았다.'),
        typhoeus('크아아아! 내 어깨의 백 개의 뱀 머리가 올림포스를 잿더미로 만들리라!'),
        NARRATION('그 모습에 겁먹은 신들은 동물로 변해 이집트로 달아났다. 남은 것은 단 하나의 신뿐.'),
        me(g === 'zeus' ? '나는 도망치지 않는다. 신들의 왕은 여기 있다!' : '형님 대신 내가 막겠다. 바다가 너를 삼킬 것이다!'),
      ];
    case 'tendon':
      return [
        typhoeus('잡았다! 네 손발의 힘줄을 끊어 코리키온 동굴에 숨겨 주마!'),
        NARRATION(`${topic(name)} 힘줄이 잘려 쓰러졌다... 잠시 동안 공격력이 크게 줄어든다!`),
      ];
    case 'hermes':
      return [
        hermes('헤르메스와 판이 왔어요! 괴물 몰래 동굴에서 힘줄을 훔쳐 왔죠!'),
        NARRATION('힘줄을 되찾았다! 10초 동안 공격력 1.5배!'),
      ];
    case 'clear':
      return [
        NARRATION(`${topic(name)} 에트나 화산을 통째로 들어 올려 티포에우스를 그 밑에 봉인했다.`),
        NARRATION('지금도 에트나 화산이 불을 뿜는 것은, 그 밑에 갇힌 티포에우스가 몸부림치기 때문이라고 한다.'),
      ];
    default:
      return null;
  }
}
