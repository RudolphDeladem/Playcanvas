# Draws the sidewalk evidence map (sidewalkmap.mjs): main roads in grey, a sidewalk side in green, over the satellite.
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
segs = json.load(open(sys.argv[1])); out = sys.argv[2]
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..'))
sat = Image.open(os.path.join(ROOT, 'public/geo/legon-sentinel2.webp')).convert('RGB')
SX0, SZ0, MPP = -2250, -2000, 5
x0, x1, z0, z1 = -1500, 1700, -1800, 2000  # the main campus and its approaches
K = 2  # output pixels a satellite pixel
img = sat.crop(((x0 - SX0) // MPP, (z0 - SZ0) // MPP, (x1 - SX0) // MPP, (z1 - SZ0) // MPP))
img = img.resize((img.width * K, img.height * K)).point(lambda v: int(v * 0.55 + 60))
d = ImageDraw.Draw(img)
P = lambda x, z: ((x - x0) / MPP * K, (z - z0) / MPP * K)
for s in segs:
    d.line([P(s['ax'], s['az']), P(s['bx'], s['bz'])], fill=(90, 90, 90), width=3)
for s in segs:
    dx, dz = s['bx'] - s['ax'], s['bz'] - s['az']; L = (dx * dx + dz * dz) ** 0.5 or 1
    for side, sg in (('l', 1), ('r', -1)):
        if not s[side]: continue
        nx, nz = dz / L * sg, -dx / L * sg; o = s['w'] + 1.5
        d.line([P(s['ax'] + nx * o, s['az'] + nz * o), P(s['bx'] + nx * o, s['bz'] + nz * o)], fill=(0, 200, 60), width=4)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except OSError: font = ImageFont.load_default()
d.rectangle([0, 0, img.width, 64], fill=(255, 255, 255))
d.text((12, 8), 'Sidewalks with map evidence (green) along the main roads (grey). North up; 200 m bar below.', fill=(0, 0, 0), font=font)
d.text((12, 36), 'Any road you know has a sidewalk but shows no green: tell me which one, or send a photo.', fill=(0, 0, 0), font=font)
d.line([(20, img.height - 20), (20 + 200 / MPP * K, img.height - 20)], fill=(255, 255, 255), width=6)
img.save(out); print(out, img.size, 'segments', len(segs), 'sides with a sidewalk', sum(bool(s['l']) + bool(s['r']) for s in segs))
