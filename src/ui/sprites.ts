import { GameState } from '../game/types';
import { formOf } from '../game/balance';

/**
 * 픽셀 아트. 문자 하나가 픽셀 하나이고, PALETTE에서 색을 찾는다. '.'은 투명.
 * 이미지 파일 없이 코드만으로 그림을 그릴 수 있어서 수정이 쉽다.
 * (2차원 배열로 그림을 그리는 건 Java 과제에서 별 찍기 하던 것과 같은 원리!)
 */
export const PALETTE: Record<string, string> = {
  y: '#FFD54A', // 금색
  Y: '#C9971C',
  s: '#FFD9B8', // 피부
  S: '#C98B5E',
  b: '#1A1A2E', // 검정
  w: '#FFFFFF',
  g: '#C8C8D8',
  G: '#8A8AA0',
  p: '#FF8FA3', // 볼터치
  h: '#8B5A2B', // 갈색 머리
  l: '#5CC46B', // 월계수
  B: '#4C8DFF',
  t: '#2BB3A3', // 청록
  T: '#1B7F74',
  u: '#2D5FC0', // 바다색 옷
  r: '#E5484D',
  v: '#9B6BFF',
  V: '#6A3FCF',
  m: '#5CD67A', // 슬라임
  M: '#2F9E4F',
  k: '#DDE6FF', // 유령
  o: '#7A4A26', // 가죽
};

export const SPRITES: Record<string, string[]> = {
  baby: [
    '...yyyyyy...',
    '..y......y..',
    '...yyyyyy...',
    '....hhhh....',
    '...hsssshh..',
    '...sbssbs...',
    '...psssps...',
    '....ssss....',
    '...wwwwww...',
    '..swwwwwws..',
    '..swwyywws..',
    '...wwwwww...',
    '....s..s....',
    '....s..s....',
  ],
  // 청소년 신: 오른손에 검을 들고 있다 (w=칼날, g=칼날 그림자, Y=손잡이·코등이)
  teen: [
    '...l.hh.l.......',
    '..lhhhhhhl....wg',
    '..hssssssh...wg.',
    '..hsbssbsh..wg..',
    '...ssssss..wg...',
    '....ssss..wg....',
    '..wwwwwwYwg.....',
    '.swwwwwwsY......',
    '.swwyyyyws......',
    '.s.wwwwww.......',
    '...wwwwww.......',
    '...wwwwww.......',
    '...ww..ww.......',
    '...ss..ss.......',
    '...ss..ss.......',
  ],
  zeus: [
    '...y.y.y......',
    '...yyyyy......',
    '..wwwwwww.....',
    '.wwsssssww...y',
    '.wsbsssbsw..yy',
    '.wsssssssw.yy.',
    '.wwgsssgww.y..',
    '..wwwwwww.yy..',
    '...wwwww.yy...',
    '.BBwwwwwsY....',
    'sBwwwyywww....',
    's.wwwwwwww....',
    '..wwwwwwww....',
    '..wwwwwwww....',
    '..ww....ww....',
    '..ss....ss....',
  ],
  poseidon: [
    'y.y.y.........',
    'yyyyy..y.y.y..',
    '..y....yyyyy..',
    '..y...tttttt..',
    '..y..ttsssst..',
    '..y..tsbssbst.',
    '..y..tsssssst.',
    '..y..ttTsssTt.',
    '..y...tttttt..',
    '..ys...tttt...',
    '..yssuuuuuuus.',
    '..y..uuuuuuu.s',
    '..y..uuyyyuu..',
    '..y..uuuuuuu..',
    '..y..uu...uu..',
    '..y..ss...ss..',
  ],
  slime: [
    '.....mm.....',
    '....mmmm....',
    '...mmwmmm...',
    '..mmmmmmmm..',
    '..mbmmmmbm..',
    '.mmmmmmmmmm.',
    '.mmmmrrmmmm.',
    'mmmmmmmmmmmm',
    'MMMMMMMMMMMM',
  ],
  bat: [
    'v..........v',
    'vv..v..v..vv',
    'vvv.vvvv.vvv',
    'vvvvvvvvvvvv',
    'vVvvrvvrvvVv',
    '.VvvvvvvvvV.',
    '..V.vwwv.V..',
    '....v..v....',
  ],
  skeleton: [
    '...wwwww....',
    '..wwwwwww...',
    '..wbbwbbw...',
    '..wwwwwww...',
    '...wbwbw....',
    '....www.....',
    '..ggwwwgg...',
    '.g.wgwgw.g..',
    '...wwwww....',
    '....w.w.....',
    '...ww.ww....',
  ],
  ghost: [
    '....kkkk....',
    '..kkkkkkkk..',
    '.kkkkkkkkkk.',
    '.kkbbkkbbkk.',
    '.kkbbkkbbkk.',
    '.kkkkkkkkkk.',
    '.kkkkbbkkkk.',
    '.kkkkkkkkkk.',
    '.kkkkkkkkkk.',
    '.kk.kk.kk.k.',
  ],
  cyclops: [
    '...SSSSSS...',
    '..SSSSSSSS..',
    '.SSwwwwwwSS.',
    '.SSwwbbwwSS.',
    '.SSwwbbwwSS.',
    '.SSSwwwwSSS.',
    '.SSSSSSSSSS.',
    '..SSrrrrSS..',
    '..oSSSSSSo..',
    '.oooooooooo.',
    '.SooooooooS.',
    '.S.oooooo.S.',
    '...SS..SS...',
  ],
};

/** 지금 단계에 맞는 신의 스프라이트 이름 */
export function heroSprite(s: GameState): string {
  if (s.god) return s.god;
  return formOf(s.level) === 'teen' ? 'teen' : 'baby';
}

/** 배경색: 성장할수록 하늘이 바뀐다 */
export function skyColors(s: GameState): [string, string] {
  if (s.god === 'zeus') return ['#1E2140', '#3B3F7A'];
  if (s.god === 'poseidon') return ['#082A44', '#0F5C7A'];
  if (formOf(s.level) === 'teen') return ['#2B3F8F', '#6C8FE0'];
  return ['#3A2C6B', '#8C6BD1'];
}
