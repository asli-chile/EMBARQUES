"""Compose a static OSM map of the ASLI office and save WebP."""
from __future__ import annotations

import io
import math
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

LAT, LON = -34.97437, -71.20348
ZOOM = 15
TILE = 256
UA = "ASLI-web/1.0 (asli.cl; static office map)"

ROOT = Path(__file__).resolve().parent.parent
OUTS = [
    ROOT / "web2" / "public" / "img" / "mapa-asli.webp",
    ROOT.parent / "WEB" / "public" / "img" / "mapa-asli.webp",
]


def lonlat_to_tile(lat: float, lon: float, z: int) -> tuple[float, float]:
    n = 2**z
    x = n * ((lon + 180.0) / 360.0)
    lat_rad = math.radians(lat)
    y = n * (1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0
    return x, y


def fetch_tile(z: int, x: int, y: int) -> Image.Image:
    url = f"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as res:
        data = res.read()
    time.sleep(0.12)
    return Image.open(io.BytesIO(data)).convert("RGB")


def draw_pin(im: Image.Image, px: float, py: float) -> None:
    d = ImageDraw.Draw(im, "RGBA")
    x, y = int(px), int(py)
    # Drop shadow
    d.ellipse((x - 10, y + 10, x + 10, y + 18), fill=(15, 40, 55, 70))
    # Teardrop
    d.polygon([(x, y - 36), (x + 16, y - 12), (x, y + 4), (x - 16, y - 12)], fill=(14, 90, 110, 255))
    d.ellipse((x - 16, y - 42, x + 16, y - 10), fill=(14, 90, 110, 255))
    d.ellipse((x - 7, y - 33, x + 7, y - 19), fill=(247, 245, 242, 255))


def main() -> None:
    fx, fy = lonlat_to_tile(LAT, LON, ZOOM)
    xs = list(range(int(fx) - 2, int(fx) + 4))  # 6 cols
    ys = list(range(int(fy) - 1, int(fy) + 3))  # 4 rows
    canvas = Image.new("RGB", (len(xs) * TILE, len(ys) * TILE), (232, 239, 232))

    for i, tx in enumerate(xs):
        for j, ty in enumerate(ys):
            tile = fetch_tile(ZOOM, tx, ty)
            canvas.paste(tile, (i * TILE, j * TILE))
            print(f"tile {tx}/{ty}")

    px = (fx - xs[0]) * TILE
    py = (fy - ys[0]) * TILE
    draw_pin(canvas, px, py)

    # Crop a bit of edge so the pin sits well
    w, h = canvas.size
    canvas = canvas.crop((40, 20, w - 40, h - 20))

    for dest in OUTS:
        dest.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(dest, "WEBP", quality=78, method=6)
        print(f"wrote {dest} {dest.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
