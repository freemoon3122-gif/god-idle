"""신 캐릭터 픽셀 아트 빌더. 캔버스에 부위별로 찍어서 heroes.json을 만든다."""
import json


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [['.'] * w for _ in range(h)]

    def put(self, r, c, ch):
        if 0 <= r < self.h and 0 <= c < self.w and ch != ' ':
            self.g[r][c] = ch

    def text(self, r, c, s):
        """s의 각 글자를 (r, c)부터 가로로 찍는다. 공백은 건너뛴다(투명 유지)."""
        for i, ch in enumerate(s):
            self.put(r, c + i, ch)

    def block(self, r, c, lines):
        for i, s in enumerate(lines):
            self.text(r + i, c, s)

    def rows(self):
        """그림이 있는 부분만 남기고 바깥 빈 줄·빈 칸을 잘라낸다 (발이 바닥에 딱 붙도록)"""
        rows = [''.join(row) for row in self.g]
        used_r = [i for i, r in enumerate(rows) if r.strip('.')]
        used_c = [j for j in range(self.w) if any(r[j] != '.' for r in rows)]
        return [r[used_c[0]:used_c[-1] + 1] for r in rows[used_r[0]:used_r[-1] + 1]]


# 공통 얼굴 (14칸 폭). 큰 눈 + 반짝이는 하이라이트
FACE = [
    'ssssssssssssss',
    'ssbwssssssbwss',
    'ssbbssssssbbss',
]


def baby():
    c = Canvas(22, 23)
    # 후광: 머리 위에 떠 있는 납작한 금빛 고리
    c.text(0, 7, 'zyyyyyyz')
    c.text(1, 7, 'YYYYYYYY')
    # 머리카락
    c.text(3, 7, 'hhhhhhhh')
    c.text(4, 5, 'hhhhhhhhhhhh')
    c.text(5, 4, 'hhHhhhhhhhhHhh')
    c.text(6, 4, 'hssssssssssssh')
    c.block(7, 4, FACE)
    c.text(10, 4, 'sppsssnnssspps')
    c.text(11, 5, 'ssssssssssss')
    c.text(12, 6, 'dssssssssd')
    # 날개 + 천 옷
    c.text(13, 1, 'www   wwwwwwww   www')
    c.text(14, 0, 'wwwFw swwwwwwwws wFwww')
    c.text(15, 0, 'wwFFw swwyyyywws wFFww')
    c.text(16, 1, 'wFF  swwwwwwwws  FFw')
    c.text(17, 2, 'F    wwwwwwww    F')
    c.text(18, 7, 'cwwwwwwc')
    c.text(19, 8, 'ss  ss')
    c.text(20, 8, 'ss  ss')
    c.text(21, 7, 'yyy  yyy')
    return c.rows()


def teen():
    c = Canvas(30, 27)
    # 머리 + 월계관
    c.text(0, 7, 'hhhhhhhh')
    c.text(1, 5, 'hhhhhhhhhhhh')
    c.text(2, 4, 'hhHhhhhhhhhHhh')
    c.text(1, 4, 'l')
    c.text(1, 17, 'l')
    c.text(2, 2, 'lL')
    c.text(2, 18, 'Ll')
    c.text(3, 2, 'llLhhhhhhhhhhhhLll')
    c.text(4, 2, 'Ll' + 'hssssssssssssh' + 'lL')
    c.text(5, 3, 'L')
    c.text(5, 18, 'L')
    c.block(5, 4, FACE)
    c.text(8, 4, 'sdssssnnssssds')
    c.text(9, 5, 'ssssssssssss')
    c.text(10, 6, 'dssssssssd')
    # 몸: 흰 키톤 + 파란 띠 + 금 허리띠
    c.text(11, 5, 'cwwwwwwwwwwc')
    c.text(12, 4, 'swBwwwwwwwwwcs')
    c.text(13, 3, 'ss wwBwwwwwwwc ss')
    c.text(14, 3, 's  wwwBwwwwwwc  s')
    c.text(15, 5, 'yyyyyyyyyyyy')
    c.text(16, 5, 'YwwwwwwwwwwY')
    c.text(17, 5, 'wcwwcwwcwwcw')
    c.text(18, 6, 'cwwcwwcwwc')
    c.text(19, 7, 'ss    ss')
    c.text(20, 7, 'ss    ss')
    c.text(21, 6, 'yyy    yyy')
    # 검: 오른손(14, 19)에서 오른쪽 위로 뻗는다. 칼날 q(밝은 면) + Q(그림자 면)
    for k in range(11):
        c.put(12 - k, 20 + k, 'q')
        c.put(13 - k, 20 + k, 'Q')
    c.put(1, 29, 'w')  # 칼끝 반짝
    c.text(12, 18, 'Y')  # 코등이
    c.text(13, 19, 'Y')
    c.text(14, 20, 'Y')
    c.put(14, 18, 'o')  # 손잡이
    c.put(15, 17, 'o')
    c.put(16, 16, 'y')  # 폼멜
    return c.rows()


def adult():
    """성인 신: 붉은 깃 장식의 청동 투구, 붉은 망토, 청동 가슴갑옷, 둥근 방패와 긴 검"""
    c = Canvas(34, 31)
    # 투구 깃 장식 (붉은 말총)
    c.text(0, 9, 'RRRRRRRR')
    c.text(1, 7, 'RrrrrrrrrrRR')
    c.text(2, 13, 'RR')
    # 청동 투구
    c.text(2, 6, 'YYYYYYY')
    c.text(3, 5, 'YyyyyyyyyyyyY')
    c.text(4, 4, 'YyyYYYYYYYYyyY')
    c.text(5, 4, 'Yy' + 'hssssssssh' + 'yY')
    c.text(6, 4, 'Yy' + 'sbbsssssbb' + 'yY')
    c.text(7, 4, 'Yy' + 'sbwsssssbw' + 'yY')
    c.text(8, 4, 'Y' + 'ys' + 'sssssdsss' + 'syY'[:2] + 'Y')
    c.text(9, 5, 'y' + 'ssssnnssss' + 'y')
    c.text(10, 6, 'Y' + 'dssssssd' + 'Y')
    # 망토(뒤) + 어깨
    c.text(11, 3, 'RRyyyyy' + 'ssss' + 'yyyyyRR')
    c.text(12, 2, 'RRyYyy' + 'yyyyyyyy' + 'yyYyRR')
    # 가슴갑옷 (청동) + 팔
    c.text(13, 2, 'RRss' + 'YyyyyyyyyyY' + 'ssRR')
    c.text(14, 2, 'RRss' + 'yYyyyyyyyYy' + 'ssR')
    c.text(15, 2, 'RR.' + 's' + 'yyYyyyyyYyy' + 's.R')
    c.text(16, 2, 'RR..' + 'yyyYYYYYyyy' + '..R')
    c.text(17, 2, 'RR..' + 'ooooooooooo' + '..R')
    # 치마 갑옷 (가죽 띠)
    c.text(18, 2, 'RR..' + 'wowwowwowwo' + '..R')
    c.text(19, 2, 'RR..' + 'owwowwowwow' + '..R')
    c.text(20, 3, 'R...' + 'ss.....ss')
    c.text(21, 7, 'ss.....ss')
    c.text(22, 7, 'YY.....YY')
    c.text(23, 6, 'YYY.....YYY')
    # 둥근 방패 (왼팔)
    shield = ['..YYYY..', '.YyyyyY.', 'YyyRRyyY', 'YyRRRRyY', 'YyRRRRyY', 'YyyRRyyY', '.YyyyyY.', '..YYYY..']
    c.block(12, 0, shield)
    # 긴 검: 오른손(15, 19)에서 오른쪽 위로
    for k in range(13):
        c.put(13 - k, 21 + k, 'q')
        c.put(14 - k, 21 + k, 'Q')
    c.put(0, 33, 'w')
    c.text(13, 19, 'YY')
    c.text(14, 20, 'Y')
    c.put(15, 20, 'o')
    c.put(16, 19, 'y')
    return c.rows()


def zeus():
    c = Canvas(30, 28)
    # 왕관
    c.text(0, 7, 'y  y  y  y')
    c.text(1, 7, 'yzyyzyyzyy')
    c.text(2, 7, 'YYYYYYYYYY')
    # 흰 머리 + 굵은 눈썹 + 긴 수염
    c.text(3, 5, 'WWWWWWWWWWWWWW')
    c.text(4, 4, 'WWEWWWWWWWWWEWW')
    c.text(5, 4, 'WssssssssssssW')
    c.text(6, 4, 'WsWWWssssWWWsW')
    c.text(7, 4, 'WsbwssssssbwsW')
    c.text(8, 4, 'WsbbssddssbbsW')
    c.text(9, 4, 'WWssWWWWWWssWW')
    c.text(10, 4, 'EWWWWWnnWWWWWE')
    c.text(11, 5, 'WWWWWWWWWWWW')
    c.text(12, 6, 'EWWWWWWWWE')
    c.text(13, 8, 'EWWWWE')
    # 토가 + 파란 띠 + 금 장식, 근육질 팔
    c.text(12, 3, 'ss')
    c.text(12, 17, 'ss')
    c.text(13, 2, 'sswwww')
    c.text(13, 14, 'wwwwss')
    c.text(14, 2, 'ss wwwBwwwwwwwc ss')
    c.text(15, 2, 's  wwwwBwwwwwwc  s')
    c.text(16, 5, 'yyyyyyyyyyyy')
    c.text(17, 5, 'YwwwwwwwwwwY')
    c.text(18, 5, 'wwcwwwwwwcww')
    c.text(19, 5, 'wcwwcwwcwwcw')
    c.text(20, 6, 'cwwcwwcwwc')
    c.text(21, 7, 'dd    dd')
    c.text(22, 7, 'ss    ss')
    c.text(23, 6, 'yyy    yyy')
    # 번개: 들어 올린 오른손(15, 19) 위로 지그재그
    bolt = [
        (0, 25, 'zz'), (1, 24, 'zz'), (2, 23, 'zzZ'), (3, 22, 'zzzzZ'), (4, 24, 'zZ'),
        (5, 23, 'zZ'), (6, 22, 'zzzZ'), (7, 23, 'zZ'), (8, 22, 'zZ'), (9, 21, 'zZ'),
        (10, 20, 'zZ'), (11, 20, 'Z'),
    ]
    for r, col, s in bolt:
        c.text(r, col, s)
    c.text(12, 19, 'ss')
    c.text(13, 19, 'ss')
    return c.rows()


def poseidon():
    c = Canvas(30, 28)
    # 삼지창: 왼쪽에 세로로 (금 자루 + 세 갈래 창끝 + 보석)
    c.text(0, 0, 'y   y   y')
    c.text(1, 0, 'y   y   y')
    c.text(2, 0, 'yY  yY  yY')
    c.text(3, 0, 'yyyyyyyyy')
    c.text(4, 3, 'YxxY')
    for r in range(5, 24):
        c.text(r, 4, 'yY')
    # 왕관
    c.text(0, 11, 'y  y  y  y')
    c.text(1, 11, 'yxyyxyyxyy')
    c.text(2, 11, 'YYYYYYYYYY')
    # 청록 머리 + 수염 (물결치는 느낌)
    c.text(3, 9, 'tAttttttttAttt')
    c.text(4, 8, 'ttTtttttttttTtt')
    c.text(5, 8, 'tssssssssssssst'[:1] + 'ssssssssssssss' + 't')
    c.text(6, 8, 'tsTTTssssTTTst'[:14])
    c.text(7, 8, 'tsbwssssssbwst'[:14])
    c.text(8, 8, 'tsbbssddssbbst'[:14])
    c.text(9, 8, 'ttssttttttsstt')
    c.text(10, 8, 'TtttttnnttttttT'[:14])
    c.text(11, 9, 'tAttttttttAt')
    c.text(12, 10, 'TttttttttT')
    c.text(13, 12, 'TttttT')
    # 비늘 갑옷 + 금 허리띠
    c.text(12, 7, 'ss')
    c.text(12, 20, 'ss')
    c.text(13, 6, 'sssuuu')
    c.text(13, 18, 'uuss')
    c.text(14, 6, 's uuUuuUuuUuuu ss')
    c.text(15, 6, 's uUuuUuuUuuUu ss')
    c.text(16, 21, 'ss')
    c.text(16, 8, 'uuUuuUuuUuuu')
    c.text(17, 8, 'yyyyxyyxyyyy')
    c.text(18, 8, 'YuuuuuuuuuuY')
    c.text(19, 8, 'uUuuUuuUuuUu')
    c.text(20, 9, 'UuuUuuUuuU')
    c.text(21, 10, 'dd    dd')
    c.text(22, 10, 'ss    ss')
    c.text(23, 9, 'yyy    yyy')
    # 왼손이 삼지창 자루를 잡고 있다
    c.text(14, 5, 'ss')
    c.text(15, 5, 'ss')
    return c.rows()


sprites = {'baby': baby(), 'teen': teen(), 'adult': adult(), 'zeus': zeus(), 'poseidon': poseidon()}
json.dump(sprites, open('heroes.json', 'w'), ensure_ascii=False, indent=1)
for k, v in sprites.items():
    print(k, len(v[0]), 'x', len(v))
