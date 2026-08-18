#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]

h = (ROOT / "lake-agro.html").read_text(encoding="utf-8")
c = (ROOT / "assets/flagship.css").read_text(encoding="utf-8")
print("html transparent critical", "background:transparent!important" in h)
print("html project-gallery", 'id="project-gallery"' in h)
print("html Our Projects", "Our Projects" in h)
print("html Locations 10", 'fs-marker-no">10</span>' in h)
idx = c.find("body.co-theme-agro .site-nav")
print("css agro nav head:\n", c[idx : idx + 180])
print("css -84", "margin-top: -84px" in c)
m = re.search(r"flagship\.css\?v=(\d+)", h)
print("flagship v", m.group(1) if m else None)

# bump SW
sw = ROOT / "sw.js"
t = sw.read_text(encoding="utf-8")
m = re.search(r"VERSION = 'v(\d+)'", t)
n = int(m.group(1)) + 1
sw.write_text(re.sub(r"VERSION = 'v\d+'", f"VERSION = 'v{n}'", t, count=1), encoding="utf-8", newline="\n")
print("SW ->", n)

# deploy statuses via gh
for dep in ("5862934595", "5862788488", "5855322961"):
    out = subprocess.check_output(
        ["gh", "api", f"repos/Smarderve/Lake.Group.Web/deployments/{dep}/statuses"],
        text=True,
    )
    # crude parse first state
    state = re.search(r'"state"\s*:\s*"([^"]+)"', out)
    desc = re.search(r'"description"\s*:\s*"([^"]*)"', out)
    print(f"deploy {dep}:", state.group(1) if state else "?", "-", desc.group(1) if desc else "")
