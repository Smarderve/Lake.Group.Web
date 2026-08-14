#!/usr/bin/env python3
"""Restore original LakeOil.jpg from HEAD and bust hero/SW caches."""
from __future__ import annotations

import hashlib
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANNER = ROOT / "assets" / "images" / "banner" / "LakeOil.jpg"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:12]


# Restore binary from HEAD (avoids PowerShell corruption)
data = subprocess.check_output(
    ["git", "show", "HEAD:assets/images/banner/LakeOil.jpg"],
    cwd=ROOT,
)
BANNER.write_bytes(data)
print(f"restored LakeOil.jpg -> {len(data)} bytes {sha(data)}")

# Unstage if still pointing at swapped blob
subprocess.run(["git", "reset", "HEAD", "--", "assets/images/banner/LakeOil.jpg"], cwd=ROOT, check=False)

# Bump cache-bust query on LakeOil.jpg only (hero + about thumbs stay distinct for LakeOil1)
for rel in ("index.html", "sw.js"):
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    new = text.replace("LakeOil.jpg?v=81", "LakeOil.jpg?v=82")
    if rel == "sw.js":
        m = re.search(r"VERSION = 'v(\d+)'", new)
        if m:
            n = int(m.group(1)) + 1
            new = re.sub(r"VERSION = 'v\d+'", f"VERSION = 'v{n}'", new, count=1)
            print(f"SW VERSION -> v{n}")
    if new != text:
        path.write_text(new, encoding="utf-8", newline="\n")
        print(f"updated {rel}")
    else:
        print(f"no change needed in {rel}")

print("status:", subprocess.check_output(["git", "status", "--short", "--", "assets/images/banner/LakeOil.jpg", "index.html", "sw.js"], cwd=ROOT, text=True).strip() or "(clean for those paths)")
