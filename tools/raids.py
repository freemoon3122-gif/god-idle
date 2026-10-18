"""레이드 픽셀 아트: 기간테스(뱀 다리 거인), 포르피리온, 폴리보테스, 티포에우스, 헤라클레스, 가이아, 헤르메스"""
import json
exec(open('build.py').read().split('# 공통 얼굴')[0])

# 새 색: C/J 거인 올리브 피부, 1/2 뱀 비늘, 4/5 푸른 바다 거인, 6/7 티포에우스 비늘, 8 불꽃, 9/N 사자 가죽


def snake_legs(c, r, c0, w, body='1', shade='2'):
    """허리(r행, c0~c0+w)에서 양쪽으로 똬리 틀며 뻗는 두 뱀 꼬리, 끝에 뱀 머리"""
    mid = c0 + w // 2
    c.text(r, c0, body * w)
    c.text(r + 1, c0 - 1, body + shade * (w // 2 - 1) + body + body + shade * (w - w // 2 - 1) + body)
    c.text(r + 2, c0 - 2, body * 3 + '.' * (w - 2) + body * 3)
    c.text(r + 3, c0 - 3, body * 2 + shade + '.' * (w - 0) + shade + body * 2)
    c.text(r + 4, c0 - 4, body * 2 + shade + '.' * (w + 2) + shade + body * 2)
    c.text(r + 5, c0 - 4, body + shade + '.' * (w + 4) + shade + body)
    # 바닥에서 감아 올라오는 꼬리 끝 = 뱀 머리 (빨간 눈 + 갈라진 혀)
    c.text(r + 6, c0 - 4, body + shade + body + '.' * (w + 2) + body + shade + body)
    c.text(r + 7, c0 - 3, shade + body + body + body + '.' * (w - 4) + body + body + body + shade)
    c.text(r + 8, c0 - 1, body + 'e' + body + 'r' + '.' * (w - 6) + 'r' + body + 'e' + body)
    c.text(r + 9, c0 - 1, '.' + body * 2 + '.' * (w - 4) + body * 2)


def giant_face(c, r, col, skin='C', shade='J'):
    c.text(r, col, skin * 12)
    c.text(r + 1, col, skin + 'jjj' + skin * 4 + 'jjj' + skin)
    c.text(r + 2, col, skin * 2 + 'je' + skin * 4 + 'ej' + skin * 2)
    c.text(r + 3, col, skin * 5 + shade * 2 + skin * 5)
    c.text(r + 4, col, skin + 'jwjwjwjwjw' + skin)
    c.text(r + 5, col, shade + skin + 'jjjjjjjj' + skin + shade)
    c.text(r + 6, col + 1, shade + skin * 8 + shade)


def giant_body(c, r, col, skin='C', shade='J', belt='o'):
    c.text(r, col + 1, skin * 16)
    c.text(r + 1, col, skin * 3 + shade + skin * 10 + shade + skin * 3)
    c.text(r + 2, col, skin * 2 + '.' + skin * 3 + shade + skin * 6 + shade + skin * 3 + '.' + skin * 2)
    c.text(r + 3, col, skin * 2 + '.' + skin * 12 + '.' + skin * 2)
    c.text(r + 4, col, shade * 2 + '.' + skin * 2 + shade * 2 + skin * 4 + shade * 2 + skin * 2 + '.' + shade * 2)
    c.text(r + 5, col, skin * 2 + '.' + belt * 12 + '.' + skin * 2)


def giant_spear():
    c = Canvas(34, 34)
    c.text(0, 7, 'HHHHHHHHHH')
    c.text(1, 5, 'HHHHHHHHHHHHHH')
    c.text(2, 4, 'HH' + 'C' * 12 + 'HH')
    giant_face(c, 3, 6)
    c.text(3, 4, 'HH'); c.text(3, 18, 'HH')
    c.text(4, 4, 'H'); c.text(4, 19, 'H')
    giant_body(c, 10, 3)
    # 창: 오른손이 쥐고 위로 세운다
    for r in range(0, 26):
        c.put(r, 23, 'K')
    c.text(0, 22, '.q.'); c.text(1, 22, 'qQq'); c.text(2, 22, 'qQq'); c.text(3, 23, 'Q')
    c.text(12, 22, 'CC'); c.text(13, 22, 'CC')
    snake_legs(c, 16, 7, 12)
    return c.rows()


def giant_rock():
    c = Canvas(34, 34)
    # 머리 위로 든 큰 바위
    c.text(0, 5, 'GGGGGGGGGG')
    c.text(1, 3, 'GgggGGGGGgGGGG')
    c.text(2, 2, 'GgggGGGGDGGGGGGG')
    c.text(3, 2, 'GGGGGGDDGGGGgGGG')
    c.text(4, 3, 'DGGGGGGGGGGGGD')
    c.text(5, 5, 'DDDDDDDDDD')
    c.text(5, 1, 'CC'); c.text(5, 17, 'CC')
    c.text(6, 1, 'CC'); c.text(6, 17, 'CC')
    c.text(7, 2, 'CC'); c.text(7, 16, 'CC')
    c.text(6, 6, 'hhhhhhhh')
    c.text(7, 4, 'hh' + 'C' * 8 + 'hh')
    giant_face(c, 8, 4)
    c.text(8, 3, 'h'); c.text(8, 16, 'h')
    giant_body(c, 15, 1)
    snake_legs(c, 21, 5, 12)
    return c.rows()


def porphyrion():
    """거인의 왕: 금관, 붉은 망토, 거대한 몸, 양손에 몽둥이 대신 큰 도끼"""
    c = Canvas(40, 40)
    c.text(0, 9, 'y.y.y.y.y.y')
    c.text(1, 9, 'yeyyyxyyyey')
    c.text(2, 9, 'YYYYYYYYYYY')
    c.text(3, 7, 'HHHHHHHHHHHHHHH')
    c.text(4, 6, 'HH' + 'C' * 13 + 'HH')
    c.text(5, 6, 'H' + 'C' * 15 + 'H')
    c.text(6, 6, 'H' + 'CjjjjCCCCCjjjjC' + 'H')
    c.text(7, 6, 'H' + 'CCjeeCCCCCeejCC' + 'H')
    c.text(8, 6, 'H' + 'CCCCCCJJJCCCCCC' + 'H')
    c.text(9, 6, 'HH' + 'jwjwjwjwjwjwj' + 'HH')
    c.text(10, 6, 'HHH' + 'jjjjjjjjjjj' + 'HHH')
    c.text(11, 7, 'HHHwjjjjjjjwHHH')
    c.text(12, 8, 'HHHHHHHHHHHHH')
    c.text(13, 10, 'HHHHHHHHH')
    # 붉은 망토 + 금 견갑
    c.text(12, 2, 'RRyyy'); c.text(12, 21, 'yyyRR')
    c.text(13, 1, 'RRyYyCC'); c.text(13, 19, 'CCyYyRR')
    c.text(14, 1, 'RRCC' + 'C' * 17 + 'CCRR')
    c.text(15, 1, 'RCCC' + 'CCJCCCCCCCCCCJCC' + 'CCCR'[:3])
    c.text(16, 0, 'RRCC.' + 'CCCJCCCCCCCJCCC' + '.CCRR')
    c.text(17, 0, 'RRCC.' + 'CJJCCCCCCCCCJJC' + '.CCRR')
    c.text(18, 0, 'RRJJ.' + 'CCCCJJCCCJJCCCC' + '.JJRR')
    c.text(19, 0, 'RRCC.' + 'yyyyyyyxyyyyyyy' + '.CCRR')
    c.text(20, 0, 'RR...' + 'YRRRRRRRRRRRRRY' + '...RR')
    c.text(21, 0, 'RR....' + 'RRRRRRRRRRRRR' + '....RR')
    # 도끼: 오른손
    for r in range(4, 30):
        c.put(r, 27, 'K')
    axe = ['.qq', 'qqqq', 'qqQqq.', 'qqQQqq', 'qqQQqqq', 'qqQQqqq', 'qqQQqq', 'qqQqq.', 'qqqq', '.qq']
    for i, s in enumerate(axe):
        c.text(1 + i, 28, s)
    for i, s in enumerate(axe):
        c.text(1 + i, 27 - len(s.rstrip('.')) + 1, s.rstrip('.')[::-1]) if i in (3, 4, 5, 6) else None
    c.text(16, 25, 'CCC'); c.text(17, 25, 'CCC')
    snake_legs(c, 22, 8, 14)
    return c.rows()


def polybotes():
    """바다의 거인: 푸른 피부, 해초 머리, 산호 왕관, 조개 방패"""
    c = Canvas(40, 40)
    c.text(0, 10, 'r..r..r..r')
    c.text(1, 10, 'rr.rr.rr.r')
    c.text(2, 9, 'rRrrRrrRrrr')
    c.text(3, 7, 'MMMMMMMMMMMMMMM')
    c.text(4, 6, 'MM' + '4' * 13 + 'MM')
    c.text(5, 6, 'M' + '4' * 15 + 'M')
    c.text(6, 6, 'M' + '4jjjj44444jjjj4' + 'M')
    c.text(7, 6, 'M' + '44jxx44444xxj44' + 'M')
    c.text(8, 6, 'M' + '444444555444444' + 'M')
    c.text(9, 6, 'MM' + 'jwjwjwjwjwjwj' + 'MM')
    c.text(10, 5, 'mMM' + 'jjjjjjjjjjj' + 'MMm')
    c.text(11, 5, 'm.MM' + '5444444445' + 'MM.m'[:4])
    c.text(12, 5, 'm..' + '.' + '555555555' + '...m')
    c.text(13, 2, '444444' + '4' * 9 + '444444')
    c.text(14, 1, '4444544' + '444444444' + '4454444')
    c.text(15, 1, '44.444' + '45444444454' + '444.44')
    c.text(16, 1, '44.444' + '44444444444' + '444.44')
    c.text(17, 1, '55.444' + '55444445544' + '444.55')
    c.text(18, 1, '44.' + 'iiiiiiiiiiiiiiiii' + '.44')
    c.text(19, 4, 'IiIiIiIiIiIiIiIiI')
    # 조개 방패 (왼손)
    c.block(13, 0, ['.']); 
    shell = ['..ppppp..', '.pnpnpnp.', 'pnpnpnpnp', 'pnpnpnpnp', '.pnpnpnp.', '..ppppp..', '...ppp...']
    c.block(14, -4 + 4, [])
    for i, s in enumerate(shell):
        c.text(13 + i, -2 + 2, s) if False else None
    for i, s in enumerate(shell):
        for j, ch in enumerate(s):
            if ch != '.':
                c.put(14 + i, j, ch)
    snake_legs(c, 20, 9, 13, '5', 'U')
    return c.rows()


def typhoeus():
    """괴물 중의 괴물: 어깨에서 솟은 뱀 머리들, 불타는 눈, 날개, 거대한 뱀 꼬리"""
    c = Canvas(48, 44)
    # 어깨의 뱀 머리들 (좌우 3개씩, 위로 솟음)
    heads = [(0, 2), (2, 9), (0, 34), (2, 27), (5, 0), (5, 38)]
    for r, col in heads:
        c.text(r, col, '.666.')
        c.text(r + 1, col, '6e6e6')
        c.text(r + 2, col, '66666')
        c.text(r + 3, col, 'wjjjw')
        c.text(r + 4, col + 1, '666')
        for k in range(5, 12 - r // 2):
            c.text(r + k, col + 1 + (1 if col < 20 else -1) * ((k - 5) // 2), '676')
    # 날개 (어두운 막)
    # 머리: 뿔, 불타는 눈(주황/노랑), 큰 아가리
    c.text(4, 15, 'G' + '.' * 15 + 'G')
    c.text(5, 15, 'GG' + '.' * 13 + 'GG')
    c.text(6, 16, 'GG66666666666GG')
    c.text(7, 16, '666666666666666')
    c.text(8, 15, '66jjj6666666jjj66')
    c.text(9, 15, '666Zzj66666jzZ666')
    c.text(10, 15, '6668Z6666666Z8666')
    c.text(11, 15, '66666667776666666')
    c.text(12, 15, '6jwjwjwjwjwjwjwj6')
    c.text(13, 15, '6jjj88888888888j6'[:17])
    c.text(14, 15, '6jj8zzzzzzzzz8jj6')
    c.text(15, 16, '6jwjwjwjwjwjwj6')
    c.text(16, 17, '7666666666667')
    # 몸통: 비늘 + 갑피, 굵은 팔에 갈고리 발톱
    c.text(17, 8, '66666' + '666666666666666' + '66666')
    c.text(18, 6, '6666766' + '67yyyyyyyyy76' + '6676666'[:7])
    c.text(19, 5, '666.766' + '6yYyYyYyYyY6' + '667.666')
    c.text(20, 4, '666..66' + '6YyYyYyYyYy6' + '66..666')
    c.text(21, 4, '77...66' + '6yYyYyYyYyY6' + '66...77')
    c.text(22, 3, '666...76' + '7YyYyYyYyY7' + '67...666')
    c.text(23, 3, 'w.w...66' + '6yYyYyYyYy6' + '66...w.w')
    c.text(24, 9, '666' + '7yyyyyyyy7' + '666')
    c.text(25, 10, '66666666666666')
    # 거대한 뱀 꼬리 2개가 똬리
    c.text(26, 9, '6667666666766766')
    c.text(27, 7, '667766........667766')
    c.text(28, 5, '6677.............6776'[:21] + '6')
    c.text(29, 3, '667......................766'[:28])
    c.text(30, 2, '66.........................66'[:30])
    c.text(31, 1, '667...........................76'[:32])
    c.text(32, 1, '66.............................66'[:33])
    c.text(33, 2, '6676......................6766')
    c.text(34, 4, '66766................66766')
    c.text(35, 7, '6676666666666666766')
    # 발밑 용암
    return c.rows()


def heracles():
    """사자 가죽을 머리에 뒤집어쓴 영웅, 활을 든 모습 (작게)"""
    c = Canvas(24, 24)
    c.text(0, 4, '.99..99.')
    c.text(1, 3, '9999999999')
    c.text(2, 2, '99NNNNNNNN99')
    c.text(3, 2, '9N' + 'jwjwjwjw' + 'N9')
    c.text(4, 2, '9N' + 'ssssssss' + 'N9')
    c.text(5, 2, '9N' + 'sbwssbws' + 'N9')
    c.text(6, 2, '9N' + 'sbbssbbs' + 'N9')
    c.text(7, 2, '99' + 'hsssssh' + 'h99'[:3])
    c.text(8, 3, '9' + 'hhhnnhhh' + '9')
    c.text(9, 3, '99hhhhhh99')
    c.text(10, 2, '999SSSSSS999')
    c.text(11, 1, 'SS99SSSSSS99SS')
    c.text(12, 1, 'SS.9SXSSXS9.SS')
    c.text(13, 1, 'SS.ooooooo.SS'[:13])
    c.text(14, 3, '.SXSSSSXS')
    c.text(15, 3, 'NNNNNNNNN')
    c.text(16, 4, 'SS...SS')
    c.text(17, 4, 'SS...SS')
    c.text(18, 3, 'ooo...ooo')
    # 활 (오른쪽)
    bow = [(3, 17, 'K'), (4, 18, 'K'), (5, 19, 'K'), (6, 19, 'K'), (7, 20, 'K'), (8, 20, 'K'), (9, 20, 'K'),
           (10, 20, 'K'), (11, 20, 'K'), (12, 19, 'K'), (13, 19, 'K'), (14, 18, 'K'), (15, 17, 'K')]
    for r, col, ch in bow:
        c.put(r, col, ch)
    for r in range(4, 15):
        c.put(r, 17, 'w')
    c.text(9, 13, 'SSSS'); c.text(9, 17, 'K')
    return c.rows()


def gaia():
    """대지의 여신 (초상): 초록 머리에 꽃, 흙빛 피부, 분노한 눈"""
    c = Canvas(20, 20)
    c.text(0, 5, 'lLllLl')
    c.text(1, 3, 'lLlpllLllp')
    c.text(2, 2, 'lllllllllllL')
    c.text(3, 1, 'Ll' + 'SSSSSSSSSS' + 'lL')
    c.text(4, 1, 'll' + 'SjjSSSSjjS' + 'll')
    c.text(5, 1, 'Ll' + 'SSeSSSSeSS' + 'Ll')
    c.text(6, 1, 'll' + 'SSSSXXSSSS' + 'll')
    c.text(7, 1, 'Ll' + 'SSSRRRRSSS' + 'lL')
    c.text(8, 1, 'll' + 'XSSSSSSSSX' + 'll')
    c.text(9, 0, 'lLl' + 'XXSSSSXX' + 'lLl')
    c.text(10, 0, 'lll' + 'MMMSSMMM' + 'lll')
    c.text(11, 0, 'Ll' + 'MMMMyyMMMM' + 'lL')
    c.text(12, 0, 'lMMMMMMMMMMMMl')
    return c.rows()


def hermes():
    """전령의 신 (초상): 날개 달린 투구, 장난스러운 미소"""
    c = Canvas(22, 20)
    c.text(0, 0, 'w.................w')
    c.text(1, 0, 'Fw..yyyyyyyy....wF'[:18] + '.')
    c.text(1, 4, 'yyyyyyyyyy')
    c.text(1, 17, 'wF')
    c.text(2, 0, 'FFw.yYyyyyyyYy.wFF')
    c.text(3, 1, 'FFwyyyyyyyyyywFF')
    c.text(4, 3, 'hYYYYYYYYYYh')
    c.text(5, 3, 'hssssssssssh')
    c.text(6, 3, 'hsbwssssbwsh')
    c.text(7, 3, 'hsbbssssbbsh')
    c.text(8, 3, 'hpsssnnsssph')
    c.text(9, 4, 'sssnnnnsss'[:10])
    c.text(10, 5, 'dssssssd')
    c.text(11, 3, 'BBwwwwwwwwBB')
    c.text(12, 2, 'BBBwwwwwwwwBBB')
    return c.rows()


data = {'giant_spear': giant_spear(), 'giant_rock': giant_rock(), 'porphyrion': porphyrion(),
        'polybotes': polybotes(), 'typhoeus': typhoeus(), 'heracles': heracles(), 'gaia': gaia(), 'hermes': hermes()}
json.dump(data, open('raids.json', 'w'), ensure_ascii=False, indent=1)
for k, v in data.items():
    print(k, len(v[0]), 'x', len(v))
