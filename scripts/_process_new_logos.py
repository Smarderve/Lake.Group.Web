"""Process the 5 new company logos from logos.zip:
remove the black background -> transparent PNGs with feathered edges.

Companies (identified via OCR):
  n1.jpg -> gulf-aggregates  (red/white  GULF AGGREGATE)
  n2.jpg -> aficd            (blue       AFICD)
  n3.jpg -> acfs             (gray       AFRICAN CONTAINER FREIGHT STATION)
  n4.jpg -> ocean-galleria   (gold       Ocean Galleria)
  n5.jpg -> cross-country    (navy/gray  CROSS COUNTRY DEVELOPER LIMITED)
"""
from PIL import Image
import os

WORK = os.path.join('scripts', '_logo_work')
OUT = os.path.join('assets', 'images', 'logos', 'companies')

JOBS = [
    ('n1.jpg', 'gulf-aggregates.png'),
    ('n2.jpg', 'aficd.png'),
    ('n3.jpg', 'acfs.png'),
    ('n4.jpg', 'ocean-galleria.png'),
    ('n5.jpg', 'cross-country.png'),
]

BG_MAX = 40          # pixels with max(r,g,b) < BG_MAX are pure background
FEATHER = 20         # (BG_MAX, BG_MAX+FEATHER] get partial alpha
                     # (opaque from maxc>=60 so dark navy (1,43,93) stays solid)


def process(src_path, dst_path):
    im = Image.open(src_path).convert('RGB')
    w, h = im.size
    data = im.tobytes()
    n = w * h

    # compute per-pixel max channel + build RGBA
    px = bytearray(n * 4)
    dark = 0
    rim = 0
    for i in range(n):
        r = data[i * 3]
        g = data[i * 3 + 1]
        b = data[i * 3 + 2]
        mx = max(r, g, b)
        if mx < BG_MAX:
            a = 0
            dark += 1
        elif mx < BG_MAX + FEATHER:
            a = int((mx - BG_MAX) * 255 / FEATHER)
            rim += 1
        else:
            a = 255
        o = i * 4
        px[o] = r
        px[o + 1] = g
        px[o + 2] = b
        px[o + 3] = a

    out = Image.frombytes('RGBA', (w, h), bytes(px))

    # crop to content bbox (alpha > 0), pad 2%
    bbox = out.getbbox()
    if bbox:
        pad_x = max(8, int((bbox[2] - bbox[0]) * 0.02))
        pad_y = max(8, int((bbox[3] - bbox[1]) * 0.02))
        box = (max(0, bbox[0] - pad_x), max(0, bbox[1] - pad_y),
               min(w, bbox[2] + pad_x), min(h, bbox[3] + pad_y))
        out = out.crop(box)

    # NOTE: no upscale - logos are only ever downscaled for display
    # (navbar ~38px, footer ~34px, megamenu ~32px), so native res stays
    # crisp without LANCZOS halo artifacts on the alpha channel.
    out.save(dst_path)
    print(f'{os.path.basename(src_path)} -> {os.path.basename(dst_path)}  '
          f'{out.size[0]}x{out.size[1]}  transparent={dark / n:.0%}  rim={rim / n:.1%}')


for src, dst in JOBS:
    process(os.path.join(WORK, src), os.path.join(OUT, dst))

print('done')
