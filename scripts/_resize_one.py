"""Downscale a single image to MAX_EDGE (default 2048) using PIL.
Handles the JPEGs that sharp/libvips cannot decode on this machine."""
import sys
import os
from PIL import Image

file = sys.argv[1]
max_edge = int(sys.argv[2]) if len(sys.argv) > 2 else 2048

try:
    im = Image.open(file)
    im.load()
except Exception as e:
    print(f"fail {e}", file=sys.stderr)
    sys.exit(1)

w, h = im.size
edge = max(w, h)
if edge <= max_edge:
    print("keep")
    sys.exit(0)

before = os.path.getsize(file)

# Downscale with high-quality Lanczos
ratio = max_edge / float(edge)
new_size = (max(1, int(round(w * ratio))), max(1, int(round(h * ratio))))
im = im.convert("RGB") if im.mode not in ("RGB", "RGBA", "L", "P", "CMYK") else im
if im.mode == "P":
    im = im.convert("RGBA") if "transparency" in im.info else im.convert("RGB")
if im.mode == "CMYK":
    im = im.convert("RGB")
im = im.resize(new_size, Image.LANCZOS)

# Save to temp then swap (Windows-safe)
tmp = file + ".rs.tmp"
ext = os.path.splitext(file)[1].lower()
if ext == ".png":
    im.save(tmp, "PNG", optimize=True)
else:
    im.save(tmp, "JPEG", quality=85, optimize=True, progressive=False, subsampling=2)

after = os.path.getsize(tmp)
if after < before * 0.95:
    with open(tmp, "rb") as src, open(file, "wb") as dst:
        dst.write(src.read())
    print(f"ok {before // 1024}KB->{after // 1024}KB {w}x{h}->{new_size[0]}x{new_size[1]}")
else:
    print("nogain")
try:
    os.remove(tmp)
except OSError:
    pass
sys.exit(0)
