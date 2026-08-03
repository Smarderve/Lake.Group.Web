#!/usr/bin/env python3
"""Regenerate public logo assets from assets/lake-group-logo-source.png."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("Pillow not installed; skipping asset preparation.")
    sys.exit(0)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "lake-group-logo-source.png"
LOGO = ROOT / "public" / "lake-group-logo.png"
FAVICON = ROOT / "public" / "favicon.png"


def main() -> None:
    if not SOURCE.exists():
        print(f"Source not found: {SOURCE}")
        sys.exit(0)

    img = Image.open(SOURCE).convert("RGBA")
    data = np.array(img)
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    data[(r > 240) & (g > 240) & (b > 240), 3] = 0
    result = Image.fromarray(data)
    result.save(LOGO)

    w, h = result.size
    scale = min(1, 64 / max(w, h))
    result.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS).save(FAVICON)
    print(f"Prepared {LOGO.name} and {FAVICON.name}")


if __name__ == "__main__":
    main()
