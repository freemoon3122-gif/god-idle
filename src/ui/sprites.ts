import { GameState } from '../game/types';
import { formOf } from '../game/balance';

/**
 * 픽셀 아트. 문자 하나가 픽셀 하나이고, PALETTE에서 색을 찾는다. '.'은 투명.
 * 이미지 파일 없이 코드만으로 그림을 그릴 수 있어서 수정이 쉽다.
 * (2차원 배열로 그림을 그리는 건 Java 과제에서 별 찍기 하던 것과 같은 원리!)
 */
export const PALETTE: Record<string, string> = {
  // 금속·장신구
  y: '#FFD54A', // 금색
  Y: '#C9971C', // 금색 그림자
  z: '#FFF27A', // 번개 밝은 부분
  Z: '#FFA51F', // 번개 주황
  x: '#6FE3FF', // 보석
  q: '#EEF3FB', // 칼날
  Q: '#93A3C2', // 칼날 그림자
  // 피부·얼굴
  s: '#FFDDC4', // 피부
  d: '#F2B391', // 피부 그림자
  S: '#C98B5E', // 갈색 피부 (키클롭스)
  b: '#2A2240', // 눈
  p: '#FF9FB0', // 볼터치
  n: '#B5475A', // 입
  R: '#B8323A', // 큰 입
  O: '#3D2A55', // 벌린 입
  // 머리카락·수염
  h: '#8B5A2B',
  H: '#5E3A1C',
  W: '#F2F4FA', // 흰 머리 (제우스)
  E: '#B4BDD3',
  t: '#2BB3A3', // 청록 머리 (포세이돈)
  T: '#16756B',
  A: '#7FE8DA',
  // 옷·날개
  w: '#FFFFFF',
  c: '#D5DDF0', // 흰 옷 그림자
  F: '#B9C6E4', // 날개 그림자
  B: '#4C8DFF', // 파란 띠
  u: '#2D5FC0', // 바다색 갑옷
  U: '#1B3C85',
  l: '#5CC46B', // 월계수
  L: '#2F8A45',
  o: '#7A4A26', // 가죽
  // 몬스터
  g: '#C8C8D8',
  G: '#8A8AA0',
  r: '#E5484D',
  v: '#9B6BFF',
  V: '#6A3FCF',
  m: '#5CD67A',
  M: '#2F9E4F',
  k: '#DDE6FF',
};

/** 외곽선 색. PixelSprite가 그림 둘레에 자동으로 1칸 두께로 그린다. */
export const OUTLINE = '#1C1430';

/*
 * 그림 데이터. 신 캐릭터는 2~3등신 치비 비율, 색마다 밝은 면/그림자 면을 나눠 칠했다.
 * 외곽선은 여기서 그리지 않는다 (PixelSprite가 자동 생성).
 */
export const SPRITES: Record<string, string[]> = {
  baby: [
    '.......zyyyyyyz.......',
    '.......YYYYYYYY.......',
    '......................',
    '.......hhhhhhhh.......',
    '.....hhhhhhhhhhhh.....',
    '....hhHhhhhhhhhHhh....',
    '....hssssssssssssh....',
    '....ssssssssssssss....',
    '....ssbwssssssbwss....',
    '....ssbbssssssbbss....',
    '....sppsssnnssspps....',
    '.....ssssssssssss.....',
    '......dssssssssd......',
    '.www...wwwwwwww...www.',
    'wwwFw.swwwwwwwws.wFwww',
    'wwFFw.swwyyyywws.wFFww',
    '.wFF..swwwwwwwws..FFw.',
    '..F....wwwwwwww....F..',
    '.......cwwwwwwc.......',
    '........ss..ss........',
    '........ss..ss........',
    '.......yyy..yyy.......',
  ],
  teen: [
    '.....hhhhhhhh...............',
    '..lhhhhhhhhhhhhl...........w',
    'lLhhHhhhhhhhhHhhLl..........',
    'llLhhhhhhhhhhhhLll.........q',
    'LlhsssssssssssshlL........qQ',
    '.LssssssssssssssL........qQ.',
    '..ssbwssssssbwss........qQ..',
    '..ssbbssssssbbss.......qQ...',
    '..sdssssnnssssds......qQ....',
    '...ssssssssssss......qQ.....',
    '....dssssssssd......qQ......',
    '...cwwwwwwwwwwc....qQ.......',
    '..swBwwwwwwwwwcsY.qQ........',
    '.ss.wwBwwwwwwwc.sYQ.........',
    '.s..wwwBwwwwwwc.osY.........',
    '...yyyyyyyyyyyyo............',
    '...Ywwwwwwwwwwy.............',
    '...wcwwcwwcwwcw.............',
    '....cwwcwwcwwc..............',
    '.....ss....ss...............',
    '.....ss....ss...............',
    '....yyy....yyy..............',
  ],
  zeus: [
    '.....y..y..y..y........zz',
    '.....yzyyzyyzyy.......zz.',
    '.....YYYYYYYYYY......zzZ.',
    '...WWWWWWWWWWWWWW...zzzzZ',
    '..WWEWWWWWWWWWEWW.....zZ.',
    '..WssssssssssssW.....zZ..',
    '..WsWWWssssWWWsW....zzzZ.',
    '..WsbwssssssbwsW.....zZ..',
    '..WsbbssddssbbsW....zZ...',
    '..WWssWWWWWWssWW...zZ....',
    '..EWWWWWnnWWWWWE..zZ.....',
    '...WWWWWWWWWWWW...Z......',
    '.ss.EWWWWWWWWE.ssss......',
    'sswwwwEWWWWEwwwwsss......',
    'ss.wwwBwwwwwwwc.ss.......',
    's..wwwwBwwwwwwc..s.......',
    '...yyyyyyyyyyyy..........',
    '...YwwwwwwwwwwY..........',
    '...wwcwwwwwwcww..........',
    '...wcwwcwwcwwcw..........',
    '....cwwcwwcwwc...........',
    '.....dd....dd............',
    '.....ss....ss............',
    '....yyy....yyy...........',
  ],
  poseidon: [
    'y...y...y..y..y..y..y...',
    'y...y...y..yxyyxyyxyy...',
    'yY..yY..yY.YYYYYYYYYY...',
    'yyyyyyyyytAttttttttAttt.',
    '...YxxY.ttTtttttttttTtt.',
    '....yY..tsssssssssssssst',
    '....yY..tsTTTssssTTTst..',
    '....yY..tsbwssssssbwst..',
    '....yY..tsbbssddssbbst..',
    '....yY..ttssttttttsstt..',
    '....yY..Ttttttnntttttt..',
    '....yY...tAttttttttAt...',
    '....yY.ss.TttttttttTss..',
    '....yYsssuuuTttttTuuss..',
    '....yss.uuUuuUuuUuuu.ss.',
    '....yss.uUuuUuuUuuUu.ss.',
    '....yY..uuUuuUuuUuuu.ss.',
    '....yY..yyyyxyyxyyyy....',
    '....yY..YuuuuuuuuuuY....',
    '....yY..uUuuUuuUuuUu....',
    '....yY...UuuUuuUuuU.....',
    '....yY....dd....dd......',
    '....yY....ss....ss......',
    '....yY...yyy....yyy.....',
  ],
  slime: [
    '........mmmm........',
    '......mmmmmmmm......',
    '.....mwwmmmmwwm.....',
    '....mwwmmmmmmwwm....',
    '...mmwmmmmmmmmwmm...',
    '..mmmmmmmmmmmmmmmm..',
    '..mmbbmmmmmmmmbbmm..',
    '.mmmbwmmmmmmmmwbmmm.',
    '.mmmbbmmmmmmmmbbmmm.',
    'mmmmmmmmnnnnmmmmmmmm',
    'mmmmmmmmMnnMmmmmmmmm',
    'MmmmmmmmmMMmmmmmmmmM',
    '.MMMMMMMMMMMMMMMMMM.',
  ],
  bat: [
    'V.........v..v.........V',
    'VV.......vv..vv.......VV',
    'VVv......vvvvvv......vVV',
    'VvvV....vvvvvvvv....VvvV',
    'VvvvV..vvvvvvvvvv..VvvvV',
    'VvvvvVvvrrvvvvrrvvVvvvvV',
    '.VvvvvVvrbvvvvbrvVvvvvV.',
    '.VvVvvvvvvvvvvvvvvvvVvV.',
    '..V.VvvvvvwOOwvvvvvV.V..',
    '.....V.vvvv..vvvv.V.....',
    '.......vv......vv.......',
  ],
  skeleton: [
    '...wwwwwwww...',
    '..wwwwwwwwww..',
    '.wwwwwwwwwwww.',
    '.wbbbwwwwbbbw.',
    '.wbbrwwwwrbbw.',
    '.wwwwbwwbwwww.',
    '..wgwgwwgwgw..',
    '...wwwwwwww...',
    '....GwGGwG....',
    '.gwwwwwwwwwwg.',
    'g.wGwGwwGwGw.g',
    'g.wwwwwwwwww.g',
    '...wGwGGwGw...',
    '...wwwwwwww...',
    '....w.ww.w....',
    '...ww.ww.ww...',
    '..www.ww.www..',
  ],
  ghost: [
    '.....kkkkkk.....',
    '...kkkkkkkkkk...',
    '..kkkkkkkkkkkk..',
    '.kkwkkkkkkkkwkk.',
    '.kwkkkkkkkkkkwk.',
    'kkkbbkkkkkkbbkkk',
    'kkkbwkkkkkkwbkkk',
    'kkkbbkkkkkkbbkkk',
    'kkpkkkkOOkkkkpkk',
    'kkkkkkkOOkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'ckkkkkkkkkkkkkkc',
    'cckkkkkkkkkkkkcc',
    'ccc.ckkkkkkc.ccc',
    '.c...ckkkkc...c.',
  ],
  cyclops: [
    '........yy........',
    '.......YyyY.......',
    '....SSSSSSSSSS....',
    '...SSSSSSSSSSSS...',
    '..SSSSwwwwwwSSSS..',
    '..SSSwwbbwbwwSSS..',
    '..SSSwwbbbbwwSSS..',
    '..SSSSwwwwwwSSSS..',
    '..SSSSSSSSSSSSSS..',
    '...SSRwwwwwwRSS...',
    '...SSSRRRRRRSSS...',
    '.SSSSSSSSSSSSSSSS.',
    'SSoSSSSSSSSSSSSoSS',
    'SS.SSSSSSSSSSSS.SS',
    'SS.oooooooooooo.SS',
    'S..ooYooYoooYoo..S',
    '...oooo.oo.oooo...',
    '....SS......SS....',
    '...SSS......SSS...',
    '..ooo........ooo..',
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
