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
    arm = capsule(15, 31, 12, 36, 2.1) | capsule(12, 36, 14, 38, 1.9)
    a.fill(arm, 'skin', sphere(cx=13, cy=32, rx=5, ry=7))
    a.fill(rect(11, 34, 4, 2), 'gold', flat(1))
    a.dot(11, 34, '#FFF7B0')
    a.fill(ell(14.5, 39, 2.4, 2.2), 'skin', sphere(th=(0.7, 0.2, -0.4)))
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
    zb = zeus_body().render()
    zw = zeus_weapon().render()
    save(zb, 'zeus')
    save(zw, 'zeus_weapon')
    sheet([compose(zb, zw, ZEUS_PIVOT, d) for d in (-35, 0, 55)], '/tmp/pix-heroes-zeus.png')


if __name__ == '__main__':
    main()
