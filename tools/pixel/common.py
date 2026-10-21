"""
도트(픽셀) 그림 공통 도구. 파이썬으로 점을 찍어 PNG를 만든다 (Pillow 필요: pip install pillow).

    from common import Sprite, save
    s = Sprite(54, 52)              # 가로 54 × 세로 52 픽셀 (투명 배경)
    s.rect(10, 20, 8, 6, '#C9971C') # x, y, 폭, 높이, 색
    s.outline()                     # 그림 둘레에 진한 1px 외곽선 (도트 게임 느낌)
    save(s, 'zeus')                 # assets/sprites/zeus.png 로 8배 확대해서 저장

규칙: 그라데이션·안티에일리어싱 없이 정해진 색(팔레트)만 쓴다. 명암은 같은 계열 3~4단계 색으로.
"""
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'sprites')
UPSCALE = 8  # 저장할 때 확대 배율 (최근접 이웃) → 폰에서 확대해도 흐려지지 않게
OUTLINE = '#1A1424'


def rgba(c):
    if c is None:
        return (0, 0, 0, 0)
    if isinstance(c, tuple):
        return c if len(c) == 4 else (*c, 255)
    c = c.lstrip('#')
    a = int(c[6:8], 16) if len(c) == 8 else 255
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


class Sprite:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.p = self.img.load()

    # ── 찍기 ──
    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.p[x, y] = rgba(c)

    def get(self, x, y):
        return self.p[x, y] if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                self.px(i, j, c)

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)

    def line(self, x0, y0, x1, y1, c):
        """브레젠험 직선 (계단 모양 그대로)"""
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def ellipse(self, cx, cy, rx, ry, c):
        """채운 타원 (중심 cx, cy / 반지름 rx, ry). 0.5 단위 중심도 된다"""
        for j in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for i in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((i + 0.5 - cx - 0.5) / max(rx, 0.5)) ** 2 + ((j + 0.5 - cy - 0.5) / max(ry, 0.5)) ** 2 <= 1:
                    self.px(i, j, c)

    def rows(self, x, y, lines, pal):
        """문자열 그림을 찍는다. pal = {'a': '#RRGGBB', ...}, '.'과 ' '는 투명(건너뜀)"""
        for j, line in enumerate(lines):
            for i, ch in enumerate(line):
                if ch not in '. ' and ch in pal:
                    self.px(x + i, y + j, pal[ch])

    def mirror_x(self):
        """왼쪽 절반을 오른쪽에 거울처럼 복사 (좌우 대칭 그림)"""
        for j in range(self.h):
            for i in range(self.w // 2):
                if self.p[i, j][3]:
                    self.p[self.w - 1 - i, j] = self.p[i, j]

    def paste(self, other, x, y):
        for j in range(other.h):
            for i in range(other.w):
                c = other.p[i, j]
                if c[3]:
                    self.px(x + i, y + j, c)

    # ── 마무리 ──
    def outline(self, c=OUTLINE):
        """그림과 맞닿은 투명 칸을 외곽선 색으로 (상하좌우 4방향)"""
        src = [[self.p[i, j][3] > 0 for i in range(self.w)] for j in range(self.h)]
        for j in range(self.h):
            for i in range(self.w):
                if src[j][i]:
                    continue
                for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ii, jj = i + di, j + dj
                    if 0 <= ii < self.w and 0 <= jj < self.h and src[jj][ii]:
                        self.p[i, j] = rgba(c)
                        break


def save(s, name, upscale=UPSCALE):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + '.png')
    s.img.resize((s.w * upscale, s.h * upscale), Image.NEAREST).save(path)
    return path


def preview(sprites, path, scale=6, bg='#3A3A44'):
    """여러 스프라이트를 한 장에 나란히 (확인용)"""
    W = sum(s.w * scale + 16 for s in sprites) + 16
    H = max(s.h * scale for s in sprites) + 32
    img = Image.new('RGBA', (W, H), rgba(bg))
    x = 16
    for s in sprites:
        big = s.img.resize((s.w * scale, s.h * scale), Image.NEAREST)
        img.alpha_composite(big, (x, H - 16 - s.h * scale))
        x += s.w * scale + 16
    img.save(path)
