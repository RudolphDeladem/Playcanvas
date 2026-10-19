# The satellite picture of the campus in the game's frame: Esri World Imagery tiles (zoom 18, about 0.6 m a pixel),
# resampled north up at 0.5 m a pixel over the campus, for the ground classification (classify.py). The tiles and the
# mosaic stay outside the repository (a reference only; nothing of the imagery ships).
# Usage: python3 tools/satellite/mosaic.py <cache dir> <out.png>
import io, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image

cache, out = sys.argv[1], sys.argv[2]
os.makedirs(cache, exist_ok=True)
# the game's frame (the original's scripts/geography/lib.mjs): x east, z south, metres from this point
LAT0, LNG0, M_LAT = 5.6518, -0.1871, 110574
M_LNG = 111320 * math.cos(math.radians(LAT0))
X0, X1, Z0, Z1, MPP, Z = -850, 1200, -1800, 1600, 0.5, 18
URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

def merc(lat, lng):
    n = 256 * 2 ** Z
    return (lng + 180) / 360 * n, (1 - np.log(np.tan(np.radians(lat)) + 1 / np.cos(np.radians(lat))) / math.pi) / 2 * n

xs = np.arange(X0, X1, MPP) + MPP / 2
zs = np.arange(Z0, Z1, MPP) + MPP / 2
px, _ = merc(LAT0, LNG0 + xs / M_LNG)
_, py = merc(LAT0 - zs / M_LAT, LNG0)
tx0, tx1, ty0, ty1 = int(px.min() // 256), int(px.max() // 256), int(py.min() // 256), int(py.max() // 256)

def fetch(t):
    x, y = t
    f = os.path.join(cache, f'{Z}_{x}_{y}.jpg')
    if not os.path.exists(f):
        for k in range(4):
            try:
                req = urllib.request.Request(URL.format(z=Z, x=x, y=y), headers={'User-Agent': 'Mozilla/5.0'})
                open(f, 'wb').write(urllib.request.urlopen(req, timeout=30).read())
                break
            except Exception:
                time.sleep(2 ** k)
    return t, f

tiles = [(x, y) for x in range(tx0, tx1 + 1) for y in range(ty0, ty1 + 1)]
big = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256, 3), np.uint8)
with ThreadPoolExecutor(8) as ex:
    for (x, y), f in ex.map(fetch, tiles):
        big[(y - ty0) * 256:(y - ty0 + 1) * 256, (x - tx0) * 256:(x - tx0 + 1) * 256] = np.asarray(Image.open(f).convert('RGB'))
# bilinear resampling onto the game's grid
fx, fy = px - tx0 * 256 - 0.5, py - ty0 * 256 - 0.5
ix, iy = np.floor(fx).astype(int), np.floor(fy).astype(int)
ax, ay = (fx - ix)[None, :, None], (fy - iy)[:, None, None]
a = big[iy][:, ix].astype(np.float32); b = big[iy][:, ix + 1]; c = big[iy + 1][:, ix]; d = big[iy + 1][:, ix + 1]
img = a * (1 - ax) * (1 - ay) + b * ax * (1 - ay) + c * (1 - ax) * ay + d * ax * ay
Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(out)
print(len(tiles), 'tiles;', img.shape[1], 'x', img.shape[0], 'px at', MPP, 'm; x', X0, X1, 'z', Z0, Z1)
