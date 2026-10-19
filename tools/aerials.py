# The numbered aerial views for the owner's corrections: each view labelled with its number, place and game-frame
# coordinates (north up, a scale bar), and an index map with every view's frame on the satellite picture.
# Usage: python3 tools/aerials.py <views.json> <shots dir> <out dir>
# (views.json: [{name, cx, cz, label, url}], shots from tools/shoot.mjs at 1280x760, camera 218 m up with a 60 deg view)
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

views = json.load(open(sys.argv[1])); shots, out = sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
W, H, HEIGHT, VFOV = 1280, 760, 218, 60
# metres a pixel at the ground (perspective from straight above)
mpp = 2 * HEIGHT * math.tan(math.radians(VFOV / 2)) / H
for v in views:
    im = Image.open(os.path.join(shots, v['name'] + '.png')).convert('RGB')
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 50], fill=(255, 255, 255))
    d.text((12, 8), f"{int(v['name'])}", fill=(200, 0, 0), font=bold)
    d.text((70, 14), f"{v['label']}  ·  centre x {v['cx']:.0f}, z {v['cz']:.0f} (game metres)", fill=(0, 0, 0), font=small)
    # north arrow and a 50 m bar
    d.polygon([(W - 30, 62), (W - 40, 90), (W - 20, 90)], fill=(255, 255, 255), outline=(0, 0, 0))
    d.text((W - 37, 92), 'N', fill=(255, 255, 255), font=small, stroke_width=2, stroke_fill=(0, 0, 0))
    L = 50 / mpp
    d.line([(16, H - 18), (16 + L, H - 18)], fill=(255, 255, 255), width=6)
    d.text((18, H - 46), '50 m', fill=(255, 255, 255), font=small, stroke_width=2, stroke_fill=(0, 0, 0))
    im.save(os.path.join(out, f"{v['name']}.jpg"), quality=85)
# the index: every view's frame on the satellite picture
sat = Image.open(os.path.join(ROOT, 'public/geo/legon-sentinel2.webp')).convert('RGB')
SX0, SZ0, MPP = -2250, -2000, 5
x0, x1, z0, z1 = -800, 1150, -1750, 1550
K = 2
img = sat.crop(((x0 - SX0) // MPP, (z0 - SZ0) // MPP, (x1 - SX0) // MPP, (z1 - SZ0) // MPP)).resize(((x1 - x0) // MPP * K, (z1 - z0) // MPP * K))
d = ImageDraw.Draw(img)
P = lambda x, z: ((x - x0) / MPP * K, (z - z0) / MPP * K)
hw, hh = W * mpp / 2, H * mpp / 2
for v in views:
    a, b = P(v['cx'] - hw, v['cz'] - hh), P(v['cx'] + hw, v['cz'] + hh)
    d.rectangle([a, b], outline=(255, 230, 0), width=3)
    c = P(v['cx'], v['cz'])
    d.text((c[0] - 14, c[1] - 18), str(int(v['name'])), fill=(255, 255, 255), font=bold, stroke_width=3, stroke_fill=(0, 0, 0))
d.rectangle([0, 0, img.width, 40], fill=(255, 255, 255))
d.text((10, 8), 'Index of the aerial views 1-30 (yellow frames), north up, on the satellite picture', fill=(0, 0, 0), font=small)
img.save(os.path.join(out, 'index.jpg'), quality=85)
print('mpp', round(mpp, 3), 'frame', round(2 * hw), 'x', round(2 * hh), 'm')
