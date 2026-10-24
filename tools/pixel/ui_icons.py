"""
UI 도트 아이콘 + 레이드 배경.  실행: python3 tools/pixel/ui_icons.py

- assets/ui/<이름>.png : 하단 탭 4개(컨텐츠·무기강화·힘강화·스킬강화), 재화 3개(골드·다이아·강화코인), 자동 이동
- assets/sprites/bg_raid_giganto.png, bg_raid_typhoeus.png : 레이드 화면 배경 (화면에 고정, 한 장)
아이콘은 16×16, 진한 1px 외곽선 + 3~4단계 명암 (캐릭터 그림과 같은 규칙).
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import OUTLINE, Sprite, rgba  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'ui')
UPSCALE = 8

GOLD = ['#FFF6B0', '#FFD84A', '#E39B22', '#A8620E']
STEEL = ['#FFFFFF', '#DCE4F0', '#A4B2CA', '#6A7898']
WOOD = ['#E0A868', '#B4783E', '#8A5428', '#5A3418']
CYAN = ['#F0FFFF', '#9FF0FF', '#3CC8F0', '#1A7EC8']
PAPER = ['#FFF8E6', '#F2DFB4', '#D8B87E', '#A88650']
RED = ['#FF9A8A', '#E8403E', '#B0223A', '#6E1028']
SKIN = ['#FFE6CC', '#F4C49A', '#D89668', '#A8663E']
PURPLE = ['#E6CCFF', '#B48CFF', '#7E54D8', '#4E2E96']
GREEN = ['#C8F4A0', '#7CD86A', '#3E9A4A', '#1E6036']


def save_png(s, name, folder=OUT, upscale=UPSCALE):
    os.makedirs(folder, exist_ok=True)
    s.img.resize((s.w * upscale, s.h * upscale), Image.NEAREST).save(os.path.join(folder, name + '.png'))


def disc(s, cx, cy, r, c):
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                s.px(x, y, c)


def poly(s, pts, c):
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


# ───────────── 탭 아이콘 ─────────────

def tab_content():
    """컨텐츠: 펼친 보물 지도 (빨간 X 표시)"""
    s = Sprite(16, 16)
    poly(s, [(1, 3), (5, 2), (10, 3), (15, 2), (15, 13), (10, 14), (5, 13), (1, 14)], PAPER[2])
    poly(s, [(1, 3), (5, 2), (5, 13), (1, 14)], PAPER[1])
    poly(s, [(10, 3), (15, 2), (15, 13), (10, 14)], PAPER[1])
    s.vline(5, 3, 10, PAPER[3])
    s.vline(10, 4, 10, PAPER[3])
    for x, y in ((3, 5), (4, 7), (6, 8), (8, 8)):  # 점선 길
        s.px(x, y, WOOD[3])
    for d in range(-1, 2):  # X 표시
        s.px(11 + d, 9 + d, RED[1])
        s.px(11 + d, 9 - d, RED[1])
    s.px(2, 4, PAPER[0])
    s.outline()
    return s


def tab_weapon():
    """무기강화: 교차한 두 자루의 검"""
    s = Sprite(16, 16)
    for a in (0, 1):
        for i in range(10):
            x, y = (2 + i, 2 + i) if a == 0 else (13 - i, 2 + i)
            s.px(x, y, STEEL[1])
            s.px(x + (1 if a == 0 else -1), y, STEEL[2])
        gx, gy = (11, 11) if a == 0 else (4, 11)
        s.rect(gx - 1, gy, 3, 1, GOLD[1])
        s.rect(gx - 1 if a else gx - 1, gy, 3, 1, GOLD[1])
        hx, hy = (13, 13) if a == 0 else (2, 13)
        s.rect(hx - 1 if a == 0 else hx, hy - 1, 2, 2, WOOD[2])
    s.px(2, 2, STEEL[0])
    s.px(13, 2, STEEL[0])
    s.outline()
    return s


def tab_power():
    """힘강화: 불끈 쥔 주먹(팔 근육) + 반짝이"""
    s = Sprite(16, 16)
    disc(s, 7, 9, 5, SKIN[2])          # 팔뚝
    disc(s, 9.5, 5.5, 3.5, SKIN[2])   # 알통
    disc(s, 9, 5, 2.2, SKIN[1])
    disc(s, 6, 8, 3, SKIN[1])
    s.px(8, 4, SKIN[0])
    s.px(5, 7, SKIN[0])
    s.rect(2, 12, 5, 3, SKIN[3])       # 손목
    s.rect(3, 12, 3, 1, SKIN[2])
    s.outline()
    for x, y in ((13, 2), (14, 9)):
        s.px(x, y, GOLD[0])
        s.px(x - 1, y, GOLD[1])
        s.px(x + 1, y, GOLD[1])
        s.px(x, y - 1, GOLD[1])
        s.px(x, y + 1, GOLD[1])
    return s


def tab_skill():
    """스킬강화: 빛나는 마법서"""
    s = Sprite(16, 16)
    poly(s, [(2, 3), (8, 4), (14, 3), (14, 13), (8, 14), (2, 13)], PURPLE[2])
    poly(s, [(3, 4), (7.5, 5), (7.5, 12.5), (3, 12)], PAPER[1])
    poly(s, [(8.5, 5), (13, 4), (13, 12), (8.5, 12.5)], PAPER[2])
    s.vline(8, 4, 10, PURPLE[3])
    for y in (6, 8, 10):
        s.hline(4, y, 3, PAPER[3])
    disc(s, 10.8, 8.2, 1.6, CYAN[1])   # 빛나는 룬
    s.px(10, 7, '#FFFFFF')
    s.outline()
    s.px(12, 1, CYAN[0])
    s.px(14, 2, CYAN[1])
    return s


# ───────────── 재화·버튼 아이콘 ─────────────

def gold():
    """골드: 금화 (테두리 + 가운데 각인)"""
    s = Sprite(16, 16)
    disc(s, 8, 8, 6.5, GOLD[3])
    disc(s, 7.6, 7.6, 5.6, GOLD[2])
    disc(s, 7.2, 7.2, 4.4, GOLD[1])
    s.rect(7, 5, 2, 6, GOLD[2])       # 가운데 세로 각인
    s.rect(6, 6, 1, 1, GOLD[2])
    s.px(5, 4, GOLD[0])
    s.px(4, 5, GOLD[0])
    s.outline()
    return s


def diamond():
    """다이아: 위가 평평한 보석 (면마다 밝기를 달리해서 반짝)"""
    s = Sprite(16, 16)
    poly(s, [(4, 3), (12, 3), (15, 7), (8, 15), (1, 7)], CYAN[3])
    poly(s, [(4, 3), (8, 3), (6, 7), (1, 7)], CYAN[1])
    poly(s, [(8, 3), (12, 3), (15, 7), (10, 7)], CYAN[2])
    poly(s, [(6, 7), (10, 7), (8, 15)], CYAN[1])
    poly(s, [(1, 7), (6, 7), (8, 15)], CYAN[2])
    s.px(5, 4, '#FFFFFF')
    s.px(4, 5, CYAN[0])
    s.outline()
    return s


def coin():
    """강화코인: 붉은 보석이 박힌 보라빛 강화 주화"""
    s = Sprite(16, 16)
    disc(s, 8, 8, 6.5, PURPLE[3])
    disc(s, 7.6, 7.6, 5.6, PURPLE[2])
    disc(s, 7.2, 7.2, 4.4, PURPLE[1])
    poly(s, [(8, 4), (11, 8), (8, 12), (5, 8)], RED[2])   # 가운데 보석
    poly(s, [(8, 5), (10, 8), (8, 8), (6, 8)], RED[1])
    s.px(7, 6, '#FFFFFF')
    s.px(5, 4, PURPLE[0])
    s.outline()
    return s


def auto():
    """자동 이동: 바람을 가르는 날개 달린 신발"""
    s = Sprite(16, 16)
    poly(s, [(3, 8), (10, 8), (14, 11), (14, 13), (3, 13)], WOOD[2])
    poly(s, [(3, 8), (10, 8), (12, 10), (3, 10)], WOOD[1])
    s.hline(3, 13, 12, WOOD[3])
    poly(s, [(5, 7), (2, 2), (7, 4), (9, 7)], '#FFFFFF')   # 날개
    poly(s, [(5, 7), (4, 4), (7, 5), (8, 7)], STEEL[1])
    s.outline()
    for y in (9, 11):
        s.hline(0, y, 2, CYAN[1])
    return s


ICONS = {
    'tab_content': tab_content,
    'tab_weapon': tab_weapon,
    'tab_power': tab_power,
    'tab_skill': tab_skill,
    'gold': gold,
    'diamond': diamond,
    'coin': coin,
    'auto': auto,
}


# ───────────── 레이드 배경 (화면 한 장, 세로) ─────────────

def raid_bg(theme):
    """
    giganto: 플레그라 평원 — 해 질 녘 붉은 하늘, 먼 바위산, 갈라진 흙바닥
    typhoeus: 타르타로스 — 검붉은 하늘, 화산, 용암 균열이 흐르는 검은 바위 바닥
    화면 비율(약 9:19)에 맞춘 원본 130×280 px, 위 40%는 하늘·원경, 아래 60%는 바닥
    """
    W, H = 130, 280
    s = Sprite(W, H)
    rnd = random.Random(theme)
    horizon = int(H * 0.42)
    if theme == 'giganto':
        sky = ['#2A1630', '#4A2238', '#7A3440', '#B0583E']
        far = ['#3A2230', '#2C1A26']
        floor = ['#5A4230', '#4A3626', '#3C2C20', '#2E2218']
        crack = '#1E160E'
        accent = '#C8884A'
    else:
        sky = ['#12060A', '#2A0A0E', '#4A1210', '#7A2410']
        far = ['#24100E', '#180A0A']
        floor = ['#2E2224', '#26181C', '#1E1216', '#160C10']
        crack = '#FF7A1F'
        accent = '#FFB347'
    # 하늘: 띠 모양 단계색 + 경계 디더링
    for y in range(horizon):
        band = min(3, int(y / horizon * 4))
        for x in range(W):
            c = sky[band]
            nb = min(3, band + 1)
            if (y % (horizon // 4)) > horizon // 4 - 3 and (x + y) % 2 == 0:
                c = sky[nb]
            s.px(x, y, c)
    # 먼 산 (두 겹)
    for layer, col in enumerate(far):
        base = horizon - (14 if layer == 0 else 4)
        x = 0
        while x < W:
            w = rnd.randint(16, 30)
            h = rnd.randint(10, 26) if layer == 0 else rnd.randint(6, 14)
            for i in range(w):
                t = i / w
                top = base - int(h * (1 - abs(t - 0.5) * 2))
                for y in range(top, horizon + 1):
                    s.px(x + i, y, col)
            x += w - rnd.randint(2, 6)
    if theme == 'typhoeus':
        # 화산 하나 + 꼭대기 불빛
        cx = 92
        for i in range(-22, 23):
            top = horizon - 34 + abs(i)
            for y in range(top, horizon + 1):
                s.px(cx + i, y, '#1A0A0A')
        for i in range(-3, 4):
            s.px(cx + i, horizon - 34 + abs(i), accent)
            s.px(cx + i, horizon - 35, crack)
        for k in range(6):
            s.px(cx + rnd.randint(-4, 4), horizon - 38 - k * 3, '#6A2A20')
    # 바닥: 넓은 돌판 + 명암 얼룩
    for y in range(horizon, H):
        t = (y - horizon) / (H - horizon)
        for x in range(W):
            n = (math.sin(x * 0.21 + y * 0.13) + math.sin(x * 0.07 - y * 0.19)) * 0.5
            band = 1 if n > 0.3 else 2 if n > -0.4 else 3
            if t < 0.06:
                band = 3  # 지평선 바로 아래 그늘
            s.px(x, y, floor[band])
    # 돌판 이음새 (원근: 아래로 갈수록 넓게)
    y = horizon + 6
    step = 8
    while y < H:
        for x in range(W):
            s.px(x, y, floor[3])
        y += step
        step += 3
    for k in range(14):
        x0 = rnd.randint(0, W)
        y0 = rnd.randint(horizon + 8, H - 4)
        # 균열 (typhoeus는 용암이 빛난다)
        x, yy = x0, y0
        for _ in range(rnd.randint(6, 16)):
            s.px(x, yy, crack)
            if theme == 'typhoeus' and rnd.random() < 0.5:
                s.px(x, yy - 1, accent)
            x += rnd.choice((-1, 0, 1, 1))
            yy += rnd.choice((0, 1))
    # 작은 돌·뼈 조각
    for k in range(22):
        x = rnd.randint(2, W - 3)
        y = rnd.randint(horizon + 6, H - 3)
        s.rect(x, y, 2, 1, floor[0])
        s.px(x, y + 1, floor[3])
    if theme == 'typhoeus':
        # 바닥 아래쪽 용암 웅덩이 빛
        for x in range(W):
            if (x // 9) % 3 == 0:
                s.px(x, H - 2, crack)
                s.px(x, H - 1, accent)
    return s


def main():
    sheet = []
    for name, fn in ICONS.items():
        s = fn()
        save_png(s, name)
        sheet.append(s)
    for theme in ('giganto', 'typhoeus'):
        s = raid_bg(theme)
        save_png(s, 'bg_raid_' + theme, os.path.join(ROOT, 'assets', 'sprites'), upscale=4)
        sheet.append(s)
    # 미리보기
    sc = 4
    Wp = sum(x.w * sc + 12 for x in sheet) + 12
    Hp = max(x.h * sc for x in sheet) + 24
    img = Image.new('RGBA', (Wp, Hp), rgba('#2A2A34'))
    x = 12
    for sp in sheet:
        img.alpha_composite(sp.img.resize((sp.w * sc, sp.h * sc), Image.NEAREST), (x, 12))
        x += sp.w * sc + 12
    img.save('/tmp/pix-ui.png')
    print('saved', len(ICONS), 'icons + 2 raid backgrounds')


if __name__ == '__main__':
    main()
