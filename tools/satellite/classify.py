# The ground types on the satellite picture (mosaic.py), a metre a cell in the game's frame: grass (left to the game),
# bare earth, light paving (concrete, car parks, yards) and dark asphalt (car parks, yards). Buildings, roads, water,
# pitches and what is already drawn or decided (surfaces.json) are left out, and specks are cleaned away.
# Usage: python3 tools/satellite/classify.py <mosaic.png> <out dir> [game-grass.png]   (writes classes.png there and the
# game's copy, public/geo/ground-classes.png)
# Only grass the game draws becomes earth or paving (where the original already draws paving or earth, a site of its
# own, it is left to it); dark grey is not used (on the picture it is mostly shadow: a stand's, a wall's, a tree's).
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
mosaic, out = sys.argv[1], sys.argv[2]
# (optional: the original's ground as the game draws it, gameground.py: 1 where it shows grass)
game_grass = np.asarray(Image.open(sys.argv[3])) > 0 if len(sys.argv) > 3 else None
os.makedirs(out, exist_ok=True)
X0, X1, Z0, Z1, MPP = -850, 1200, -1800, 1600, 0.5
CELL = 1.0
W, H = int((X1 - X0) / CELL), int((Z1 - Z0) / CELL)
NONE, EARTH, PAVED, ASPHALT = 0, 1, 2, 3
# (x0, z0, x1, z1) left out: the town east of the N4 by the main gate
TOWN = [(1010, 960, 1200, 1300)]

img = np.asarray(Image.open(mosaic).convert('RGB')).astype(np.float32)
# a metre a cell: the mean of each 2 x 2 block, lightly smoothed
img = img.reshape(H, 2, W, 2, 3).mean(axis=(1, 3))
img = np.stack([nd.gaussian_filter(img[..., k], 0.8) for k in range(3)], -1)
r, g, b = img[..., 0], img[..., 1], img[..., 2]
mx, mn = img.max(-1), img.min(-1)
V, S = mx, (mx - mn) / np.maximum(mx, 1)
# hue in degrees (the imagery is warm: paving reads beige-grey, earth orange, grass olive to green)
c = np.maximum(mx - mn, 1e-3)
hue = np.where(mx == r, 60 * ((g - b) / c % 6), np.where(mx == g, 60 * ((b - r) / c + 2), 60 * ((r - g) / c + 4)))
exg = 2 * g - r - b
cls = np.zeros((H, W), np.uint8)
green = ((hue > 52) & (S > 0.3)) | (exg > 30)
# bare earth: the orange-red laterite
earth = (((hue < 42) & (S >= 0.34)) | ((hue < 32) & (S >= 0.28))) & (exg < 20) & (V > 110) & ~green
# paving: beige-grey with little colour, light (concrete) or darker (asphalt); darker still is shadow
grey = (S < 0.27) & (exg < 22) & (hue > 20) & (hue < 75) & ~green & ~earth
paved = grey & (V >= 135)
asphalt = grey & (V >= 92) & (V < 135)
cls[earth] = EARTH; cls[paved] = PAVED

# ---------------------------------------------------------------------------------------------- what is left out
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
P = lambda x, z: ((x - X0) / CELL, (z - Z0) / CELL)
m = json.load(open(os.path.join(ROOT, 'src/data/legon-map.json')))
nodes = m['nodes']
for bl in m['buildings']:
    p = bl['p']; pts = [P(p[i] / 10, p[i + 1] / 10) for i in range(0, len(p), 2)]
    if len(pts) > 2: d.polygon(pts, fill=255, outline=255)
ROAD_WIDTH = [9, 7.4, 6.2, 4.6, 2.6]
for rd in m['roads']:
    w = ROAD_WIDTH[int(rd['c'])] + 1.0
    pts = [P(nodes[n * 2] / 10, nodes[n * 2 + 1] / 10) for n in rd['w']]
    d.line(pts, fill=255, width=max(1, round(w / CELL)), joint='curve')
    for q in pts: d.ellipse([q[0] - w / 2, q[1] - w / 2, q[0] + w / 2, q[1] + w / 2], fill=255)
for a in m['areas']:
    if a['k'] in ('water', 'pitch', 'track', 'plaza', 'parking'):
        p = a['p']; pts = [P(p[i] / 10, p[i + 1] / 10) for i in range(0, len(p), 2)]
        if len(pts) > 2: d.polygon(pts, fill=255, outline=255)
for f in json.load(open(os.path.join(ROOT, 'src/data/surfaces.json')))['features']:
    p = f['pts']; pts = [P(p[i], p[i + 1]) for i in range(0, len(p), 2)]
    if f['geom'] == 'area' and len(pts) > 2: d.polygon(pts, fill=255, outline=255)
    elif len(pts) > 1: d.line(pts, fill=255, width=max(1, round((f.get('w') or 2) / CELL)))
# what waits on the owner's decision (classify.mjs OWNER REVIEW: UPSA's compound, the fountain, ...) is not decided here
for f in json.load(open(os.path.join(ROOT, 'tools/surfaces/classification.json')))['features']:
    if 'OWNER REVIEW' not in (f.get('why') or ''): continue
    p = f['pts']; pts = [P(p[i], p[i + 1]) for i in range(0, len(p), 2)]
    if f['geom'] == 'area' and len(pts) > 2: d.polygon(pts, fill=255, outline=255)
    elif len(pts) > 1: d.line(pts, fill=255, width=max(1, round((f.get('w') or 2) / CELL)))
# the town east of the N4 by the main gate: corrugated roofs the map leaves out read as paving and earth on the
# picture (not classified; listed for review)
for x0, z0, x1, z1 in TOWN:
    d.rectangle([P(x0, z0), P(x1, z1)], fill=255)
out_mask = np.asarray(mask) > 0
if game_grass is not None:
    # (and a metre round what is not grass: no sliver along the original's own paving)
    out_mask |= nd.binary_dilation(~game_grass, iterations=1)
# (a building's edge and its lean: a metre and a half round it)
bmask = Image.new('L', (W, H), 0); bd = ImageDraw.Draw(bmask)
for bl in m['buildings']:
    p = bl['p']; pts = [P(p[i] / 10, p[i + 1] / 10) for i in range(0, len(p), 2)]
    if len(pts) > 2: bd.polygon(pts, fill=255, outline=255)
bm = np.asarray(bmask) > 0
out_mask |= nd.binary_dilation(bm, iterations=2)
# (roof tiles are the colour of the laterite, and the roofs reach past the mapped footprints: their eaves, and the
# lean of a tall building on the picture; no earth within 5 m of a building)
near_building = nd.binary_dilation(bm, iterations=5)

# ---------------------------------------------------------------------------------------------- cleaning
def clean(k, open_r, min_area, hole, close_r=1):
    a = cls == k
    if k == EARTH: a &= ~near_building
    a = nd.binary_closing(a, iterations=close_r)
    a = nd.binary_opening(a, iterations=open_r)
    a &= ~out_mask
    lab, n = nd.label(a)
    if n:
        sizes = nd.sum(a, lab, range(1, n + 1))
        a = np.isin(lab, 1 + np.flatnonzero(sizes >= min_area / CELL ** 2))
    # small holes filled (a car or a shadow in a car park)
    holes = nd.binary_fill_holes(a) & ~a
    lab, n = nd.label(holes)
    if n:
        sizes = nd.sum(holes, lab, range(1, n + 1))
        a |= np.isin(lab, 1 + np.flatnonzero(sizes < hole / CELL ** 2))
    return a & ~out_mask
e_ = clean(EARTH, 2, 120, 30)
p_ = clean(PAVED, 2, 120, 150, 2)
# (paving and asphalt touching: one surface, the class of the larger part)
res = np.zeros((H, W), np.uint8)
res[p_] = PAVED; res[e_] = EARTH
Image.fromarray(res).save(os.path.join(out, 'classes.png'))
# (the game's copy: a cell's grey level is its class; satground.ts)
Image.fromarray(res, 'L').save(os.path.join(ROOT, 'public/geo/ground-classes.png'), optimize=True)
np.save(os.path.join(out, 'mask.npy'), out_mask)
for k, nm in [(EARTH, 'earth'), (PAVED, 'paved')]:
    print(nm, round((res == k).sum() * CELL ** 2 / 1e4, 1), 'ha')
