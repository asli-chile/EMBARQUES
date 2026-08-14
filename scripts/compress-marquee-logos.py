from pathlib import Path
from PIL import Image

FILES = [
    "alma.png",
    "cope.png",
    "hillvilla.png",
    "xsur.png",
    "jotrisa.png",
    "san-andres.png",
    "rino.png",
    "agronexo.png",
    "fedefruta.png",
    "maulealimenta.png",
    "prochile2.png",
    "avianca.png",
    "cma.png",
    "latamcargo.png",
    "zim.png",
    "maersk.png",
    "oocl.png",
    "iberia.png",
    "msc.png",
    "pil.png",
    "skylogo.png",
    "cosco.png",
    "yangming.png",
    "one.png",
    "jetsmart.png",
    "wanhai.png",
]

ROOT = Path(__file__).resolve().parent.parent
DIRS = [ROOT / "web2" / "public" / "img", ROOT.parent / "WEB" / "public" / "img"]
MAX_W = 280

before = 0
after = 0
src_dir = DIRS[0]

for name in FILES:
    src = src_dir / name
    if not src.exists():
        print("missing", name)
        continue
    before += src.stat().st_size
    im = Image.open(src)
    if im.mode in ("P", "LA"):
        im = im.convert("RGBA")
    elif im.mode == "CMYK":
        im = im.convert("RGB")
    if im.width > MAX_W:
        h = max(1, int(im.height * MAX_W / im.width))
        im = im.resize((MAX_W, h), Image.Resampling.LANCZOS)
    out_name = f"{src.stem}.webp"
    for dest in DIRS:
        dest.mkdir(parents=True, exist_ok=True)
        im.save(dest / out_name, "WEBP", quality=78, method=6)
    size = (src_dir / out_name).stat().st_size
    after += size
    print(f"{name:22} {src.stat().st_size/1024:7.1f} KB -> {size/1024:5.1f} KB")

print(f"TOTAL {before/1024:.0f} KB -> {after/1024:.0f} KB")
