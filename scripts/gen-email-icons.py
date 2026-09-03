from PIL import Image, ImageDraw
from pathlib import Path
import math

out = Path(r"c:\Users\rodri\OneDrive\Desktop\DEVELOPER\ERP+WEB\ERP\public\email\icons")
out.mkdir(parents=True, exist_ok=True)

NAVY = (17, 34, 78, 255)
WHITE = (255, 255, 255, 255)
RED = (200, 16, 46, 255)


def circle_icon(name, drawer):
    size = 72
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, size - 1, size - 1), fill=NAVY)
    drawer(d, size)
    img.save(out / f"{name}.png")


def draw_calendar(d, s):
    m = int(s * 0.22)
    d.rounded_rectangle((m, m + 4, s - m, s - m), radius=6, outline=WHITE, width=3)
    d.rectangle((m, m + 4, s - m, m + int(s * 0.38)), fill=WHITE)
    for x in (s * 0.35, s * 0.65):
        d.line((x, m - 2, x, m + 10), fill=WHITE, width=3)


def draw_pin(d, s):
    cx, cy = s / 2, s * 0.38
    r = s * 0.18
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=WHITE, width=3)
    d.ellipse((cx - r * 0.35, cy - r * 0.35, cx + r * 0.35, cy + r * 0.35), fill=WHITE)
    d.polygon(
        [(cx, s * 0.82), (cx - s * 0.14, cy + r * 0.7), (cx + s * 0.14, cy + r * 0.7)],
        fill=WHITE,
    )


def draw_product(d, s):
    d.ellipse((s * 0.22, s * 0.42, s * 0.48, s * 0.70), outline=WHITE, width=3)
    d.ellipse((s * 0.48, s * 0.42, s * 0.74, s * 0.70), outline=WHITE, width=3)
    d.arc((s * 0.30, s * 0.18, s * 0.70, s * 0.55), start=200, end=340, fill=WHITE, width=3)


def draw_document(d, s):
    m = int(s * 0.24)
    d.rounded_rectangle((m, m, s - m, s - m), radius=4, outline=WHITE, width=3)
    for i, y in enumerate([0.38, 0.52, 0.66]):
        x1, x2 = s * 0.34, s * (0.66 if i < 2 else 0.55)
        d.line((x1, s * y, x2, s * y), fill=WHITE, width=3)


def draw_cold(d, s):
    cx, cy = s / 2, s / 2
    for angle in range(0, 360, 60):
        rad = math.radians(angle)
        x2 = cx + math.cos(rad) * s * 0.28
        y2 = cy + math.sin(rad) * s * 0.28
        d.line((cx, cy, x2, y2), fill=WHITE, width=3)
    d.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=WHITE)


circle_icon("calendar", draw_calendar)
circle_icon("pin", draw_pin)
circle_icon("product", draw_product)
circle_icon("document", draw_document)
circle_icon("cold", draw_cold)

mark = Image.new("RGBA", (44, 44), (0, 0, 0, 0))
md = ImageDraw.Draw(mark)
md.polygon([(22, 4), (40, 40), (4, 40)], fill=RED)
md.polygon([(22, 16), (30, 36), (14, 36)], fill=(11, 26, 61, 255))
mark.save(out / "mark-a.png")
print("ok", sorted(p.name for p in out.iterdir()))
