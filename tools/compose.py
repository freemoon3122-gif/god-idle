import json, sys
from PIL import Image
sys.argv = ['x', 'mounts.json', '/dev/null']
exec(open('preview.py').read().split('sprites = json.load')[0])
heroes = json.load(open('heroes.json')); mounts = json.load(open('mounts.json'))
def comp(hero, mount, heroX, overlap, scale=6):
    h = render(heroes[hero], scale); m = render(mounts[mount], scale)
    top = h.height - overlap * scale
    W = max(m.width, heroX * scale + h.width); H = top + m.height
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    img.paste(h, (heroX * scale, 0), h); img.paste(m, (0, top), m)
    return img
opts = [('poseidon', 'shark', 2, 10), ('poseidon', 'shark', 4, 12), ('poseidon', 'shark', 6, 13), ('zeus', 'cloud', 5, 5)]
imgs = [comp(*o) for o in opts]
W = sum(i.width for i in imgs) + 20 * 5; H = max(i.height for i in imgs) + 40
sheet = Image.new('RGBA', (W, H), (40, 90, 120, 255)); x = 20
for im in imgs: sheet.paste(im, (x, H - im.height - 20), im); x += im.width + 20
sheet.save('compose.png'); print(sheet.size)
