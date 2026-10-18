"""몬스터 픽셀 아트. 대부분 좌우 대칭이라 왼쪽 절반만 쓰고 거울처럼 뒤집어 붙인다."""
import json


def sym(half, odd_middle=''):
    """'..mmM' → '..mmM' + 가운데 + 'Mmm..' (좌우 대칭 한 줄)"""
    return half + odd_middle + half[::-1]


def sprite(lines):
    w = max(len(l) for l in lines)
    return [l.ljust(w, '.') for l in lines]


# 슬라임: 말랑한 물방울. 위쪽 하이라이트, 아래쪽 그림자, 큰 눈
slime = sprite([
    sym('........mm'),
    sym('......mmmm'),
    sym('.....mwwmm'),
    sym('....mwwmmm'),
    sym('...mmwmmmm'),
    sym('..mmmmmmmm'),
    sym('..mmbbmmmm'),
    sym('.mmmbwmmmm'),
    sym('.mmmbbmmmm'),
    sym('mmmmmmmmnn'),
    sym('mmmmmmmmMn'),
    sym('MmmmmmmmmM'),
    sym('.MMMMMMMMM'),
])

# 박쥐: 펼친 날개(막 그림자), 뾰족 귀, 빨간 눈, 송곳니
bat = sprite([
    sym('V.........v.'),
    sym('VV.......vv.'),
    sym('VVv......vvv'),
    sym('VvvV....vvvv'),
    sym('VvvvV..vvvvv'),
    sym('VvvvvVvvrrvv'),
    sym('.VvvvvVvrbvv'),
    sym('.VvVvvvvvvvv'),
    sym('..V.VvvvvvwO'),
    sym('.....V.vvvv.'),
    sym('.......vv...'),
])

# 해골 병사: 둥근 두개골, 깊은 눈구멍, 갈비뼈, 뼈 다리
skeleton = sprite([
    sym('...wwww'),
    sym('..wwwww'),
    sym('.wwwwww'),
    sym('.wbbbww'),
    sym('.wbbrww'),
    sym('.wwwwbw'),
    sym('..wgwgw'),
    sym('...wwww'),
    sym('....GwG'),
    sym('.gwwwww'),
    sym('g.wGwGw'),
    sym('g.wwwww'),
    sym('...wGwG'),
    sym('...wwww'),
    sym('....w.w'),
    sym('...ww.w'),
    sym('..www.w'),
])

# 유령: 동그란 머리, 물결치는 꼬리, 볼터치, 'O' 입
ghost = sprite([
    sym('.....kkk'),
    sym('...kkkkk'),
    sym('..kkkkkk'),
    sym('.kkwkkkk'),
    sym('.kwkkkkk'),
    sym('kkkbbkkk'),
    sym('kkkbwkkk'),
    sym('kkkbbkkk'),
    sym('kkpkkkkO'),
    sym('kkkkkkkO'),
    sym('kkkkkkkk'),
    sym('ckkkkkkk'),
    sym('cckkkkkk'),
    sym('ccc.ckkk'),
    sym('.c...ckk'),
])

# 키클롭스: 커다란 외눈, 뿔, 갈색 피부, 가죽 허리옷
cyclops = sprite([
    sym('........', 'yy'),
    sym('.......Y', 'yy'),
    sym('....SSSS', 'SS'),
    sym('...SSSSS', 'SS'),
    sym('..SSSSww', 'ww'),
    sym('..SSSwwb', 'bw'),
    sym('..SSSwwb', 'bb'),
    sym('..SSSSww', 'ww'),
    sym('..SSSSSS', 'SS'),
    sym('...SSRww', 'ww'),
    sym('...SSSRR', 'RR'),
    sym('.SSSSSSS', 'SS'),
    sym('SSoSSSSS', 'SS'),
    sym('SS.SSSSS', 'SS'),
    sym('SS.ooooo', 'oo'),
    sym('S..ooYoo', 'Yo'),
    sym('...oooo.', 'oo'),
    sym('....SS..', '..'),
    sym('...SSS..', '..'),
    sym('..ooo...', '..'),
])

data = {'slime': slime, 'bat': bat, 'skeleton': skeleton, 'ghost': ghost, 'cyclops': cyclops}
json.dump(data, open('monsters.json', 'w'), ensure_ascii=False, indent=1)
for k, v in data.items():
    print(k, len(v[0]), 'x', len(v))
