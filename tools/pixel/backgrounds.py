"""
맵 배경 3종을 도트(픽셀) 그림으로 만든다. (python3 tools/pixel/backgrounds.py)

    assets/sprites/bg_earth.png     신이 되기 전 숲 속 공터 (풀·흙길·꽃, 위쪽에 나무숲)
    assets/sprites/bg_zeus.png      올림포스 (대리석 타일 + 금 상감, 위쪽에 신전 벽·기둥, 아래 가장자리 구름)
    assets/sprites/bg_poseidon.png  바닷속 궁전 (모래 덮인 돌바닥·산호·해초·조개, 위쪽에 부서진 기둥, 물빛 무늬)

크기: 312 × 268 픽셀을 4배로 키워 저장 (1248 × 1072).
  - 맵 전체를 한 장으로 덮는다. 카메라는 가로로 움직이며 한 번에 약 42%만 보이므로
    한곳에 시선이 몰리는 큰 그림 대신 가로 전체에 고르게 장식을 흩뿌린다.
  - 위쪽 약 50픽셀은 위 HUD 뒤에 깔리는 원경 → 어둡고 대비를 낮춰 흰 글씨가 잘 읽히게.
  - 나머지는 캐릭터가 걷는 바닥 → 중간보다 약간 어두운 차분한 톤 (작은 캐릭터·밝은 이펙트가 돋보이게).
규칙: 그라데이션·안티에일리어싱 없이 정해진 색 단계만 쓴다. 넓은 명암 변화는 4×4 바이어(Bayer) 디더로.
같은 결과가 매번 나오도록 무작위 수는 고정 시드(random.Random)로 만든다.
"""
import math
import random

from common import Sprite, save, rgba

W, H = 312, 268
TOP = 50  # 원경(위 HUD 뒤) 높이

# 4×4 바이어 행렬 → 0~1 문턱값. 두 색 사이를 점 무늬로 섞을 때 쓴다 (그라데이션 대신)
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
BAYER = [[(v + 0.5) / 16 for v in row] for row in BAYER]


# ─────────────────────────── 공통 도구 ───────────────────────────
class Noise:
    """값 노이즈 (격자에 무작위 값을 두고 부드럽게 보간). 큰 얼룩 모양의 명암 변화를 만든다"""

    def __init__(self, seed, cell):
        self.r = random.Random(seed)
        self.cell = cell
        self.g = {}

    def _v(self, i, j):
        k = (i, j)
        if k not in self.g:
            self.g[k] = self.r.random()
        return self.g[k]

    def __call__(self, x, y):
        fx, fy = x / self.cell, y / self.cell
        i, j = math.floor(fx), math.floor(fy)
        tx, ty = fx - i, fy - j
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        a = self._v(i, j) + (self._v(i + 1, j) - self._v(i, j)) * tx
        b = self._v(i, j + 1) + (self._v(i + 1, j + 1) - self._v(i, j + 1)) * tx
        return a + (b - a) * ty


def fbm(seed, cell, octaves=3):
    """여러 크기의 노이즈를 겹친 것 (0~1)"""
    ns = [Noise(seed + k * 101, max(2, cell / (2 ** k))) for k in range(octaves)]

    def f(x, y):
        tot, amp, norm = 0.0, 1.0, 0.0
        for n in ns:
            tot += n(x, y) * amp
            norm += amp
            amp *= 0.5
        return tot / norm

    return f


def pick(ramp, v, x, y, soft=0.35):
    """0~1 값 v를 색 단계(ramp)로 바꾼다. 경계 근처만 바이어 디더로 섞어 계단이 덜 거칠게"""
    v = min(max(v, 0.0), 0.9999)
    t = v * len(ramp) - 0.5
    base = math.floor(t)
    frac = t - base
    thr = 0.5 + (BAYER[y % 4][x % 4] - 0.5) * soft * 2
    idx = base + (1 if frac > thr else 0)
    return ramp[min(max(idx, 0), len(ramp) - 1)]


def mul(c, k):
    """색을 k배 (그림자·하이라이트용). 정해진 배율만 써서 색 수가 늘지 않게 한다"""
    r, g, b, a = rgba(c)
    return (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)), 255)


def shade(s, x, y, k):
    if 0 <= x < s.w and 0 <= y < s.h:
        s.p[x, y] = mul(s.p[x, y], k)


def shadow_ellipse(s, cx, cy, rx, ry, k=0.72):
    """바닥에 드리운 그림자: 기존 바닥색을 어둡게 (모양은 딱 떨어지는 타원)"""
    for j in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for i in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1:
                shade(s, i, j, k)


def stamp(dst, art, x, y, outline=None):
    """작은 소품 그림을 외곽선 두르고 붙인다 (캐릭터와 같은 도트 게임 느낌)"""
    if outline:
        art.outline(outline)
    dst.paste(art, x, y)


def crack(s, rng, x, y, length, dark, light=None, y_min=TOP):
    """돌 틈 금: 한 칸씩 걸어가는 지그재그 선 + 아래쪽에 밝은 점(깨진 모서리 빛)"""
    dx = rng.choice((-1, 1))
    for _ in range(length):
        if y >= y_min:
            s.px(x, y, dark)
            if light and rng.random() < 0.45:
                s.px(x, y + 1, light)
        r = rng.random()
        if r < 0.55:
            x += dx
        elif r < 0.85:
            y += 1
        else:
            y -= 1
        if rng.random() < 0.12:
            dx = -dx
        if rng.random() < 0.08:  # 가지 갈라짐
            crack(s, rng, x, y, length // 3, dark, light, y_min)


def mood(s, seed, y0=TOP + 4, dark=0.84, light=1.07):
    """은은한 명암 얼룩 (구름 그늘처럼): 큰 노이즈를 3단계로 나눠 어둡게/그대로/밝게. 경계만 디더"""
    n = fbm(seed, 70, 2)
    for y in range(y0, H):
        for x in range(W):
            v = n(x, y) + (BAYER[y % 4][x % 4] - 0.5) * 0.04
            if v < 0.4:
                shade(s, x, y, dark)
            elif v > 0.63:
                shade(s, x, y, light)


def scatter(rng, n, x0, x1, y0, y1, min_d, avoid=None):
    """가로 전체에 고르게 흩뿌린 점 (서로 min_d 이상 떨어지게). 한쪽에 몰리지 않게 구간을 나눠 고른다"""
    pts = avoid[:] if avoid else []
    out = []
    slots = n
    for k in range(slots):
        sx0 = x0 + (x1 - x0) * k / slots
        sx1 = x0 + (x1 - x0) * (k + 1) / slots
        for _ in range(40):
            x, y = rng.uniform(sx0, sx1), rng.uniform(y0, y1)
            if all((x - px) ** 2 + (y - py) ** 2 >= min_d ** 2 for px, py in pts):
                pts.append((x, y))
                out.append((int(x), int(y)))
                break
    return out


# ─────────────────────────── 숲 (earth) ───────────────────────────
GRASS = ['#24331F', '#2C3D25', '#34482B', '#3D5331', '#475E37']  # 채도를 낮춘 풀 5단계
DIRT = ['#3A2E24', '#46372A', '#524131', '#5E4C3A']
LEAF = ['#121C14', '#18251A', '#1F3021', '#283C29', '#33492F']  # 원경 나무 (어둡게)
EOUT = '#11160F'


def path_y(x):
    """흙길 중심선: 가로 전체를 완만하게 굽이치며 지나간다 (한 화면에 굽이가 하나쯤 보이게)"""
    return 168 + 16 * math.sin(x / W * math.pi * 2 * 2.2 + 0.6) + 6 * math.sin(x / 23.0)


def tree_canopy(s, rng, cx, cy, r, ramp):
    """둥근 나무 덮개: 작은 잎 덩어리 원 여러 개를 겹치고, 왼쪽 위가 밝게"""
    blobs = [(cx + rng.uniform(-r * 0.6, r * 0.6), cy + rng.uniform(-r * 0.5, r * 0.4), r * rng.uniform(0.45, 0.7))
             for _ in range(7)]
    blobs.append((cx, cy, r * 0.8))
    for bx, by, br in blobs:
        for j in range(int(by - br) - 1, int(by + br) + 2):
            for i in range(int(bx - br) - 1, int(bx + br) + 2):
                d = ((i - bx) ** 2 + (j - by) ** 2) / (br * br)
                if d <= 1:
                    # 왼쪽 위에서 빛이 온다: 위치에 따라 밝기 단계
                    lit = 0.62 - ((i - bx) * 0.5 + (j - by)) / (br * 2.2) - d * 0.25
                    s.px(i, j, pick(ramp, lit, i, j, 0.5))


def bush(rng, r, ramp=None):
    """바닥의 작은 덤불 (외곽선 붙여 쓰는 소품)"""
    a = Sprite(r * 2 + 4, r * 2 + 2)
    ramp = ramp or ['#1C291B', '#263824', '#31482D', '#3E5936', '#4B6A3F']
    tree_canopy(a, rng, r + 2, r + 1, r, ramp)
    return a


def rock(rng, w, h, ramp):
    a = Sprite(w + 2, h + 2)
    cx, cy = (w + 1) / 2, (h + 1) / 2
    for j in range(h + 2):
        for i in range(w + 2):
            d = ((i - cx) / (w / 2)) ** 2 + ((j - cy) / (h / 2)) ** 2
            if d <= 1:
                lit = 0.55 - ((i - cx) / w + (j - cy) / h) * 0.9
                a.px(i, j, pick(ramp, lit, i, j, 0.2))
    return a


def make_earth():
    s = Sprite(W, H)
    rng = random.Random(7)
    big = fbm(11, 48, 3)
    fine = fbm(12, 6, 2)
    pathn = fbm(13, 9, 2)

    # 1) 바닥: 풀 (큰 얼룩 + 잔 무늬), 흙길
    for y in range(H):
        for x in range(W):
            v = big(x, y) * 0.75 + fine(x, y) * 0.35 - 0.12
            c = pick(GRASS, v, x, y)
            d = abs(y - path_y(x)) - (9 + (pathn(x, y) - 0.5) * 8)
            if d < 0:
                c = pick(DIRT, big(x + 500, y) * 0.6 + fine(x, y) * 0.5 - 0.05, x, y)
            elif d < 1.5:
                c = GRASS[0]  # 길 가장자리에 풀 그늘 한 줄
            s.px(x, y, c)

    # 2) 풀잎 무늬: 밝은 V자 (작게, 고르게)
    for x, y in scatter(rng, 260, 0, W, TOP + 4, H, 5):
        if abs(y - path_y(x)) < 13:
            continue
        col = rng.choice(GRASS[3:])
        s.px(x, y, col)
        s.px(x - 1, y - 1, col)
        s.px(x + 1, y - 1, col)
        s.px(x, y + 1, GRASS[0])

    # 3) 흙길 위 자갈, 바퀴 자국 같은 어두운 점
    for x in range(0, W, 2):
        for _ in range(2):
            if rng.random() < 0.35:
                py = int(path_y(x) + rng.uniform(-7, 7))
                s.px(x, py, rng.choice((DIRT[3], '#6B5A47')))
                s.px(x, py + 1, DIRT[0])

    # 4) 원경: 어두운 숲 (뒤 줄은 더 어둡게, 앞 줄은 조금 밝게) — 위 HUD 글씨가 묻히지 않게 대비 낮춤
    s.rect(0, 0, W, TOP + 6, LEAF[0])
    back = ['#0E1610', '#121C14', '#16221A', '#1B2A1E']
    for cx in range(-10, W + 20, 17):
        tree_canopy(s, rng, cx + rng.uniform(-4, 4), 14 + rng.uniform(-6, 4), 13, back)
    # 줄기 (앞 줄 나무 아래로 살짝 보이게)
    trunks = []
    for cx in range(4, W + 20, 26):
        tx = int(cx + rng.uniform(-5, 5))
        trunks.append(tx)
        s.rect(tx - 2, 34, 4, TOP + 4 - 34, '#1E1712')
        s.vline(tx - 2, 34, TOP + 4 - 34, '#2A2019')
    for tx in trunks:
        tree_canopy(s, rng, tx + rng.uniform(-3, 3), 30 + rng.uniform(-3, 3), 15, LEAF)
    # 숲 가장자리 그늘: 바닥 윗부분을 두 단계로 어둡게 (디더 경계)
    for y in range(TOP - 2, TOP + 14):
        for x in range(W):
            if s.p[x, y][:3] == rgba(LEAF[0])[:3]:
                continue
            k = 0.55 if y < TOP + 6 else 0.78
            if y >= TOP + 6 and BAYER[y % 4][x % 4] < (y - TOP - 6) / 8:
                continue
            shade(s, x, y, k)
    # 숲 아래 가장자리에 풀 덤불 (원경과 바닥의 경계를 부드럽게)
    edge_ramp = ['#152016', '#1B291B', '#223322', '#2A3E28', '#33492F']
    x = -6
    while x < W + 4:
        r = rng.choice((3, 4, 5, 6))
        b = bush(rng, r, edge_ramp)
        stamp(s, b, x, TOP + 1 - r + rng.randint(-2, 3), EOUT)
        x += r + rng.randint(2, 7)

    mood(s, 14)
    # 어두운 풀 덤불 무늬 (큰 잎 그늘, 바닥이 밋밋하지 않게)
    for x, y in scatter(rng, 40, 0, W, TOP + 14, H, 14):
        if abs(y - path_y(x)) < 14:
            continue
        for k in range(rng.randint(3, 6)):
            gx, gy = x + rng.randint(-3, 3), y + rng.randint(-2, 2)
            s.px(gx, gy, GRASS[0])
            s.px(gx, gy - 1, GRASS[1])
            s.px(gx + 1, gy - 2, GRASS[4] if k % 2 else GRASS[3])
    # 5) 바닥 소품: 덤불, 돌, 그루터기, 꽃 (가로로 고르게, 길은 피해서)
    pts = []
    for x, y in scatter(rng, 9, 6, W - 10, TOP + 22, H - 14, 26):
        if abs(y - path_y(x)) < 20:
            y = int(path_y(x) + rng.choice((-1, 1)) * rng.uniform(26, 40))
            y = min(max(y, TOP + 22), H - 14)
        pts.append((x, y))
        r = rng.choice((5, 6, 7))
        shadow_ellipse(s, x + 2, y + r + 1, r + 2, 2.5)
        stamp(s, bush(rng, r), x - r - 2, y - r, EOUT)
    rock_ramp = ['#3B3C3A', '#4C4D49', '#5E5F59', '#71716A']
    for x, y in scatter(rng, 12, 4, W - 8, TOP + 16, H - 6, 18, pts):
        w = rng.choice((5, 6, 8))
        h = w - 2
        shadow_ellipse(s, x + w / 2 + 1, y + h + 1, w / 2 + 1, 1.5)
        stamp(s, rock(rng, w, h, rock_ramp), x, y, EOUT)
        pts.append((x, y))
    # 그루터기 몇 개
    for x, y in scatter(rng, 3, 30, W - 30, TOP + 30, H - 20, 40, pts):
        a = Sprite(10, 9)
        a.rect(1, 3, 8, 6, '#4A3526')
        a.vline(1, 3, 6, '#5C4330')
        a.vline(8, 3, 6, '#38281D')
        a.ellipse(4.5, 2.5, 4, 2, '#7A6247')
        a.ellipse(4.5, 2.5, 2, 1, '#5C4A36')
        a.px(4, 2, '#8C7355')
        shadow_ellipse(s, x + 6, y + 9, 6, 2)
        stamp(s, a, x, y, EOUT)
        pts.append((x, y))
    # 꽃: 작은 3점 꽃 (빨강·노랑·흰색, 채도 살짝 낮게) — 무리 지어 조금씩
    flower_cols = ['#C9A94A', '#B8565A', '#C8C3B0', '#8E7CC0']
    for x, y in scatter(rng, 26, 2, W - 4, TOP + 14, H - 4, 10, pts):
        if abs(y - path_y(x)) < 14:
            continue
        col = rng.choice(flower_cols)
        for _ in range(rng.randint(2, 4)):
            fx, fy = x + rng.randint(-4, 4), y + rng.randint(-3, 3)
            s.px(fx, fy + 1, GRASS[0])
            s.px(fx, fy, col)
            if rng.random() < 0.5:
                s.px(fx + 1, fy, mul(col, 0.75))
    return s


# ─────────────────────────── 올림포스 (zeus) ───────────────────────────
MARBLE = ['#4C485F', '#57536B', '#625E77', '#6D6983', '#78748F']  # 바닥 대리석 (중간보다 살짝 어둡게)
GROUT = '#34304A'
GOLD = ['#6E5220', '#957027', '#BE9235', '#DDBB5E']
WALL = ['#24223A', '#2B2944', '#33304E', '#3B3858']
COL = ['#3E3B5C', '#4C4970', '#5A5782', '#6A6794']
ZOUT = '#17142A'


def make_zeus():
    s = Sprite(W, H)
    rng = random.Random(21)
    big = fbm(31, 60, 3)
    vein = fbm(32, 14, 3)
    TS = 16  # 타일 한 칸
    ox, oy = 4, TOP + 4  # 타일 격자 시작점 (원경 바로 아래)

    # 1) 대리석 타일: 타일마다 밝기가 조금씩 다르고, 결(맥) 무늬, 위·왼쪽 모서리 밝게, 아래·오른쪽 어둡게
    tone = {}
    for y in range(TOP, H):
        for x in range(W):
            tx, ty = (x - ox) // TS, (y - oy) // TS
            lx, ly = (x - ox) % TS, (y - oy) % TS
            if (tx, ty) not in tone:
                # 바둑판처럼 한 칸 건너 살짝 진하게 + 칸마다 조금씩 다르게
                tone[(tx, ty)] = rng.uniform(-0.1, 0.1) + (0.07 if (tx + ty) % 2 else -0.05)
            v = 0.45 + tone[(tx, ty)] + (big(x, y) - 0.5) * 0.5
            vv = vein(x + tx * 37, y)
            if abs(vv - 0.5) < 0.018:  # 대리석 결: 노이즈 등고선 한 줄
                v -= 0.28
            c = pick(MARBLE, v, x, y)
            if lx == 0 or ly == 0:
                c = GROUT
            elif lx == 1 or ly == 1:
                c = mul(c, 1.12)
            elif lx == TS - 1 or ly == TS - 1:
                c = mul(c, 0.84)
            s.px(x, y, c)

    # 2) 금 상감: 가로 띠 두 줄 (바닥 가운데쯤, 타일 줄눈 위) + 띠 사이 마름모
    band_rows = [oy + TS * 6, oy + TS * 8]
    for by in band_rows:
        s.hline(0, by - 1, W, GOLD[0])
        s.hline(0, by, W, GOLD[2])
        s.hline(0, by + 1, W, GOLD[1])
        for x in range(0, W, 4):
            s.px(x, by, GOLD[3])
    for k in range(-1, W // TS + 2):
        cx, cy = ox + k * TS * 2 + TS, oy + TS * 7
        for j in range(-3, 4):
            w = 3 - abs(j)
            for i in range(-w, w + 1):
                s.px(cx + i, cy + j, GOLD[1] if (i + j) > 0 else GOLD[2])
        s.px(cx, cy - 3, GOLD[3])
        s.px(cx, cy, GOLD[3])
    # 줄눈 교차점 몇 곳에 작은 금 장식 (가로 전체에 고르게)
    for k in range(W // TS + 2):
        for m in range(0, 14):
            if (k * 7 + m * 3) % 5 == 0 and oy + m * TS not in band_rows:
                cx, cy = ox + k * TS, oy + m * TS
                if cy < TOP + 8 or abs(cy - (oy + TS * 7)) < 3:
                    continue
                s.px(cx, cy, GOLD[2])
                s.px(cx - 1, cy, GOLD[1])
                s.px(cx + 1, cy, GOLD[1])
                s.px(cx, cy - 1, GOLD[1])
                s.px(cx, cy + 1, GOLD[0])

    # 3) 금 간 타일, 깨진 모서리 (오래된 신전 느낌)
    for x, y in scatter(rng, 16, 0, W, TOP + 12, H - 30, 22):
        crack(s, rng, x, y, rng.randint(6, 14), '#36324A')
    for _ in range(14):
        tx, ty = rng.randint(0, W // TS), rng.randint(1, 12)
        x, y = ox + tx * TS + 1, oy + ty * TS + 1
        for j in range(3):
            for i in range(3 - j):
                s.px(x + i, y + j, GROUT)

    mood(s, 33)
    # 무너진 기둥 조각·돌 부스러기 (가로로 고르게 몇 개)
    drum = ['#4A4768', '#5A5780', '#6C6994', '#7E7BA6']
    pts = []
    for x, y in scatter(rng, 7, 8, W - 20, TOP + 20, H - 40, 40):
        if abs(y - (oy + TS * 7)) < 22:
            y += 30
        pts.append((x, y))
        a = Sprite(16, 16)
        # 부러진 기둥 밑동을 위에서 본 모양: 네모 받침돌 + 둥근 단면(가장자리 홈) + 금 간 윗면
        a.rect(0, 1, 16, 15, drum[0])
        a.hline(0, 1, 16, drum[1])
        a.vline(0, 1, 15, drum[1])
        a.ellipse(7.5, 7.5, 6.5, 6.5, drum[1])
        a.ellipse(7.5, 7.5, 5.5, 5.5, drum[2])
        a.ellipse(6.5, 6.5, 3, 3, drum[3])
        for k in range(12):  # 세로 홈 끝이 단면 둘레에 점으로
            ang = k / 12 * math.pi * 2
            a.px(round(8 + math.cos(ang) * 6), round(8 + math.sin(ang) * 6), drum[0])
        a.line(5, 9, 9, 12, '#3A3654')
        a.line(9, 12, 11, 11, '#3A3654')
        shadow_ellipse(s, x + 10, y + 15, 8, 2.5)
        stamp(s, a, x, y, ZOUT)
    for x, y in scatter(rng, 14, 4, W - 6, TOP + 14, H - 24, 16, pts):
        for _ in range(rng.randint(2, 4)):
            rx, ry = x + rng.randint(-4, 4), y + rng.randint(-3, 3)
            w = rng.choice((2, 3))
            s.rect(rx, ry, w, 2, drum[2])
            s.hline(rx, ry, w, drum[3])
            s.hline(rx, ry + 2, w, ZOUT)

    # 4) 원경: 신전 벽 (어둡고 대비 낮게) + 기둥 줄
    for y in range(0, TOP + 4):
        for x in range(W):
            v = 0.35 + (big(x + 900, y) - 0.5) * 0.5
            c = pick(WALL, v, x, y)
            if y % 10 == 0 or (x + (y // 10) * 9) % 22 == 0:  # 벽돌 줄눈
                c = '#1E1C33'
            s.px(x, y, c)
    s.hline(0, 6, W, '#3F3B5E')  # 처마 띠
    s.hline(0, 7, W, '#2A2742')
    for x in range(0, W, 6):
        s.rect(x, 3, 3, 3, '#38345A')
    COLW = 12
    for i, cx in enumerate(range(8, W + 20, 34)):
        x0 = cx - COLW // 2
        # 기둥 몸통: 세로 홈 (밝음·어두움 번갈아)
        for x in range(x0, x0 + COLW):
            lx = x - x0
            c = COL[2] if lx in (2, 3, 6, 7) else COL[1]
            if lx in (4, 8):
                c = COL[0]
            if lx == 0 or lx == COLW - 1:
                c = COL[0]
            s.vline(x, 9, TOP - 9, c)
            s.px(x, 9 + (lx * 7) % 13, mul(c, 0.9))  # 돌 얼룩
        s.vline(x0 + 2, 9, TOP - 9, COL[3])
        # 기둥머리
        s.rect(x0 - 2, 8, COLW + 4, 3, COL[3])
        s.hline(x0 - 2, 10, COLW + 4, COL[1])
        # 기둥 받침 (계단 2단) — 바닥과 닿는 곳
        s.rect(x0 - 2, TOP - 2, COLW + 4, 3, COL[2])
        s.hline(x0 - 2, TOP - 2, COLW + 4, COL[3])
        s.rect(x0 - 4, TOP + 1, COLW + 8, 3, COL[1])
        s.hline(x0 - 4, TOP + 1, COLW + 8, COL[2])
        s.hline(x0 - 4, TOP + 4, COLW + 8, ZOUT)
        for y in range(9, TOP + 4):
            s.px(x0 - 1 if y < TOP - 2 else x0 - 5, y, ZOUT)
        # 기둥 사이 벽에 작은 금 등불 (어두운 벽 위 은은한 포인트)
        lx_ = cx + 17
        s.rect(lx_ - 1, 24, 3, 4, GOLD[0])
        s.px(lx_, 22, GOLD[3])
        s.px(lx_, 23, GOLD[2])
        s.px(lx_ - 1, 23, GOLD[1])
        s.px(lx_ + 1, 23, GOLD[1])
    # 원경과 바닥 경계: 벽 그늘 한 줄
    for x in range(W):
        if s.p[x, TOP + 5][:3] != rgba(ZOUT)[:3]:
            shade(s, x, TOP + 5, 0.7)
            if x % 2 == 0:
                shade(s, x, TOP + 6, 0.8)

    # 5) 아래 가장자리: 바닥 끝 너머로 피어오르는 구름 (밝은 라벤더, 3단계)
    cl = ['#7C78A6', '#A29ECA', '#C6C2E6', '#E2DFF5']
    for cx in range(-6, W + 12, 22):
        bx = cx + rng.randint(-5, 5)
        by = H - rng.randint(3, 8)
        for _ in range(4):
            px_, py_ = bx + rng.randint(-9, 9), by + rng.randint(-2, 4)
            r = rng.uniform(5, 8)
            for j in range(int(py_ - r) - 1, int(py_ + r) + 2):
                for i in range(int(px_ - r) - 1, int(px_ + r) + 2):
                    d = ((i - px_) ** 2 + ((j - py_) * 1.4) ** 2) / (r * r)
                    if d <= 1:
                        lit = 0.85 - (j - py_ + r) / (2 * r) * 0.7 + (0.1 if d < 0.4 else 0)
                        s.px(i, j, pick(cl, lit, i, j, 0.4))
    # 구름 윗선에 외곽 (위로 맞닿은 바닥 칸만)
    for x in range(W):
        for y in range(H - 2, TOP, -1):
            c = s.p[x, y][:3]
            if any(c == rgba(k)[:3] for k in cl):
                continue
            if any(s.p[x, y + 1][:3] == rgba(k)[:3] for k in cl):
                s.px(x, y, '#4A4668')
            break
    return s


# ─────────────────────────── 바닷속 궁전 (poseidon) ───────────────────────────
STONE = ['#1E3640', '#25414A', '#2D4C54', '#36585E', '#406468']  # 물에 젖은 청록빛 돌
SAND = ['#4A4B3F', '#545446', '#5E5D4D', '#686654']  # 물속 모래 (따뜻하지만 어둡게)  # 물빛이 비친 모래 (탁하게)
SGROUT = '#13252D'
DEEP = ['#06141F', '#0A1C29', '#0E2433', '#132D3D']
POUT = '#08121A'


def coral(rng, kind):
    """산호 (가지 산호 / 둥근 뇌산호), 채도 낮춘 분홍·주황"""
    if kind == 0:
        a = Sprite(19, 17)
        cols = rng.choice((['#7A3B4A', '#A35565', '#C87A82'], ['#7C4A2E', '#A86A3E', '#CF9157']))

        def branch(x, y, ang, n):
            for k in range(n):
                a.px(round(x), round(y), cols[1])
                a.px(round(x) + 1, round(y), cols[0])
                x += math.cos(ang)
                y -= math.sin(ang)
            a.px(round(x), round(y), cols[2])  # 가지 끝은 밝게
            a.px(round(x) + 1, round(y), cols[2])
            if n > 2:
                branch(x, y, ang + rng.uniform(0.45, 0.8), n - 2)
                branch(x, y, ang - rng.uniform(0.45, 0.8), n - 2)

        branch(8.5, 16, math.pi / 2, 6)
        return a
    a = Sprite(15, 11)
    cols = rng.choice((['#5C4060', '#7A5A80', '#9A7AA0'], ['#6A5530', '#8E7442', '#B39556']))
    a.ellipse(7, 5.5, 7, 5, cols[1])
    a.ellipse(5.5, 4, 4, 2.5, cols[2])
    for j in range(1, 11, 3):  # 뇌산호 주름 무늬 (구불구불한 줄)
        for i in range(15):
            if a.get(i, j)[3] and (i + j) % 5 != 0:
                a.px(i, j + (i // 3) % 2, cols[0])
    return a


def seaweed(rng, h):
    a = Sprite(7, h + 1)
    cols = ['#1C4A3A', '#28634A', '#36805A']
    for strand in range(rng.randint(2, 3)):
        x0 = 2 + strand
        ph = rng.uniform(0, 6)
        for y in range(h - rng.randint(0, 4)):
            x = x0 + round(math.sin(y / 3 + ph) * 1.2)
            a.px(x, h - y, cols[1] if strand % 2 else cols[0])
            if y % 4 == 1:
                a.px(x + 1, h - y, cols[2])
    return a


def shell(rng):
    a = Sprite(7, 6)
    cols = rng.choice((['#8A6F66', '#B8978A', '#D8C0B0'], ['#7E7A60', '#A8A27E', '#CEC8A2']))
    a.rows(0, 0, [
        '.bbcb..',
        'bacacb.',
        'bacacab',
        '.babab.',
        '..aaa..',
    ], {'a': cols[0], 'b': cols[1], 'c': cols[2]})
    return a


def starfish(rng):
    a = Sprite(9, 9)
    col = rng.choice((['#8E4A3A', '#B8664C'], ['#8A6A34', '#B48C46']))
    a.rows(0, 0, [
        '....a....',
        '....b....',
        '...bbb...',
        'abbbbbbba',
        '..bbabb..',
        '..bb.bb..',
        '.ab...ba.',
    ], {'a': col[0], 'b': col[1]})
    return a


def make_poseidon():
    s = Sprite(W, H)
    rng = random.Random(41)
    big = fbm(51, 50, 3)
    fine = fbm(52, 5, 2)
    sandn = fbm(53, 30, 3)
    ca = fbm(54, 13, 2)
    cb = fbm(55, 17, 2)
    cmask = fbm(56, 40, 2)

    # 1) 돌바닥: 엇갈려 쌓은 크기 다른 판석 (줄마다 높이·폭이 조금씩 다르게)
    rows = []
    y = TOP + 2
    while y < H:
        h = rng.choice((12, 14, 16))
        xs = [rng.randint(-20, 0)]
        while xs[-1] < W:
            xs.append(xs[-1] + rng.choice((16, 20, 24, 28)))
        rows.append((y, h, xs))
        y += h
    for (y0, h, xs) in rows:
        for a, b in zip(xs, xs[1:]):
            t = rng.uniform(-0.12, 0.12)
            for yy in range(y0, min(y0 + h, H)):
                for xx in range(max(a, 0), min(b, W)):
                    v = 0.45 + t + (big(xx, yy) - 0.5) * 0.5 + (fine(xx, yy) - 0.5) * 0.25
                    c = pick(STONE, v, xx, yy)
                    if xx == a or yy == y0:
                        c = SGROUT
                    elif xx == a + 1 or yy == y0 + 1:
                        c = mul(c, 1.14)
                    elif xx == b - 1 or yy == y0 + h - 1:
                        c = mul(c, 0.82)
                    s.px(xx, yy, c)

    # 2) 모래가 판석 위를 덮은 곳 (큰 얼룩, 가장자리는 디더)
    for y in range(TOP, H):
        for x in range(W):
            m = sandn(x, y) + (y - TOP) / (H - TOP) * 0.12
            edge = 0.63 + (BAYER[y % 4][x % 4] - 0.5) * 0.06
            if m > edge:
                v = 0.4 + (fine(x + 300, y) - 0.5) * 0.6 + (m - 0.6) * 0.8
                # 모래 물결 무늬: 가로로 기울어진 줄
                if (x + y * 3 + int(big(x, y) * 30)) % 11 == 0:
                    v -= 0.3
                s.px(x, y, pick(SAND, v, x, y))

    # 3) 금 간 판석
    for x, y in scatter(rng, 14, 0, W, TOP + 10, H - 10, 22):
        crack(s, rng, x, y, rng.randint(5, 12), SGROUT, '#4C6E70')

    # 4) 원경: 깊은 물 속 궁전 벽 + 부서진 기둥 (어둡게)
    for y in range(0, TOP + 3):
        for x in range(W):
            v = 0.35 + (big(x + 700, y) - 0.5) * 0.5 + (0.15 if y > 30 else 0)
            c = pick(DEEP, v, x, y)
            if y > 18 and (y % 9 == 0 or (x + (y // 9) * 11) % 24 == 0):  # 무너진 벽 돌 줄눈
                c = '#050E16'
            s.px(x, y, c)
    # 벽 윗선이 무너진 모양 (들쭉날쭉)
    wall_top = []
    for x in range(W):
        wall_top.append(18 + int(Noise(57, 7)(x, 0) * 8))
    for x in range(W):
        for y in range(0, wall_top[x]):
            s.px(x, y, pick(DEEP[:2], big(x, y + 200), x, y))
        s.px(x, wall_top[x], '#173445')
    # 위에서 내려오는 희미한 빛줄기 (넓은 디더 띠, 아주 약하게)
    for k in range(6):
        bx = 20 + k * 52 + rng.randint(-8, 8)
        for y in range(0, TOP):
            for x in range(bx + y // 3, bx + y // 3 + 7):
                if BAYER[y % 4][x % 4] < 0.25 and 0 <= x < W:
                    shade(s, x, y, 1.35)
    # 부서진 기둥: 높이가 제각각
    PCOL = ['#1B3644', '#244656', '#2F5868', '#3C6B7A']
    for i, cx in enumerate(range(10, W + 20, 30)):
        cx += rng.randint(-4, 4)
        w = 10
        top = rng.choice((10, 16, 22, 28, 34))
        x0 = cx - w // 2
        for x in range(x0, x0 + w):
            lx = x - x0
            c = PCOL[2] if lx in (2, 3, 6) else PCOL[1]
            if lx in (0, w - 1, 5):
                c = PCOL[0]
            s.vline(x, top, TOP - top, c)
        s.vline(x0 + 2, top, TOP - top, PCOL[3])
        # 부러진 윗면: 비스듬한 톱니
        for lx in range(w):
            cut = top + ((lx * 5 + i * 3) % 4)
            for y in range(top - 1, cut):
                s.px(x0 + lx, y, None)
            s.px(x0 + lx, cut, PCOL[3])
        # 투명으로 지운 칸은 벽색으로 다시
        for lx in range(w):
            for y in range(top - 1, top + 4):
                if 0 <= x0 + lx < W and s.p[x0 + lx, y][3] == 0:
                    s.px(x0 + lx, y, DEEP[1])
        # 받침
        s.rect(x0 - 2, TOP - 2, w + 4, 3, PCOL[2])
        s.hline(x0 - 2, TOP - 2, w + 4, PCOL[3])
        s.rect(x0 - 3, TOP + 1, w + 6, 2, PCOL[1])
        s.hline(x0 - 3, TOP + 3, w + 6, POUT)
        # 기둥에 붙은 해초
        if i % 2 == 0:
            stamp(s, seaweed(rng, rng.randint(10, 16)), x0 + w - 2, TOP - 15, POUT)
    # 원경 아래 그늘
    for x in range(W):
        shade(s, x, TOP + 4, 0.7)
        if x % 2:
            shade(s, x, TOP + 5, 0.8)

    mood(s, 58, dark=0.82, light=1.06)
    # 5) 물빛 무늬 (커스틱): 노이즈 등고선 두 겹이 겹치는 그물 모양, 일부 구역에만 옅게
    for y in range(TOP + 6, H):
        for x in range(W):
            if cmask(x, y) < 0.52:
                continue
            a = abs(ca(x, y) - 0.5) < 0.025
            b = abs(cb(x + 40, y) - 0.5) < 0.025
            if a or b:
                shade(s, x, y, 1.4 if (a and b) else 1.22)

    # 6) 소품: 산호, 해초, 조개, 불가사리, 부서진 돌 조각
    pts = []
    for x, y in scatter(rng, 10, 6, W - 14, TOP + 16, H - 16, 26):
        kind = rng.randint(0, 1)
        c = coral(rng, kind)
        shadow_ellipse(s, x + c.w / 2 + 1, y + c.h, c.w / 2 + 1, 2)
        stamp(s, c, x, y, POUT)
        pts.append((x, y))
    for x, y in scatter(rng, 10, 4, W - 8, TOP + 20, H - 26, 22, pts):
        sw = seaweed(rng, rng.randint(14, 22))
        shadow_ellipse(s, x + 4, y + sw.h, 4, 1.5)
        stamp(s, sw, x, y, POUT)
        pts.append((x, y))
    for x, y in scatter(rng, 12, 2, W - 8, TOP + 12, H - 6, 16, pts):
        a = shell(rng) if rng.random() < 0.65 else starfish(rng)
        stamp(s, a, x, y, POUT)
        pts.append((x, y))
    rock_ramp = ['#22383E', '#2E4A50', '#3C5C60', '#4C6E70']
    for x, y in scatter(rng, 8, 4, W - 10, TOP + 14, H - 6, 18, pts):
        w = rng.choice((5, 7))
        shadow_ellipse(s, x + w / 2 + 1, y + w - 1, w / 2 + 1, 1.5)
        stamp(s, rock(rng, w, w - 2, rock_ramp), x, y, POUT)
    # 물방울 (작은 원 테두리)
    for x, y in scatter(rng, 14, 2, W - 4, 4, H - 4, 14):
        s.px(x, y, '#5E8C92')
        s.px(x + 1, y - 1, '#7FB0B4')
    return s


if __name__ == '__main__':
    for name, fn in (('bg_earth', make_earth), ('bg_zeus', make_zeus), ('bg_poseidon', make_poseidon)):
        print(save(fn(), name, upscale=4))
