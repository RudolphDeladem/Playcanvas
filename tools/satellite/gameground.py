# Where the game's campus (the original's converted ground, before this project's own ground layers) shows grass, a
# metre a cell in the satellite classification's frame: from straight-down renders of tools/view (game=0, 300 m up, a
# 60 degree view, 1280 x 760: 0.456 m a pixel at the ground). Grass and the trees over it read green; paving, earth,
# roads and roofs do not. Cells no render covers count as grass.
# Usage: python3 tools/satellite/gameground.py <views.json> <shots dir> <out.png>
import json, math, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

views, shots, out = sys.argv[1:4]
X0, Z0, W, H = -850, -1800, 2050, 3400
grass = np.ones((H, W), bool)
seen = np.zeros((H, W), bool)
mpp = 2 * 300 * math.tan(math.radians(30)) / 760
for v in json.load(open(views)):
    try:
        im = np.asarray(Image.open(f"{shots}/{v['name']}.png").convert('RGB')).astype(np.int16)
    except FileNotFoundError:
        continue
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    green = (g > r + 6) & (g > b + 6)
    # the frame's cells: each cell's centre to its pixel
    x0, x1 = v['cx'] - 640 * mpp, v['cx'] + 640 * mpp
    z0, z1 = v['cz'] - 380 * mpp, v['cz'] + 380 * mpp
    i0, i1 = max(0, int(math.ceil(x0 - X0))), min(W, int(x1 - X0))
    j0, j1 = max(0, int(math.ceil(z0 - Z0))), min(H, int(z1 - Z0))
    if i1 <= i0 or j1 <= j0: continue
    xs = X0 + np.arange(i0, i1) + 0.5
    zs = Z0 + np.arange(j0, j1) + 0.5
    px = np.clip(((xs - v['cx']) / mpp + 640).astype(int), 0, 1279)
    py = np.clip(((zs - v['cz']) / mpp + 380).astype(int), 0, 759)
    grass[j0:j1, i0:i1] = green[py][:, px]
    seen[j0:j1, i0:i1] = True
# (specks: a lamp post, a bench, a car on the grass)
grass = nd.binary_closing(grass, iterations=1) | ~seen
Image.fromarray((grass * 255).astype(np.uint8)).save(out, optimize=True)
print('covered', round(seen.mean() * 100), '% of the frame; not grass', round((~grass).sum() / 1e4, 1), 'ha')
