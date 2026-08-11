"""Structural verification of the modern navbar redesign.

Runs against the already-running dev server (http://127.0.0.1:8737).
Checks: ink bar, hairline border, gold top tick, no pills, underline active,
link overflow at desktop widths, megamenu/dropdown/lang open states, mobile
drawer, and the agro (deep forest) variant.
"""
import json
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8737"
RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append({"name": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (("  " + detail) if detail else ""))


def style(page, sel, prop, pseudo=None):
    return page.evaluate(
        """([sel, prop, pseudo]) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            return getComputedStyle(el, pseudo || null).getPropertyValue(prop);
        }""",
        [sel, prop, pseudo],
    )


def rect(page, sel):
    return page.evaluate(
        """(sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom };
        }""",
        sel,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)

    # ---------- 1. index.html desktop 1440 ----------
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(BASE + "/index.html", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)

    check("index bar bg ink", style(page, ".site-nav", "background-color") == "rgb(1, 63, 92)",
          style(page, ".site-nav", "background-color"))
    check("index hairline border", style(page, ".site-nav", "border-bottom-width") == "1px",
          style(page, ".site-nav", "border-bottom-width") + " " + style(page, ".site-nav", "border-bottom-color"))
    check("index gold top tick", style(page, ".site-nav", "height", "::before") == "2px",
          style(page, ".site-nav", "background-color", "::before"))
    check("nav-links visible desktop", style(page, ".nav-links", "display") != "none")
    check("link radius 0 (no pills)", style(page, ".nav-links > li > a", "border-radius") == "0px",
          style(page, ".nav-links > li > a", "border-radius"))
    check("active link gold", style(page, '.nav-links > li > a[href="index.html"]', "color") == "rgb(255, 242, 0)",
          style(page, '.nav-links > li > a[href="index.html"]', "color"))
    check("active underline shown", style(page, '.nav-links > li > a[href="index.html"]', "opacity", "::after") == "1",
          style(page, '.nav-links > li > a[href="index.html"]', "opacity", "::after"))

    # no overflow at 1440
    nl = rect(page, ".nav-links")
    ni = rect(page, ".nav-inner")
    check("no nav-links overflow @1440", nl is not None and ni is not None and nl["right"] <= ni["right"] + 1,
          f"links right {nl['right'] if nl else None} vs inner right {ni['right'] if ni else None}")
    ow = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("no horizontal page overflow @1440", ow <= 0, f"overflow {ow}px")

    # megamenu opens on hover
    page.hover(".nav-links > li.has-megamenu > a")
    page.wait_for_timeout(800)
    mm = rect(page, ".nav-megamenu")
    mm_disp = style(page, ".nav-megamenu", "display")
    check("megamenu opens on hover", mm is not None and mm_disp != "none" and mm["width"] > 500,
          f"display={mm_disp} width={mm['width'] if mm else None}")
    if mm:
        vw = page.evaluate("() => window.innerWidth")
        check("megamenu centered in viewport",
              mm["left"] >= 0 and mm["right"] <= vw + 1,
              f"left={mm['left']:.0f} right={mm['right']:.0f} vw={vw}")
    check("megamenu ink glass bg", style(page, ".nav-megamenu", "background-color") in
          ("rgba(3, 40, 66, 0.98)", "rgb(3, 40, 66)"),
          style(page, ".nav-megamenu", "background-color"))
    page.mouse.move(5, 5)
    page.wait_for_timeout(500)

    # simple dropdown (Leadership) opens on hover
    page.hover(".nav-links > li:not(.has-megamenu).has-dropdown > a, .nav-links > li.has-dropdown:not(.has-megamenu) > a")
    page.wait_for_timeout(800)
    dd = rect(page, ".nav-dropdown:not(.nav-megamenu)")
    dd_disp = style(page, ".nav-dropdown:not(.nav-megamenu)", "opacity")
    check("simple dropdown opens on hover", dd is not None and dd_disp != "0", f"opacity={dd_disp}")
    check("dropdown ink glass bg", style(page, ".nav-dropdown:not(.nav-megamenu)", "background-color") in
          ("rgba(3, 40, 66, 0.98)", "rgb(3, 40, 66)"),
          style(page, ".nav-dropdown:not(.nav-megamenu)", "background-color"))
    page.mouse.move(5, 5)
    page.wait_for_timeout(400)

    # lang menu opens on click
    page.click(".lang-trigger")
    page.wait_for_timeout(500)
    lm = style(page, ".lang-menu:not([hidden])", "opacity")
    check("lang menu opens", lm == "1", f"opacity={lm}")
    check("lang menu ink bg", style(page, ".lang-menu:not([hidden])", "background-color") in
          ("rgba(3, 40, 66, 0.98)", "rgb(3, 40, 66)"),
          style(page, ".lang-menu:not([hidden])", "background-color"))
    page.close()

    # ---------- 2. index.html tight desktop 1120 ----------
    page = browser.new_page(viewport={"width": 1120, "height": 900})
    page.goto(BASE + "/index.html", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    nl = rect(page, ".nav-links")
    ni = rect(page, ".nav-inner")
    check("no nav-links overflow @1120", nl is not None and ni is not None and nl["right"] <= ni["right"] + 1,
          f"links right {nl['right'] if nl else None} vs inner right {ni['right'] if ni else None}")
    ow = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("no horizontal page overflow @1120", ow <= 0, f"overflow {ow}px")
    page.close()

    # ---------- 3. about.html desktop (flagship stylesheet) ----------
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(BASE + "/about.html", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    check("about bar ink", style(page, ".site-nav", "background-color") == "rgb(1, 63, 92)",
          style(page, ".site-nav", "background-color"))
    check("about tick gold", style(page, ".site-nav", "background-color", "::before") == "rgb(255, 242, 0)",
          style(page, ".site-nav", "background-color", "::before"))
    check("about active underline (About)", style(page, '.nav-links > li > a[href="about.html"]', "opacity", "::after") == "1",
          style(page, '.nav-links > li > a[href="about.html"]', "opacity", "::after"))
    page.close()

    # ---------- 4. lake-agro.html (agro variant) ----------
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(BASE + "/lake-agro.html", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    check("agro bar deep forest", style(page, ".site-nav", "background-color") == "rgb(0, 75, 30)",
          style(page, ".site-nav", "background-color"))
    check("agro tick orange", style(page, ".site-nav", "background-color", "::before") == "rgb(230, 126, 34)",
          style(page, ".site-nav", "background-color", "::before"))
    check("agro hairline border", style(page, ".site-nav", "border-bottom-width") == "1px",
          style(page, ".site-nav", "border-bottom-width"))
    page.close()

    # ---------- 5. mobile drawer 390px ----------
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto(BASE + "/index.html", wait_until="domcontentloaded")
    page.wait_for_timeout(1200)
    check("toggle visible on mobile", page.locator("#nav-toggle").is_visible())
    page.click("#nav-toggle")
    page.wait_for_timeout(500)
    nm = style(page, ".nav-mobile", "display")
    check("mobile drawer opens", nm == "flex", f"display={nm}")
    check("mobile drawer ink bg", style(page, ".nav-mobile", "background-color") == "rgb(1, 63, 92)",
          style(page, ".nav-mobile", "background-color"))
    page.close()

    browser.close()

fails = [r for r in RESULTS if not r["ok"]]
print("\n==== SUMMARY: %d/%d passed ====" % (len(RESULTS) - len(fails), len(RESULTS)))
if fails:
    print("FAILED:", json.dumps([f["name"] for f in fails], indent=2))
    sys.exit(1)
print("All checks passed.")
