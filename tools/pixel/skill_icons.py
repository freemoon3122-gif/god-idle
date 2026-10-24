"""
스킬 버튼 아이콘 도트 그림 17종 (32×32, 투명 배경).

    python3 tools/pixel/skill_icons.py   # assets/icons/<skill_id>.png 생성 + /tmp/pix-icons.png 미리보기

그리는 방식 (heroes.py와 같은 규칙):
- 모양을 '칸 좌표 집합(마스크)'으로 만들고, 재질마다 4단계 팔레트(하이라이트→그림자)로 명암을 넣는다.
- 빛은 왼쪽 위에서 온다 → 마스크의 왼쪽/위 가장자리는 밝게, 오른쪽/아래 가장자리는 어둡게 (계단식 명암, 그라데이션 없음).
- 아이콘은 동그란 보라색(궁극기는 주황색) 버튼 위에 얹히므로 모티프를 가운데 약 26×26 안에 꽉 차게 그린다.
- 마지막에 1px 진한 외곽선을 두르고, 외곽선 밖에 작은 반짝이를 찍어 '스킬' 느낌을 낸다.
"""
import math
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from common import OUTLINE, ROOT, UPSCALE, Sprite, rgba  # noqa: E402

OUT = os.path.join(ROOT, 'assets', 'icons')
N = 32  # 원본 칸 수

# ── 팔레트: 재질마다 [하이라이트, 밝음, 중간, 그림자] + 안쪽 선색 ─────────────
# (gold·steel·leaf·bronze·bolt·blue는 heroes.py와 같은 색 → 캐릭터와 톤을 맞춘다)
RAMPS = {
    'gold': (['#FFF7B0', '#FFD84A', '#E39B22', '#A8620E'], '#6E3A08'),
    'white': (['#FFFFFF', '#EEF1F8', '#C6CEE4', '#8F9AC2'], '#5C6694'),
    'steel': (['#FFFFFF', '#DCE4F0', '#A4B2CA', '#6A7898'], '#3A4466'),
    'cyan': (['#F0FFFF', '#8FF4FF', '#34C8F0', '#1A84C8'], '#0C4A80'),
    'leaf': (['#C2F48E', '#6CCB58', '#2F8E46', '#1A5C36'], '#0E3A22'),
    'bronze': (['#FFE9A0', '#EAAE48', '#B87422', '#7A4614'], '#4E2A0A'),
    'bolt': (['#FFFFF2', '#FFF068', '#FFC11E', '#F08414'], '#8A3E06'),
    'blue': (['#A6D0FF', '#5490F2', '#2E5EC2', '#1C3A84'], '#10245A'),
    'sea': (['#C8F4FF', '#5CC8F4', '#2A86D8', '#1A4EA0'], '#0E2A66'),
    'fire': (['#FFF6C0', '#FFB43C', '#F06A1E', '#B8301A'], '#6A140A'),
    'orange': (['#FFE2A8', '#FFA040', '#E8661C', '#A83C12'], '#5E1E08'),
    'red': (['#FF8A78', '#E8403E', '#B0223A', '#6E1028'], '#4A0A1C'),
    'purple': (['#F2C8FF', '#C27CF0', '#8A44C8', '#5A248E'], '#36125E'),
    'storm': (['#C6C2E6', '#8A86B8', '#5E5A8E', '#3E3A68'], '#221E40'),
    'rock': (['#E2D6B0', '#B0A07E', '#7E7056', '#544836'], '#30281C'),
    'brown': (['#E0A868', '#B4783E', '#8A5428', '#5A3418'], '#3A200C'),
    'marble': (['#FFFFFF', '#F4F0E4', '#D6CCB4', '#A89C84'], '#6E6452'),
}
WHITE = '#FFFFFF'
SPARK = '#FFF2A0'
FOAM = '#F2FCFF'


# ── 모양 (칸 좌표 집합) ───────────────────────────────────────────
def ell(cx, cy, rx, ry, ang=0.0):
    """타원 (ang: 기울기, 라디안). 칸 중심이 타원 안이면 포함"""
    out = set()
    ca, sa = math.cos(ang), math.sin(ang)
    r = max(rx, ry)
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            u, v = dx * ca + dy * sa, -dx * sa + dy * ca
            if (u / rx) ** 2 + (v / ry) ** 2 <= 1.0:
                out.add((x, y))
    return out


def disc(cx, cy, r):
    return ell(cx, cy, r, r)


def poly(pts):
    """다각형 (Pillow polygon은 안티에일리어싱이 없다 → 칸이 또렷)"""
    img = Image.new('L', (N, N), 0)
    ImageDraw.Draw(img).polygon([(x, y) for x, y in pts], fill=255)
    px = img.load()
    return {(x, y) for y in range(N) for x in range(N) if px[x, y]}


def capsule(x0, y0, x1, y1, r):
    """두께 r인 막대 (끝이 둥글다)"""
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


def tube(spine, r0, r1):
    """곡선(점 목록)을 따라 굵기가 r0→r1로 변하는 관 (촉수·회오리 띠).
    점 사이를 잘게 나눠 동그라미를 찍어 이어 붙인다"""
    out = set()
    segs = len(spine) - 1
    for i in range(segs):
        (ax, ay), (bx, by) = spine[i], spine[i + 1]
        steps = max(2, int(math.hypot(bx - ax, by - ay) * 3))
        for k in range(steps + 1):
            t = (i + k / steps) / segs
            x, y = ax + (bx - ax) * k / steps, ay + (by - ay) * k / steps
            r = r0 + (r1 - r0) * t
            out |= disc(x, y, max(r, 0.5))
    return out


def blade(x0, y0, x1, y1, w, bend=0.0, sharp=1.0):
    """양 끝이 뾰족한 잎/날 모양. w: 가운데 폭(반폭), bend: 휘는 정도(칸).
    sharp가 클수록 끝이 더 가늘다"""
    L = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    nx, ny = -uy, ux
    left, right = [], []
    n = 16
    for i in range(n + 1):
        t = i / n
        cx = x0 + ux * L * t + nx * bend * math.sin(math.pi * t)
        cy = y0 + uy * L * t + ny * bend * math.sin(math.pi * t)
        hw = w * math.sin(math.pi * t) ** sharp
        left.append((cx + nx * hw, cy + ny * hw))
        right.append((cx - nx * hw, cy - ny * hw))
    return poly(left + right[::-1])


def xf(pts, cx, cy, ang):
    """로컬 좌표(u: 앞쪽, v: 옆)를 화면 좌표로 회전·이동"""
    ca, sa = math.cos(ang), math.sin(ang)
    return [(cx + u * ca - v * sa, cy + u * sa + v * ca) for u, v in pts]


def star_pts(cx, cy, R, r, ang=-math.pi / 2, n=5):
    pts = []
    for i in range(n * 2):
        a = ang + i * math.pi / n
        rr = R if i % 2 == 0 else r
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def bolt_pts(x, y, s=1.0):
    """번개 모양 (위 넓고 아래 뾰족). (x, y)는 위 왼쪽 기준, s는 배율"""
    base = [(5, 0), (13, 0), (9, 7), (14, 7), (3, 22), (6, 11), (1, 11)]
    return [(x + px * s, y + py * s) for px, py in base]


# ── 명암 ─────────────────────────────────────────────────────────
def shade(s, mask, ramp, sep=False, flat=None):
    """마스크를 재질 팔레트로 칠한다.
    - 왼쪽/위가 비어 있는 칸 = 빛 받는 가장자리 → 하이라이트
    - 오른쪽/아래가 비어 있는 칸 = 그늘 → 가장 어두운 색
    - 나머지는 덩어리 안 위치(왼쪽 위→오른쪽 아래)로 밝음/중간
    sep=True면 먼저 칠한 다른 부위와 맞닿은 칸을 안쪽 선색으로 (부위가 또렷이 갈라진다)
    flat: 0~3을 주면 그 단계 하나로만 칠한다"""
    cols, line = RAMPS[ramp]
    m = {p for p in mask if 0 <= p[0] < N and 0 <= p[1] < N}
    if not m:
        return
    xs = [p[0] for p in m]
    ys = [p[1] for p in m]
    x0, y0 = min(xs), min(ys)
    w, h = max(1, max(xs) - x0), max(1, max(ys) - y0)
    before = {(x, y) for (x, y) in m if s.get(x, y)[3] > 0}
    for (x, y) in m:
        if flat is not None:
            s.px(x, y, cols[flat])
            continue
        t = ((x - x0) / w + (y - y0) / h) / 2
        tl = (x - 1, y) not in m or (x, y - 1) not in m
        br = (x + 1, y) not in m or (x, y + 1) not in m
        br2 = (x + 2, y) not in m or (x, y + 2) not in m
        tone = 1 if t < 0.5 else 2
        if tl and not br:
            tone = 0 if t < 0.6 else 1
        elif br and not tl:
            tone = 3
        elif br2 and tone == 1:
            tone = 2
        s.px(x, y, cols[tone])
    if sep:
        for (x, y) in m:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if q not in m and q in before | _painted(s, m, q):
                    s.px(x, y, line)
                    break


def _painted(s, m, q):
    """q가 이 부위 밖에서 이미 칠해진 칸이면 {q}"""
    return {q} if q not in m and s.get(*q)[3] > 0 else set()


def fill(s, mask, c):
    for (x, y) in mask:
        s.px(x, y, c)


def sparkle(s, x, y, big=False, c=SPARK):
    """4갈래 반짝이 (가운데 흰색)"""
    arm = 2 if big else 1
    for k in range(1, arm + 1):
        cc = c if k == arm or not big else c
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            s.px(x + dx, y + dy, cc)
    s.px(x, y, WHITE)


def dot(s, x, y, c=SPARK):
    s.px(x, y, c)


# ── 아이콘 17종 ──────────────────────────────────────────────────
def baby_star():
    """별똥별: 오른쪽 위에서 빛나는 금빛 별 + 왼쪽 아래로 남는 꼬리"""
    s = Sprite(N, N)
    # 꼬리 (뒤에서부터 3줄, 바깥이 연한 주황 → 안쪽 노랑)
    shade(s, tube([(3, 29), (9, 23), (15, 17)], 1.2, 4.2), 'orange')
    shade(s, tube([(6, 28), (11, 22), (16, 17)], 0.6, 2.6), 'bolt', flat=1)
    shade(s, tube([(2, 22), (8, 19)], 0.5, 1.3), 'orange')
    shade(s, tube([(9, 30), (13, 25)], 0.5, 1.3), 'orange')
    # 별
    shade(s, poly(star_pts(19.5, 12.5, 11, 5, ang=-math.pi / 2 - 0.25)), 'gold', sep=True)
    # 별 가운데 반짝 (볼록한 느낌)
    fill(s, {(17, 10), (18, 10), (17, 11)}, '#FFF7B0')
    s.outline(OUTLINE)
    sparkle(s, 29, 3)
    dot(s, 4, 15)
    dot(s, 26, 27)
    return s


def baby_halo():
    """후광 부메랑: 비스듬히 기운 금빛 고리 + 도는 방향 바람 선"""
    s = Sprite(N, N)
    ang = -0.35
    ring = ell(16, 16, 13, 8, ang) - ell(16.3, 15.6, 8.6, 4.2, ang)
    shade(s, ring, 'gold')
    # 고리 위 보석 3개 (후광 장식)
    for (x, y) in ((9, 13), (21, 7), (24, 20)):
        fill(s, {(x, y), (x + 1, y)}, '#FFFFFF')
    s.outline(OUTLINE)
    # 회전 바람 선 (외곽선 밖, 밝은 색)
    for (x, y) in ((2, 21), (2, 22), (3, 23), (4, 24), (5, 25)):
        dot(s, x, y, '#FFF7B0')
    for (x, y) in ((29, 10), (29, 9), (28, 8), (27, 7), (26, 6)):
        dot(s, x, y, '#FFF7B0')
    sparkle(s, 5, 5, big=True)
    sparkle(s, 27, 27)
    return s


def baby_feather():
    """깃털 폭풍: 소용돌이치며 흩날리는 흰 깃털 3개"""
    s = Sprite(N, N)
    # 바람 소용돌이 띠 (뒤)
    shade(s, tube([(5, 22), (9, 27), (17, 28), (25, 24)], 0.6, 1.4), 'cyan', flat=1)
    shade(s, tube([(27, 9), (22, 4), (14, 3)], 1.4, 0.6), 'cyan', flat=1)
    feathers = [
        (4, 18, 17, 4, 3.6, -2.0),   # 왼쪽 위로 뻗는 큰 깃털
        (14, 27, 28, 12, 3.4, 2.0),  # 오른쪽 아래 깃털
        (9, 14, 20, 22, 2.4, 1.4),   # 가운데 작은 깃털
    ]
    for x0, y0, x1, y1, w, b in feathers:
        shade(s, blade(x0, y0, x1, y1, w, bend=b, sharp=0.7), 'white', sep=True)
        # 깃대 (가운데 줄)
        n = 10
        for i in range(1, n):
            t = i / n
            L = math.hypot(x1 - x0, y1 - y0)
            nx, ny = -(y1 - y0) / L, (x1 - x0) / L
            x = x0 + (x1 - x0) * t + nx * b * math.sin(math.pi * t)
            y = y0 + (y1 - y0) * t + ny * b * math.sin(math.pi * t)
            s.px(int(x), int(y), RAMPS['white'][0][3])
    s.outline(OUTLINE)
    sparkle(s, 28, 27, big=True)
    sparkle(s, 3, 4)
    return s


def teen_slash():
    """삼연참: 비스듬한 청록 참격 세 줄 (가운데 흰 심)"""
    s = Sprite(N, N)
    for k, off in enumerate((-8, 0, 8)):
        x0, y0 = 6 + off, 27 + off * 0.1
        x1, y1 = 26 + off * 0.2, 4 + off
        m = blade(4 + off, 26, 22 + off, 5, 2.6 if k == 1 else 2.0, bend=-2.4, sharp=1.4)
        shade(s, m, 'cyan')
        # 날 가운데 흰 심
        core = blade(5 + off, 25, 21 + off, 6, 0.9, bend=-2.6, sharp=1.4)
        fill(s, core & m, WHITE)
    s.outline(OUTLINE)
    sparkle(s, 27, 4, big=True)
    sparkle(s, 4, 27)
    return s


def teen_dash():
    """섬광 돌진: 오른쪽 위를 찌르는 검 + 뒤로 길게 남는 빛줄기"""
    s = Sprite(N, N)
    ang = -math.pi / 4  # 오른쪽 위
    # 빛줄기 (검 뒤쪽)
    for v, ln, r in ((-5, 12, 1.0), (0, 15, 1.6), (5, 11, 1.0)):
        a = xf([(-15, v), (-15 + ln, v)], 16, 16, ang)
        shade(s, capsule(*a[0], *a[1], r), 'cyan', flat=1 if r < 1.5 else 0)
    # 칼날
    shade(s, poly(xf([(-5, -1.9), (9, -1.9), (14.5, 0), (9, 1.9), (-5, 1.9)], 16, 16, ang)), 'steel', sep=True)
    # 날 가운데 홈 (빛)
    a = xf([(-4, 0), (10, 0)], 16, 16, ang)
    s.line(round(a[0][0]), round(a[0][1]), round(a[1][0]), round(a[1][1]), WHITE)
    # 코등이·손잡이·끝장식
    shade(s, poly(xf([(-7, -5.5), (-5, -5.5), (-5, 5.5), (-7, 5.5)], 16, 16, ang)), 'gold', sep=True)
    shade(s, poly(xf([(-12, -1.3), (-7, -1.3), (-7, 1.3), (-12, 1.3)], 16, 16, ang)), 'brown', sep=True)
    c = xf([(-13, 0)], 16, 16, ang)[0]
    shade(s, disc(c[0], c[1], 1.7), 'gold', sep=True)
    s.outline(OUTLINE)
    sparkle(s, 28, 3, big=True)
    dot(s, 3, 13, '#8FF4FF')
    dot(s, 18, 29, '#8FF4FF')
    return s


def teen_laurel():
    """월계수 칼날비: 날카로운 초록 잎이 아래로 쏟아진다 (잎 가장자리에 칼날 빛)"""
    s = Sprite(N, N)
    leaves = [
        (21, 2, 26, 15, 2.6, 1.0),   # 오른쪽 위
        (6, 4, 11, 17, 2.6, 1.0),    # 왼쪽 위
        (12, 11, 19, 29, 3.8, -1.2), # 가운데 큰 잎
        (24, 16, 28, 27, 2.2, 0.8),  # 오른쪽 아래
        (3, 19, 7, 29, 2.0, 0.8),    # 왼쪽 아래
    ]
    for x0, y0, x1, y1, w, b in leaves:
        m = blade(x0, y0, x1, y1, w, bend=b, sharp=0.9)
        shade(s, m, 'leaf', sep=True)
        # 잎맥 (가운데 진한 줄)
        s.line(int(x0 + (x1 - x0) * 0.2), int(y0 + (y1 - y0) * 0.2),
               int(x0 + (x1 - x0) * 0.8), int(y0 + (y1 - y0) * 0.8), RAMPS['leaf'][0][3])
        # 칼날처럼 번쩍이는 끝
        s.px(int(x1 - (x1 - x0) * 0.08), int(y1 - (y1 - y0) * 0.08), WHITE)
    s.outline(OUTLINE)
    # 떨어지는 속도선
    for x, y in ((16, 3), (16, 4), (16, 5), (29, 6), (29, 7), (2, 11), (2, 12)):
        dot(s, x, y, '#C2F48E')
    sparkle(s, 28, 30)
    return s


def adult_whirl():
    """회오리 검무: 아래로 좁아지는 주황 회오리 + 그 속을 가르는 검"""
    s = Sprite(N, N)
    # 회오리 띠 (위가 넓고 아래가 좁다, 띠마다 살짝 엇갈림)
    bands = [(16, 7, 13, 4.2), (17, 13, 10, 3.6), (15, 18.5, 7.5, 3.0), (16.5, 23.5, 5, 2.4), (15.5, 27.5, 2.8, 1.8)]
    for cx, cy, rx, ry in bands:
        m = ell(cx, cy, rx, ry) - ell(cx + 1.2, cy - 1.3, rx - 1.6, ry - 0.6)
        shade(s, m, 'orange', sep=True)
    # 검 (오른쪽 위→왼쪽 아래로 회오리를 관통)
    ang = math.pi * 0.75
    shade(s, poly(xf([(-3, -1.4), (11, -1.4), (15, 0), (11, 1.4), (-3, 1.4)], 18, 14, ang)), 'steel', sep=True)
    shade(s, poly(xf([(-5, -4), (-3, -4), (-3, 4), (-5, 4)], 18, 14, ang)), 'gold', sep=True)
    shade(s, poly(xf([(-9, -1.1), (-5, -1.1), (-5, 1.1), (-9, 1.1)], 18, 14, ang)), 'brown', sep=True)
    s.outline(OUTLINE)
    for x, y in ((1, 12), (2, 13), (30, 16), (29, 17)):
        dot(s, x, y, '#FFE2A8')
    sparkle(s, 27, 25, big=True)
    return s


def adult_shield():
    """방패 강타: 둥근 청동 방패가 내리찍힌다 (아래 충격 선)"""
    s = Sprite(N, N)
    cx, cy = 15.5, 13.5
    # 아래쪽 충격 파편 (방패 뒤)
    for pts in (((3, 26), (8, 21)), ((28, 26), (23, 21)), ((16, 30), (16, 26))):
        shade(s, capsule(*pts[0], *pts[1], 1.1), 'bolt', flat=1)
    shade(s, ell(15.5, 27, 12, 2.4) - ell(15.5, 26.3, 9, 1.6), 'bolt')
    # 방패: 테두리 → 안쪽 판 → 무늬 → 가운데 볼록 장식
    shade(s, disc(cx, cy, 12), 'bronze')
    shade(s, disc(cx, cy, 9.3), 'gold', sep=True)
    shade(s, poly(star_pts(cx, cy, 8.2, 3.6)), 'bronze', sep=True)
    shade(s, disc(cx, cy, 3), 'gold', sep=True)
    fill(s, {(14, 12)}, WHITE)
    # 테두리 리벳
    for a in range(8):
        r = 10.7
        x = cx + r * math.cos(a * math.pi / 4 + math.pi / 8)
        y = cy + r * math.sin(a * math.pi / 4 + math.pi / 8)
        s.px(int(x), int(y), '#FFE9A0')
    s.outline(OUTLINE)
    # 내리찍는 속도선 (위쪽)
    for x in (4, 27):
        for y in (2, 3, 4):
            dot(s, x, y, '#FFE9A0')
    sparkle(s, 29, 22)
    sparkle(s, 2, 22)
    return s


def adult_meteor():
    """천공의 일격 (궁극기): 불타는 검이 유성처럼 내리꽂힌다 + 땅의 충격"""
    s = Sprite(N, N)
    ang = math.pi * 0.62  # 오른쪽 위 → 왼쪽 아래로 꽂힘
    cx, cy = 17, 13
    # 불꽃 꼬리 (검을 감싸는 큰 불덩어리, 뒤가 넓다)
    flame = poly(xf([(14, 0), (6, -6), (-4, -8.5), (-13, -5), (-17, -2), (-12, 0), (-17, 3),
                     (-12, 5.5), (-4, 8.5), (6, 6)], cx, cy, ang))
    shade(s, flame, 'fire')
    inner = poly(xf([(12, 0), (5, -3.6), (-4, -5), (-11, -2), (-6, 0), (-11, 2.5),
                     (-4, 5), (5, 3.6)], cx, cy, ang))
    shade(s, inner, 'bolt', flat=1)
    # 검: 칼날(하얗게 달궈짐) → 코등이 → 손잡이
    shade(s, poly(xf([(-3, -1.6), (10, -1.6), (15, 0), (10, 1.6), (-3, 1.6)], cx, cy, ang)), 'steel', sep=True)
    a = xf([(-2, 0), (12, 0)], cx, cy, ang)
    s.line(round(a[0][0]), round(a[0][1]), round(a[1][0]), round(a[1][1]), WHITE)
    shade(s, poly(xf([(-5.5, -4.5), (-3, -4.5), (-3, 4.5), (-5.5, 4.5)], cx, cy, ang)), 'gold', sep=True)
    shade(s, poly(xf([(-10, -1.3), (-5.5, -1.3), (-5.5, 1.3), (-10, 1.3)], cx, cy, ang)), 'red', sep=True)
    c = xf([(-11, 0)], cx, cy, ang)[0]
    shade(s, disc(c[0], c[1], 1.6), 'gold', sep=True)
    # 꽂힌 자리 충격파
    tip = xf([(15, 0)], cx, cy, ang)[0]
    shade(s, ell(tip[0], tip[1] + 1, 7, 2) - ell(tip[0], tip[1] + 0.3, 4.6, 1.2), 'fire')
    s.outline(OUTLINE)
    sparkle(s, 4, 4, big=True)
    sparkle(s, 28, 26, big=True)
    for x, y in ((29, 4), (2, 17), (24, 30)):
        dot(s, x, y, '#FFF6C0')
    return s


def zeus_bolt():
    """낙뢰: 화면을 가르는 큰 노란 번개"""
    s = Sprite(N, N)
    pts = [(14, 1), (25, 1), (19, 11), (26, 11), (9, 31), (12, 17), (6, 17)]
    shade(s, poly(pts), 'bolt')
    # 번개 가운데 흰 심 (번쩍)
    core = [(16, 3), (21, 3), (16, 13), (21, 13), (12, 25), (14, 15), (10, 15)]
    fill(s, poly(core), '#FFFFF2')
    s.outline(OUTLINE)
    sparkle(s, 5, 6, big=True)
    sparkle(s, 27, 22, big=True)
    dot(s, 28, 4)
    dot(s, 4, 26)
    return s


def zeus_storm():
    """천둥 폭풍: 짙은 먹구름 아래로 번개 두 줄기"""
    s = Sprite(N, N)
    # 번개 (구름 뒤에서 나온다)
    shade(s, poly(bolt_pts(7, 12, 0.85)), 'bolt')
    shade(s, poly(bolt_pts(17, 13, 0.75)), 'bolt')
    # 먹구름 (동그라미 여러 개)
    cloud = disc(9, 12, 6) | disc(16, 8, 7) | disc(24, 12, 5.5) | ell(16, 15, 13, 4)
    shade(s, cloud, 'storm', sep=True)
    # 구름 위쪽 은빛 테
    for (x, y) in ((13, 2), (14, 2), (15, 1), (16, 1), (17, 1), (5, 8), (6, 7), (22, 7), (23, 7)):
        if (x, y) in cloud:
            s.px(x, y, '#E6E2FF')
    s.outline(OUTLINE)
    # 빗줄기
    for x, y in ((4, 23), (5, 25), (27, 21), (26, 23), (24, 27), (14, 27)):
        dot(s, x, y, '#A6D0FF')
    sparkle(s, 28, 28, big=True)
    return s


def zeus_judgment():
    """올림포스의 심판 (궁극기): 금빛 신전 위로 번개가 쏟아진다"""
    s = Sprite(N, N)
    # 뒤쪽 후광 빛살
    for a in range(8):
        aa = a * math.pi / 4 + math.pi / 8
        x1, y1 = 16 + 14.5 * math.cos(aa), 17 + 14.5 * math.sin(aa)
        shade(s, capsule(16, 17, x1, y1, 1.1), 'gold', flat=1)
    # 번개 3줄기 (신전 위)
    shade(s, poly(bolt_pts(1, 0, 0.62)), 'bolt')
    shade(s, poly(bolt_pts(21, 0, 0.62)), 'bolt')
    shade(s, poly([(13, 0), (19, 0), (17, 4), (20, 4), (14, 11), (15, 6), (12, 6)]), 'bolt')
    # 신전: 지붕(삼각) → 처마 → 기둥 4개 → 받침 2단
    shade(s, poly([(16, 8.5), (29, 14.5), (3, 14.5)]), 'gold', sep=True)
    shade(s, {(x, y) for x in range(4, 28) for y in range(15, 17)}, 'gold', sep=True)
    for x in (6, 11, 18, 23):
        shade(s, {(i, j) for i in range(x, x + 3) for j in range(17, 25)}, 'marble', sep=True)
    shade(s, {(x, y) for x in range(4, 28) for y in range(25, 27)}, 'gold', sep=True)
    shade(s, {(x, y) for x in range(2, 30) for y in range(27, 29)}, 'gold', sep=True)
    # 지붕 가운데 보석
    fill(s, {(15, 12), (16, 12), (15, 13), (16, 13)}, '#FF5A5A')
    s.px(15, 12, '#FFC8C0')
    s.outline(OUTLINE)
    sparkle(s, 2, 21)
    sparkle(s, 29, 21)
    return s


def poseidon_wave():
    """대해일: 크게 말려 올라가는 파도 (꼭대기 흰 거품)"""
    s = Sprite(N, N)
    # 파도 몸통: 큰 원에서 안쪽 원을 파내 말린 모양을 만든다
    body = disc(17, 15, 12.5) - disc(13.5, 17.5, 6.5)
    body -= {(x, y) for x in range(0, 12) for y in range(16, 32)}  # 왼쪽 아래를 비워 말린 끝이 보이게
    body |= {(x, y) for x in range(2, 30) for y in range(24, 29)}  # 바닥 물결
    body |= disc(5, 22.5, 3.2)
    shade(s, body, 'sea')
    # 안쪽(말린 속)은 더 진하게
    hollow = (disc(13.5, 17.5, 8.2) - disc(13.5, 17.5, 6.5)) & body
    fill(s, {p for p in hollow if p[0] > 12 and p[1] > 14}, RAMPS['sea'][0][3])
    # 거품: 꼭대기 가장자리 + 말린 끝
    for (x, y) in body:
        if (x, y - 1) not in body and y < 16:
            s.px(x, y, FOAM)
            if (x, y + 1) in body and y < 9:
                s.px(x, y + 1, FOAM)
    fill(s, {(3, 10), (4, 10), (3, 11), (4, 11), (5, 12)}, FOAM)
    for x in range(3, 29, 5):
        s.px(x, 24, FOAM)
        s.px(x + 1, 24, FOAM)
    s.outline(OUTLINE)
    # 물방울
    for x, y in ((2, 4), (29, 3), (8, 2)):
        dot(s, x, y, '#C8F4FF')
    sparkle(s, 26, 30)
    return s


def poseidon_trident():
    """삼지창 난무: 비스듬히 선 금빛 삼지창 + 끝 반짝"""
    s = Sprite(N, N)
    ang = -math.pi / 4
    cx, cy = 15, 17

    def P(pts):
        return poly(xf(pts, cx, cy, ang))

    # 자루
    shade(s, P([(-15, -1.2), (4, -1.2), (4, 1.2), (-15, 1.2)]), 'gold')
    # 가로대 + 양쪽 갈래 (미늘 끝)
    shade(s, P([(3, -7), (6, -7), (6, 7), (3, 7)]), 'gold', sep=True)
    shade(s, P([(5, -7), (11, -7), (14, -6), (11, -5.2), (11, -4.5), (5, -4.5)]), 'gold', sep=True)
    shade(s, P([(5, 7), (11, 7), (14, 6), (11, 5.2), (11, 4.5), (5, 4.5)]), 'gold', sep=True)
    # 가운데 갈래 (화살촉)
    shade(s, P([(5, -1.2), (11, -1.2), (11, -3), (16, 0), (11, 3), (11, 1.2), (5, 1.2)]), 'gold', sep=True)
    # 자루 끝 보석 + 손잡이 감은 끈
    e = xf([(-15, 0)], cx, cy, ang)[0]
    shade(s, disc(e[0], e[1], 2), 'sea', sep=True)
    for u in (-8, -6, -4):
        a = xf([(u, -1.2), (u, 1.2)], cx, cy, ang)
        s.line(round(a[0][0]), round(a[0][1]), round(a[1][0]), round(a[1][1]), RAMPS['blue'][0][2])
    s.outline(OUTLINE)
    sparkle(s, 28, 3, big=True)
    sparkle(s, 4, 10)
    sparkle(s, 22, 25)
    return s


def poseidon_kraken():
    """크라켄 강림 (궁극기): 바다에서 솟구치는 보라 촉수들"""
    s = Sprite(N, N)
    # 촉수 3개 (아래 굵고 끝은 가늘게 말린다)
    tents = [
        [(6, 28), (4, 21), (5, 14), (9, 9), (12, 11), (10, 14)],
        [(25, 28), (28, 21), (27, 13), (23, 6), (19, 6), (19, 9), (21, 10)],
        [(15, 29), (16, 22), (14, 14), (16, 6), (19, 3)],
    ]
    for sp, r0 in zip(tents, (3.4, 3.4, 3.8)):
        shade(s, tube(sp, r0, 0.8), 'purple', sep=True)
    # 빨판 (안쪽 분홍 점)
    for (x, y) in ((7, 22), (7, 18), (8, 14), (23, 21), (24, 17), (23, 13), (17, 21), (16, 17), (16, 13)):
        s.px(x, y, '#FFD6F4')
        s.px(x + 1, y, RAMPS['purple'][0][2])
    # 바다 (촉수 앞)
    sea = {(x, y) for x in range(1, 31) for y in range(26, 30)} | ell(16, 26, 15, 2)
    shade(s, sea, 'sea', sep=True)
    for x in range(2, 30, 4):
        s.px(x, 25, FOAM)
        s.px(x + 1, 25, FOAM)
    s.outline(OUTLINE)
    sparkle(s, 4, 4, big=True)
    sparkle(s, 28, 2)
    return s


def zeus_gigas():
    """거인 사냥: 번개와 헤라클레스의 금빛 화살이 X자로 교차"""
    s = Sprite(N, N)
    # 화살 (왼쪽 아래 → 오른쪽 위)
    shade(s, capsule(5, 27, 23, 9, 1.1), 'gold')
    shade(s, poly([(28, 4), (26, 13), (23.5, 10.5), (21, 8), (19, 6)]), 'steel', sep=True)
    # 깃
    shade(s, poly([(5, 27), (2, 25), (3, 22), (7, 25)]), 'red', sep=True)
    shade(s, poly([(5, 27), (7, 30), (10, 29), (7, 25)]), 'red', sep=True)
    # 번개 (왼쪽 위 → 오른쪽 아래)
    shade(s, poly([(3, 2), (11, 3), (13, 10), (19, 12), (29, 29), (14, 17), (8, 15), (7, 9)]), 'bolt', sep=True)
    fill(s, {(8, 6), (9, 7), (9, 8), (10, 11), (11, 12)}, '#FFFFF2')
    s.outline(OUTLINE)
    sparkle(s, 28, 18)
    sparkle(s, 17, 2, big=True)
    return s


def poseidon_nisyros():
    """니시로스 투척: 풀 덮인 섬 바위가 날아간다 (뒤로 속도선·흙 부스러기)"""
    s = Sprite(N, N)
    # 속도선 (뒤, 왼쪽 아래)
    for (a, b, r) in (((2, 20), (9, 17), 1.0), ((4, 28), (12, 23), 1.2), ((11, 30), (16, 27), 0.8)):
        shade(s, capsule(*a, *b, r), 'white', flat=1)
    # 바위 덩어리 (울퉁불퉁 다각형)
    rock = poly([(9, 11), (15, 7), (23, 6), (29, 10), (29, 17), (25, 24), (17, 27), (10, 24), (7, 17)])
    shade(s, rock, 'rock')
    # 금 간 자국
    s.line(18, 18, 22, 22, RAMPS['rock'][1])
    s.line(14, 21, 17, 18, RAMPS['rock'][1])
    # 풀 덮인 윗면
    grass = poly([(9, 11), (15, 7), (23, 6), (29, 10), (28, 13), (24, 12), (20, 14), (15, 13), (11, 15), (8, 14)])
    shade(s, grass, 'leaf', sep=True)
    # 작은 나무
    shade(s, {(19, 4), (19, 5), (19, 6), (19, 7)}, 'brown', flat=2)
    shade(s, disc(19, 2.5, 2.6), 'leaf', sep=True)
    # 날아가는 돌 부스러기
    shade(s, disc(5, 9, 1.4), 'rock')
    shade(s, disc(8, 4, 1.0), 'rock')
    s.outline(OUTLINE)
    sparkle(s, 29, 26, big=True)
    dot(s, 2, 14, '#EEF1F8')
    return s


ICONS = {
    'baby_star': baby_star, 'baby_halo': baby_halo, 'baby_feather': baby_feather,
    'teen_slash': teen_slash, 'teen_dash': teen_dash, 'teen_laurel': teen_laurel,
    'adult_whirl': adult_whirl, 'adult_shield': adult_shield, 'adult_meteor': adult_meteor,
    'zeus_bolt': zeus_bolt, 'zeus_storm': zeus_storm, 'zeus_judgment': zeus_judgment,
    'poseidon_wave': poseidon_wave, 'poseidon_trident': poseidon_trident, 'poseidon_kraken': poseidon_kraken,
    'zeus_gigas': zeus_gigas, 'poseidon_nisyros': poseidon_nisyros,
}
ULTIMATES = {'adult_meteor', 'zeus_judgment', 'poseidon_kraken'}


def save_icon(s, name):
    """assets/icons/<name>.png 로 8배 확대 저장 (common.save와 같은 방식, 폴더만 다름)"""
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + '.png')
    s.img.resize((s.w * UPSCALE, s.h * UPSCALE), Image.NEAREST).save(path)
    return path


def preview_sheet(sprites, path):
    """확인용: 윗줄은 6배 확대, 아랫줄은 게임 속 크기(버튼 44pt @2x = 88px, 아이콘 64px)로 동그란 버튼 위에"""
    scale, cell = 6, N * 6 + 12
    cols = 6
    rows = math.ceil(len(sprites) / cols)
    W = cols * cell + 12
    H = rows * (cell + 104) + 12
    img = Image.new('RGBA', (W, H), rgba('#2A2A34'))
    d = ImageDraw.Draw(img)
    for i, (name, s) in enumerate(sprites):
        cx, cy = 12 + (i % cols) * cell, 12 + (i // cols) * (cell + 104)
        d.rectangle([cx, cy, cx + N * scale - 1, cy + N * scale - 1], fill=rgba('#3A3A44'))
        img.alpha_composite(s.img.resize((N * scale, N * scale), Image.NEAREST), (cx, cy))
        # 게임 속 버튼: 지름 88px 원 + 64px 아이콘 (2배), 옆에 1배(44px 원 + 32px 아이콘)
        bg = '#C2410C' if name in ULTIMATES else '#8B6BFF'
        by = cy + N * scale + 8
        d.ellipse([cx, by, cx + 87, by + 87], fill=rgba(bg))
        img.alpha_composite(s.img.resize((64, 64), Image.NEAREST), (cx + 12, by + 12))
        d.ellipse([cx + 100, by + 22, cx + 143, by + 65], fill=rgba(bg))
        img.alpha_composite(s.img.resize((32, 32), Image.NEAREST), (cx + 106, by + 28))
    img.save(path)


if __name__ == '__main__':
    done = []
    for name, fn in ICONS.items():
        s = fn()
        save_icon(s, name)
        done.append((name, s))
    preview_sheet(done, '/tmp/pix-icons.png')
    print('saved', len(done), 'icons →', OUT)
