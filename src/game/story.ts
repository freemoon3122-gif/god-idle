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

// ───────────── 메인 스토리: 500스테이지마다 한 장, 총 10장 ─────────────
//
// 크로노스(티탄의 왕)가 올림포스를 되찾으려고 세상에 괴물을 풀었다.
// 이제 막 태어난 어린 신이 괴물들을 물리치며 자라나, 마지막에는 타르타로스의 문 앞에 선다.
// 장마다 주 몬스터(balance.ts의 MONSTER_KINDS)가 바뀌고, 그 몬스터가 대사를 한다.

export interface Chapter {
  title: string;
  boss: string; // 대사를 하는 몬스터 스프라이트
  bossName: string;
  lines: { who: 'n' | 'hero' | 'boss' | 'gaia' | 'hermes' | 'heracles'; text: string }[];
}

export const CHAPTERS: Chapter[] = [
  {
    title: '1장 · 오염된 숲',
    boss: 'slime',
    bossName: '독 슬라임',
    lines: [
      { who: 'n', text: '티탄의 왕 크로노스가 타르타로스에서 깨어났다. 그는 올림포스를 되찾으려고 세상에 괴물을 풀어놓았다.' },
      { who: 'n', text: '그 무렵 올림포스 기슭의 숲에서, 작은 신 하나가 눈을 떴다.' },
      { who: 'boss', text: '꾸르륵… 크로노스 님의 독이 이 숲을 삼킨다…!' },
      { who: 'hero', text: '숲이 아파하고 있어. 내가 지킬 거야!' },
    ],
  },
  {
    title: '2장 · 어둠의 동굴',
    boss: 'bat',
    bossName: '흡혈 박쥐',
    lines: [
      { who: 'n', text: '숲을 지나자 빛이 들지 않는 동굴이 나타났다. 천장에서 붉은 눈들이 번뜩인다.' },
      { who: 'boss', text: '끼에에엑! 신의 피는 얼마나 달콤할까!' },
      { who: 'hermes', text: '어린 신이여, 동굴 끝에 지상으로 나가는 길이 있어요. 겁먹지 마세요!' },
      { who: 'hero', text: '어둠 따위 무섭지 않아. 앞으로 나아가자!' },
    ],
  },
  {
    title: '3장 · 망자의 들판',
    boss: 'skeleton',
    bossName: '해골 전사',
    lines: [
      { who: 'n', text: '동굴을 빠져나오자 옛 전쟁터가 펼쳐졌다. 쓰러진 병사들이 크로노스의 주문에 다시 일어선다.' },
      { who: 'boss', text: '덜그럭… 우리는 죽지 않는다… 몇 번이고 일어난다…' },
      { who: 'hero', text: '그렇다면 몇 번이고 쓰러뜨려 주지!' },
    ],
  },
  {
    title: '4장 · 저승의 문',
    boss: 'ghost',
    bossName: '원령',
    lines: [
      { who: 'n', text: '들판 끝에서 차가운 바람이 분다. 하데스의 저승으로 이어지는 문이 열려 원령들이 쏟아져 나온다.' },
      { who: 'boss', text: '돌아갈 수 없다… 산 자는… 우리와 함께…' },
      { who: 'gaia', text: '아이야, 대지가 너에게 힘을 빌려주마. 저 문을 닫아라.' },
      { who: 'hero', text: '저승의 문, 내가 닫겠어!' },
    ],
  },
  {
    title: '5장 · 대장간 섬',
    boss: 'cyclops',
    bossName: '분노한 키클롭스',
    lines: [
      { who: 'n', text: '바다 건너 화산섬. 원래 신들의 무기를 만들던 키클롭스들이 크로노스에게 속아 분노에 휩싸였다.' },
      { who: 'boss', text: '신들은 우리를 가뒀다! 이제 우리가 신을 부술 차례다!' },
      { who: 'hero', text: '너희를 속인 건 크로노스야. 정신 차리게 해 주지!' },
    ],
  },
  {
    title: '6장 · 플레그라 평원',
    boss: 'giant_spear',
    bossName: '기간테스 전사',
    lines: [
      { who: 'n', text: '대지가 갈라지며 뱀의 다리를 가진 거인족 기간테스가 솟아올랐다. 가이아마저 크로노스의 편에 선 것일까?' },
      { who: 'boss', text: '신은 거인을 죽일 수 없다! 우리는 불사의 몸이다!' },
      { who: 'heracles', text: '제가 함께 싸우겠습니다! 거인에게 필멸의 화살을 꽂아 드리죠!' },
      { who: 'hero', text: '좋아, 헤라클레스. 같이 가자!' },
    ],
  },
  {
    title: '7장 · 무너진 산맥',
    boss: 'giant_rock',
    bossName: '기간테스 투석병',
    lines: [
      { who: 'n', text: '거인들이 산을 통째로 뽑아 던지며 올림포스로 향하는 길을 막았다. 하늘에서 바위가 비처럼 쏟아진다.' },
      { who: 'boss', text: '올림포스까지 산을 쌓아 올려 주마! 신들의 왕좌를 부숴 버리겠다!' },
      { who: 'hero', text: '길은 내가 연다. 한 걸음도 물러서지 않아!' },
    ],
  },
  {
    title: '8장 · 분노한 바다',
    boss: 'polybotes',
    bossName: '바다 거인',
    lines: [
      { who: 'n', text: '바다가 검게 끓어오른다. 바다의 거인들이 파도를 일으켜 해안의 마을을 덮치고 있다.' },
      { who: 'boss', text: '바다는 원래 우리 것이었다! 신 따위가 다스릴 곳이 아니다!' },
      { who: 'hero', text: '바다에 사는 모두를 위해서, 이 파도를 멈추겠어!' },
    ],
  },
  {
    title: '9장 · 거인의 성채',
    boss: 'porphyrion',
    bossName: '거인 군주',
    lines: [
      { who: 'n', text: '구름을 뚫고 솟은 거인들의 성채. 왕관을 쓴 거인 군주들이 마지막 군대를 이끌고 있다.' },
      { who: 'boss', text: '크로노스 님이 깨어나시면 이 세상은 다시 티탄의 것이 된다!' },
      { who: 'gaia', text: '아이야… 나는 내 아이들을 아꼈지만, 이 싸움은 끝나야 한다. 네가 끝내 다오.' },
      { who: 'hero', text: '알겠어요, 가이아. 이 전쟁을 끝낼게요.' },
    ],
  },
  {
    title: '10장 · 타르타로스의 문',
    boss: 'typhoeus',
    bossName: '티포에우스의 자식',
    lines: [
      { who: 'n', text: '마침내 세상의 가장 깊은 곳, 타르타로스의 문 앞. 문 너머에서 크로노스의 목소리가 울린다.' },
      { who: 'boss', text: '크르르… 아버지 티포에우스의 원수! 네 백 개의 뼈를 부숴 주마!' },
      { who: 'n', text: '"어린 신이여, 여기까지 오다니. 하지만 시간의 신인 나를 이길 수는 없다." — 크로노스' },
      { who: 'hero', text: '시간이 얼마가 걸려도 좋아. 끝까지 싸워서, 이 세상을 지킬 거야!' },
    ],
  },
];

/** n장(1~10)의 스토리 대사. hero = 지금 신의 스프라이트·이름 */
export function chapterStory(chapter: number, heroSprite: string, heroName: string): StoryLine[] {
  const ch = CHAPTERS[Math.min(CHAPTERS.length, Math.max(1, chapter)) - 1];
  const who = {
    n: { sprite: null, speaker: '' },
    hero: { sprite: heroSprite, speaker: heroName },
    boss: { sprite: ch.boss, speaker: ch.bossName },
    gaia: { sprite: 'gaia', speaker: '가이아' },
    hermes: { sprite: 'hermes', speaker: '헤르메스' },
    heracles: { sprite: 'heracles', speaker: '헤라클레스' },
  };
  return [
    { sprite: null, speaker: '', text: `— ${ch.title} —` },
    ...ch.lines.map((l) => ({ ...who[l.who], text: l.text })),
  ];
}
