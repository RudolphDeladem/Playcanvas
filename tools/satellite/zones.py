# The zone audit sheets (the owner's ground and sidewalk specification, 2026-10-19, section 8): for each numbered aerial
# view (docs/aerials, tools/aerials.py) the satellite picture of the same frame (mosaic.py), the game before and after
# a round of corrections, side by side and north up, with the ground types read off the satellite drawn over a copy.
# Usage: python3 tools/satellite/zones.py <views.json> <mosaic.png> <classes.png> <before dir> <after dir> <out dir>
# (before and after: the labelled aerial views, NN.jpg)
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
views, mosaic, classes, before, after, out = sys.argv[1:7]
os.makedirs(out, exist_ok=True)
X0, Z0, MPP = -850, -1800, 0.5
W, H, HEIGHT, VFOV = 1280, 760, 218, 60
mpp = 2 * HEIGHT * math.tan(math.radians(VFOV / 2)) / H
sat = Image.open(mosaic)
cls = Image.open(classes)
bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
COL = np.array([[0, 0, 0, 0], [230, 120, 30, 150], [80, 160, 255, 150], [200, 40, 200, 150]], np.uint8)
S = 0.5  # (each panel at half size)
for v in json.load(open(views)):
    n = v['name']
    hw, hh = W * mpp / 2, H * mpp / 2
    box = (int((v['cx'] - hw - X0) / MPP), int((v['cz'] - hh - Z0) / MPP), int((v['cx'] + hw - X0) / MPP), int((v['cz'] + hh - Z0) / MPP))
    s = sat.crop(box).resize((int(W * S), int(H * S)))
    c = np.asarray(cls.crop((box[0] // 2, box[1] // 2, box[2] // 2, box[3] // 2)).resize((int(W * S), int(H * S)), Image.NEAREST))
    o = s.convert('RGBA'); o.alpha_composite(Image.fromarray(COL[c]))
    panels = [(s, 'SATELLITE'), (o.convert('RGB'), 'GROUND TYPES READ'), (Image.open(f'{before}/{n}.jpg').resize((int(W * S), int(H * S))), 'GAME BEFORE'), (Image.open(f'{after}/{n}.jpg').resize((int(W * S), int(H * S))), 'GAME AFTER')]
    im = Image.new('RGB', (int(W * S) * 2 + 6, int(H * S) * 2 + 6), 'white')
    for k, (p, t) in enumerate(panels):
        x, y = (k % 2) * (int(W * S) + 6), (k // 2) * (int(H * S) + 6)
        im.paste(p, (x, y))
        ImageDraw.Draw(im).text((x + 8, y + (32 if k >= 2 else 8)), t, fill=(255, 255, 0), font=bold, stroke_width=3, stroke_fill=(0, 0, 0))
    ImageDraw.Draw(im).text((8, int(H * S) - 30), 'earth: orange  paving: blue  asphalt: purple', fill=(255, 255, 255), font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15), stroke_width=2, stroke_fill=(0, 0, 0))
    im.save(f'{out}/{n}.jpg', quality=82)
print('sheets', len(os.listdir(out)))
