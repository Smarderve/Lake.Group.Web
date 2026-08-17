#!/usr/bin/env python3
"""Inspect live Vercel Lake Agro + extract stash projects gallery and patch local page."""
from __future__ import annotations

import hashlib
import re
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UA = {"User-Agent": "Mozilla/5.0"}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main() -> None:
    html = fetch("https://lakegroup.vercel.app/lake-agro.html").decode("utf-8", "replace")
    local = (ROOT / "lake-agro.html").read_text(encoding="utf-8")
    print("live sha", hashlib.sha256(html.encode()).hexdigest()[:12], "len", len(html))
    print("local==live", local == html)
    for pat in [
        r"flagship\.css\?v=(\d+)",
        r"background:transparent!important",
        r"margin-top:\s*-84px",
        r"Our Projects",
        r"lakeagro\.com/assets",
        r'id="projects"',
    ]:
        print(pat, "YES" if re.search(pat, html) else "NO")

    m = re.search(r'id="lg-skel-critical">(.*?)</style>', html, re.S)
    if m:
        s = m.group(1)
        i = s.find("co-theme-agro .site-nav")
        print("critical agro nav:", s[i : i + 200] if i >= 0 else "missing")

    css = fetch("https://lakegroup.vercel.app/assets/flagship.css").decode("utf-8", "replace")
    idx = css.find("body.co-theme-agro .site-nav")
    print("live css agro nav block:\n", css[idx : idx + 500] if idx >= 0 else "MISSING")
    print("live css has -84px", "margin-top: -84px" in css or "margin-top:-84px" in css)

    # Extract gallery from stash@{1}
    stash_html = subprocess.check_output(
        ["git", "show", "stash@{1}:lake-agro.html"], cwd=ROOT
    ).decode("utf-8", "replace")
    gm = re.search(
        r'(<section class="fs-section section-light" id="projects">.*?</section>)',
        stash_html,
        re.S,
    )
    if not gm:
        # stash may use different id; search Our Projects
        gm = re.search(
            r'(<section[^>]*>\s*<div class="container">\s*<div class="fs-marker"><span class="fs-marker-no">09</span><span class="fs-eyebrow">Projects</span>.*?</section>)',
            stash_html,
            re.S,
        )
    if not gm:
        raise SystemExit("Could not find projects gallery in stash")

    gallery = gm.group(1)
    # Avoid clashing with existing id="projects" (Plantations & Ag Parks)
    gallery = gallery.replace('id="projects"', 'id="project-gallery"', 1)
    gallery = gallery.replace(
        '<span class="fs-marker-no">09</span>',
        '<span class="fs-marker-no">09</span>',
        1,
    )
    print("gallery extracted", len(gallery), "chars")

    # Insert before Locations (#reach), renumber Locations to 10
    if 'id="project-gallery"' in local:
        print("project-gallery already present; skip insert")
        return

    reach = '<section class="fs-section fs-on-dark" id="reach">'
    if reach not in local:
        raise SystemExit("reach section not found")

    updated = local.replace(
        reach,
        gallery + "\n\n" + reach,
        1,
    )
    updated = updated.replace(
        '<span class="fs-marker-no">09</span><span class="fs-eyebrow" data-i18n="agro.s9.eyebrow">Locations</span>',
        '<span class="fs-marker-no">10</span><span class="fs-eyebrow" data-i18n="agro.s10.eyebrow">Locations</span>',
        1,
    )
    # Also bump i18n keys for title if present on same block
    updated = updated.replace(
        'data-i18n="agro.s9.title">Reach Lake Agro',
        'data-i18n="agro.s10.title">Reach Lake Agro',
        1,
    )

    # Bump flagship cache on this page
    updated = re.sub(
        r"assets/flagship\.css\?v=\d+",
        "assets/flagship.css?v=101",
        updated,
        count=1,
    )

    (ROOT / "lake-agro.html").write_text(updated, encoding="utf-8", newline="\n")
    print("patched lake-agro.html")


if __name__ == "__main__":
    main()
