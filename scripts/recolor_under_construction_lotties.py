"""Harmonize the shared Under Construction Lottie packages with Lake blue.

The animations retain their original timing, layers, and geometry. Only source
blue/periwinkle fills are remapped to a tonal palette derived from #013f5c,
which is also the Under Construction heading colour.
"""

from __future__ import annotations

import colorsys
import json
import shutil
import tempfile
import zipfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "animations"
PRIMARY = (1, 63, 92)
TONES = ((1, 63, 92), (13, 102, 137), (72, 153, 184), (142, 197, 214), (197, 224, 231))
YELLOW = (255, 242, 0)


def is_source_brand_colour(red: int, green: int, blue: int) -> bool:
    if (red, green, blue) in TONES:
        return False
    hue, lightness, saturation = colorsys.rgb_to_hls(red / 255, green / 255, blue / 255)
    blue_family = 0.53 <= hue <= 0.72 and blue > red and blue > green
    red_family = (hue <= 0.06 or hue >= 0.94) and red > green * 1.25 and red > blue * 1.25
    return saturation >= 0.12 and (blue_family or red_family)


def lake_tone(red: int, green: int, blue: int) -> tuple[int, int, int]:
    _, lightness, _ = colorsys.rgb_to_hls(red / 255, green / 255, blue / 255)
    if lightness < 0.34:
        return PRIMARY
    if lightness < 0.47:
        return TONES[1]
    if lightness < 0.63:
        return TONES[2]
    if lightness < 0.77:
        return TONES[3]
    return TONES[4]


def recolor_png(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    pixels = [(*lake_tone(r, g, b), a) if a and is_source_brand_colour(r, g, b) else (r, g, b, a)
              for r, g, b, a in image.getdata()]
    image.putdata(pixels)
    image.save(path, format="PNG", optimize=True)


def recolor_json(path: Path) -> None:
    animation = json.loads(path.read_text(encoding="utf-8"))
    accent_candidates: list[dict[str, object]] = []

    def walk(value: object) -> None:
        if isinstance(value, dict):
            color = value.get("c")
            if isinstance(color, dict) and color.get("a") == 0:
                channels = color.get("k")
                if isinstance(channels, list) and len(channels) >= 3:
                    rgb = tuple(round(channel * 255) for channel in channels[:3])
                    if rgb == YELLOW:
                        color["k"] = [channel / 255 for channel in TONES[1]] + channels[3:]
                        accent_candidates.append(color)
                    elif is_source_brand_colour(*rgb):
                        mapped = lake_tone(*rgb)
                        color["k"] = [channel / 255 for channel in mapped] + channels[3:]
                    elif rgb == TONES[1]:
                        accent_candidates.append(color)
            for nested in value.values():
                walk(nested)
        elif isinstance(value, list):
            for nested in value:
                walk(nested)

    walk(animation)
    # Preserve the illustration's blue-led hierarchy while turning only three
    # small former interface highlights into the Lake yellow brand accent.
    for color in accent_candidates[6:9]:
        channels = color["k"]
        color["k"] = [channel / 255 for channel in YELLOW] + channels[3:]
    path.write_text(json.dumps(animation, separators=(",", ":")), encoding="utf-8")


def rebuild(package: Path, animation_path: str, raster: bool) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        work = Path(temp_dir)
        with zipfile.ZipFile(package) as archive:
            archive.extractall(work)
        if raster:
            for image in (work / "images").glob("*.png"):
                recolor_png(image)
        else:
            recolor_json(work / animation_path)
        rebuilt = work / package.name
        with zipfile.ZipFile(rebuilt, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for file in sorted(work.rglob("*")):
                if file.is_file() and file != rebuilt:
                    archive.write(file, file.relative_to(work).as_posix())
        shutil.copyfile(rebuilt, package)


rebuild(ASSETS / "video-marketing.lottie", "animations/Video Marketing.json", raster=True)
rebuild(ASSETS / "web-designs.lottie", "a/Main Scene.json", raster=False)
