# The owner's review sheet for this round: each open question with its place marked on a zoomed satellite crop and on
# a straight-down render of the game centred on it (tools/view, game=1, 2 x half-size / 1.1547 m up).
# Usage: python3 tools/satellite/review.py <mosaic.png> <out.jpg> <shots dir: rA.png ...>
import math, sys
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS = None
mosaic, out, shots = sys.argv[1], sys.argv[2], sys.argv[3]
X0, Z0, MPP = -850, -1800, 0.5
# (letter, aerial view, box x0, z0, x1, z1, question)
ITEMS = [
    ('A', '18', -135, 450, -105, 520, 'A large hatched structure north-west of the Legon Hall area (about x -120, z 485): the game\nhas open grass, the satellite reads earth and grey. What is it (shade houses, a yard), and should the game show it?'),
    ('B', '09', -625, 85, -585, 160, "Commonwealth Hall's central courtyard: the satellite reads paving between lawn squares; the game\nnow lays paving patches where it had lawn. Paved courtyard with lawn squares, or lawn?"),
    ('C', '30', 1010, 960, 1200, 1300, 'The town east of the N4 by the main gate: roofs the map leaves out read as paving, so its ground\nis left unclassified. Leave it as it is?'),
    ('D', '04', 830, -480, 1000, -300, 'Woodland east of the N4 (zone 4): the satellite shows trees and bare earth; the game has bare\nlawn with the earth now drawn but no trees. Plant trees there (the original has none)?'),
]
sat = Image.open(mosaic)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
rows = []
for k, v, x0, z0, x1, z1, q in ITEMS:
    m = max(x1 - x0, z1 - z0) * 0.5 + 25
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    bx = (cx - m, cz - m, cx + m, cz + m)
    s = sat.crop([int((bx[0] - X0) / MPP), int((bx[1] - Z0) / MPP), int((bx[2] - X0) / MPP), int((bx[3] - Z0) / MPP)]).resize((520, 520))
    sc = 520 / (2 * m)
    ImageDraw.Draw(s).rectangle([(x0 - bx[0]) * sc, (z0 - bx[1]) * sc, (x1 - bx[0]) * sc, (z1 - bx[1]) * sc], outline=(255, 0, 0), width=4)
    # (the game: a straight-down render centred on the place, 2 m tall frame for 1.1547 m of height, its middle square)
    g = Image.open(f'{shots}/r{k}.png').crop((260, 0, 1020, 760)).resize((520, 520))
    ImageDraw.Draw(g).rectangle([(x0 - bx[0]) * sc, (z0 - bx[1]) * sc, (x1 - bx[0]) * sc, (z1 - bx[1]) * sc], outline=(255, 0, 0), width=4)
    r = Image.new('RGB', (1060, 640), 'white')
    r.paste(s, (0, 110)); r.paste(g, (540, 110))
    d = ImageDraw.Draw(r)
    d.text((10, 8), k, fill=(200, 0, 0), font=fb)
    d.multiline_text((60, 10), q + f'\n(aerial view {int(v)}; left: satellite, right: the game now)', fill=(0, 0, 0), font=f)
    rows.append(r)
sheet = Image.new('RGB', (1060 * 2 + 20, 640 * 2 + 20), (220, 220, 220))
for i, r in enumerate(rows): sheet.paste(r, ((i % 2) * 1080, (i // 2) * 660))
sheet.save(out, quality=85)
print('ok')
