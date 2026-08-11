#!/usr/bin/env python
"""Process the pasted official AFICD + Gulf Aggregate logos.

White background -> transparent via edge flood-fill (preserves interior
white text/letter counters that are enclosed by logo marks), tight crop,
upscale to a retina-safe width, save over the live company logo files.
"""
import io
import os
from PIL import Image, ImageDraw

SRC = {
    'aficd.png': 'scripts/_logo_tmp4/aficd_new.png',
    'gulf-aggregates.png': 'scripts/_logo_tmp4/gulf_new.png',
}
OUT_DIR = 'assets/images/logos/companies'
UPSCALE_W = 1400
FILL = (0, 0, 0, 0)
THRESH = 26


def whiteish(p):
    r, g, b, a = p
    return a > 200 and abs(r - 255) < THRESH and abs(g - 255) < THRESH and abs(b - 255) < THRESH


def process(src_path, dst_path):
    im = Image.open(src_path).convert('RGBA')
    w, h = im.size
    seeds = set()
    for x in range(w):
        if whiteish(im.getpixel((x, 0))):
            seeds.add((x, 0))
        if whiteish(im.getpixel((x, h - 1))):
            seeds.add((x, h - 1))
    for y in range(h):
        if whiteish(im.getpixel((0, y))):
            seeds.add((0, y))
        if whiteish(im.getpixel((w - 1, y))):
            seeds.add((w - 1, y))
    for s in seeds:
        ImageDraw.floodfill(im, s, FILL, thresh=THRESH)

    # Tight crop to non-transparent content
    bbox = im.getbbox()
    if bbox is None:
        raise RuntimeError('nothing left after transparency for ' + src_path)
    im = im.crop(bbox)

    # Upscale to consistent retina-safe width (LANCZOS)
    ow, oh = im.size
    if ow < UPSCALE_W:
        nw = UPSCALE_W
        nh = max(1, round(oh * (nw / ow)))
        im = im.resize((nw, nh), Image.LANCZOS)

    im.save(dst_path, 'PNG', optimize=True)
    print('wrote %s  (%dx%d)' % (dst_path, im.size[0], im.size[1]))


for out_name, src in SRC.items():
    process(src, os.path.join(OUT_DIR, out_name))
print('done')
