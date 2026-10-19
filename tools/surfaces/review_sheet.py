# The owner's review sheet: each surface the evidence can't settle, side by side as the Sentinel-2 satellite picture
# (5 m a pixel, the best imagery in the map data) and the game's top-down render, the feature outlined in both, north
# up, with its id, place and the question. Usage (after the audit page has rendered the thumbnails, see SURFACES_REPORT):
#   python3 tools/surfaces/review_sheet.py <thumbs dir> <ctx> <out.png> id=question ...
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../..'))
thumbs, ctx, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
items = [a.split('=', 1) for a in sys.argv[4:]]
feats = {f['id']: f for f in json.load(open(os.path.join(HERE, 'classification.json')))['features']}
sat = Image.open(os.path.join(ROOT, 'public/geo/legon-sentinel2.webp')).convert('RGB')
SX0, SZ0, MPP = -2250, -2000, 5  # the imagery's frame (legon-master.geojson metadata.imagery)
S = 420
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
except OSError:
    font = bold = ImageFont.load_default()

rows = []
for fid, question in items:
    f = feats[fid]
    p = f['pts']
    xs, zs = p[0::2], p[1::2]
    pad = (f.get('w') or 0) + 2
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    half = (max(max(xs) - min(xs), max(zs) - min(zs)) / 2 + pad) * ctx
    to = lambda x, z: ((x - (cx - half)) / (2 * half) * S, (z - (cz - half)) / (2 * half) * S)
    box = ((cx - half - SX0) / MPP, (cz - half - SZ0) / MPP, (cx + half - SX0) / MPP, (cz + half - SZ0) / MPP)
    a = sat.crop(tuple(round(v) for v in box)).resize((S, S), Image.NEAREST)
    g = Image.open(os.path.join(thumbs, fid.replace('/', '_').replace(':', '_') + '.png')).convert('RGB').resize((S, S))
    for im in (a, g):
        d = ImageDraw.Draw(im)
        pts = [to(xs[i], zs[i]) for i in range(len(xs))]
        if f['geom'] == 'area': d.line(pts + [pts[0]], fill=(255, 0, 255), width=3)
        else: d.line(pts, fill=(255, 0, 255), width=3)
        # north arrow and scale
        d.polygon([(S - 24, 14), (S - 32, 36), (S - 16, 36)], fill=(255, 255, 255), outline=(0, 0, 0))
        d.text((S - 29, 38), 'N', fill=(255, 255, 255), font=bold, stroke_width=2, stroke_fill=(0, 0, 0))
        m = 100 if half > 300 else 50 if half > 120 else 20 if half > 30 else 10
        L = m / (2 * half) * S
        d.line([(12, S - 14), (12 + L, S - 14)], fill=(255, 255, 255), width=4)
        d.text((14, S - 36), f'{m} m', fill=(255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
    row = Image.new('RGB', (S * 2 + 30, S + 96), 'white')
    row.paste(a, (10, 86)); row.paste(g, (S + 20, 86))
    d = ImageDraw.Draw(row)
    d.text((10, 6), f"{fid}  ({f.get('cls') or 'untagged'}; game x {cx:.0f}, z {cz:.0f})", fill=(0, 0, 0), font=bold)
    words, line, lines = question.split(), '', []
    for w in words:
        if len(line) + len(w) > 95: lines.append(line); line = ''
        line += w + ' '
    lines.append(line)
    for i, l in enumerate(lines[:3]): d.text((10, 28 + i * 18), l, fill=(40, 40, 40), font=font)
    d.text((10, S + 88 - 4), '', fill=(0, 0, 0))
    rows.append(row)
head = Image.new('RGB', (S * 2 + 30, 34), 'white')
ImageDraw.Draw(head).text((10, 8), 'Left: satellite (Sentinel-2, 5 m a pixel). Right: the game from above. Magenta: the feature.', fill=(0, 0, 0), font=bold)
sheet = Image.new('RGB', (S * 2 + 30, 34 + sum(r.height for r in rows)), 'white')
sheet.paste(head, (0, 0))
y = 34
for r in rows: sheet.paste(r, (0, y)); y += r.height
sheet.save(out)
print(out, sheet.size)
