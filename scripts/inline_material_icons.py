#!/usr/bin/env python3
"""
Replace <span class="material-symbols-outlined">icon_name</span> with an
inline SVG (sourced from @material-symbols/svg-400, Google's official
Material Symbols distribution) across every page.

Why inline SVG instead of the web font:
  - The material-symbols web font (material-symbols-outlined.woff2) is the
    ENTIRE icon set, ~3.9MB, to render literally 15 icons used site-wide.
  - It also requires a network fetch to Google Fonts, which breaks full
    offline use (the site should work with no internet connection at all,
    per current requirements).
  - Inline SVG has zero network dependency, totals ~64KB for all 15 icons
    actually used, and inherits color via `fill="currentColor"`, so the
    existing CSS rules (e.g. `.career-icon .material-symbols-outlined {
    color: var(--blue) }`) keep working by simply retargeting the same
    rule at the wrapper `<svg>` instead of `<span>`.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS_DIR = os.path.join(ROOT, 'assets', 'icons')

SPAN_RE = re.compile(r'<span class="material-symbols-outlined">([a-z_0-9]+)</span>')


def load_icon_svg(name):
    path = os.path.join(ICONS_DIR, f'{name}.svg')
    with open(path, encoding='utf-8') as f:
        svg = f.read()
    # Add fill="currentColor" to the <svg> tag itself (not the <path>), and
    # a class so existing `.foo .material-symbols-outlined { color: ... }`
    # CSS rules can be retargeted to `.foo svg.msi { ... }` with one find/
    # replace in each page's <style> block.
    svg = svg.replace(
        '<svg xmlns="http://www.w3.org/2000/svg"',
        '<svg class="msi" fill="currentColor" xmlns="http://www.w3.org/2000/svg"',
        1
    )
    return svg


def main():
    total_replacements = 0
    for fn in sorted(os.listdir(ROOT)):
        if not fn.endswith('.html'):
            continue
        path = os.path.join(ROOT, fn)
        with open(path, 'r', encoding='utf-8', newline='') as f:
            raw = f.read()

        if 'material-symbols-outlined">' not in raw:
            continue

        def replacer(m):
            nonlocal total_replacements
            icon_name = m.group(1)
            total_replacements += 1
            return load_icon_svg(icon_name)

        new_raw = SPAN_RE.sub(replacer, raw)

        # Retarget CSS selectors that styled `.material-symbols-outlined`
        # (the font-icon span) to instead style `.msi` (the inline svg
        # wrapper class added above). This preserves all existing
        # color/sizing rules without needing to rewrite each one by hand,
        # except font-size, which doesn't apply to SVGs and is converted
        # to width+height (an SVG's intrinsic size is its viewBox, so it
        # needs an explicit box size rather than a text font-size).
        new_raw = re.sub(r'\.material-symbols-outlined\b', '.msi', new_raw)

        def fontsize_to_wh(m):
            size = m.group(1)
            return f'width: {size}; height: {size};'

        # Only touch font-size declarations inside rules targeting .msi,
        # to avoid touching unrelated font-size rules elsewhere on the page.
        def fix_msi_block(m):
            block = m.group(0)
            return re.sub(r'font-size:\s*([0-9.]+px);', fontsize_to_wh, block)

        new_raw = re.sub(r'\.msi\b[^{]*\{[^}]*\}', fix_msi_block, new_raw)

        if new_raw != raw:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(new_raw)
            print(f'updated {fn}')

    print(f'\nTotal icon replacements: {total_replacements}')


if __name__ == '__main__':
    main()
