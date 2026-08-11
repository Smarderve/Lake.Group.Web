from PIL import Image
from collections import Counter
import os

paths = [
    'C:/Users/s0cRAT3s/AppData/Local/Temp/freebuff-desktop-pastes/paste-1785933276716-18904.png',
    'C:/Users/s0cRAT3s/AppData/Local/Temp/freebuff-desktop-pastes/paste-1785933370862-18904.png',
    'C:/Users/s0cRAT3s/AppData/Local/Temp/freebuff-desktop-pastes/paste-1785933410158-18904.png',
]

def classify(px):
    r, g, b = px
    if r < 40 and g < 40 and b < 40:
        return 'near-black'
    if r > 230 and g > 230 and b > 230:
        return 'white'
    if abs(r - g) < 12 and abs(g - b) < 12 and r > 120:
        return 'grey'
    if r > 160 and g < 140 and b < 140:
        return 'RED'
    if b > 120 and b > r + 20 and b > g:
        return 'blue'
    if g > 100 and g > r + 20 and g > b + 10:
        return 'green'
    if r > 180 and g > 150 and b < 120:
        return 'YELLOW'
    if r < 120 and g < 100 and b < 120 and b > 40:
        return 'dark-blue/navy'
    if r < 90 and g < 110 and b < 90:
        return 'dark-green'
    return f'other({r},{g},{b})'

for p in paths:
    im = Image.open(p).convert('RGB')
    w, h = im.size
    print(f'===== {os.path.basename(p)} {w}x{h}')
    bands = [('header', 0, 0.06), ('hero', 0.06, 0.16), ('content1', 0.2, 0.3),
             ('content2', 0.45, 0.55), ('content3', 0.7, 0.8), ('footer', 0.93, 1.0)]
    for name, y0, y1 in bands:
        band = im.crop((0, int(h * y0), w, int(h * y1)))
        small = band.resize((80, 12))
        # dominant raw colors
        c = Counter(small.getdata()).most_common(3)
        # dominant classified
        cl = Counter(classify(px) for px in small.getdata()).most_common(3)
        print(f'  {name}: raw={c} class={cl}')
    # accent scan: red/yellow presence
    small = im.resize((100, int(100 * h / w)))
    pix = list(small.getdata())
    red = sum(1 for p in pix if p[0] > 170 and p[1] < 130 and p[2] < 130)
    yel = sum(1 for p in pix if p[0] > 180 and p[1] > 150 and p[2] < 120)
    print(f'  ACCENTS: red-ish={red/len(pix)*100:.1f}% yellow-ish={yel/len(pix)*100:.1f}%')
