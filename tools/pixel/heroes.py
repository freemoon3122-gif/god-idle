"""
주인공 도트 그림 (아기·소년·성인 신, 제우스·포세이돈, 탈것 구름·상어).

    python3 tools/pixel/heroes.py      # assets/sprites/*.png 생성 + /tmp/pix-heroes*.png 미리보기

그리는 방식 (픽셀법사 키우기 같은 치비 도트 느낌):
- 부위(머리, 얼굴, 토가…)를 '재질 + 명암 단계'로 칸에 찍는다. 색은 재질마다 4단계 팔레트(밝음→어두움)만 쓴다.
- 명암은 왼쪽 위에서 빛이 온다고 보고, 부위를 둥근 덩어리(타원)로 가정해 단계를 고른다 → 그라데이션 없이 계단식 명암.
- 앞 부위가 뒤 부위와 맞닿는 가장자리는 그 재질의 진한 선색으로 (안쪽 외곽선) → 덩어리가 또렷하게 갈라진다.
- 눈·입·반짝이 같은 작은 부분은 마지막에 점을 직접 찍고, 맨 끝에 그림 둘레에 1px 진한 외곽선을 두른다.
좌표는 모두 원본 픽셀 기준 (저장할 때 8배 확대). SVG 그림(src/ui/art)의 좌표 ÷ 5 = 픽셀 좌표.
"""
import math
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from common import OUTLINE, Sprite, preview, rgba, save  # noqa: E402

# ── 팔레트: 재질마다 [하이라이트, 밝음, 중간, 그림자] + 안쪽 선색 ─────────────
RAMPS = {
    'skin': (['#FFF4E8', '#FFDCC2', '#F4B08E', '#D07E68'], '#9A4E46'),
    'white': (['#FFFFFF', '#EEF1F8', '#C6CEE4', '#8F9AC2'], '#5C6694'),
    'hair': (['#FFFFFF', '#EDF0FA', '#C2CAEA', '#8C95CC'], '#565E9A'),
    'gold': (['#FFF7B0', '#FFD84A', '#E39B22', '#A8620E'], '#6E3A08'),
    'teal': (['#8FF2E6', '#34C4BE', '#178A98', '#0D5A6C'], '#073A4A'),
    'red': (['#FF8A78', '#E8403E', '#B0223A', '#6E1028'], '#4A0A1C'),
    'bronze': (['#FFE9A0', '#EAAE48', '#B87422', '#7A4614'], '#4E2A0A'),
    'blue': (['#A6D0FF', '#5490F2', '#2E5EC2', '#1C3A84'], '#10245A'),
    'leaf': (['#C2F48E', '#6CCB58', '#2F8E46', '#1A5C36'], '#0E3A22'),
    'steel': (['#FFFFFF', '#DCE4F0', '#A4B2CA', '#6A7898'], '#3A4466'),
    'brown': (['#E0A868', '#B4783E', '#8A5428', '#5A3418'], '#3A200C'),
    'leather': (['#C88A50', '#9C6236', '#70421E', '#4A2810'], '#2E180A'),
    'bolt': (['#FFFFF2', '#FFF068', '#FFC11E', '#F08414'], '#8A3E06'),
    'orb': (['#F0FFFF', '#96EAF4', '#40B8DA', '#1E78AE'], '#0E4A78'),
    'shark': (['#C4DAEE', '#8AA8C6', '#5E7E9E', '#3F5876'], '#23324A'),
    'belly': (['#FFFFFF', '#EEF2F8', '#C8D2E4', '#97A4C0'], '#5C6694'),
    'cloud': (['#FFFFFF', '#F2F5FC', '#D2DAEE', '#A6B2D6'], '#6A76A8'),
    'gem': (['#E6FFFA', '#5EE6D6', '#16A6A4', '#0B6A70'], '#063E44'),
    'mouth': (['#FF8C9A', '#C8485E', '#8A2440', '#5A1430'], '#3A0A1E'),
}

# 눈·볼 같은 직접 찍는 색
INK = '#22183A'        # 눈동자 테두리 (외곽선보다 조금 밝게)
EYE_BLUE = ('#1E3E9A', '#3E8EEA', '#9EE2FF')   # 진함, 중간, 밝음
EYE_TEAL = ('#0E5A66', '#20B0A6', '#8FF4DE')
BLUSH = '#FF9C9C'
WHITE = '#FFFFFF'
SPARK = '#FFF2A0'

# 빛 방향 (왼쪽 위 앞) — 정규화
_L = (-0.55, -0.68, 0.48)
_n = math.sqrt(sum(v * v for v in _L))
LIGHT = tuple(v / _n for v in _L)


# ── 모양 (칸 좌표 집합) ───────────────────────────────────────────
def ell(cx, cy, rx, ry):
    """타원. 칸의 중심이 (cx, cy) 기준 타원 안에 들면 포함"""
    out = set()
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1.0:
                out.add((x, y))
    return out


def poly(pts):
    """다각형 (Pillow로 안티에일리어싱 없이 채움)"""
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    ox, oy = int(min(xs)) - 2, int(min(ys)) - 2
    w, h = int(max(xs)) - ox + 4, int(max(ys)) - oy + 4
    img = Image.new('L', (w, h), 0)
    ImageDraw.Draw(img).polygon([(x - ox, y - oy) for x, y in pts], fill=255)
    px = img.load()
    return {(x + ox, y + oy) for y in range(h) for x in range(w) if px[x, y]}


def rect(x, y, w, h):
    return {(i, j) for j in range(y, y + h) for i in range(x, x + w)}


def capsule(x0, y0, x1, y1, r):
    """두께 있는 선 (끝이 둥근 막대). 칸 중심과 선분 거리 ≤ r"""
    out = set()
    dx, dy = x1 - x0, y1 - y0
    ll = dx * dx + dy * dy or 1
    for y in range(int(min(y0, y1) - r) - 1, int(max(y0, y1) + r) + 2):
        for x in range(int(min(x0, x1) - r) - 1, int(max(x0, x1) + r) + 2):
            px, py = x + 0.5, y + 0.5
            t = max(0, min(1, ((px - x0) * dx + (py - y0) * dy) / ll))
            if (px - x0 - t * dx) ** 2 + (py - y0 - t * dy) ** 2 <= r * r:
                out.add((x, y))
    return out


def puffs(circles):
    """동그라미 여러 개를 합친 몽실몽실 덩어리 (머리카락·수염·구름)"""
    out = set()
    for c in circles:
        out |= ell(*c) if len(c) == 4 else ell(c[0], c[1], c[2], c[2])
    return out


def mirror(mask, cx):
    """세로축 x=cx(칸 경계 기준)로 뒤집기"""
    return {(int(2 * cx - x - 1), y) for x, y in mask}


# ── 명암 함수 ─────────────────────────────────────────────────────
def _quant(d, th):
    for i, t in enumerate(th):
        if d > t:
            return i
    return len(th)


def sphere(cx=None, cy=None, rx=None, ry=None, th=(0.78, 0.32, -0.25), bias=0.0):
    """둥근 덩어리 명암. 중심/반지름을 안 주면 모양의 테두리 상자로 정한다"""
    def make(mask):
        xs = [p[0] for p in mask]
        ys = [p[1] for p in mask]
        _cx = cx if cx is not None else (min(xs) + max(xs) + 1) / 2
        _cy = cy if cy is not None else (min(ys) + max(ys) + 1) / 2
        _rx = rx if rx is not None else (max(xs) - min(xs) + 1) / 2 + 0.5
        _ry = ry if ry is not None else (max(ys) - min(ys) + 1) / 2 + 0.5

        def f(x, y):
            nx = (x + 0.5 - _cx) / _rx
            ny = (y + 0.5 - _cy) / _ry
            nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
            d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + bias
            return _quant(d, th)
        return f
    return make


def flat(t):
    return lambda mask: (lambda x, y: t)


def vband(y0, y1, tones):
    """위→아래로 단계가 바뀌는 띠 (치마·망토 같은 천)"""
    def make(mask):
        def f(x, y):
            k = (y - y0) / max(1, (y1 - y0))
            return tones[max(0, min(len(tones) - 1, int(k * len(tones))))]
        return f
    return make


# ── 그림판 ────────────────────────────────────────────────────────
class Art:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.part = {}     # (x,y) -> 부위 번호
        self.tone = {}     # (x,y) -> 명암 단계
        self.parts = []    # 부위 정보 (재질, 안쪽선, 묶음)
        self.over = {}     # 마지막에 직접 찍는 점

    def fill(self, mask, mat, shade=None, edge=True, group=None, under=False, dirs=None):
        """mask 칸을 재질 mat으로 칠한다. 나중에 칠한 부위가 앞. under=True면 빈 칸에만"""
        mask = {(x, y) for x, y in mask if 0 <= x < self.w and 0 <= y < self.h}
        if not mask:
            return mask
        f = (shade or sphere())(mask)
        idx = len(self.parts)
        self.parts.append({'mat': mat, 'edge': edge, 'group': group if group is not None else idx, 'dirs': dirs})
        for p in mask:
            if under and p in self.part:
                continue
            self.part[p] = idx
            self.tone[p] = f(*p)
        return mask

    def puffs(self, circles, mat, center, size, edge=2, th=(0.72, 0.38, 0.02), mass=0.45):
        """몽실몽실 덩어리를 동그라미마다 따로 명암 → 털·구름의 한 뭉치 한 뭉치가 보인다.
        center/size = 덩어리 전체의 중심·반지름 (아래·오른쪽 뭉치일수록 어둡게)"""
        out = set()
        # 아래 뭉치부터 칠해서 위 뭉치가 겹쳐 덮게 → 뭉치 아랫면에 컬 선이 생긴다
        for c in sorted(circles, key=lambda c: -c[1]):
            cx, cy = c[0], c[1]
            rx, ry = (c[2], c[3]) if len(c) == 4 else (c[2], c[2])
            nx = (cx - center[0]) / size[0]
            ny = (cy - center[1]) / size[1]
            bias = (nx * LIGHT[0] + ny * LIGHT[1]) * mass
            m = ell(cx, cy, rx, ry)
            out |= self.fill(m, mat, sphere(cx=cx, cy=cy - ry * 0.15, rx=rx + 0.6, ry=ry + 0.6, th=th, bias=bias),
                             edge=edge, dirs=((0, 1), (1, 1), (-1, 1)))
        return out

    def shade(self, mask, d=1, only=None):
        """이미 칠한 칸의 명암을 d단계 어둡게(음수면 밝게). only = 재질 이름 목록"""
        for p in mask:
            if p in self.part:
                if only and self.parts[self.part[p]]['mat'] not in only:
                    continue
                self.tone[p] = max(0, min(3, self.tone[p] + d))

    def erase(self, mask):
        for p in mask:
            self.part.pop(p, None)
            self.tone.pop(p, None)
            self.over.pop(p, None)

    def dot(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.over[(x, y)] = c

    def dots(self, x, y, rows, pal):
        """문자열 그림을 직접 찍기 ('.'은 건너뜀)"""
        for j, line in enumerate(rows):
            for i, ch in enumerate(line):
                if ch != '.' and ch in pal:
                    self.dot(x + i, y + j, pal[ch])

    def line_of(self, mat):
        return RAMPS[mat][1]

    def color(self, mat, t):
        return RAMPS[mat][0][max(0, min(3, t))]

    def render(self, outline=True):
        s = Sprite(self.w, self.h)
        for (x, y), i in self.part.items():
            pi = self.parts[i]
            c = self.color(pi['mat'], self.tone[(x, y)])
            if pi['edge']:
                # 뒤에 있는 다른 부위와 맞닿은 가장자리 → 진한 선
                for dx, dy in pi['dirs'] or ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    j = self.part.get(q)
                    if j is not None and j < i and self.parts[j]['group'] != pi['group']:
                        e = pi['edge']
                        c = self.line_of(pi['mat']) if e is True else self.color(pi['mat'], e)
                        break
            s.px(x, y, c)
        for (x, y), c in self.over.items():
            s.px(x, y, c)
        if outline:
            s.outline(OUTLINE)
        return s


# ── 공용 얼굴 부품 ────────────────────────────────────────────────
def eye(a, x, y, colors=EYE_BLUE, tall=4):
    """큰 치비 눈 (가로 3 × 세로 tall). 위 왼쪽에 흰 반짝임, 아래쪽은 밝은 홍채"""
    dk, md, lt = colors
    pal = {'K': INK, 'D': dk, 'M': md, 'L': lt, 'W': WHITE}
    rows = ['KKK', 'WDK', 'DMD', 'MLM'] if tall == 4 else ['KKK', 'WDK', 'DMD', 'MML', 'KLK']
    if tall == 3:
        rows = ['KKK', 'WDK', 'MLM']
    a.dots(x, y, rows, pal)


def laurel(a, cx, leaves, mat='gold'):
    """월계관: (x, y, 방향각) 자리마다 작은 아몬드 잎. cx 기준으로 좌우 대칭"""
    lt, md, dk = RAMPS[mat][0][0], RAMPS[mat][0][1], RAMPS[mat][0][2]
    ln = RAMPS[mat][1]
    for x, y, ang in leaves:
        for side in (0, 1):
            ax = ang if side == 0 else 180 - ang
            lx = x if side == 0 else 2 * cx - x
            r = math.radians(ax)
            ux, uy = math.cos(r), math.sin(r)
            # 잎 몸통 (길이 4, 폭 1.4)
            m = capsule(lx, y, lx + ux * 3.2, y + uy * 3.2, 1.15)
            for p in m:
                # 왼쪽 위는 밝게, 오른쪽 아래는 어둡게
                q = [(p[0] + d[0], p[1] + d[1]) for d in ((1, 0), (0, 1))]
                a.dot(*p, dk if any(qq not in m for qq in q) else md)
            a.dot(int(lx + ux * 1.5), int(y + uy * 1.5), lt)
            # 잎 둘레에 선 (그림 안쪽이어도 잎이 또렷하게)
            for p in m:
                for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    qq = (p[0] + d[0], p[1] + d[1])
                    if qq not in m and qq not in a.over:
                        a.dot(*qq, ln)
    return a


def sparkle(a, x, y, big=False):
    """네 갈래 반짝이"""
    a.dot(x, y, WHITE)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        a.dot(x + dx, y + dy, SPARK)
    if big:
        for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            a.dot(x + dx, y + dy, '#FFD84A')


# ══════════════════════════════════════════════════════════════════
# 제우스 (54×52). 번개 든 팔은 따로 (zeus_weapon), 어깨 축 (36, 32)
# ══════════════════════════════════════════════════════════════════
ZEUS_PIVOT = (36, 32)


def zeus_body():
    a = Art(54, 52)
    # 망토 (몸 뒤, 왼쪽으로 펄럭임). 아래 10칸은 구름에 가려진다
    cape = poly([(18, 29), (12, 32), (8, 37), (6, 43), (5, 48), (8, 47), (10, 49), (13, 47), (16, 49), (30, 46), (31, 30)])
    a.fill(cape, 'white', sphere(cx=14, cy=34, rx=12, ry=16, th=(0.7, 0.2, -0.3)))
    a.shade(capsule(9, 40, 7, 47, 0.6) | capsule(14, 38, 12, 47, 0.6), 1)

    # 뒷머리: 몽실몽실한 흰 머리 (얼굴 뒤로 크게)
    a.fill(ell(24.5, 17, 12, 12), 'hair', flat(3))
    a.puffs([(14, 28, 3.6), (35, 28, 3.6), (12.5, 22, 4.2), (36.5, 22, 4.2), (12, 15, 4.4), (37, 15, 4.4),
             (16, 9, 5), (33, 9, 5), (24.5, 6, 6)], 'hair', center=(24, 14), size=(14, 14), mass=0.5)

    # 다리 + 샌들 (대부분 구름에 가려짐)
    for lx in (19, 27):
        a.fill(rect(lx, 43, 4, 5), 'skin', flat(1))
        a.fill(rect(lx - 1, 48, 6, 3), 'leather', sphere(th=(0.6, 0.0, -0.6)))
        a.shade({(lx + 3, y) for y in range(43, 48)}, 1)

    # 토가 치마: 아래로 퍼지고 금색 단
    skirt = poly([(16, 37), (33, 37), (35, 45), (31, 46), (25, 45), (19, 46), (14, 45)])
    a.fill(skirt, 'white', sphere(cx=22, cy=37, rx=14, ry=10, th=(0.75, 0.25, -0.4)))
    a.fill(rect(14, 44, 22, 1) - {(14, 44)}, 'gold', flat(1), edge=False)
    a.shade({(20, 41), (20, 42), (25, 41), (25, 42), (30, 41), (30, 42)}, 1)

    # 상체: 오른쪽 가슴은 맨살, 왼쪽 어깨에서 내려오는 토가
    torso = poly([(17, 29), (25, 28), (34, 29), (37, 32), (35, 36), (33, 38), (16, 38), (15, 33)])
    a.fill(torso, 'skin', sphere(cx=24, cy=30, rx=14, ry=10))
    toga = poly([(16, 29), (20, 28), (34, 37), (34, 39), (15, 39), (15, 33)])
    a.fill(toga, 'white', sphere(cx=20, cy=31, rx=12, ry=10))
    a.fill(capsule(20, 29, 33, 37, 0.6), 'gold', flat(1), edge=False)
    # 금 허리띠 + 둥근 버클
    a.fill(rect(15, 37, 20, 2), 'gold', vband(37, 39, (1, 2)), edge=False)
    a.fill(ell(25, 38, 2.6, 2.2), 'gold', sphere(th=(0.6, 0.1, -0.5)), edge=3)
    a.dot(24, 37, WHITE)

    # 반대쪽 팔: 허리에 주먹, 금 팔찌, 금 어깨장식
    arm = capsule(15, 31, 12, 36, 2.1)
    a.fill(arm, 'skin', sphere(cx=13, cy=31, rx=5, ry=7))
    a.fill(rect(10, 33, 5, 2), 'gold', lambda m: (lambda x, y: 0 if (x, y) == (10, 33) else (1 if y == 33 else 2)), edge=False)
    a.fill(ell(13.5, 37.5, 2.6, 2.3), 'skin', sphere(cx=12.5, cy=36.5, rx=3.5, ry=3.5, th=(0.6, 0.15, -0.4)), edge=3)
    a.dots(14, 37, ['k', 'k'], {'k': '#C07060'})
    a.fill(ell(16, 30, 3.5, 2.6), 'gold', sphere(th=(0.6, 0.15, -0.4)))
    a.dot(15, 29, WHITE)

    # 얼굴
    face = ell(25, 19.5, 10.5, 9.5)
    a.fill(face, 'skin', sphere(cx=24, cy=18, rx=12, ry=11, th=(0.85, 0.25, -0.35)))
    # 앞머리: 이마 위 몽실몽실
    bang = a.puffs([(16.5, 13, 3.4), (33.5, 13, 3.4), (20.5, 11, 4), (29.5, 11, 4), (25, 10, 4.2)],
                   'hair', center=(25, 10), size=(10, 5), mass=0.4)
    # 이마 그림자
    a.shade({(x, y) for x, y in face if y == 15 and (x, y) not in bang}, 1, only=('skin',))
    # 옆머리 (볼 옆)
    a.fill(puffs([(13.5, 21, 2.3, 4)]), 'hair', sphere(cx=13, cy=17, rx=4, ry=7))
    a.fill(puffs([(36.3, 21, 2, 4)]), 'hair', sphere(cx=35, cy=17, rx=4, ry=7))

    # 월계관: 양쪽 관자놀이에서 위로 뻗은 금 잎
    laurel(a, 25, [(13.5, 17, 215), (13, 11.5, 250), (16.5, 6.5, 290)])
    # 굵은 흰 눈썹 (가운데로 내려감 → 화난 듯 귀엽게)
    br = {'w': '#FFFFFF', 's': '#C6CEE4', 'k': '#5C6694'}
    a.dots(17, 15, ['kkk...', 'kwwkk.', '.ssww k'.replace(' ', ''), '...kkk'], br)
    a.dots(28, 15, ['...kkk', '.kkwwk', 'kwwss.', 'kkk...'], br)
    # 눈
    eye(a, 20, 19, EYE_BLUE)
    eye(a, 29, 19, EYE_BLUE)
    # 볼터치
    for x in (17, 18, 33, 34):
        a.dot(x, 23, BLUSH)

    # 큰 수염: 볼에서 가슴까지, 아래가 몽실몽실
    a.fill(ell(25, 27, 8, 5) - rect(0, 0, 54, 24), 'hair', flat(1))
    a.puffs([(15.5, 25, 2.8), (34.5, 25, 2.8), (16.5, 29, 3.2), (33.5, 29, 3.2), (20, 32.5, 3.3),
             (30, 32.5, 3.3), (25, 34, 3.6)], 'hair', center=(25, 26), size=(10, 8), mass=0.45)
    # 입
    a.dots(24, 27, ['kmk'], {'k': '#5A1430', 'm': '#C8485E'})
    # 콧수염: 양쪽으로 말린 두 덩어리
    mus = puffs([(21.5, 25.5, 3, 1.8), (28.5, 25.5, 3, 1.8)])
    a.fill(mus, 'white', sphere(cx=24, cy=24, rx=8, ry=3, th=(0.6, 0.1, -0.5)))
    # 코
    a.fill({(24, 23), (25, 23), (24, 24), (25, 24)}, 'skin', flat(1))
    a.dot(25, 24, '#F4B08E')
    return a


def zeus_weapon():
    a = Art(54, 52)
    px, py = ZEUS_PIVOT
    # 번개 (팔 뒤): 지그재그. 왼쪽 면은 밝게, 오른쪽 면은 어둡게 + 가운데 흰 심
    bolt = poly([(44, 1), (51, 1), (46.5, 9), (50.5, 9), (40.5, 32), (43, 17), (39.5, 17)])
    a.fill(bolt, 'bolt', lambda m: (lambda x, y: 1), edge=3)
    for x, y in bolt:
        if (x + 1, y) not in bolt or (x + 1, y - 1) not in bolt:
            a.shade({(x, y)}, 1)
    a.shade(capsule(45.5, 2.5, 44, 6, 0.5) | capsule(48.5, 9.5, 47, 13, 0.5), -1)
    # 위팔 (어깨 → 팔꿈치) + 아래팔 (팔꿈치 → 주먹, 위로 꺾임)
    upper = capsule(px + 0.5, py + 0.5, 40.5, 34.5, 2.2)
    a.fill(upper, 'skin', sphere(cx=38, cy=31.5, rx=5, ry=5))
    fore = capsule(40.5, 34, 42, 26, 2.1)
    a.fill(fore, 'skin', sphere(cx=40, cy=28, rx=4.5, ry=8), edge=3)
    # 금 팔찌
    a.fill(rect(39, 28, 5, 2), 'gold', vband(28, 30, (1, 2)), edge=False)
    a.dot(39, 28, '#FFF7B0')
    # 주먹 (번개를 꽉 쥠) + 손가락 마디
    fist = ell(42.5, 24, 3.2, 2.8)
    a.fill(fist, 'skin', sphere(cx=42, cy=23, rx=4, ry=4, th=(0.6, 0.15, -0.35)), edge=3)
    a.dots(43, 23, ['k', '.', 'k'], {'k': '#C07060'})
    a.dot(41, 22, '#FFF4E8')
    # 둥근 맨 어깨 (돌아도 모양이 같아서 관절이 티 나지 않는다)
    a.fill(ell(px + 0.5, py + 0.5, 3.2, 3.2), 'skin', sphere(cx=px, cy=py - 0.5, rx=4, ry=4, th=(0.7, 0.2, -0.3)), edge=3)
    sparkle(a, 52, 16)
    sparkle(a, 39, 6)
    return a


# ── 공용: 칼날·갈색 머리 ──────────────────────────────────────────
def blade(a, x0, y0, x1, y1, w=1.3, mat='steel'):
    """곧은 칼날. 중심선 위쪽(빛 쪽) 절반은 밝게, 아래쪽 절반은 어둡게 → 날이 각져 보인다"""
    m = capsule(x0, y0, x1, y1, w)
    dx, dy = x1 - x0, y1 - y0
    ln = math.hypot(dx, dy)

    def f(mask):
        def g(x, y):
            # 중심선에서 어느 쪽인지 (외적 부호)
            s = ((x + 0.5 - x0) * dy - (y + 0.5 - y0) * dx) / ln
            return 0 if s > 0.35 else (1 if s > -0.35 else 2)
        return g
    a.fill(m, mat, f, edge=3)
    # 끝을 뾰족하게: 끝 칸 하나 남기고 정리
    return m


def brown_hair(a, cx, cy, rx, ry, bang_y, sides, spikes, mat='brown'):
    """갈색 치비 머리: 둥근 지붕 + 이마 위 뾰족 앞머리 + 옆머리.
    bang_y = 앞머리 끝 높이, spikes = 앞머리 끝 x 목록(이 x에서 아래로 2칸 뾰족)"""
    dome = ell(cx, cy, rx, ry)
    hair = set()
    for x, y in dome:
        if y < bang_y:
            hair.add((x, y))
        elif (x < cx - rx + sides or x > cx + rx - sides - 1) and y < bang_y + 6:
            hair.add((x, y))
    for sx in spikes:
        for k in range(3):
            for xx in range(sx - (2 - k) // 2, sx + (2 - k) // 2 + 1):
                if (xx, bang_y - 1) in dome:
                    hair.add((xx, bang_y + k))
    a.fill(hair, mat, sphere(cx=cx - 2, cy=cy - ry * 0.6, rx=rx + 2, ry=ry, th=(0.8, 0.35, -0.15)), edge=3)
    return hair


# ══════════════════════════════════════════════════════════════════
# 아기 신 (48×48): 후광, 작은 흰 날개, 흰 토가, 금 허리띠
# ══════════════════════════════════════════════════════════════════
def baby():
    a = Art(48, 48)
    # 날개 (몸 뒤, 양쪽): 깃털 3겹
    wing = poly([(17, 30), (14, 26), (10, 23.5), (6, 23), (4, 25), (6, 26.5), (3.5, 28), (6, 30), (4.5, 32),
                 (8, 33.5), (7, 35), (11, 35.5), (15, 34.5), (17, 33)])
    for m in (wing, mirror(wing, 24)):
        a.fill(m, 'white', sphere(cx=10, cy=24, rx=10, ry=10, th=(0.6, 0.15, -0.35)), edge=3)
    # 깃털 겹 (아래 깃털 경계를 한 단계 어둡게)
    feather = capsule(6.5, 26.5, 14, 27.5, 0.4) | capsule(6.5, 30, 14, 30.5, 0.4) | capsule(8.5, 33.5, 14, 33.5, 0.4)
    a.shade(feather, 1)
    a.shade(mirror(feather, 24), 1)
    # 다리 + 금 샌들
    for lx in (20, 25):
        a.fill(rect(lx, 39, 3, 4), 'skin', flat(1))
        a.shade({(lx + 2, y) for y in range(39, 43)}, 1)
        a.fill(rect(lx - 1, 43, 5, 3) - {(lx - 1, 43), (lx + 3, 43)}, 'gold', sphere(th=(0.6, 0.1, -0.5)))
    # 팔 (양옆으로 내려옴)
    for side in (0, 1):
        arm = capsule(16, 29.5, 14, 35.5, 2)
        if side:
            arm = mirror(arm, 24)
        a.fill(arm, 'skin', sphere(cx=14 if not side else 34, cy=29, rx=4, ry=7))
    # 토가 (동그란 몸통)
    toga = poly([(17, 28), (24, 26.5), (31, 28), (33, 39), (29, 40), (24, 39.5), (19, 40), (15, 39)])
    a.fill(toga, 'white', sphere(cx=22, cy=29, rx=12, ry=12, th=(0.75, 0.25, -0.25)))
    a.shade(capsule(18, 29, 29, 33, 0.5) - rect(0, 33, 48, 10), 1)
    a.shade({(20, 38), (20, 39), (28, 38), (28, 39), (24, 39)}, 1)
    # 금 허리띠 + 하늘색 보석
    a.fill(poly([(15, 33), (33, 33), (33.5, 35), (14.5, 35)]), 'gold', vband(33, 35, (1, 2)), edge=False)
    a.fill(ell(24, 35, 1.6, 1.6), 'gem', sphere(th=(0.4, 0.0, -0.5)), edge=3)
    a.dot(23, 34, WHITE)
    # 머리 (크게)
    a.fill(ell(24, 20, 13, 11.2), 'skin', sphere(cx=22, cy=17, rx=15, ry=13, th=(0.85, 0.25, -0.45)))
    hair = brown_hair(a, 24, 17, 13.4, 10.6, 15, 2, [14, 18, 23, 28, 33])
    # 정수리 곱슬
    a.fill({(24, 5), (25, 5), (26, 6), (26, 7), (23, 6), (25, 4)}, 'brown', flat(1), edge=False)
    # 이마 그림자
    a.shade({(x, y + 1) for x, y in hair if (x, y + 1) not in hair}, 1, only=('skin',))
    # 얼굴
    eye(a, 17, 20, EYE_BLUE, tall=5)
    eye(a, 27, 20, EYE_BLUE, tall=5)
    for x in (15, 16, 32, 33):
        a.dot(x, 25, BLUSH)
    a.dots(22, 26, ['k..k', '.mm.'], {'k': INK, 'm': '#C8485E'})
    # 금빛 후광 (머리 위에 떠 있음)
    halo = ell(24, 3.5, 9, 2.6) - ell(24, 3.5, 6.6, 1.2)
    a.fill(halo, 'gold', sphere(cx=21, cy=2, rx=10, ry=4, th=(0.55, 0.1, -0.4)), edge=False)
    a.dot(18, 2, WHITE)
    a.dot(19, 2, '#FFF7B0')
    return a


# ══════════════════════════════════════════════════════════════════
# 소년 신 (60×48): 월계관, 흰 튜닉, 파란 띠, 오른쪽 위로 치켜든 검
# ══════════════════════════════════════════════════════════════════
def teen():
    a = Art(60, 48)
    # 다리 + 금 샌들
    for lx in (15, 21):
        a.fill(rect(lx, 40, 4, 4), 'skin', flat(1))
        a.shade({(lx + 3, y) for y in range(40, 44)}, 1)
        a.fill(rect(lx - 1, 44, 6, 2) | rect(lx, 43, 4, 1), 'gold', sphere(th=(0.6, 0.1, -0.5)))
    # 왼팔 (내려놓음)
    a.fill(capsule(12.5, 29, 10, 36, 2), 'skin', sphere(cx=10, cy=29, rx=5, ry=8))
    a.fill(ell(9.5, 37, 2.2, 2), 'skin', sphere(th=(0.6, 0.15, -0.4)))
    # 튜닉 치마 (주름)
    skirt = poly([(11, 35), (30, 35), (32, 42), (26, 43), (20, 42), (14, 43), (9, 42)])
    a.fill(skirt, 'white', sphere(cx=17, cy=34, rx=15, ry=10, th=(0.7, 0.2, -0.4)))
    a.shade({(x, y) for x in (14, 20, 26) for y in (39, 40, 41)}, 1)
    # 튜닉 윗옷
    a.fill(poly([(12, 28), (20, 26), (28, 28), (30, 36), (11, 36)]), 'white', sphere(cx=17, cy=27, rx=13, ry=11))
    # 파란 띠 (왼쪽 어깨 → 오른쪽 허리)
    a.fill(capsule(13, 28, 29, 35.5, 1.4), 'blue', sphere(cx=18, cy=28, rx=14, ry=10, th=(0.6, 0.15, -0.4)), edge=3)
    # 금 허리띠 + 보석
    a.fill(rect(10, 35, 21, 2), 'gold', vband(35, 37, (1, 2)), edge=False)
    a.fill(ell(20.5, 36, 1.6, 1.6), 'gem', sphere(th=(0.4, 0.0, -0.5)), edge=3)
    a.dot(20, 35, WHITE)
    # 오른팔 (앞으로 뻗어 검을 쥠)
    a.fill(capsule(28, 29.5, 34, 30, 2), 'skin', sphere(cx=30, cy=28, rx=6, ry=4))
    # 검: 손잡이 → 코등이 → 날
    a.fill(capsule(32.5, 33, 36, 29, 0.9), 'leather', flat(2), edge=False)
    a.fill(ell(32, 33.5, 1.5, 1.5), 'gold', sphere(th=(0.4, 0.0, -0.5)), edge=3)
    blade(a, 38, 26, 56.5, 4.5, 1.25)
    a.dots(56, 3, ['.w', 'w.'], {'w': '#DCE4F0'})
    a.fill(capsule(34.5, 25, 40, 30, 1.1), 'gold', sphere(cx=35, cy=25, rx=6, ry=6, th=(0.5, 0.0, -0.5)), edge=3)
    # 주먹
    a.fill(ell(35, 30.5, 2.6, 2.4), 'skin', sphere(cx=34, cy=29, rx=3.5, ry=3.5, th=(0.6, 0.15, -0.4)), edge=3)
    a.dot(36, 30, '#C07060')
    # 목 + 머리
    a.fill(rect(18, 25, 5, 3), 'skin', flat(2))
    a.fill(ell(20.5, 16.5, 12.5, 11), 'skin', sphere(cx=19, cy=14, rx=14, ry=13, th=(0.85, 0.25, -0.45)))
    hair = brown_hair(a, 20.5, 14, 13.2, 10.5, 13, 2, [11, 15, 20, 25, 29])
    a.shade({(x, y + 1) for x, y in hair if (x, y + 1) not in hair}, 1, only=('skin',))
    # 월계관 (초록 잎)
    laurel(a, 20.5, [(9, 14, 225), (9.5, 9.5, 260), (13, 6, 295)], mat='leaf')
    # 얼굴: 자신감 있는 눈썹과 미소
    a.dots(14, 16, ['kkk'], {'k': '#5A3418'})
    a.dots(23, 16, ['kkk'], {'k': '#5A3418'})
    eye(a, 15, 17, EYE_BLUE, tall=4)
    eye(a, 24, 17, EYE_BLUE, tall=4)
    for x in (12, 13, 28, 29):
        a.dot(x, 22, BLUSH)
    a.dots(19, 23, ['k...k', '.kmk.'], {'k': INK, 'm': '#C8485E'})
    return a


# ══════════════════════════════════════════════════════════════════
# 성인 신 (72×52): 청동 투구·가슴갑옷, 붉은 망토, 둥근 방패, 긴 검
# ══════════════════════════════════════════════════════════════════
def adult():
    a = Art(72, 52)
    # 붉은 망토 (몸 뒤, 오른쪽으로 펄럭임)
    cape = poly([(20, 26), (43, 27), (46, 34), (48, 45), (45, 44), (42, 46), (39, 44), (36, 46), (32, 45), (30, 30)])
    a.fill(cape, 'red', sphere(cx=36, cy=27, rx=14, ry=20, th=(0.75, 0.25, -0.3)))
    a.shade(capsule(41, 31, 44, 43, 0.5) | capsule(38, 33, 39, 43, 0.5), 1)
    # 다리 + 청동 정강이받이
    for lx in (19, 31):
        a.fill(rect(lx, 41, 4, 4), 'skin', flat(1))
        a.shade({(lx + 3, y) for y in range(41, 45)}, 1)
        a.fill(poly([(lx - 1, 50), (lx - 0.5, 45), (lx + 2, 44), (lx + 4.5, 45), (lx + 5, 50)]), 'bronze',
               sphere(th=(0.6, 0.15, -0.4)))
    # 가죽 치마 (줄무늬)
    a.fill(poly([(17, 36), (37, 36), (38.5, 42.5), (27, 43.5), (16, 42.5)]), 'leather', sphere(th=(0.7, 0.2, -0.4)))
    for x in (20, 23, 27, 31, 34):
        a.shade({(x, y) for y in range(39, 43)}, 2, only=('leather',))
    # 가슴갑옷 (근육 모양)
    chest = poly([(17, 27), (27, 24), (37, 27), (38, 37), (16, 37)])
    a.fill(chest, 'bronze', sphere(cx=24, cy=26, rx=14, ry=13, th=(0.75, 0.25, -0.25)))
    a.shade(capsule(20, 30, 26, 31, 0.4) | capsule(28, 31, 34, 30, 0.4) | capsule(27, 32, 27, 35, 0.4), 1)
    a.shade({(21, 29), (22, 29)}, -1)
    a.fill(rect(16, 36, 23, 2), 'gold', vband(36, 38, (1, 2)), edge=False)
    a.fill(ell(27.5, 37, 1.6, 1.6), 'red', sphere(th=(0.4, 0.0, -0.5)), edge=3)
    # 오른팔 (검 쥔 손)
    a.fill(capsule(36, 28, 41, 32, 2.2), 'skin', sphere(cx=38, cy=27, rx=5, ry=6))
    # 긴 검
    a.fill(capsule(38.5, 38.5, 43.5, 33, 0.9), 'leather', flat(2), edge=False)
    a.fill(ell(38, 39, 1.6, 1.6), 'gold', sphere(th=(0.4, 0.0, -0.5)), edge=3)
    blade(a, 44.5, 30, 68.5, 4, 1.4)
    a.dots(68, 2, ['.w', 'w.'], {'w': '#DCE4F0'})
    a.fill(capsule(40.5, 27.5, 47.5, 34, 1.1), 'gold', sphere(cx=41, cy=27, rx=7, ry=7, th=(0.5, 0.0, -0.5)), edge=3)
    a.fill(ell(41.5, 34, 2.8, 2.6), 'skin', sphere(cx=40, cy=33, rx=3.5, ry=3.5, th=(0.6, 0.15, -0.4)), edge=3)
    a.dot(43, 33, '#C07060')
    # 둥근 방패 (앞쪽 왼편): 청동 테 + 붉은 안쪽 + 금 별
    a.fill(ell(10.5, 34.5, 9.2, 9.2), 'bronze', sphere(th=(0.7, 0.2, -0.35)))
    a.fill(ell(10.5, 34.5, 6.2, 6.2), 'red', sphere(cx=10.5, cy=34.5, rx=7, ry=7, th=(0.75, 0.25, -0.3)), edge=3)
    star = {'g': '#FFD84A', 'h': '#FFF7B0', 'd': '#E39B22'}
    a.dots(7, 31, ['...h...', '...g...', 'hggggdd', '.hgggd.', '.gg.dd.', '.g...d.'], star)
    a.dot(5, 29, WHITE)
    a.dot(4, 30, '#FFE9A0')
    # 머리
    a.fill(ell(25.5, 19, 11.6, 10.4), 'skin', sphere(cx=24, cy=17, rx=13, ry=12, th=(0.85, 0.25, -0.45)))
    # 투구: 붉은 볏 → 둥근 몸체(볼 가리개) → 금 테
    plume = puffs([(18, 9, 4, 3.4), (25, 6, 6, 4.6), (33, 7.5, 5.2, 3.8), (38, 10, 3.4, 3)])
    a.fill(plume, 'red', sphere(cx=24, cy=4, rx=16, ry=8, th=(0.6, 0.15, -0.35)))
    a.shade(capsule(21, 6, 30, 3.5, 0.4) | capsule(30, 5.5, 37, 7, 0.4), -1, only=('red',))
    helm = poly([(13.5, 26), (12.5, 18), (14.5, 11), (20, 7), (26, 6), (32, 7), (37, 11), (39, 18), (38, 26),
                 (35, 26), (35, 20), (33.5, 17), (25.5, 15), (17.5, 17), (16, 20), (16.5, 26)])
    a.fill(helm, 'bronze', sphere(cx=24, cy=10, rx=16, ry=16, th=(0.72, 0.28, -0.25)))
    a.fill(poly([(16.5, 17), (25.5, 14), (34.5, 17), (34.5, 19), (25.5, 16.4), (16.5, 19)]), 'gold',
           vband(14, 19, (0, 1, 1, 2)), edge=3)
    a.dot(19, 10, WHITE)
    a.dot(20, 9, '#FFE9A0')
    # 얼굴: 용맹한 눈썹
    a.dots(19, 19, ['kk..', '.kkk'], {'k': INK})
    a.dots(28, 19, ['..kk', 'kkk.'], {'k': INK})
    eye(a, 20, 21, EYE_BLUE, tall=3)
    eye(a, 28, 21, EYE_BLUE, tall=3)
    for x in (18, 19, 32, 33):
        a.dot(x, 25, BLUSH)
    a.dots(24, 26, ['k..k', '.kk.'], {'k': INK})
    return a


# ══════════════════════════════════════════════════════════════════
# 포세이돈 (52×52). 삼지창 든 아래팔은 따로 (poseidon_weapon), 팔꿈치 축 (38, 37)
# ══════════════════════════════════════════════════════════════════
POS_PIVOT = (38, 37)


def poseidon_body():
    a = Art(52, 52)
    # 망토 (청록, 몸 뒤 왼쪽으로)
    cape = poly([(18, 30), (12, 33), (8, 39), (5, 47), (8, 46), (10, 48), (14, 47), (19, 48), (34, 48), (38, 48), (37, 36), (33, 30)])
    a.fill(cape, 'teal', sphere(cx=14, cy=32, rx=14, ry=18, th=(0.7, 0.25, -0.3)))
    a.shade(capsule(12, 37, 9, 46, 0.5) | capsule(16, 37, 14, 46, 0.5), 1)
    # 뒷머리: 흰 머리, 끝은 청록으로 물들어 뒤로 흩날림
    a.fill(ell(25, 18, 14, 12), 'hair', flat(3))
    a.puffs([(10, 29, 3.4), (7, 23, 3.6), (8, 16, 4), (11, 10.5, 4), (17, 8, 4.2), (25, 7.5, 4.4),
             (33, 8, 4.2), (39, 10.5, 4), (41.5, 17, 3.8), (41, 24, 3.2)], 'hair', center=(25, 15), size=(16, 14), mass=0.45)
    # 청록 머리끝 컬
    a.fill(puffs([(6, 32, 3, 2.4), (4, 27.5, 2.4, 2.6)]), 'teal', sphere(cx=5, cy=28, rx=5, ry=6, th=(0.6, 0.15, -0.35)), edge=2)
    a.fill(puffs([(42.5, 28, 2.2, 2.4)]), 'teal', sphere(th=(0.6, 0.15, -0.35)), edge=2)
    a.shade({(x, y) for x, y in ell(25, 17, 20, 20) if y >= 22}, 1, only=('hair',))
    # 다리 + 금 샌들 (상어에 거의 가려짐)
    for lx in (19, 27):
        a.fill(rect(lx, 45, 4, 4), 'skin', flat(1))
        a.fill(rect(lx - 1, 49, 6, 2), 'gold', vband(49, 51, (1, 2)))
    # 토가 치마 (청록 단)
    a.fill(poly([(16, 40), (36, 40), (37, 47), (31, 48), (25, 47), (19, 48), (14, 47)]), 'white',
           sphere(cx=22, cy=39, rx=15, ry=9, th=(0.7, 0.2, -0.4)))
    a.fill(rect(14, 46, 23, 1) - {(14, 46)}, 'teal', flat(1), edge=False)
    # 몸통 (흰 토가) + 청록 띠
    a.fill(poly([(18, 30), (25.5, 28.5), (33, 30), (35.5, 41), (15.5, 41)]), 'white', sphere(cx=21, cy=29, rx=14, ry=12))
    a.fill(capsule(19, 30.5, 34.5, 39.5, 1.4), 'teal', sphere(cx=22, cy=29, rx=14, ry=12, th=(0.6, 0.15, -0.35)), edge=3)
    # 금 허리띠 + 조개 버클
    a.fill(rect(15, 39, 21, 2), 'gold', vband(39, 41, (1, 2)), edge=False)
    shell = {'g': '#FFD84A', 'h': '#FFF7B0', 'd': '#E39B22', 'k': '#6E3A08'}
    a.dots(23, 38, ['.kkk.', 'khgdk', 'kgdgk', '.kdk.'], shell)
    # 화면 오른쪽 위팔 (어깨 → 팔꿈치). 아래팔은 무기 층
    a.fill(capsule(34, 31.5, 38.5, 37.5, 2.2), 'skin', sphere(cx=35, cy=31, rx=5, ry=7))
    # 화면 왼쪽 팔: 물방울 구슬을 받친 손 (상어에 가리지 않게 y 36 위로)
    a.fill(capsule(17, 31.5, 12.5, 34, 2), 'skin', sphere(cx=14, cy=30, rx=6, ry=5))
    a.fill(capsule(14, 33, 12, 34, 2.1), 'gold', vband(31, 36, (1, 1, 2, 2)), edge=3)
    # 금 어깨장식 (양쪽)
    for cx in (18, 34):
        a.fill(ell(cx, 30.5, 3.2, 2.4), 'gold', sphere(th=(0.6, 0.15, -0.4)), edge=3)
        a.dot(cx - 1, 29, WHITE)
    # 물방울 구슬
    orb = ell(8.5, 27.5, 5, 5)
    a.fill(orb, 'orb', sphere(cx=8, cy=26.5, rx=5.5, ry=5.5, th=(0.75, 0.3, -0.25)), edge=3)
    a.dots(5, 24, ['ww.', 'w..'], {'w': WHITE})
    a.dot(11, 30, WHITE)
    a.dots(5, 28, ['.lll.', 'l...l'], {'l': '#E0FCFF'})
    # 구슬을 받친 손
    a.fill(ell(9, 33, 3.6, 1.9), 'skin', sphere(cx=8, cy=32, rx=4, ry=3, th=(0.6, 0.15, -0.4)), edge=3)
    # 얼굴
    face = ell(25.5, 19.5, 11.6, 10.4)
    a.fill(face, 'skin', sphere(cx=24, cy=17, rx=13, ry=12, th=(0.85, 0.25, -0.45)))
    # 옆머리 (볼 옆으로 흘러내림)
    a.fill(poly([(14, 13), (12.5, 20), (14.5, 27), (16.5, 18)]), 'hair', sphere(cx=13, cy=16, rx=4, ry=8), edge=2)
    a.fill(poly([(37, 13), (38.5, 20), (36.5, 27), (34.5, 18)]), 'hair', sphere(cx=35, cy=16, rx=4, ry=8), edge=2)
    # 앞머리 (흰 물결)
    bang = a.puffs([(16.5, 13.5, 3.2), (21, 11.5, 3.6), (26.5, 11, 3.6), (31.5, 12, 3.4), (35, 14, 2.6)],
                   'hair', center=(25, 11), size=(10, 4), mass=0.4)
    a.shade({(x, y + 1) for x, y in bang if (x, y + 1) in face and (x, y + 1) not in bang}, 1, only=('skin',))
    # 금관: 뾰족한 다섯 뿔 + 가운데 청록 보석
    crown = poly([(14, 11), (13, 4), (17.5, 7.5), (19, 2), (22.5, 7), (25.5, 0), (28.5, 7), (32, 2), (33.5, 7.5),
                  (38, 4), (37, 11), (25.5, 9)])
    a.fill(crown, 'gold', sphere(cx=22, cy=3, rx=14, ry=10, th=(0.6, 0.15, -0.3)))
    a.fill(poly([(14, 9.5), (25.5, 7.5), (37, 9.5), (37, 11.5), (25.5, 10), (14, 11.5)]), 'gold', vband(8, 12, (1, 2, 2, 3)), edge=3)
    a.fill({(25, 4), (26, 4), (24, 5), (25, 5), (26, 5), (27, 5), (25, 6), (26, 6), (25, 7), (26, 7)}, 'gem', sphere(th=(0.4, 0.0, -0.5)), edge=3)
    a.dot(25, 5, WHITE)
    a.dot(19, 6, '#5EE6D6')
    a.dot(32, 6, '#5EE6D6')
    a.dot(24, 2, WHITE)
    # 결연한 눈썹 (회색, 가운데로 내려옴)
    br = {'k': '#565E9A', 's': '#8E9BAE'}
    a.dots(18, 16, ['kk...', '.sskk'], br)
    a.dots(28, 16, ['...kk', 'kkss.'], br)
    eye(a, 20, 18, EYE_TEAL, tall=4)
    eye(a, 29, 18, EYE_TEAL, tall=4)
    for x in (17, 18, 33, 34):
        a.dot(x, 23, BLUSH)
    # 풍성한 흰 수염 (물결)
    a.fill(ell(25.5, 26, 9, 4) - rect(0, 0, 52, 24), 'hair', flat(1))
    a.puffs([(16.5, 25.5, 2.6), (34.5, 25.5, 2.6), (17.5, 29.5, 3), (33.5, 29.5, 3), (21, 32.5, 3),
             (30, 32.5, 3), (25.5, 34, 3.2)], 'hair', center=(25, 26), size=(10, 8), mass=0.45)
    a.dots(24, 27, ['kmk'], {'k': '#5A1430', 'm': '#C8485E'})
    mus = puffs([(22, 25.5, 3, 1.7), (29, 25.5, 3, 1.7)])
    a.fill(mus, 'white', sphere(cx=24, cy=24, rx=8, ry=3, th=(0.6, 0.1, -0.5)))
    a.fill({(25, 23), (26, 23), (25, 24), (26, 24)}, 'skin', flat(1))
    a.dot(26, 24, '#F4B08E')
    return a


def poseidon_weapon():
    a = Art(52, 52)
    px, py = POS_PIVOT
    # 삼지창 자루 (청록) + 금 고리
    a.fill(rect(42, 16, 2, 33), 'teal', lambda m: (lambda x, y: 1 if x == 42 else 2), edge=False)
    a.fill(rect(41, 24, 4, 2), 'gold', vband(24, 26, (1, 2)), edge=3)
    a.fill(poly([(41, 47), (45, 47), (44.5, 50), (41.5, 50)]), 'gold', sphere(th=(0.5, 0.0, -0.5)), edge=3)
    # 삼지창 머리 (금, 세 갈래)
    head = (poly([(36.5, 11), (37, 4), (40, 9), (40, 12.5), (42, 13.5), (42, 6), (43, 0.5), (44, 6), (44, 13.5),
                  (46, 12.5), (46, 9), (49, 4), (49.5, 11), (47.5, 15), (44.5, 17), (41.5, 17), (38.5, 15)]))
    a.fill(head, 'gold', sphere(cx=41, cy=6, rx=10, ry=10, th=(0.55, 0.12, -0.35)))
    # 갈래 끝 화살촉
    tips = {'g': '#FFD84A', 'h': '#FFF7B0', 'd': '#E39B22'}
    a.dots(35, 3, ['..h', '.hg', 'hgg', '..g'], tips)
    a.dots(47, 3, ['g..', 'gd.', 'gdd', 'g..'], tips)
    a.dot(42, 1, '#FFF7B0')
    a.dot(43, 1, '#FFD84A')
    a.fill({(42, 13), (43, 13), (42, 14), (43, 14)}, 'gem', sphere(th=(0.4, 0.0, -0.5)), edge=False)
    a.dot(42, 13, WHITE)
    a.dot(38, 7, WHITE)
    a.dot(42, 4, WHITE)
    # 아래팔 (팔꿈치 → 주먹) + 금 팔찌
    a.fill(capsule(px + 0.5, py + 0.5, 41.5, 35.5, 2.1), 'skin', sphere(cx=39, cy=34, rx=5, ry=4))
    a.fill(rect(39, 34, 2, 5) - {(39, 38)}, 'gold', lambda m: (lambda x, y: 1 if x == 39 else 2), edge=3)
    # 둥근 팔꿈치 (돌아도 관절이 티 나지 않게)
    a.fill(ell(px + 0.5, py + 0.5, 2.3, 2.3), 'skin', sphere(cx=px, cy=py - 0.5, rx=3, ry=3, th=(0.7, 0.2, -0.3)), edge=False)
    # 자루를 꽉 쥔 주먹 (손가락이 앞으로 감싼다)
    fist = poly([(41, 32), (45.5, 32), (46.5, 33.5), (46.5, 37), (45, 38.5), (41.5, 38.5), (40.5, 37)])
    a.fill(fist, 'skin', sphere(cx=42, cy=33, rx=5, ry=5, th=(0.6, 0.15, -0.4)), edge=3)
    a.dots(43, 34, ['kkk', '...', 'kkk'], {'k': '#C07060'})
    a.dot(42, 32, '#FFF4E8')
    return a


# ══════════════════════════════════════════════════════════════════
# 탈것: 구름 (72×24), 상어 (88×36, 오른쪽을 봄)
# ══════════════════════════════════════════════════════════════════
def cloud():
    a = Art(72, 24)
    # 아래는 납작, 위는 몽실몽실. 가운데 위(제우스 다리 자리)는 꼭대기까지 덮는다
    a.fill(ell(36, 15, 34, 5.5), 'cloud', flat(2))
    a.puffs([(5.5, 15, 4.5), (13, 12, 6), (24, 9.5, 7.5), (36, 8.5, 8.5), (48, 9.5, 7.5), (59, 12, 6), (66.5, 15, 4.5),
             (18, 17, 4.5), (30, 17.5, 4.5), (42, 17.5, 4.5), (54, 17, 4.5)],
            'cloud', center=(36, 12), size=(34, 9), mass=0.35, th=(0.6, 0.15, -0.35))
    a.erase(rect(0, 21, 72, 3))
    for x, big in ((10, False), (27, True), (47, False), (62, True)):
        pass
    sparkle(a, 8, 21)
    sparkle(a, 30, 22)
    sparkle(a, 52, 21)
    sparkle(a, 66, 22)
    return a


def shark():
    a = Art(88, 36)
    # 가슴·배 지느러미
    a.fill(poly([(30, 27), (32, 33), (38, 35), (37, 27)]), 'shark', sphere(th=(0.6, 0.2, -0.3)))
    a.fill(poly([(52, 27), (54, 32), (60, 34), (59, 27)]), 'shark', sphere(th=(0.6, 0.2, -0.3)))
    # 등지느러미
    a.fill(poly([(50, 10), (55, 6), (58, 1), (62, 6), (69, 10)]), 'shark', sphere(cx=55, cy=2, rx=12, ry=10, th=(0.6, 0.2, -0.3)))
    # 꼬리 (왼쪽)
    tail = poly([(17, 18), (10, 13), (2.5, 5), (4, 15), (6, 20), (4, 26), (3, 31), (10, 25), (17.5, 22.5)])
    a.fill(tail, 'shark', sphere(cx=8, cy=10, rx=12, ry=20, th=(0.6, 0.2, -0.3)))
    # 몸통 (유선형)
    body = poly([(13, 20), (20, 14), (30, 10), (44, 8), (58, 8), (70, 10), (79, 14), (85.5, 18.5), (86, 22),
                 (84, 24.5), (72, 28.5), (58, 30), (44, 30), (30, 27.5), (20, 25), (14, 22.5)])
    a.fill(body, 'shark', sphere(cx=48, cy=12, rx=40, ry=16, th=(0.75, 0.3, -0.15)))
    # 흰 배
    belly = poly([(18, 23), (30, 23.5), (45, 23.5), (60, 22.5), (72, 23), (84, 23.5), (72, 28.5), (58, 30), (44, 30),
                  (30, 27.5), (20, 25)])
    a.fill(belly, 'belly', sphere(cx=50, cy=22, rx=36, ry=8, th=(0.7, 0.1, -0.5)), edge=3)
    # 등 반사광
    a.shade(capsule(32, 11, 50, 9.5, 0.4), -1, only=('shark',))
    # 아가미
    for gx in (63, 66, 69):
        a.shade({(gx, 15), (gx - 1, 16), (gx - 1, 17), (gx - 1, 18), (gx, 19)}, 2, only=('shark',))
    # 벌린 입 + 이빨
    mouth = poly([(71, 22.5), (78.5, 21), (85.5, 20.5), (84, 25), (78, 26), (73, 25)])
    a.erase(mouth)
    a.fill(mouth, 'mouth', vband(21, 26, (2, 3, 3)), edge=False)
    teeth = {'w': WHITE, 's': '#C8D2E4'}
    a.dots(73, 21, ['......wwwwwww', 'wwwwwwwwwsw.w', 'w.sw.sw.w..'.ljust(13, '.')], teeth)
    a.dots(75, 24, ['..w..w..w.', '.wsw.wswws'], teeth)
    # 눈 + 매서운 눈썹
    a.dots(74, 14, ['kkk..', '.kkkk', '.wwk.', '.wkk.', '..kk.'], {'k': INK, 'w': WHITE})
    a.dot(76, 16, WHITE)
    return a


# ── 미리보기 도구 ─────────────────────────────────────────────────
def rotate_layer(s, pivot, deg, scale=8):
    """확대한 무기 층을 축 기준으로 돌린다 (게임에서 +는 시계 방향)"""
    big = s.img.resize((s.w * scale, s.h * scale), Image.NEAREST)
    return big.rotate(-deg, resample=Image.NEAREST, center=(pivot[0] * scale, pivot[1] * scale))


def compose(body, weapon, pivot, deg, mount=None, mx=0, overlap=0, scale=8):
    """몸 + (돌린) 무기 + 탈것을 게임과 같은 순서로 겹쳐 본다"""
    W = max(body.w + mx, mount.w if mount else 0)
    top = body.h - overlap
    H = top + mount.h if mount else body.h
    img = Image.new('RGBA', (W * scale, H * scale), (0, 0, 0, 0))
    big = body.img.resize((body.w * scale, body.h * scale), Image.NEAREST)
    img.alpha_composite(big, (mx * scale, 0))
    if weapon:
        img.alpha_composite(rotate_layer(weapon, pivot, deg, scale), (mx * scale, 0))
    if mount:
        img.alpha_composite(mount.img.resize((mount.w * scale, mount.h * scale), Image.NEAREST), (0, top * scale))
    return img


def sheet(images, path, bg='#3A3A44'):
    W = sum(i.width + 24 for i in images) + 24
    H = max(i.height for i in images) + 48
    out = Image.new('RGBA', (W, H), rgba(bg))
    x = 24
    for i in images:
        out.alpha_composite(i, (x, H - 24 - i.height))
        x += i.width + 24
    out.save(path)


def main():
    out = {
        'baby': baby().render(),
        'teen': teen().render(),
        'adult': adult().render(),
        'zeus': zeus_body().render(),
        'zeus_weapon': zeus_weapon().render(),
        'poseidon': poseidon_body().render(),
        'poseidon_weapon': poseidon_weapon().render(),
        'cloud': cloud().render(),
        'shark': shark().render(),
    }
    for name, s in out.items():
        save(s, name)
    S = 8
    big = lambda s: s.img.resize((s.w * S, s.h * S), Image.NEAREST)
    # 1) 성장 단계 + 탈것
    sheet([big(out['baby']), big(out['teen']), big(out['adult'])], '/tmp/pix-heroes-1.png')
    # 2) 제우스: 휘두르기 각도별 (구름 위)
    sheet([compose(out['zeus'], out['zeus_weapon'], ZEUS_PIVOT, d, out['cloud'], 10, 10) for d in (-35, 0, 55)],
          '/tmp/pix-heroes-zeus.png')
    # 3) 포세이돈: 휘두르기 각도별 (상어 위)
    sheet([compose(out['poseidon'], out['poseidon_weapon'], POS_PIVOT, d, out['shark'], 8, 16) for d in (-35, 0, 55)],
          '/tmp/pix-heroes-poseidon.png')
    # 4) 낱장 (탈것 없이, 무기 층 포함) — 실제 크기에 가까운 3배
    preview([out['baby'], out['teen'], out['adult'], out['zeus'], out['zeus_weapon'], out['poseidon'],
             out['poseidon_weapon'], out['cloud'], out['shark']], '/tmp/pix-heroes-all.png', scale=3)


if __name__ == '__main__':
    main()
