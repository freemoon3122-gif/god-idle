"""픽셀 스프라이트 미리보기: 외곽선 자동 생성 포함. 사용: python3 preview.py sprites.json out.png"""
import json
import sys

from PIL import Image

PALETTE = {
    'y': '#FFD54A', 'Y': '#C9971C', 's': '#FFDDC4', 'd': '#F2B391', 'S': '#B87A4E', 'b': '#2A2240',
    'w': '#FFFFFF', 'c': '#D5DDF0', 'g': '#C8C8D8', 'G': '#8A8AA0', 'p': '#FF9FB0', 'n': '#B5475A',
    'h': '#8B5A2B', 'H': '#5E3A1C', 'l': '#5CC46B', 'L': '#2F8A45', 'B': '#4C8DFF', 'F': '#B9C6E4',
    'W': '#F2F4FA', 'E': '#B4BDD3', 't': '#2BB3A3', 'T': '#16756B', 'A': '#7FE8DA', 'u': '#2D5FC0',
    'U': '#1B3C85', 'q': '#EEF3FB', 'Q': '#93A3C2', 'z': '#FFF27A', 'Z': '#FFA51F', 'x': '#6FE3FF',
    'r': '#E5484D', 'v': '#7A4FC8', 'V': '#4A2A8C', 'm': '#6CC24A', 'M': '#2E7A2A', 'k': '#DDE6FF',
    'o': '#7A4A26', 'R': '#B8323A', 'O': '#3D2A55', 'i': '#5B7A99', 'I': '#3E5772',
    'a': '#B8F27C', 'j': '#2A1238', 'e': '#FF2E2E', 'f': '#6F7385', 'D': '#41434F', 'K': '#7A4A26', 'P': '#7C6FA8', 'X': '#8E5A37',
}
OUTLINE = '#1C1430'


def outline(rows):
    w = max(len(r) for r in rows)
    grid = [list(r.ljust(w, '.')) for r in rows]
    h = len(grid)
    out = [['.'] * (w + 2) for _ in range(h + 2)]
    for y in range(h):
        for x in range(w):
            out[y + 1][x + 1] = grid[y][x]
    res = [row[:] for row in out]
    for y in range(h + 2):
        for x in range(w + 2):
            if out[y][x] != '.':
                continue
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h + 2 and 0 <= xx < w + 2 and out[yy][xx] != '.':
                    res[y][x] = '#'
                    break
    return res


def render(rows, scale):
    grid = outline(rows)
    img = Image.new('RGBA', (len(grid[0]) * scale, len(grid) * scale), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            color = OUTLINE if ch == '#' else PALETTE.get(ch)
            if color is None:
                raise SystemExit(f'unknown color {ch!r}')
            rgb = tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))
            for yy in range(y * scale, (y + 1) * scale):
                for xx in range(x * scale, (x + 1) * scale):
                    img.putpixel((xx, yy), rgb + (255,))
    return img


sprites = json.load(open(sys.argv[1]))
for name, rows in sprites.items():
    widths = {len(r) for r in rows}
    if len(widths) != 1:
        print(f'{name}: 줄 길이가 다름 {[(i, len(r)) for i, r in enumerate(rows)]}')
scale = 8
imgs = [render(r, scale) for r in sprites.values()]
W = sum(i.width for i in imgs) + 20 * (len(imgs) + 1)
H = max(i.height for i in imgs) + 40
sheet = Image.new('RGBA', (W, H), (90, 110, 200, 255))
x = 20
for im in imgs:
    sheet.paste(im, (x, H - im.height - 20), im)
    x += im.width + 20
sheet.save(sys.argv[2])
print('saved', sys.argv[2], sheet.size)
