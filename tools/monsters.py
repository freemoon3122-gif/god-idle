"""포악한 몬스터 픽셀 아트. 찡그린 눈썹 + 빛나는 빨간 눈 + 날카로운 이빨/발톱/무기.
대부분 좌우 대칭이라 왼쪽 절반만 쓰고 거울처럼 뒤집어 붙인다."""
import json


def sym(half, middle=''):
    return half + middle + half[::-1]


def sprite(lines):
    w = max(len(l) for l in lines)
    return [l.ljust(w, '.') for l in lines]


# 독 슬라임: 찡그린 눈, 이빨이 삐죽삐죽한 큰 입, 아래로 떨어지는 독 방울
# m 몸 / a 하이라이트 / M 그림자 / j 입속·눈썹 / e 빨간 눈 / w 이빨
slime = sprite([
    sym('...........m'),
    sym('........mmmm'),
    sym('......mmmmmm'),
    sym('.....maammmm'),
    sym('....maammmmm'),
    sym('...maammmmmm'),
    sym('..mmjjmmmmmm'),
    sym('..mmmjjjmmmm'),
    sym('.mmmmeejjmmm'),
    sym('.mmmmeeemmmm'),
    sym('mmmmmmmmmmmm'),
    sym('mmmmjwjwjwjw'),
    sym('Mmmmjjjjjjjj'),
    sym('MMmmjjjjjjjj'),
    sym('MMMmmwjwjwjw'),
    sym('.MMMMmmmmmmm'),
    sym('..MMMMMMMMMM'),
    sym('...M....M...'),
    sym('...M........'),
])

# 흡혈 박쥐: 찢어진 날개막, 뾰족 귀, 빛나는 눈, 긴 송곳니, 발톱
bat = sprite([
    sym('V..........v'),
    sym('VV........vv'),
    sym('VjV......vvv'),
    sym('VjjV....vvvv'),
    sym('VjjjV..jvvvv'),
    sym('VjjjjVjjvvvv'),
    sym('VjjjjjVvjjvv'),
    sym('.VjjjjjVveev'),
    sym('.VjVjjjVveev'),
    sym('..V.VjjjvvvO'),
    sym('.....VjjvvwO'),
    sym('......V.vvwv'),
    sym('........v.vv'),
    sym('.......ww.w.'),
])

# 해골 전사: 뿔 달린 투구, 금 간 두개골, 빛나는 눈, 이빨, 갑옷 / 오른손 칼, 왼손 방패
skeleton = sprite([
    '..G.............G...',
    '..GG...........GG...',
    '...GDfffffffffDG....',
    '...DfffffffffffD....',
    '...Dfffffffffffd....'.replace('d', 'D'),
    '...wwwwwwwwwwwww....',
    '...wjjjwwwwwjjjw....',
    '...wjeejwwwjeejw....',
    '...wwjjwwgwwjjww....',
    '....wwwwgjgwwww.....',
    '....wjwjwjwjwjw.....',
    '.....wwwwwwwww......',
    'K.....GwGwGwG....q..',
    'KyK.DffffffffD...q..',
    'KKK.DwGwGwGwfD...q..',
    'KyKwwfwGwGwffwwwYYY.',
    'KKK.DwGwGwGwfD...o..',
    'K...DffffffffD......',
    '.....wGwGwGwG.......',
    '.....ww.....ww......',
    '.....ww.....ww......',
    '....DDD.....DDD.....',
])

# 원령: 어두운 보랏빛 몸, 텅 빈 눈 속 붉은 눈동자, 들쭉날쭉한 이빨, 갈고리 손, 찢어진 꼬리
ghost = sprite([
    sym('.......PP'),
    sym('.....PPPP'),
    sym('...PPPPPP'),
    sym('..PPPPPPP'),
    sym('.PPjjPPPP'),
    sym('.PjjjjPPP'),
    sym('PPjjejPPP'),
    sym('PPPjjPPPP'),
    sym('PPPPPPPPP'),
    sym('PPPjwjwjw'),
    sym('PPPjjjjjj'),
    sym('PPPPwjwjw'),
    sym('IPPPPPPPP'),
    sym('wIPPPPPPP'),
    sym('wwIPPPPPP'),
    sym('.wIIPPPPP'),
    sym('..IIIPPPP'),
    sym('..I.IIPPI'),
    sym('.I...IPI.'),
    sym('.....I.I.'),
])

# 키클롭스: 분노한 외눈(빨간 홍채), 짙은 눈썹, 엄니, 뿔, 가시 박힌 몽둥이
cyclops = sprite([
    '.........yy...........',
    '........yYYy..........',
    '.....SSSSSSSSSS.......',
    '....SSSSSSSSSSSS......',
    '...SSjjjjjjjjjjSS.....',
    '...SSSjjjjjjjjSSS.....',
    '...SSwwwwwwwwwwSS.....',
    '...SSwwweeeewwwSS.....',
    '...SSwweejjeewwSS.....',
    '...SSwweejjeewwSS.....',
    '...SSSwwweewwwSSS.....',
    '...SSXSSSSSSSSXSS.....',
    '....SwjjjjjjjjwS......',
    '....SSwjwjwjwjSS......',
    '..XSSSSSSSSSSSSSSX....',
    '.XSSSSSSSSSSSSSSSSX.ooo',
    'SSXSSSSSSSSSSSSSSXSSoGo',
    'SS.SSXSSSSSSSSXSS.SSooo',
    'SS.KKKKKKKKKKKKKK..SSoo',
    'SS.KKyKKyKKyKKyKK...SSo',
    '...KKKKK.KK.KKKKK....oo',
    '....SSX......XSS.....oo',
    '...SSSX......XSSS.....o',
    '..jjjj........jjjj....',
])

data = {'slime': slime, 'bat': bat, 'skeleton': skeleton, 'ghost': ghost, 'cyclops': cyclops}
json.dump(data, open('monsters.json', 'w'), ensure_ascii=False, indent=1)
for k, v in data.items():
    print(k, len(v[0]), 'x', len(v))
