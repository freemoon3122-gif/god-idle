"""
스킬 이펙트 도트 애니메이션.  실행: python3 tools/pixel/effects.py

이펙트 하나 = 가로 띠 PNG 한 장 (프레임을 왼쪽 → 오른쪽으로 나란히). 게임은 띠를 한 칸씩 넘겨 보여 준다 (플립북).
결과: assets/fx/<이름>.png (4배 확대) + src/ui/art/fx.ts (게임이 읽는 목록, 자동 생성)

그리는 규칙 (도트 이펙트의 관례)
  - 가운데가 가장 밝고(흰색) 바깥으로 갈수록 진한 색 → 빛나 보인다. 그라데이션 대신 3~4단계 색 띠
  - 외곽선은 없다 (캐릭터와 달리 빛이라서)
  - 시작(작게) → 절정(가장 크고 밝게) → 사라짐(흩어지고 어두워짐)
같은 결과가 나오도록 무작위는 고정 시드(random.Random(이름))를 쓴다.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import Sprite, rgba  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'fx')
TS = os.path.join(ROOT, 'src', 'ui', 'art', 'fx.ts')
UPSCALE = 4

# 색 띠: [가장 밝음(흰빛), 밝음, 기본, 어둠]
RAMP = {
    'bolt': ['#FFFFFF', '#FFF7A0', '#FFD23A', '#E8891A'],
    'cyan': ['#FFFFFF', '#C8FAFF', '#7FE8FF', '#2E9ED8'],
    'orange': ['#FFFFFF', '#FFE0A8', '#FFB347', '#D9661C'],
    'green': ['#FFFFFF', '#D8FFC0', '#7CE08A', '#2E9A4A'],
    'gold': ['#FFFFFF', '#FFF3B8', '#FFE27A', '#E0A82A'],
    'fire': ['#FFFFFF', '#FFF0A0', '#FFA030', '#E0401C'],
    'water': ['#FFFFFF', '#C8F6FF', '#5CC8F4', '#2A7AD0'],
    'purple': ['#F6E6FF', '#D2A6FF', '#9A5CE0', '#5E2EA0'],
    'dust': ['#F4E6C0', '#D2B47E', '#A07E50', '#6E5236'],
    'smoke': ['#B8B4C4', '#8E8AA0', '#66627A', '#46425A'],
    'white': ['#FFFFFF', '#F2F6FF', '#C8D4F0', '#8E9CC8'],
}


# ───────────── 기본 도형 ─────────────

def disc(s, cx, cy, r, c):
    if r <= 0:
        return
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                s.px(x, y, c)


def ellipse(s, cx, cy, rx, ry, c):
    if rx <= 0 or ry <= 0:
        return
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                s.px(x, y, c)


def ellipse_ring(s, cx, cy, rx, ry, w, c):
    """두께 w의 타원 고리"""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            d = ((x + 0.5 - cx) / max(rx, 0.1)) ** 2 + ((y + 0.5 - cy) / max(ry, 0.1)) ** 2
            inner = ((x + 0.5 - cx) / max(rx - w, 0.1)) ** 2 + ((y + 0.5 - cy) / max(ry - w, 0.1)) ** 2
            if d <= 1 and (rx - w <= 0 or inner > 1):
                s.px(x, y, c)


def thick_line(s, x0, y0, x1, y1, r, c):
    """굵기 r(반지름)의 직선: 점을 촘촘히 찍는다"""
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
    for i in range(n + 1):
        t = i / n
        disc(s, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, c)


def poly(s, pts, c):
    """채운 다각형 (스캔라인)"""
    ys = [p[1] for p in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        yc = y + 0.5
        xs = []
        for i in range(len(pts)):
            (xa, ya), (xb, yb) = pts[i], pts[(i + 1) % len(pts)]
            if (ya <= yc < yb) or (yb <= yc < ya):
                xs.append(xa + (yc - ya) * (xb - xa) / (yb - ya))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            for x in range(int(round(xs[k])), int(round(xs[k + 1]))):
                s.px(x, y, c)


def sparkle(s, x, y, c='#FFFFFF', big=False):
    """반짝이 (+ 모양)"""
    s.px(x, y, c)
    for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        s.px(x + d[0], y + d[1], c)
    if big:
        for d in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            s.px(x + d[0], y + d[1], c)


def layered(fn, ramp, scales=(1.0, 0.72, 0.45, 0.22)):
    """같은 모양을 크기만 줄여 가며 어두운 색 → 밝은 색 순서로 겹친다 (빛나는 심)"""
    for k, sc in enumerate(scales):
        fn(sc, ramp[3 - k] if k < 4 else ramp[0])


def strip(frames):
    w, h = frames[0].w, frames[0].h
    out = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.alpha_composite(f.img, (i * w, 0))
    return out


# ───────────── 이펙트들 ─────────────

def fx_bolt():
    """낙뢰: 하늘에서 땅까지 지그재그 번개. 1프레임 예고 → 2~3 절정(가지) → 사라짐"""
    W, H, n = 24, 96, 6
    rnd = random.Random('bolt')
    path = [(12, 0)]
    for y in range(8, H, 8):
        path.append((12 + rnd.randint(-5, 5), y))
    path.append((12, H - 1))
    branches = [(3, 12 + rnd.choice((-1, 1)) * 9, 3 * 8 + 14), (6, 12 + rnd.choice((-1, 1)) * 9, 6 * 8 + 12)]
    widths = [0.6, 2.2, 2.8, 1.8, 1.0, 0]
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        w = widths[f]
        if f == 0:
            # 예고: 위쪽만 가늘게
            for a, b in zip(path[:4], path[1:5]):
                thick_line(s, *a, *b, 0.6, RAMP['bolt'][2])
        elif w > 0:
            for k, (rad, col) in enumerate(((w + 1.4, RAMP['bolt'][3]), (w + 0.6, RAMP['bolt'][2]), (w, RAMP['bolt'][1]), (max(0.6, w - 1.2), RAMP['bolt'][0]))):
                for a, b in zip(path, path[1:]):
                    thick_line(s, *a, *b, rad, col)
            if f in (1, 2):
                for i, bx, by in branches:
                    thick_line(s, *path[i], bx, by, 0.7, RAMP['bolt'][1])
            # 땅에 닿은 섬광
            if f in (2, 3):
                ellipse(s, 12, H - 3, 11 if f == 2 else 8, 3, RAMP['bolt'][2])
                ellipse(s, 12, H - 3, 7 if f == 2 else 4, 2, RAMP['bolt'][0])
        else:
            # 남은 불꽃
            for _ in range(6):
                s.px(12 + rnd.randint(-8, 8), H - 2 - rnd.randint(0, 10), RAMP['bolt'][1])
        frames.append(s)
    return frames


def fx_slash(color):
    """초승달 참격: 호가 왼쪽 위에서 오른쪽 아래로 휩쓸고 지나간다"""
    W = H = 48
    ramp = RAMP[color]
    n = 6
    cx, cy, R = 22, 26, 19
    frames = []
    # (시작 각, 끝 각, 두께 배율)
    spans = [(-150, -110, 0.5), (-150, -40, 1.0), (-140, 30, 1.25), (-90, 50, 1.0), (-20, 55, 0.6), (30, 58, 0.3)]
    for f in range(n):
        s = Sprite(W, H)
        a0, a1, th = spans[f]
        steps = 60
        for k, col in enumerate((ramp[3], ramp[2], ramp[1], ramp[0])):
            for i in range(steps + 1):
                t = i / steps
                a = math.radians(a0 + (a1 - a0) * t)
                # 가운데가 두껍고 양끝이 가는 초승달
                width = (math.sin(t * math.pi) * 7.5 + 1.0) * th * (1 - k * 0.24)
                r = R - k * 0.6
                x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
                disc(s, x, y, max(0.5, width / 2), col)
        if f in (2, 3):
            sparkle(s, int(cx + math.cos(math.radians(a1)) * R), int(cy + math.sin(math.radians(a1)) * R), '#FFFFFF', big=True)
        frames.append(s)
    return frames


def fx_hit():
    """작은 타격 불꽃: 별 모양으로 번쩍 → 흩어짐"""
    W = H = 32
    n = 5
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        c = 16
        if f < 3:
            L = [6, 13, 11][f]
            for ang in range(0, 360, 45):
                a = math.radians(ang + 22.5 * (f % 2))
                ln = L if ang % 90 == 0 else L * 0.6
                thick_line(s, c, c, c + math.cos(a) * ln, c + math.sin(a) * ln, 1.0 if f < 2 else 0.6, RAMP['bolt'][2])
            disc(s, c, c, [4, 6, 3][f], RAMP['bolt'][1])
            disc(s, c, c, [2.5, 4, 1.5][f], '#FFFFFF')
        else:
            rnd = random.Random(f)
            for ang in range(0, 360, 40):
                a = math.radians(ang)
                d = 9 + f * 2 + rnd.random() * 2
                s.px(int(c + math.cos(a) * d), int(c + math.sin(a) * d), RAMP['bolt'][1 if f == 3 else 2])
        frames.append(s)
    return frames


def fx_explosion():
    """폭발: 흰 섬광 → 노랑·주황 불덩이가 부풀고 → 붉은 테두리 → 연기로 흩어짐"""
    W = H = 48
    n = 7
    rnd = random.Random('explosion')
    blobs = [(rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0.45, 0.75)) for _ in range(7)]
    radii = [6, 13, 18, 20, 20, 18, 15]
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        R = radii[f]
        c = 24
        if f <= 4:
            ramp = RAMP['fire'] if f < 4 else ['#FFE0A0', '#F08030', '#C03A1C', '#6E2418']
            for k, sc in enumerate((1.0, 0.78, 0.55, 0.32)):
                col = ramp[3 - k]
                if f >= 3 and k == 3:
                    col = ramp[1]  # 식어 가면서 흰 심이 사라진다
                disc(s, c, c, R * sc, col)
                for bx, by, br in blobs:
                    disc(s, c + bx * R * 0.6, c + by * R * 0.6, R * br * sc, col)
        else:
            # 연기: 회색 덩어리가 위로 올라가며 옅어진다
            ramp = RAMP['smoke']
            for bx, by, br in blobs:
                disc(s, c + bx * R * 0.8, c + by * R * 0.6 - (f - 4) * 3, R * br * (0.7 if f == 5 else 0.5), ramp[2 if f == 5 else 3])
                disc(s, c + bx * R * 0.8 - 1, c + by * R * 0.6 - (f - 4) * 3 - 1, R * br * (0.4 if f == 5 else 0.25), ramp[1])
        # 튀는 불씨
        if 2 <= f <= 5:
            for ang in range(0, 360, 30):
                a = math.radians(ang + f * 11)
                d = R + 2 + (f - 2) * 2
                s.px(int(c + math.cos(a) * d), int(c + math.sin(a) * d), RAMP['fire'][1])
        frames.append(s)
    return frames


def fx_splash():
    """물보라: 가운데서 물기둥이 솟고 물방울이 사방으로 튄다"""
    W = H = 48
    n = 6
    rnd = random.Random('splash')
    drops = [(rnd.uniform(0, math.pi * 2), rnd.uniform(0.7, 1.2)) for _ in range(14)]
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['water']
        c = 24
        if f <= 3:
            h = [8, 16, 20, 14][f]
            wdt = [6, 9, 11, 12][f]
            ellipse(s, c, 34 - h / 2, wdt / 2 + 1, h / 2 + 1, ramp[3])
            ellipse(s, c, 34 - h / 2, wdt / 2, h / 2, ramp[2])
            ellipse(s, c - 1, 34 - h / 2 - 1, wdt / 3, h / 3, ramp[1])
            ellipse(s, c, 36, wdt + 4, 3, ramp[2])
        for a, sp in drops:
            d = (4 + f * 4.5) * sp
            x = c + math.cos(a) * d
            y = 30 + math.sin(a) * d * 0.7 + f * f * 0.5  # 떨어진다
            r = max(0.6, 2.0 - f * 0.3)
            disc(s, x, y, r, ramp[2 if f < 4 else 3])
            if f < 3:
                s.px(int(x), int(y), ramp[0])
        frames.append(s)
    return frames


def fx_wave():
    """해일: 파도가 솟아올라 오른쪽으로 말리며 부서진다 (흰 거품)"""
    W, H = 96, 48
    n = 6
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['water']
        rise = [0.35, 0.7, 1.0, 1.0, 0.75, 0.4][f]
        crest_x = [30, 44, 58, 70, 80, 88][f]
        top = H - 4 - 38 * rise
        # 파도 몸통: 왼쪽은 낮고, 마루(crest)로 갈수록 높다
        pts = [(0, H)]
        for x in range(0, crest_x + 1, 4):
            t = x / max(crest_x, 1)
            pts.append((x, H - 6 - (H - 6 - top) * (t ** 1.6)))
        # 말려 내려오는 앞부분
        pts += [(crest_x + 8, top + 4), (crest_x + 10, top + 12), (crest_x + 4, top + 10), (crest_x + 6, H - 6), (W if f >= 3 else crest_x + 14, H)]
        poly(s, pts, ramp[3])
        poly(s, [(x, y + 3) for x, y in pts], ramp[2])
        # 물결 줄무늬
        for x in range(4, crest_x - 4, 9):
            t = x / max(crest_x, 1)
            y = H - 6 - (H - 6 - top) * (t ** 1.6) + 6
            s.hline(x, int(y), 4, ramp[1])
        # 마루의 흰 거품
        for i in range(10):
            fx = crest_x - 10 + i * 2
            disc(s, fx, top + 1 + (i % 3), 1.6, ramp[0])
        if f >= 3:
            rnd = random.Random(f)
            for _ in range(14):
                disc(s, crest_x + rnd.randint(-6, 12), top + rnd.randint(-6, 16), 1.2, ramp[0 if rnd.random() < 0.5 else 1])
        s.hline(0, H - 2, W if f >= 2 else crest_x + 10, ramp[1])
        frames.append(s)
    return frames


def star_poly(cx, cy, R, r, rot=-90):
    pts = []
    for i in range(10):
        a = math.radians(rot + i * 36)
        rr = R if i % 2 == 0 else r
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return pts


def fx_star():
    """별 터짐: 금빛 별이 커졌다가 반짝이로 흩어진다"""
    W = H = 32
    n = 5
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['gold']
        R = [6, 12, 14, 9, 0][f]
        if R:
            poly(s, star_poly(16, 16, R + 1.5, (R + 1.5) * 0.45), ramp[3])
            poly(s, star_poly(16, 16, R, R * 0.45), ramp[2])
            poly(s, star_poly(15, 15, R * 0.55, R * 0.25), ramp[1])
            disc(s, 15, 15, max(1, R * 0.18), ramp[0])
        for i, ang in enumerate(range(0, 360, 60)):
            a = math.radians(ang + 30)
            d = [8, 12, 15, 14, 13][f]
            if f >= 1:
                sparkle(s, int(16 + math.cos(a) * d), int(16 + math.sin(a) * d), ramp[0 if f < 4 else 2], big=(f == 2 and i % 2 == 0))
        frames.append(s)
    return frames


def fx_meteor():
    """유성: 불덩이 + 왼쪽 위로 늘어지는 꼬리 (4프레임 반복용, 투사체로 날아간다)"""
    W = H = 24
    n = 4
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['fire']
        # 꼬리 (왼쪽 위)
        for k in range(8):
            t = k / 8
            r = 4.5 * (1 - t) + 0.5
            jitter = (f + k) % 2
            disc(s, 15 - k * 1.6 - jitter * 0.5, 15 - k * 1.6 + jitter * 0.5, r, ramp[3 if k > 4 else 2])
        disc(s, 15, 15, 5.5, ramp[3])
        disc(s, 15, 15, 4.5, ramp[2])
        disc(s, 14.5 + (f % 2) * 0.5, 14.5, 3, ramp[1])
        disc(s, 14, 14, 1.6, ramp[0])
        frames.append(s)
    return frames


def feather_shape(s, cx, cy, ang, L, ramp):
    """깃털 한 장: 가운데 깃대 + 양쪽 깃"""
    dx, dy = math.cos(ang), math.sin(ang)
    nx, ny = -dy, dx
    pts = [(cx - dx * L, cy - dy * L), (cx + nx * L * 0.35, cy + ny * L * 0.35), (cx + dx * L, cy + dy * L), (cx - nx * L * 0.35, cy - ny * L * 0.35)]
    poly(s, pts, ramp[2])
    poly(s, [(cx - dx * L * 0.7, cy - dy * L * 0.7), (cx + nx * L * 0.2, cy + ny * L * 0.2), (cx + dx * L * 0.8, cy + dy * L * 0.8)], ramp[0])
    thick_line(s, cx - dx * L, cy - dy * L, cx + dx * L * 0.9, cy + dy * L * 0.9, 0.5, ramp[3])


def fx_feather():
    """깃털 폭풍: 하얀 깃털이 가운데서 터져 빙글빙글 흩날린다"""
    W = H = 32
    n = 6
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['white']
        for i in range(6):
            base = i * 60
            a = math.radians(base + f * 25)
            d = 4 + f * 2.2
            x, y = 16 + math.cos(a) * d, 16 + math.sin(a) * d + f * 0.6
            feather_shape(s, x, y, math.radians(base + f * 50), 5.0 if f < 4 else 3.8, ramp)
        if f < 2:
            disc(s, 16, 16, 3 - f, '#FFFFFF')
        frames.append(s)
    return frames


def leaf_shape(s, cx, cy, ang, L, ramp):
    dx, dy = math.cos(ang), math.sin(ang)
    nx, ny = -dy, dx
    pts = [(cx - dx * L, cy - dy * L), (cx + nx * L * 0.42, cy + ny * L * 0.42), (cx + dx * L, cy + dy * L), (cx - nx * L * 0.42, cy - ny * L * 0.42)]
    poly(s, pts, ramp[3])
    poly(s, [(cx - dx * L * 0.8, cy - dy * L * 0.8), (cx + nx * L * 0.3, cy + ny * L * 0.3), (cx + dx * L * 0.8, cy + dy * L * 0.8)], ramp[2])
    thick_line(s, cx - dx * L * 0.7, cy - dy * L * 0.7, cx + dx * L * 0.6, cy + dy * L * 0.6, 0.45, ramp[1])


def fx_leaf():
    """월계수 칼날: 날카로운 잎이 회오리처럼 돌며 베고 지나간다 (마지막엔 흰 베기 선)"""
    W = H = 32
    n = 6
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['green']
        for i in range(5):
            a = math.radians(i * 72 + f * 40)
            d = 11 - f * 1.2 if f < 4 else 6 + (f - 3) * 4
            leaf_shape(s, 16 + math.cos(a) * d, 16 + math.sin(a) * d, a + math.pi / 2, 6.0, ramp)
        if 2 <= f <= 4:
            # 칼날이 지나간 흰 선
            L = [8, 13, 10][f - 2]
            thick_line(s, 16 - L, 16 + L * 0.4, 16 + L, 16 - L * 0.4, 1.3, ramp[0])
        frames.append(s)
    return frames


def fx_tornado():
    """회오리: 아래가 좁고 위가 넓은 소용돌이, 칼날 반짝임"""
    W, H = 40, 56
    n = 6
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['orange']
        grow = [0.45, 0.8, 1.0, 1.0, 0.85, 0.55][f]
        layers = 9
        for k in range(layers):
            t = k / (layers - 1)
            y = H - 3 - t * (H - 8) * grow
            rx = (3 + t * 15) * grow
            off = math.sin(f * 1.3 + k * 0.9) * 3 * t
            col = ramp[3] if k % 2 else ramp[2]
            ellipse_ring(s, 20 + off, y, rx, max(1.5, rx * 0.28), 1.6, col)
            ellipse(s, 20 + off - rx * 0.3, y - 0.5, max(0.8, rx * 0.25), 0.8, ramp[1])
        if 1 <= f <= 3:
            sparkle(s, 20 + int(math.cos(f * 2) * 10), int(H - 20 - f * 6), '#FFFFFF', big=True)
        frames.append(s)
    return frames


def fx_shockwave():
    """지면 충격파: 땅이 울리며 흙먼지 고리가 퍼지고 파편이 튄다"""
    W, H = 64, 24
    n = 6
    rnd = random.Random('shock')
    rocks = [(rnd.uniform(-1, 1), rnd.uniform(0.3, 1)) for _ in range(10)]
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['dust']
        rx = [8, 16, 24, 29, 31, 32][f]
        ry = rx * 0.28
        cy = H - 6
        ellipse_ring(s, 32, cy, rx, ry, 3 if f < 4 else 2, ramp[2 if f < 4 else 3])
        ellipse_ring(s, 32, cy - 1, rx - 2, ry - 0.8, 1.2, ramp[0 if f < 3 else 1])
        if f < 3:
            ellipse(s, 32, cy, rx * 0.5, ry * 0.5, RAMP['gold'][1])
        for i, (dx, sp) in enumerate(rocks):
            t = f / (n - 1)
            x = 32 + dx * (6 + t * 24)
            y = cy - math.sin(min(1.0, t * 1.4) * math.pi) * 14 * sp
            if f >= 1:
                s.rect(int(x), int(y), 2, 2, ramp[3] if i % 2 else ramp[2])
        frames.append(s)
    return frames


def fx_holy():
    """성스러운 후광: 금빛 고리가 퍼지며 빛살이 뻗는다"""
    W = H = 48
    n = 6
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['gold']
        R = [6, 11, 16, 19, 21, 22][f]
        # 빛살
        if 1 <= f <= 4:
            for ang in range(0, 360, 30):
                a = math.radians(ang + 15)
                thick_line(s, 24 + math.cos(a) * (R - 4), 24 + math.sin(a) * (R - 4), 24 + math.cos(a) * (R + 3), 24 + math.sin(a) * (R + 3), 0.6, ramp[1])
        ellipse_ring(s, 24, 24, R, R * 0.55, 3 if f < 4 else 2, ramp[3 if f >= 4 else 2])
        ellipse_ring(s, 24, 23, R - 1, R * 0.55 - 1, 1.2, ramp[0 if f < 4 else 1])
        if f <= 2:
            disc(s, 24, 24, [4, 5, 3][f], '#FFFFFF')
        frames.append(s)
    return frames


def fx_tentacle():
    """크라켄 촉수: 땅을 뚫고 솟구쳤다가 앞으로 휘어 내리친다"""
    W, H = 32, 96
    n = 6
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['purple']
        height = [0.3, 0.7, 1.0, 0.95, 0.75, 0.45][f]
        bend = [0, 0.1, 0.25, 0.7, 1.0, 1.0][f]  # 휘는 정도 (오른쪽으로)
        segs = 22
        prev = None
        for k in range(segs + 1):
            t = k / segs
            y = H - 4 - t * (H - 10) * height
            x = 12 + math.sin(t * math.pi * 0.8) * 3 + bend * (t ** 2) * 14
            r = 6.5 * (1 - t) + 1.2
            pt = (x, y, r)
            if prev:
                thick_line(s, prev[0], prev[1], x, y, r + 1, ramp[3])
                thick_line(s, prev[0] - 0.5, prev[1], x - 0.5, y, r, ramp[2])
                thick_line(s, prev[0] - r * 0.4, prev[1], x - r * 0.4, y, max(0.5, r * 0.35), ramp[1])
            prev = pt
        # 빨판
        for k in range(3, segs - 3, 3):
            t = k / segs
            y = H - 4 - t * (H - 10) * height
            x = 12 + math.sin(t * math.pi * 0.8) * 3 + bend * (t ** 2) * 14
            disc(s, x + 3 * (1 - t), y, max(0.8, 1.6 * (1 - t)), ramp[0])
        # 땅에서 튀는 물보라
        ellipse(s, 14, H - 3, 11, 3, RAMP['water'][2])
        ellipse(s, 14, H - 3, 7, 2, RAMP['water'][1])
        frames.append(s)
    return frames


def fx_dash():
    """섬광 돌진: 오른쪽으로 뻗는 빛줄기와 속도선"""
    W, H = 64, 24
    n = 5
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        ramp = RAMP['cyan']
        head = [20, 44, 62, 62, 62][f]
        tail = [0, 4, 18, 40, 56][f]
        if head > tail:
            poly(s, [(tail, 12), (head - 6, 7), (head, 12), (head - 6, 17)], ramp[3])
            poly(s, [(tail + 4, 12), (head - 7, 9), (head - 2, 12), (head - 7, 15)], ramp[2])
            s.hline(tail + 8, 12, max(0, head - tail - 12), ramp[0])
            s.hline(tail + 8, 11, max(0, head - tail - 16), ramp[1])
        for i, y in enumerate((4, 7, 17, 20)):
            x0 = tail + 4 + i * 5
            s.hline(x0, y, max(0, min(head - 10, x0 + 14) - x0), ramp[1 if i % 2 else 2])
        frames.append(s)
    return frames


def fx_aura(color):
    """힘이 솟는 오라: 발밑 고리 + 위로 솟는 불꽃 모양 빛기둥"""
    W = H = 48
    n = 6
    ramp = RAMP[color]
    frames = []
    for f in range(n):
        s = Sprite(W, H)
        R = [10, 15, 19, 20, 20, 18][f]
        ellipse_ring(s, 24, 38, R, R * 0.3, 2, ramp[2])
        ellipse_ring(s, 24, 37, R - 1.5, R * 0.3 - 1, 1, ramp[0])
        for i in range(7):
            x = 24 + (i - 3) * (R / 3.2)
            h = [6, 14, 22, 26, 20, 12][f] * (1 - abs(i - 3) / 5)
            y = 38 - h - ((i * 7 + f * 5) % 6)
            thick_line(s, x, 37, x, y, 1.2 if i % 2 else 0.8, ramp[2 if i % 2 else 1])
            s.px(int(x), int(y) - 1, ramp[0])
        if 1 <= f <= 3:
            for k in range(4):
                sparkle(s, 24 + int(math.cos(k * 1.7 + f) * 14), 16 + int(math.sin(k * 2.3 + f) * 8), '#FFFFFF')
        frames.append(s)
    return frames


EFFECTS = {
    'bolt': fx_bolt,
    'slash_cyan': lambda: fx_slash('cyan'),
    'slash_orange': lambda: fx_slash('orange'),
    'slash_green': lambda: fx_slash('green'),
    'slash_gold': lambda: fx_slash('gold'),
    'hit': fx_hit,
    'explosion': fx_explosion,
    'splash': fx_splash,
    'wave': fx_wave,
    'star': fx_star,
    'meteor': fx_meteor,
    'feather': fx_feather,
    'leaf': fx_leaf,
    'tornado': fx_tornado,
    'shockwave': fx_shockwave,
    'holy': fx_holy,
    'tentacle': fx_tentacle,
    'dash': fx_dash,
    'aura_gold': lambda: fx_aura('gold'),
    'aura_blue': lambda: fx_aura('water'),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = []
    previews = []
    for name, fn in EFFECTS.items():
        frames = fn()
        img = strip(frames)
        img.resize((img.width * UPSCALE, img.height * UPSCALE), Image.NEAREST).save(os.path.join(OUT, name + '.png'))
        rows.append((name, len(frames), frames[0].w, frames[0].h))
        previews.append(img)
    # 게임이 읽는 목록 (TypeScript)
    lines = [
        '// 자동 생성 (tools/pixel/effects.py) — 직접 고치지 말 것',
        "import { ImageSourcePropType } from 'react-native';",
        '',
        '/** 도트 이펙트 한 종류: 가로 띠 이미지 + 프레임 수 + 한 프레임의 원본 크기(px) */',
        'export interface FxSheet {',
        '  source: ImageSourcePropType;',
        '  frames: number;',
        '  fw: number;',
        '  fh: number;',
        '}',
        '',
        'export type FxName = ' + ' | '.join(f"'{r[0]}'" for r in rows) + ';',
        '',
        'export const FX: Record<FxName, FxSheet> = {',
    ]
    for name, frames, fw, fh in rows:
        lines.append(f"  {name}: {{ source: require('../../../assets/fx/{name}.png'), frames: {frames}, fw: {fw}, fh: {fh} }},")
    lines.append('};')
    with open(TS, 'w') as fp:
        fp.write('\n'.join(lines) + '\n')
    # 확인용 미리보기
    scale = 3
    Wp = max(p.width for p in previews) * scale + 24
    Hp = sum(p.height * scale + 10 for p in previews) + 14
    sheet = Image.new('RGBA', (Wp, Hp), rgba('#2A2A33'))
    y = 10
    for p in previews:
        sheet.alpha_composite(p.resize((p.width * scale, p.height * scale), Image.NEAREST), (12, y))
        y += p.height * scale + 10
    sheet.save('/tmp/pix-fx.png')
    print('saved', len(rows), 'effects →', OUT)


if __name__ == '__main__':
    main()
