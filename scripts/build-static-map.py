"""Compose a close satellite static map of the ASLI office."""
from __future__ import annotations

import io
import math
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

# Apple Maps / Waze de la oficina (el embed de Google centra ~190 m al oeste, en un lote vacío).
LAT, LON = -34.9743702, -71.2034765
ZOOM = 17
TILE = 256
COLS, ROWS = 5, 4
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
    x0 = int(math.floor(fx - (COLS - 1) / 2.0))
    y0 = int(math.floor(fy - (ROWS - 1) / 2.0))
    xs = list(range(x0, x0 + COLS))
    ys = list(range(y0, y0 + ROWS))
    canvas = Image.new("RGB", (len(xs) * TILE, len(ys) * TILE), (30, 40, 35))

    for i, tx in enumerate(xs):
        for j, ty in enumerate(ys):
            tile = fetch_tile(ZOOM, tx, ty)
            canvas.paste(tile, (i * TILE, j * TILE))
            print(f"tile {tx}/{ty}")

    px = (fx - xs[0]) * TILE
    py = (fy - ys[0]) * TILE
    draw_pin(canvas, px, py)
    print(f"pin at {px:.0f},{py:.0f} of {canvas.size}")

    out_w, out_h = canvas.width, int(canvas.width * 9 / 16)
    left = int(px - out_w / 2)
    top = int(py - out_h / 2)
    left = max(0, min(left, canvas.width - out_w))
    top = max(0, min(top, canvas.height - out_h))
    canvas = canvas.crop((left, top, left + out_w, top + out_h))
    canvas.thumbnail((1280, 720), Image.Resampling.LANCZOS)

    d = ImageDraw.Draw(canvas, "RGBA")
    d.rectangle((8, canvas.height - 22, 178, canvas.height - 6), fill=(0, 0, 0, 110))
    d.text((12, canvas.height - 20), "Esri, Maxar, Earthstar", fill=(255, 255, 255, 220))

    for dest in OUTS:
        dest.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(dest, "WEBP", quality=74, method=6)
        print(f"wrote {dest} {dest.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
