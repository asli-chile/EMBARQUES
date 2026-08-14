"""Compose a close satellite static map of the ASLI office."""
from __future__ import annotations

import io
import math
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

LAT, LON = -34.97437, -71.20348
ZOOM = 17
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
    url = (
        "https://server.arcgisonline.com/ArcGIS/rest/services/"
        f"World_Imagery/MapServer/tile/{z}/{y}/{x}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as res:
        data = res.read()
    time.sleep(0.08)
    return Image.open(io.BytesIO(data)).convert("RGB")


def draw_pin(im: Image.Image, px: float, py: float) -> None:
    d = ImageDraw.Draw(im, "RGBA")
    x, y = int(px), int(py)
    d.ellipse((x - 12, y + 10, x + 12, y + 20), fill=(0, 0, 0, 80))
    d.polygon([(x, y - 42), (x + 18, y - 14), (x, y + 6), (x - 18, y - 14)], fill=(255, 255, 255, 255))
    d.ellipse((x - 18, y - 50, x + 18, y - 14), fill=(255, 255, 255, 255))
    d.polygon([(x, y - 38), (x + 14, y - 14), (x, y + 2), (x - 14, y - 14)], fill=(14, 90, 110, 255))
    d.ellipse((x - 14, y - 46, x + 14, y - 18), fill=(14, 90, 110, 255))
    d.ellipse((x - 6, y - 38, x + 6, y - 26), fill=(255, 255, 255, 255))


def main() -> None:
    fx, fy = lonlat_to_tile(LAT, LON, ZOOM)
    xs = list(range(int(fx) - 2, int(fx) + 3))  # 5 cols
    ys = list(range(int(fy) - 1, int(fy) + 3))  # 4 rows
    canvas = Image.new("RGB", (len(xs) * TILE, len(ys) * TILE), (30, 40, 35))

    for i, tx in enumerate(xs):
        for j, ty in enumerate(ys):
            tile = fetch_tile(ZOOM, tx, ty)
            canvas.paste(tile, (i * TILE, j * TILE))
            print(f"tile {tx}/{ty}")

    px = (fx - xs[0]) * TILE
    py = (fy - ys[0]) * TILE
    draw_pin(canvas, px, py)

    w, h = canvas.size
    canvas = canvas.crop((24, 16, w - 24, h - 16))
    canvas.thumbnail((1280, 860), Image.Resampling.LANCZOS)

    d = ImageDraw.Draw(canvas, "RGBA")
    d.rectangle((8, canvas.height - 22, 178, canvas.height - 6), fill=(0, 0, 0, 110))
    d.text((12, canvas.height - 20), "Esri, Maxar, Earthstar", fill=(255, 255, 255, 220))

    for dest in OUTS:
        dest.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(dest, "WEBP", quality=74, method=6)
        print(f"wrote {dest} {dest.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
