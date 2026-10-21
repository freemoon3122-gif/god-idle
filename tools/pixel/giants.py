"""
거인·레이드 보스 도트 그림: 기간테스 창병/투석병, 폴리보테스, 포르피리온, 티포에우스.

    python3 tools/pixel/giants.py          # assets/sprites/*.png 저장 + /tmp/pix-giants*.png 미리보기

좌표는 src/ui/art/raid.tsx(SVG, 칸×10 단위)와 같은 숫자를 그대로 쓰고, 찍을 때 ×0.2 해서 픽셀로 바꾼다
(1칸 = 2픽셀). 그래서 SVG 그림의 배치·비율을 그대로 옮겨 오면서, 명암·외곽선만 도트 방식으로 다시 칠한다.
- 명암: 왼쪽 위에서 빛이 온다고 보고, 모양 안에서 '왼쪽 위 가장자리까지 거리'와 '오른쪽 아래 가장자리까지 거리'의
  비율로 밝은색/기본/그림자/진한 그림자 4단계를 고른다 (그라데이션 없이 정해진 색만).
- 외곽선: 부품끼리 겹치는 곳은 부품마다 진한 선을 두르고, 마지막에 그림 전체 둘레에 1px 외곽선을 한 번 더 두른다.
- 얼굴(눈·이빨 등)은 너무 작아서 도형으로 찍으면 뭉개지므로 픽셀을 직접 찍는다.
"""
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402

from common import OUTLINE, Sprite, preview, rgba, save  # noqa: E402

K = 0.2  # SVG 좌표 → 픽셀 (칸 10 → 2픽셀)

# ───────────── 팔레트 (밝은색, 기본, 그림자, 진한 그림자) ─────────────
SKIN = ['#D3DE96', '#97A35F', '#6A763C', '#434E26']          # 기간테스 올리브 피부
SNAKE = ['#A6D27A', '#5E8C43', '#3F6A31', '#26401E']         # 뱀 다리
SNAKE_BAND = ['#7DAE58', '#4A7638', '#335A28', '#22381A']    # 뱀 비늘 띠
SNAKE_HEAD = ['#B6E08A', '#86BC5E', '#55883E', '#2F4F24']
HIP = ['#8CC068', '#4F7A3A', '#3A5C2C', '#22381A']
LEATHER = ['#C88A50', '#A86A38', '#7A4A26', '#4E2C12']
WOOD = ['#C99358', '#A87140', '#7A4E26', '#4E2E14']
STEEL = ['#FFFFFF', '#C6D0E4', '#8592B2', '#4E5A7A']
GOLD = ['#FFF3A6', '#FFD54A', '#D49A22', '#8A560C']
RED = ['#FF8A8A', '#E5484D', '#A8283A', '#6A1020']
STONE = ['#E4E4F0', '#A9A9BE', '#73738C', '#43445A']
MOSS = ['#9AD06A', '#6CA048', '#4A7A32', '#2E5020']
BONE = ['#FFFFFF', '#F4F1E6', '#CFC6AE', '#8E866E']

TEETH = '#F4F1E6'
MOUTH = '#2A0A1E'
RED_EYE = ('#FF2E2E', '#FFE0C8', '#2A1238')  # (눈 색, 빛나는 중심, 눈구멍)


# ───────────── SVG 경로 → 점 목록 ─────────────

def _bez3(p0, p1, p2, p3, n):
    out = []
    for k in range(1, n + 1):
        t = k / n
        u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out


def _bez2(p0, p1, p2, n):
    out = []
    for k in range(1, n + 1):
        t = k / n
        u = 1 - t
        out.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return out


def subpaths(d):
    """M/L/C/Q/Z 절대좌표 경로를 부분 경로별 점 목록으로 (곡선은 잘게 쪼갠다)"""
    tok = re.findall(r'[MLCQZ]|-?\d+(?:\.\d+)?', d)
    res, cur, i, cmd = [], [], 0, None
    nums = lambda k: [float(tok[i + j]) for j in range(k)]  # noqa: E731
    while i < len(tok):
        if tok[i] in 'MLCQZ':
            cmd = tok[i]
            i += 1
            if cmd == 'Z':
                if cur:
                    res.append(cur)
                cur = []
                continue
        if cmd == 'M':
            if cur:
                res.append(cur)
            x, y = nums(2)
            cur = [(x, y)]
            i += 2
            cmd = 'L'
        elif cmd == 'L':
            # 직선도 잘게 쪼갠다 (관을 그릴 때 끝점에만 원이 찍히지 않도록)
            x, y = nums(2)
            x0, y0 = cur[-1]
            n = max(1, int(math.dist((x0, y0), (x, y)) / 2))
            cur += [(x0 + (x - x0) * k / n, y0 + (y - y0) * k / n) for k in range(1, n + 1)]
            i += 2
        elif cmd == 'C':
            a = nums(6)
            cur += _bez3(cur[-1], (a[0], a[1]), (a[2], a[3]), (a[4], a[5]), 16)
            i += 6
        elif cmd == 'Q':
            a = nums(4)
            cur += _bez2(cur[-1], (a[0], a[1]), (a[2], a[3]), 12)
            i += 4
    if cur:
        res.append(cur)
    return res


def mx(d, axis):
    """좌우 뒤집기 (raid.tsx의 mx와 같음)"""
    return re.sub(r'(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)', lambda m: f'{2 * axis - float(m.group(1)):g} {m.group(2)}', d)


def tf(d, x, y, s=1.0, rot=0.0, flip=False):
    """경로를 옮기고·돌리고·키운다 (SVG의 translate rotate scale 순서와 같음)"""
    a = math.radians(rot)
    ca, sa = math.cos(a), math.sin(a)

    def f(m):
        px, py = float(m.group(1)) * (-s if flip else s), float(m.group(2)) * s
        return f'{x + px * ca - py * sa:.2f} {y + px * sa + py * ca:.2f}'
    return re.sub(r'(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)', f, d)


# ───────────── 모양(마스크 = 픽셀 좌표 집합) ─────────────

def shape(d):
    """닫힌 경로 안쪽 픽셀 (픽셀 중심이 안에 있으면 칠함, 부분 경로끼리는 합집합)"""
    m = set()
    for poly in subpaths(d):
        pts = [(x * K, y * K) for x, y in poly]
        if len(pts) < 3:
            continue
        ys = [p[1] for p in pts]
        for j in range(int(min(ys)) - 1, int(max(ys)) + 2):
            cy = j + 0.5
            xs = []
            for k in range(len(pts)):
                (x0, y0), (x1, y1) = pts[k], pts[(k + 1) % len(pts)]
                if (y0 <= cy) != (y1 <= cy):
                    xs.append(x0 + (cy - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for i in range(math.ceil(a - 0.5), math.floor(b - 0.5) + 1):
                    m.add((i, j))
    return m


def ell(cx, cy, rx, ry):
    """SVG 좌표 타원"""
    cx, cy, rx, ry = cx * K, cy * K, rx * K, ry * K
    m = set()
    for j in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for i in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1:
                m.add((i, j))
    return m


def tube(d, w, w1=None):
    """굵은 관(뱀 몸통·팔). w → w1 로 굵기가 변할 수 있다. (마스크, 픽셀별 길이 위치) 반환"""
    pts = [p for sp in subpaths(d) for p in sp]
    w1 = w if w1 is None else w1
    total, acc = 0.0, [0.0]
    for k in range(1, len(pts)):
        total += math.dist(pts[k - 1], pts[k])
        acc.append(total)
    m, along = set(), {}
    for k, (x, y) in enumerate(pts):
        t = acc[k] / total if total else 0
        r = (w + (w1 - w) * t) / 2 * K
        cx, cy = x * K, y * K
        for j in range(int(cy - r) - 1, int(cy + r) + 2):
            for i in range(int(cx - r) - 1, int(cx + r) + 2):
                if (i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r:
                    m.add((i, j))
                    along.setdefault((i, j), acc[k] * K)
    return m, along


def tmask(d, w, w1=None):
    return tube(d, w, w1)[0]


def prune(m):
    """이웃이 하나뿐인 삐죽한 낱픽셀을 지운다 (작게 줄였을 때 지저분해지는 것 방지)"""
    out = set(m)
    for (x, y) in m:
        n = sum((x + dx, y + dy) in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if n <= 1:
            out.discard((x, y))
    return out


# ───────────── 캔버스 ─────────────

class Canvas:
    def __init__(self, w, h, oy=0):
        self.w, self.h = w, h
        self.oy = oy  # 그림 전체를 아래로 내리는 픽셀 수 (SVG 원본이 캔버스 맨 위에 붙어 있을 때)
        self.s = Sprite(w, h)

    def put(self, x, y, c):
        self.s.px(int(x), int(y) + self.oy, c)

    def filled(self, x, y):
        return self.s.get(x, y + self.oy)[3] > 0

    def fill(self, m, ramp, edge=OUTLINE, shade=True, along=None, band=None, period=3.0, hl=True):
        """마스크를 4단계 명암으로 칠한다. edge: 이미 칠한 부분과 맞닿은 둘레에 두를 선 색 (None이면 없음)
        band: 관(tube)을 따라 일정 간격(period 픽셀)마다 다른 색 띠 (뱀 비늘 무늬)"""
        m = {p for p in m if 0 <= p[0] < self.w and 0 <= p[1] + self.oy < self.h}
        if edge:
            # 뒤에 있는 부품과의 경계선. 빈 곳(그림 바깥)은 마지막 외곽선이 맡는다
            for (x, y) in m:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q not in m and self.filled(*q):
                        self.put(q[0], q[1], edge)
        for (x, y) in m:
            r = ramp
            if band and along is not None and (x, y) in along and int(along[(x, y)] / period) % 2:
                r = band
            self.put(x, y, tone(m, x, y, r) if shade else r[1])

    def paint(self, m, c):
        for (x, y) in m:
            self.put(x, y, c)

    def line(self, d, c, w=None):
        """1픽셀 선(근육 결·주름·골) — 곡선을 따라 계단 모양 그대로 찍는다 (w는 예전 호출 호환용)"""
        for sp in subpaths(d):
            pts = [(int(x * K), int(y * K)) for x, y in sp]
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                self.s.line(x0, y0 + self.oy, x1, y1 + self.oy, c)
            if len(pts) == 1:
                self.put(*pts[0], c)


def _run(m, x, y, dx, dy):
    n = 0
    while (x, y) in m:
        n += 1
        x += dx
        y += dy
    return n


def tone(m, x, y, ramp):
    """왼쪽 위 빛 기준 명암 단계 고르기"""
    hi, base, sh = ramp[0], ramp[1], ramp[2]
    dk = ramp[3] if len(ramp) > 3 else ramp[2]
    a = min(_run(m, x, y, -1, 0), _run(m, x, y, 0, -1))  # 밝은 쪽 가장자리까지
    b = min(_run(m, x, y, 1, 0), _run(m, x, y, 0, 1))    # 어두운 쪽 가장자리까지
    tot = a + b
    if tot <= 2:
        return base if a == 1 else sh
    if b == 1:
        return dk
    if a == 1 or (a == 2 and tot >= 12):
        return hi
    if a / tot > 0.6:
        return sh
    return base


def finish(c):
    """마지막 외곽선 + 확대 저장용 Sprite 반환"""
    c.s.outline(OUTLINE)
    # 발(외곽선)이 캔버스 맨 아래 줄에 닿도록 남는 아래 여백만큼 내린다
    box = c.s.img.getbbox()
    gap = c.h - box[3]
    if gap > 0 and box[1] >= gap:
        moved = Image.new('RGBA', (c.w, c.h), (0, 0, 0, 0))
        moved.alpha_composite(c.s.img, (0, gap))
        c.s.img = moved
        c.s.p = moved.load()
    return c.s


# ───────────── 공용 부품 ─────────────

# 뱀 머리는 몇 픽셀 안 돼서 도형을 돌려 찍으면 뭉개진다 → 손으로 찍은 작은 도트를 붙인다.
# 글자: h 밝은 비늘, b 비늘, s 그림자, d 진한 그림자, e 눈, E 빛나는 눈 중심, w 이빨, m 입속, t 혀, n/N 뿔
SERP_SMALL = [  # 8×7, 오른쪽 위를 보고 입을 벌림 (뱀 다리 끝)
    '..hhh...',
    '.hbbbhh.',
    'hbbEebbh',
    'bbbbbbsw',
    'sbbsmmm.',
    '.sdddwd.',
    '..dd....',
]
SERP_BIG = [  # 13×12, 왼쪽을 보고 크게 벌린 입 + 뒤로 젖힌 뿔 (티포에우스 목 끝)
    '..........NN.',
    '.........nNN.',
    '......hhnnN..',
    '...hhhbsssbsd',
    '..hbbbbEebbsd',
    '.hbbbbbeebssd',
    'hbbbbbbbbbssd',
    'wbwbwbsssssd.',
    'mmmmmmmmssd..',
    'tmmmmmmmdsd..',
    '.twmwmddddd..',
    '..dddddd.....',
]


def stamp(c, rows, pal, x, y, flip=False, edge=OUTLINE):
    """손으로 찍은 도트를 (x, y)에 붙인다. flip이면 좌우 반전. 뒤에 있는 그림과의 경계엔 외곽선"""
    w = len(rows[0])
    pix = {}
    for j, line in enumerate(rows):
        for i, ch in enumerate(line):
            if ch in pal:
                pix[(x + (w - 1 - i if flip else i), y + j)] = pal[ch]
    if edge:
        for (px, py) in pix:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (px + dx, py + dy)
                if q not in pix and c.filled(*q):
                    c.put(q[0], q[1], edge)
    for (px, py), col in pix.items():
        c.put(px, py, col)


def serp_pal(skin, eye='#FF2E2E', core='#FFF6D0'):
    return {'h': skin[0], 'b': skin[1], 's': skin[2], 'd': skin[3], 'e': eye, 'E': core,
            'w': TEETH, 'm': MOUTH, 't': '#E5484D', 'n': BONE[1], 'N': BONE[3]}


def leg_heads(c, lx, rx, y, skin, eye='#FF2E2E'):
    """뱀 다리 끝 머리 두 개: 왼쪽 것은 오른쪽 위를, 오른쪽 것은 왼쪽 위를 본다 (x는 머리 가운데 픽셀)"""
    pal = serp_pal(skin, eye)
    stamp(c, SERP_SMALL, pal, int(lx) - 4, int(y) - 4)
    stamp(c, SERP_SMALL, pal, int(rx) - 3, int(y) - 4, flip=True)


def _pt(d):
    x, y = subpaths(d)[0][0]
    return x * K, y * K


def glow_eye(c, x, y, w, color, core, socket, slant=1):
    """빛나는 눈 (픽셀 좌표). 눈구멍 → 눈 → 밝은 중심. slant=1이면 안쪽이 위로 깎인 성난 눈(왼쪽 눈 기준)"""
    for i in range(-1, w + 1):
        c.put(x + i, y - 1, socket)
        c.put(x + i, y + 1, socket)
    c.put(x - 1, y, socket)
    c.put(x + w, y, socket)
    for i in range(w):
        c.put(x + i, y, color)
    c.put(x + (w - 2 if slant > 0 else 1), y, core)


def snake_legs(c, base_y=0, sx=0, scale=1.0):
    """기간테스 공용 뱀 다리 (raid.tsx gigasLegs)"""
    T = lambda d: tf(d, sx, base_y, scale)  # noqa: E731
    for d in ('M96 182 C60 188 18 200 20 232 C22 258 46 264 62 252', 'M104 182 C140 188 182 200 180 232 C178 258 154 264 138 252'):
        m, al = tube(T(d), 26 * scale)
        c.fill(m, SNAKE, along=al, band=SNAKE_BAND, period=2.5)
    leg_heads(c, (sx + 62 * scale) * K, (sx + 138 * scale) * K, (base_y + 250 * scale) * K, SNAKE_HEAD)
    c.fill(shape(T('M50 180 C50 166 150 166 150 180 C150 196 128 200 100 200 C72 200 50 196 50 180 Z')), HIP)


def gigas_torso(c, oy=0, strap=False):
    T = lambda d: tf(d, 0, oy)  # noqa: E731
    c.fill(shape(T('M34 116 C60 104 140 104 166 116 C180 122 182 140 172 150 C166 160 160 168 152 176 L48 176 C40 168 34 160 28 150 C18 140 20 122 34 116 Z')), SKIN)
    # 가슴·복근 결
    c.line(T('M60 134 Q78 144 95 136 M105 136 Q122 144 140 134'), SKIN[2], 5)
    c.line(T('M100 140 L100 162'), SKIN[2], 4)
    c.line(T('M86 152 L94 153 M106 153 L114 152'), SKIN[2], 4)
    c.line(T('M56 126 Q70 120 84 124'), SKIN[0], 4)
    if strap:
        c.fill(tmask(T('M44 118 L150 174'), 11), LEATHER)
    c.fill(shape(T('M44 164 L156 164 L158 184 L42 184 Z')), LEATHER)
    c.fill(ell(100, 174 + oy, 8, 8), GOLD)
    c.fill(shape(T('M82 184 L118 184 L114 206 L100 200 L86 206 Z')), LEATHER[1:])


def gigas_head(c, hair, oy=0):
    """거인 얼굴. 왼쪽을 보도록 얼굴 부품을 왼쪽으로 1픽셀 옮기고 오른쪽 귀를 작게"""
    T = lambda d: tf(d, 0, oy)  # noqa: E731
    Y = oy * K
    c.fill(shape(T('M100 6 C120 4 140 8 152 18 C168 16 182 30 176 46 C188 56 184 74 170 82 C168 66 160 56 150 52 L50 52 C40 56 32 66 30 82 C16 74 12 56 24 46 C18 30 32 16 48 18 C60 8 80 4 100 6 Z')), hair)
    # 갈기 끝 삐침 (헬멧처럼 매끈해 보이지 않게 위·옆으로 뻗친 머리털)
    c.fill(shape(T('M60 16 L50 4 L76 10 Z M94 8 L106 0 L116 8 Z M136 12 L156 4 L150 22 Z M26 40 L10 34 L24 54 Z M174 40 L190 34 L178 56 Z')), hair)
    c.fill(shape(T('M54 62 L26 46 L32 74 C36 84 48 86 54 82 Z')), SKIN)
    c.fill(shape(T('M148 64 L170 52 L166 74 C162 82 152 84 148 80 Z')), SKIN)
    face = shape(T('M50 46 C50 22 74 14 100 14 C126 14 150 22 150 46 L152 78 C152 100 130 112 100 112 C70 112 48 100 48 78 Z'))
    c.fill(face, SKIN)
    c.fill(shape(T('M46 58 L48 36 C56 20 78 12 100 12 C122 12 144 20 152 36 L154 58 L140 44 L132 56 L120 40 L110 52 L100 36 L90 52 L80 40 L68 56 L60 44 Z')), hair)
    # 눈: 왼쪽을 보므로 둘 다 1픽셀 왼쪽, 오른눈은 조금 좁게
    ey = int(15 + Y)
    glow_eye(c, 13, ey, 3, *RED_EYE, slant=1)
    glow_eye(c, 22, ey, 3, *RED_EYE, slant=-1)
    # 성난 눈썹 (안쪽이 아래로)
    for i, dy in enumerate((0, 0, 1, 1, 2)):
        c.put(11 + i, ey - 3 + dy, hair[3])
        c.put(11 + i, ey - 2 + dy, hair[3]) if i >= 1 else None
    for i, dy in enumerate((2, 1, 1, 0, 0)):
        c.put(21 + i, ey - 3 + dy, hair[3])
        c.put(21 + i, ey - 2 + dy, hair[3]) if i <= 3 else None
    # 코 (왼쪽으로 튀어나온 그림자)
    c.put(18, ey + 2, SKIN[2])
    c.put(17, ey + 3, SKIN[3])
    c.put(18, ey + 3, SKIN[3])
    c.put(20, ey + 3, SKIN[2])
    # 입 + 윗니 + 아래 송곳니
    my = ey + 4
    for i in range(13, 26):
        c.put(i, my, MOUTH)
        c.put(i, my + 1, MOUTH)
    for i in range(14, 25):
        c.put(i, my + 2, MOUTH)
    for i in range(14, 25, 2):
        c.put(i, my, TEETH)
    for tx in (14, 24):
        c.put(tx, my + 1, TEETH)
        c.put(tx, my, TEETH)
        c.put(tx, my - 1, TEETH)
    # 턱 그림자
    for i in range(14, 25):
        c.put(i, my + 3, SKIN[2])


# ───────────── 기간테스 창병 (48×56) ─────────────

def giant_spear():
    c = Canvas(48, 56, oy=1)
    hair = ['#9A6438', '#6E4626', '#4A2C14', '#24140A']
    # 창 (몸 뒤)
    c.fill(shape('M212 54 L222 54 L222 272 L212 272 Z'), WOOD)
    c.fill(shape('M217 2 C234 22 236 42 217 64 C198 42 200 22 217 2 Z'), STEEL)
    c.line('M218 14 L218 54', STEEL[2], 4)
    c.fill(shape('M207 60 L227 60 L227 72 L207 72 Z'), LEATHER)
    c.fill(shape('M226 66 C238 72 240 90 232 102 C228 90 224 82 219 76 Z'), RED)
    snake_legs(c)
    c.fill(tmask('M32 128 C22 146 18 158 22 172', 26), SKIN)
    gigas_torso(c, strap=True)
    c.fill(shape('M8 176 C8 164 18 158 26 160 C36 162 38 174 34 184 C30 192 14 192 8 176 Z'), SKIN)
    c.fill(tmask('M164 128 C182 142 196 146 210 138', 24), SKIN)
    c.fill(ell(34, 124, 22, 20), SKIN)
    c.fill(ell(166, 124, 22, 20), SKIN)
    c.fill(shape('M202 126 C204 116 232 116 234 126 L234 150 C232 160 204 160 202 150 Z'), SKIN)
    c.line('M206 136 L230 136 M206 145 L230 145', SKIN[3], 4)
    gigas_head(c, hair)
    return finish(c)


# ───────────── 기간테스 투석병 (44×66) ─────────────

def giant_rock():
    c = Canvas(44, 66)
    hair = ['#D09456', '#A8743E', '#74491F', '#4A2A12']
    oy = 52
    snake_legs(c, base_y=oy)
    T = lambda d: tf(d, 0, oy)  # noqa: E731
    c.fill(tmask(T('M36 126 C14 104 12 66 26 22'), 26), SKIN)
    c.fill(tmask(T('M164 126 C186 104 188 66 174 22'), 26), SKIN)
    gigas_torso(c, oy)
    c.fill(ell(36, 122 + oy, 22, 20), SKIN)
    c.fill(ell(164, 122 + oy, 22, 20), SKIN)
    gigas_head(c, hair, oy)
    # 바위
    rock = shape('M22 46 C14 24 40 8 76 10 C98 2 140 4 162 12 C188 16 202 34 194 52 C190 70 160 76 120 74 C80 78 32 72 22 46 Z')
    c.fill(rock, STONE)
    c.line('M96 14 L104 30 L96 42 M140 46 L156 40 L166 52 M52 54 L66 46', STONE[3], 4)
    c.line('M44 64 C70 70 130 72 180 60', STONE[2], 5)
    c.fill(ell(130, 20, 16, 6) & rock, MOSS, edge=None)
    c.fill(ell(58, 24, 10, 5) & rock, MOSS, edge=None)
    # 바위를 움켜쥔 손
    hand = 'M10 70 C6 56 18 50 30 54 C44 58 44 74 36 82 C28 90 14 86 10 70 Z'
    c.fill(shape(hand), SKIN)
    c.fill(shape(mx(hand, 102)), SKIN)
    c.line('M18 62 L30 64 M16 72 L30 73 M168 64 L180 62 M172 73 L186 72', SKIN[3], 4)
    # 떨어지는 돌 부스러기
    c.fill(shape('M198 76 L210 70 L214 82 L202 86 Z'), STONE)
    c.fill(shape('M4 98 L14 92 L18 102 L8 106 Z'), STONE)
    return finish(c)


# ───────────── 폴리보테스 (56×64) ─────────────

def polybotes():
    c = Canvas(56, 64)
    skin = ['#A6D4F4', '#5A92C4', '#386A9A', '#1E3E64']
    sea = ['#6E9CD0', '#2F5A85', '#22476E', '#122A4A']
    sea_band = ['#4E7CB0', '#1E4272', '#173A62', '#0E2442']
    weed = ['#7CCB5E', '#3E9A3A', '#2A7230', '#174A1C']
    shell = ['#FFE6EC', '#FF9FB0', '#E07890', '#A8405C']
    coral = ['#FFB0B0', '#E5484D', '#B02E40', '#6E1424']
    eye = ('#6FE3FF', '#F0FFFF', '#0F1E30')
    c.fill(shape('M150 34 C186 32 214 44 220 70 C228 92 222 112 232 136 C220 132 216 142 208 134 L92 134 C84 142 80 132 68 136 C78 112 72 92 80 70 C86 44 114 32 150 34 Z'), weed)
    for d in ('M120 228 C82 236 46 248 46 276 C46 300 72 306 88 294', mx('M120 228 C82 236 46 248 46 276 C46 300 72 306 88 294', 145)):
        m, al = tube(d, 28)
        c.fill(m, sea, along=al, band=sea_band, period=2.5)
    leg_heads(c, 88 * K, 202 * K, 292 * K, ['#8EC0EA', '#4F86B8', '#2E5E92', '#1B3C85'], eye='#6FE3FF')
    c.fill(shape('M80 224 C80 208 210 208 210 224 C210 242 180 248 145 248 C110 248 80 242 80 224 Z'), sea)
    c.fill(tmask('M58 158 C46 172 46 182 52 194', 26), skin)
    c.fill(tmask('M232 158 C246 176 250 192 248 208', 26), skin)
    c.fill(shape('M56 146 C92 132 198 132 234 146 C250 154 252 178 242 190 C236 200 230 208 222 216 L68 216 C60 208 54 200 48 190 C38 178 40 154 56 146 Z'), skin)
    c.line('M106 164 Q124 174 140 166 M150 166 Q166 174 184 164', skin[2], 5)
    c.line('M145 170 L145 192', skin[2], 4)
    c.fill(ell(58, 150, 22, 20), skin)
    c.fill(ell(232, 150, 22, 20), skin)
    # 따개비 + 늘어진 해초
    c.fill(ell(222, 142, 6, 6), BONE)
    c.fill(ell(238, 136, 5, 5), BONE)
    c.fill(tmask('M208 136 C220 152 236 146 244 164 C250 176 242 186 250 200', 9), weed)
    # 상어가죽 허리띠 + 이빨 장식
    c.fill(shape('M66 194 L224 194 L222 218 L68 218 Z'), ['#AFC4D8', '#7E9AB6', '#5A7694', '#3A5270'])
    for i in range(8):
        x = int((86 + i * 18) * K)
        c.put(x, int(200 * K) + 1, TEETH)
        c.put(x, int(200 * K) + 2, TEETH)
        c.put(x + 1, int(200 * K) + 1, TEETH)
    c.fill(shape('M232 216 C232 204 242 198 252 200 C264 202 266 216 260 226 C254 234 236 232 232 216 Z'), skin)
    # 가리비 방패: 경첩에서 퍼진 부채꼴 + 물결 테두리 + 골
    cx, cy, rx, ry, n = 55, 226, 48, 84, 7
    pt = lambda deg, k: (cx + rx * k * math.cos(math.radians(deg)), cy + ry * k * math.sin(math.radians(deg)))  # noqa: E731
    ang = lambda i: 200 + 140 * i / n  # noqa: E731
    d = f'M{cx} {cy} L{pt(ang(0), 1)[0]:.1f} {pt(ang(0), 1)[1]:.1f}'
    for i in range(n):
        q, e = pt((ang(i) + ang(i + 1)) / 2, 1.13), pt(ang(i + 1), 1)
        d += f' Q{q[0]:.1f} {q[1]:.1f} {e[0]:.1f} {e[1]:.1f}'
    c.fill(shape(d + ' Z'), shell)
    for i in range(1, n):
        e = pt(ang(i), 0.9)
        c.line(f'M{cx} {cy - 6} L{e[0]:.1f} {e[1]:.1f}', shell[3], 4)
    c.fill(shape('M36 220 L74 220 L70 236 L40 236 Z'), shell[1:])
    # 지느러미 귀
    fin = 'M94 80 L58 60 L70 78 L56 88 L72 94 L62 108 L94 102 Z'
    c.fill(shape(fin), ['#7EB4E4', '#3E78AE', '#2A5A8E', '#183A62'])
    c.fill(shape(mx(fin, 150)), ['#7EB4E4', '#3E78AE', '#2A5A8E', '#183A62'])
    c.fill(shape('M92 66 C92 46 118 40 150 40 C182 40 208 46 208 66 L210 96 C210 118 184 128 150 128 C116 128 90 118 90 96 Z'), skin)
    # 아가미 결
    c.line('M100 96 Q107 102 104 110 M196 96 Q190 102 192 110', skin[3], 4)
    # 눈 (왼쪽을 보도록 1픽셀 왼쪽)
    glow_eye(c, 22, 17, 4, *eye, slant=1)
    glow_eye(c, 32, 17, 3, *eye, slant=-1)
    for i, dy in enumerate((0, 0, 1, 1, 2, 2)):
        c.put(20 + i, 14 + dy, '#132A48')
    for i, dy in enumerate((2, 2, 1, 1, 0)):
        c.put(31 + i, 14 + dy, '#132A48')
    c.put(28, 19, skin[3])
    c.put(30, 19, skin[3])
    # 상어 이빨 입
    for i in range(23, 36):
        c.put(i, 21, MOUTH)
        c.put(i, 22, MOUTH)
    for i in range(24, 35):
        c.put(i, 23, MOUTH)
    for i in range(23, 36, 2):
        c.put(i, 21, TEETH)
    for i in range(25, 35, 3):
        c.put(i, 23, TEETH)
    # 해초 턱수염 + 앞머리
    c.fill(shape('M124 124 C128 140 136 136 140 148 C146 138 154 138 160 148 C164 136 172 140 176 124 C166 130 134 130 124 124 Z'), weed)
    c.fill(shape('M88 78 C90 56 114 42 150 42 C186 42 210 56 212 78 C204 70 198 74 192 62 C184 70 174 64 166 58 C158 66 146 64 138 58 C130 66 122 64 114 62 C106 72 96 68 88 78 Z'), weed)
    c.fill(tmask('M80 128 C70 142 84 152 72 170', 9), weed)
    c.fill(tmask(mx('M80 128 C70 142 84 152 72 170', 150), 9), weed)
    # 산호 왕관
    c.fill(tmask('M150 46 L150 12 M150 30 L136 18 M150 22 L162 10', 10), coral)
    c.fill(tmask('M124 50 L116 26 L106 14 M117 30 L128 16', 10), coral)
    c.fill(tmask('M176 50 L184 26 L194 14 M183 30 L172 16', 10), coral)
    return finish(c)


# ───────────── 포르피리온 (74×68) ─────────────

def porphyrion():
    c = Canvas(74, 68)
    skin = ['#D0DC90', '#8C985E', '#626E38', '#3E4822']
    hair = ['#8E5C34', '#6A4224', '#46280F', '#1E0F06']
    cape = ['#F06870', '#D23A48', '#9A2034', '#5E0C1C']
    # 양날 도끼 (몸 뒤)
    c.fill(shape('M279 70 L291 70 L291 302 L279 302 Z'), WOOD)
    c.fill(ell(285, 306, 9, 9), GOLD)
    c.fill(shape('M285 2 L296 38 L274 38 Z'), STEEL)
    c.fill(shape('M292 30 C326 16 362 44 362 68 C362 92 326 120 292 104 C300 80 300 54 292 30 Z'), STEEL)
    c.fill(shape('M278 40 C254 32 224 50 222 68 C224 86 254 104 278 94 C272 76 272 58 278 40 Z'), STEEL)
    c.line('M330 30 C354 46 356 88 330 106', '#FFFFFF', 4)
    c.line('M244 46 C230 58 230 80 244 92', '#FFFFFF', 4)
    c.fill(shape('M272 30 L298 30 L298 106 L272 106 Z'), GOLD)
    c.fill(ell(285, 68, 8, 8), RED)
    # 붉은 망토
    c.fill(shape('M54 146 L246 146 C266 180 272 220 270 264 C256 254 244 268 228 258 L72 258 C56 268 44 254 30 264 C28 220 34 180 54 146 Z'), cape)
    c.line('M70 180 C64 210 60 236 58 256 M230 180 C236 210 240 236 242 256', cape[2], 5)
    # 뒷머리 갈기
    c.fill(shape('M150 22 C192 20 228 38 234 76 C242 110 238 140 224 160 L76 160 C62 140 58 110 66 76 C72 38 108 20 150 22 Z'), hair)
    # 뱀 다리
    for d in ('M126 246 C84 252 38 266 38 298 C38 324 66 332 84 316', mx('M126 246 C84 252 38 266 38 298 C38 324 66 332 84 316', 150)):
        m, al = tube(d, 32)
        c.fill(m, SNAKE, along=al, band=SNAKE_BAND, period=3)
    leg_heads(c, 84 * K, 216 * K, 314 * K, SNAKE_HEAD)
    c.fill(shape('M84 246 C84 230 216 230 216 246 C216 264 186 270 150 270 C114 270 84 264 84 246 Z'), HIP)
    # 팔
    c.fill(tmask('M50 170 C40 190 36 204 38 222', 30), skin)
    c.fill(tmask('M248 168 C264 188 276 192 284 178', 30), skin)
    # 몸통
    c.fill(shape('M58 150 C100 138 200 138 242 150 C258 160 258 186 246 198 C240 210 232 220 222 230 L78 230 C68 220 60 210 54 198 C42 186 42 160 58 150 Z'), skin)
    c.line('M150 188 L150 204', skin[2], 4)
    # 붉은 앞가리개 + 황금 허리띠 + 보석
    c.fill(shape('M100 228 L200 228 L194 262 L172 252 L150 266 L128 252 L106 262 Z'), cape)
    c.fill(shape('M70 206 L230 206 L226 232 L74 232 Z'), GOLD)
    for x in (96, 120, 180, 204):
        c.put(x * K, 219 * K, GOLD[3])
    c.fill(shape('M150 204 L166 219 L150 236 L134 219 Z'), ['#E0FAFF', '#6FE3FF', '#2EA8D0', '#1A6A8A'])
    # 주먹
    c.fill(shape('M20 230 C20 216 32 210 42 212 C54 214 58 228 52 240 C46 250 26 248 20 230 Z'), skin)
    c.fill(shape('M268 164 C270 152 300 152 302 164 L302 190 C300 202 270 202 268 190 Z'), skin)
    c.line('M272 174 L298 174 M272 183 L298 183', skin[3], 4)
    # 황금 어깨갑옷 (가시 + 판)
    sp = 'M40 134 L28 108 L56 128 Z M64 130 L64 102 L82 132 Z'
    c.fill(shape(sp), GOLD)
    c.fill(shape(mx(sp, 150)), GOLD)
    pl = 'M20 172 C14 146 40 128 66 132 C90 136 100 156 94 174 C72 168 44 168 20 172 Z'
    c.fill(shape(pl), GOLD)
    c.fill(shape(mx(pl, 150)), GOLD)
    c.fill(ell(60, 154, 7, 7), RED)
    c.fill(ell(240, 154, 7, 7), RED)
    # 머리: 귀 → 얼굴
    ear = 'M92 76 L60 56 L70 90 C74 100 86 102 92 98 Z'
    c.fill(shape(ear), skin)
    c.fill(shape('M206 78 L232 62 L226 90 C222 100 212 100 206 96 Z'), skin)
    c.fill(shape('M90 60 C90 38 116 30 150 30 C184 30 210 38 210 60 L212 92 C212 116 186 128 150 128 C114 128 88 116 88 92 Z'), skin)
    ey = 16
    glow_eye(c, 23, ey, 4, *RED_EYE, slant=1)
    glow_eye(c, 33, ey, 3, *RED_EYE, slant=-1)
    for i, dy in enumerate((0, 0, 1, 1, 2, 2)):
        c.put(21 + i, ey - 3 + dy, hair[3])
        c.put(21 + i, ey - 2 + dy, hair[3]) if i > 0 else None
    for i, dy in enumerate((2, 2, 1, 1, 0, 0)):
        c.put(31 + i, ey - 3 + dy, hair[3])
        c.put(31 + i, ey - 2 + dy, hair[3]) if i < 5 else None
    c.put(29, ey + 2, skin[2])
    c.put(28, ey + 3, skin[3])
    c.put(29, ey + 3, skin[3])
    c.put(31, ey + 3, skin[2])
    # 풍성한 수염
    c.fill(shape('M88 94 C96 112 110 120 122 118 C134 120 142 116 150 118 C158 116 166 120 178 118 C190 120 204 112 212 94 C220 122 216 152 202 172 C190 184 182 176 172 190 C164 180 158 196 150 184 C142 196 136 180 128 190 C118 176 110 184 98 172 C84 152 80 122 88 94 Z'), hair)
    c.line('M112 136 C114 150 118 160 122 168 M136 140 C136 154 138 166 140 176 M164 140 C164 154 162 166 160 176 M188 136 C186 150 182 160 178 168', hair[0], 3)
    # 입 + 이빨 + 콧수염
    for i in range(25, 35):
        c.put(i, 21, MOUTH)
        c.put(i, 22, MOUTH)
    for i in range(26, 34):
        c.put(i, 23, MOUTH)
    for i in range(25, 35, 2):
        c.put(i, 21, TEETH)
    c.fill(shape('M114 104 C128 92 142 96 150 101 C158 96 172 92 186 104 C176 110 162 108 150 105 C138 108 124 110 114 104 Z'), hair)
    # 왕관
    crown = 'M102 58 L97 16 L116 34 L127 8 L139 32 L150 7 L161 32 L173 8 L184 34 L203 16 L198 58 Z'
    c.fill(shape(crown), GOLD)
    for x, y in ((98, 18), (127, 10), (150, 9), (173, 10), (202, 18)):
        c.fill(ell(x, y, 5, 5), ['#FFFFFF', '#FFF27A', '#F2C23A', '#C9971C'], edge=None)
    c.fill(shape('M100 42 C130 38 170 38 200 42 L200 58 C170 54 130 54 100 58 Z'), ['#F2C23A', '#C9971C', '#9A6E10', '#6A4A08'])
    c.fill(ell(150, 49, 8, 7), RED)
    c.fill(ell(122, 50, 5, 5), ['#E0FAFF', '#6FE3FF', '#2EA8D0'])
    c.fill(ell(178, 50, 5, 5), ['#E0FAFF', '#6FE3FF', '#2EA8D0'])
    return finish(c)


# ───────────── 티포에우스 (90×76) ─────────────

def typhoeus():
    c = Canvas(90, 76)
    scale_r = ['#F08088', '#B03E4A', '#7E2634', '#4A1220']
    band = ['#C85460', '#8A2C38', '#64202C', '#3A0C18']
    head_r = ['#FF9AA0', '#C44A56', '#8A2A38', '#4A1220']
    snake = ['#F07A84', '#D04A56', '#902838', '#5A1424']
    gold = GOLD
    horn = ['#F0EEF6', '#BEBED0', '#7E7E96', '#3E3E52']
    fire = ['#FFFBD0', '#FFF27A', '#FFB030', '#FF4A1F']
    # 똬리 꼬리 (뒤쪽 바닥을 크게 감는다)
    m, al = tube('M200 262 C120 262 36 276 36 318 C36 352 130 362 230 360 C330 358 410 346 410 312 C410 290 400 272 384 262', 46)
    c.fill(m, scale_r, along=al, band=band, period=3.5)
    m, al = tube('M386 264 C376 256 368 248 356 238', 30, 10)
    c.fill(m, scale_r)
    c.fill(shape('M372 254 C362 238 350 226 334 216 C358 214 380 224 392 244 Z'), band)
    # 뱀 목·머리 여섯: 뒤(위쪽) 목은 어둡게, 앞 목은 밝게 해서 서로 겹쳐도 구분되게.
    # 목 끝(tip)에 손으로 찍은 큰 뱀 머리를 붙인다. 왼쪽 셋은 왼쪽을, 오른쪽 셋은 오른쪽을 본다
    back = ['#C85A66', '#8E2E3C', '#64202C', '#3A0C18']
    back_band = ['#A84452', '#72222E', '#521824', '#2E0812']
    necks = [  # (경로, 굵기, 비늘색, 띠색, 머리색)
        ('M178 180 C160 150 140 120 132 92 C128 72 124 58 118 46', 22, back, back_band,
         ['#E06A76', '#B03E4A', '#7E2634', '#4A1220']),
        ('M160 190 C120 172 80 160 76 126 C74 110 70 100 66 92', 24, scale_r, band, snake),
        ('M150 200 C100 204 44 200 44 176 C44 166 48 160 52 156', 26, scale_r, band, snake),
    ]
    for d, w, r, bd, hd in necks:
        for side in 'LR':
            dd = d if side == 'L' else mx(d, 225)
            mm, al = tube(dd, w)
            c.fill(mm, r, along=al, band=bd, period=3)
            tx, ty = _pt(mx(d, 225)[::-1] and ('M' + d.split()[-2] + ' ' + d.split()[-1]))
            pal = serp_pal(hd, eye='#FFB030', core='#FFFBD0')
            if side == 'L':
                stamp(c, SERP_BIG, pal, int(tx) - 9, int(ty) - 7)
            else:
                stamp(c, SERP_BIG, pal, int(90 - tx) - 3, int(ty) - 7, flip=True)
    # 몸통 + 팔
    c.fill(shape('M118 186 C160 166 290 166 332 186 C352 196 356 222 342 238 C332 252 318 262 302 272 L148 272 C132 262 118 252 108 238 C94 222 98 196 118 186 Z'), scale_r)
    # 팔: 어깨는 굵고 손목으로 갈수록 가늘게 (근육질 팔뚝)
    arm = 'M136 196 C104 200 80 214 68 244'
    c.fill(tmask(arm, 38, 26), scale_r)
    c.fill(tmask(mx(arm, 225), 38, 26), scale_r)
    # 황금 배비늘
    c.fill(shape('M182 182 L268 182 C276 212 272 246 262 274 L188 274 C178 246 174 212 182 182 Z'), gold)
    c.line('M182 206 C205 214 245 214 268 206 M182 230 C205 238 245 238 268 230 M186 254 C206 262 244 262 264 254', gold[3], 4)
    # 발톱 손
    claws = 'M46 256 L34 280 L54 266 Z M60 266 L56 292 L70 270 Z M76 266 L88 288 L86 262 Z'
    c.fill(shape(claws), BONE)
    c.fill(shape(mx(claws, 225)), BONE)
    hand = 'M42 250 C40 232 58 226 72 230 C90 234 94 252 84 264 C74 274 46 270 42 250 Z'
    c.fill(shape(hand), head_r)
    c.fill(shape(mx(hand, 225)), head_r)
    # 뿔 + 볼 지느러미
    hn = 'M188 84 C166 70 158 44 172 12 C180 42 194 56 210 68 Z'
    c.fill(shape(hn), horn)
    c.fill(shape(mx(hn, 225)), horn)
    fin = 'M156 108 L116 92 L140 120 L110 130 L146 140 L122 160 L164 156 Z'
    c.fill(shape(fin), band)
    c.fill(shape(mx(fin, 225)), band)
    # 큰 머리
    c.fill(shape('M212 66 L225 36 L238 66 Z'), band)
    c.fill(shape('M150 112 C146 84 176 62 225 62 C274 62 304 84 300 112 C306 134 296 152 286 162 C270 178 250 184 225 184 C200 184 180 178 164 162 C154 152 144 134 150 112 Z'), head_r)
    # 불타는 눈 (크게: 5×2 + 아래로 번지는 불빛)
    for (x0, sl) in ((35, 1), (48, -1)):
        for i in range(-1, 7):
            c.put(x0 + i, 20, '#2E0C16')
            c.put(x0 + i, 23, '#2E0C16')
        c.put(x0 - 1, 21, '#2E0C16'); c.put(x0 - 1, 22, '#2E0C16')
        c.put(x0 + 6, 21, '#2E0C16'); c.put(x0 + 6, 22, '#2E0C16')
        for i in range(6):
            c.put(x0 + i, 21, '#FF7A1F')
            c.put(x0 + i, 22, '#FFB030')
        cx = x0 + (3 if sl > 0 else 2)
        c.put(cx, 21, '#FFF27A'); c.put(cx - 1 if sl > 0 else cx + 1, 21, '#FFF27A'); c.put(cx, 22, '#FFFBD0')
    # 눈썹 (V자로 깎인 성난 이마)
    for i in range(8):
        c.put(33 + i, 17 + i // 2, '#2E0C16')
        c.put(33 + i, 18 + i // 2, '#2E0C16')
        c.put(54 - i, 17 + i // 2, '#2E0C16')
        c.put(54 - i, 18 + i // 2, '#2E0C16')
    c.put(42, 26, OUTLINE); c.put(46, 26, OUTLINE)
    # 불을 머금은 아가리
    mouth = shape('M172 138 C200 132 250 132 278 138 C274 168 252 180 225 180 C198 180 176 168 172 138 Z')
    c.fill(mouth, ['#7A1A28', '#5A0F1E', '#3A0812', '#1A0408'])
    c.fill(shape('M194 174 C190 160 202 152 208 144 C214 156 220 150 225 140 C230 150 236 156 242 144 C248 152 260 162 256 174 C246 180 204 180 194 174 Z') & mouth, fire[::-1][1:] if False else ['#FFFBD0', '#FFF27A', '#FFB030', '#FF4A1F'], edge=None)
    for i in range(36, 55, 2):
        c.put(i, 28, TEETH)
    c.put(37, 29, TEETH); c.put(53, 29, TEETH)
    for (fx) in (40, 50):
        c.put(fx, 35, TEETH); c.put(fx, 34, TEETH)
    # 불티
    for (x, y, col) in ((150, 26, '#FF7A1F'), (300, 30, '#FFF27A'), (20, 220, '#FFF27A'), (430, 206, '#FF7A1F'), (120, 290, '#FF7A1F'), (340, 296, '#FFF27A')):
        c.put(x * K, y * K, col)
        c.put(x * K + 1, y * K, col)
        c.put(x * K, y * K + 1, col)
    return finish(c)


ALL = [
    ('giant_spear', giant_spear),
    ('giant_rock', giant_rock),
    ('polybotes', polybotes),
    ('porphyrion', porphyrion),
    ('typhoeus', typhoeus),
]


def small_preview(sprites, path, height=40, bg='#5A6A4A'):
    """필드 몬스터 크기(약 55pt 폭)로 줄였을 때 어떻게 보이는지 — 화면 크기를 흉내 내 줄인 뒤 다시 키워 본다"""
    ups = []
    for s in sprites:
        k = height / max(s.h, 1) * (s.h / 56)  # 거인은 대략 같은 비율로 줄어든다
        w, h = max(1, round(s.w * k)), max(1, round(s.h * k))
        ups.append(s.img.resize((w, h), Image.BOX).resize((w * 4, h * 4), Image.NEAREST))
    W = sum(u.width + 16 for u in ups) + 16
    H = max(u.height for u in ups) + 32
    img = Image.new('RGBA', (W, H), rgba(bg))
    x = 16
    for u in ups:
        img.alpha_composite(u, (x, H - 16 - u.height))
        x += u.width + 16
    img.save(path)


if __name__ == '__main__':
    sprites = []
    for name, fn in ALL:
        s = fn()
        save(s, name)
        sprites.append(s)
    preview(sprites, '/tmp/pix-giants.png', scale=6)
    preview(sprites, '/tmp/pix-giants-bg.png', scale=3, bg='#6E8A4E')
    small_preview(sprites, '/tmp/pix-giants-small.png')
    print('saved', [n for n, _ in ALL])
