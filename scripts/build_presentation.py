#!/usr/bin/env python3
"""Generate Lake Group stakeholder presentation (PPTX)."""

from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "LAKE_GROUP_PRESENTATION.pptx"

# Brand palette
NAVY = RGBColor(0x0E, 0x1F, 0x5A)
BLUE = RGBColor(0x1D, 0x3E, 0xA8)
GOLD = RGBColor(0xFF, 0xD7, 0x00)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
INK_TEXT = RGBColor(0x1A, 0x23, 0x40)
MUTE = RGBColor(0x5A, 0x64, 0x78)
PAPER = RGBColor(0xF6, 0xF5, 0xF1)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


def blank_slide(prs, dark=False):
    layout = prs.slide_layouts[6]  # blank
    slide = prs.slides.add_slide(layout)
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = NAVY if dark else WHITE
    return slide


def add_gold_rule(slide, top=Inches(1.35), width=Inches(1.2)):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.9), top, width, Pt(4))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GOLD
    bar.line.fill.background()


def add_footer(slide, text="lakeoilgroup.com  ·  July 2026", dark=False):
    box = slide.shapes.add_textbox(Inches(0.9), Inches(6.95), Inches(11.5), Inches(0.35))
    tf = box.text_frame
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(10)
    p.font.color.rgb = RGBColor(0xAA, 0xB4, 0xCC) if dark else MUTE


def add_title_block(slide, eyebrow, title, subtitle=None, dark=True):
    y = Inches(2.2)
    if eyebrow:
        eb = slide.shapes.add_textbox(Inches(0.9), y, Inches(11), Inches(0.4))
        p = eb.text_frame.paragraphs[0]
        p.text = eyebrow.upper()
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = GOLD
        p.font.name = "Calibri"
        y += Inches(0.45)
    add_gold_rule(slide, top=y - Inches(0.15))
    tb = slide.shapes.add_textbox(Inches(0.9), y + Inches(0.15), Inches(11), Inches(1.8))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = WHITE if dark else NAVY
    p.font.name = "Calibri"
    if subtitle:
        sb = slide.shapes.add_textbox(Inches(0.9), y + Inches(1.5), Inches(11), Inches(1.2))
        sp = sb.text_frame.paragraphs[0]
        sp.text = subtitle
        sp.font.size = Pt(18)
        sp.font.color.rgb = RGBColor(0xCC, 0xD4, 0xE8) if dark else MUTE
        sp.font.name = "Calibri"


def slide_cover(prs):
    s = blank_slide(prs, dark=True)
    add_title_block(
        s,
        "Lake Group",
        "Digital Platform\nOverview",
        "A modern corporate web experience for sponsors, partners & stakeholders",
    )
    stats = s.shapes.add_textbox(Inches(0.9), Inches(5.2), Inches(11), Inches(0.8))
    p = stats.text_frame.paragraphs[0]
    p.text = "29 pages  ·  3 languages  ·  8 countries  ·  PWA-enabled  ·  lakeoilgroup.com"
    p.font.size = Pt(14)
    p.font.color.rgb = RGBColor(0x99, 0xA8, 0xC8)
    add_footer(s, dark=True)


def slide_section(prs, num, title, subtitle=""):
    s = blank_slide(prs, dark=True)
    num_box = s.shapes.add_textbox(Inches(0.9), Inches(2.5), Inches(2), Inches(0.6))
    p = num_box.text_frame.paragraphs[0]
    p.text = f"{num:02d}"
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = GOLD
    add_gold_rule(s, top=Inches(3.2), width=Inches(2))
    add_title_block(s, None, title, subtitle, dark=True)
    add_footer(s, dark=True)


def slide_content(prs, title, bullets, note=None):
    s = blank_slide(prs, dark=False)
    # Header band
    band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, Inches(1.15))
    band.fill.solid()
    band.fill.fore_color.rgb = NAVY
    band.line.fill.background()
    tb = s.shapes.add_textbox(Inches(0.9), Inches(0.28), Inches(11.5), Inches(0.7))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = WHITE
    # Bullets
    body = s.shapes.add_textbox(Inches(0.9), Inches(1.55), Inches(11.5), Inches(4.8))
    tf = body.text_frame
    tf.word_wrap = True
    for i, item in enumerate(bullets):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.text = item
        para.level = 0
        para.font.size = Pt(20)
        para.font.color.rgb = INK_TEXT
        para.space_after = Pt(14)
        para.font.name = "Calibri"
    if note:
        nb = s.shapes.add_textbox(Inches(0.9), Inches(6.35), Inches(11), Inches(0.5))
        np = nb.text_frame.paragraphs[0]
        np.text = note
        np.font.size = Pt(12)
        np.font.italic = True
        np.font.color.rgb = MUTE
    add_footer(s)


def slide_two_col(prs, title, left_title, left_items, right_title, right_items):
    s = blank_slide(prs, dark=False)
    band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, Inches(1.15))
    band.fill.solid()
    band.fill.fore_color.rgb = NAVY
    band.line.fill.background()
    tb = s.shapes.add_textbox(Inches(0.9), Inches(0.28), Inches(11.5), Inches(0.7))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = WHITE

    def col(x, heading, items):
        hb = s.shapes.add_textbox(x, Inches(1.5), Inches(5.5), Inches(0.45))
        hp = hb.text_frame.paragraphs[0]
        hp.text = heading
        hp.font.size = Pt(16)
        hp.font.bold = True
        hp.font.color.rgb = BLUE
        box = s.shapes.add_textbox(x, Inches(2.0), Inches(5.5), Inches(4.5))
        tf = box.text_frame
        for i, item in enumerate(items):
            para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            para.text = f"• {item}"
            para.font.size = Pt(17)
            para.font.color.rgb = INK_TEXT
            para.space_after = Pt(10)

    col(Inches(0.9), left_title, left_items)
    col(Inches(6.8), right_title, right_items)
    add_footer(s)


def slide_stat_row(prs, title, stats):
    """stats: list of (number, label)"""
    s = blank_slide(prs, dark=False)
    band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, Inches(1.15))
    band.fill.solid()
    band.fill.fore_color.rgb = NAVY
    band.line.fill.background()
    tb = s.shapes.add_textbox(Inches(0.9), Inches(0.28), Inches(11.5), Inches(0.7))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = WHITE
    n = len(stats)
    w = 11.0 / n
    for i, (num, label) in enumerate(stats):
        x = Inches(0.9 + i * w)
        card = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(2.0), Inches(w - 0.25), Inches(3.8))
        card.fill.solid()
        card.fill.fore_color.rgb = PAPER
        card.line.color.rgb = RGBColor(0xD8, 0xDE, 0xEC)
        nb = s.shapes.add_textbox(x + Inches(0.15), Inches(2.4), Inches(w - 0.5), Inches(1.2))
        np = nb.text_frame.paragraphs[0]
        np.text = num
        np.font.size = Pt(36)
        np.font.bold = True
        np.font.color.rgb = BLUE
        np.alignment = PP_ALIGN.CENTER
        lb = s.shapes.add_textbox(x + Inches(0.15), Inches(3.6), Inches(w - 0.5), Inches(1.5))
        lp = lb.text_frame.paragraphs[0]
        lp.text = label
        lp.font.size = Pt(14)
        lp.font.color.rgb = MUTE
        lp.alignment = PP_ALIGN.CENTER
    add_footer(s)


def slide_agenda(prs):
    s = blank_slide(prs, dark=False)
    band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, Inches(1.15))
    band.fill.solid()
    band.fill.fore_color.rgb = NAVY
    band.line.fill.background()
    tb = s.shapes.add_textbox(Inches(0.9), Inches(0.28), Inches(11.5), Inches(0.7))
    p = tb.text_frame.paragraphs[0]
    p.text = "Agenda"
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = WHITE
    items = [
        ("01", "Platform at a glance"),
        ("02", "Design & brand experience"),
        ("03", "3D Global Operations hero"),
        ("04", "Languages & reach"),
        ("05", "Progressive Web App (PWA)"),
        ("06", "Search & discoverability (SEO)"),
        ("07", "Knowledge assistant"),
        ("08", "Content & pages"),
        ("09", "Maps, news & media"),
        ("10", "Accessibility, security & hosting"),
        ("11", "Summary & next steps"),
    ]
    y = Inches(1.5)
    for num, label in items:
        row = s.shapes.add_textbox(Inches(0.9), y, Inches(11), Inches(0.42))
        tf = row.text_frame
        p = tf.paragraphs[0]
        p.text = f"{num}   {label}"
        p.font.size = Pt(17)
        p.font.color.rgb = INK_TEXT
        y += Inches(0.44)
    add_footer(s)


def slide_closing(prs):
    s = blank_slide(prs, dark=True)
    add_title_block(s, "Thank you", "Questions &\nDiscussion", "lakeoilgroup.com")
    add_footer(s, "Lake Group — Powering East & Central Africa", dark=True)


def build():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    slide_cover(prs)
    slide_agenda(prs)

    # 01 — At a glance
    slide_section(prs, 1, "Platform at a Glance", "What we built and why it matters")
    slide_stat_row(
        prs,
        "The Lake Group website in numbers",
        [
            ("29", "Web pages"),
            ("3", "Languages\nEN · FR · SW"),
            ("8+", "Countries\nof operation"),
            ("1", "Installable\nPWA app"),
        ],
    )
    slide_content(
        prs,
        "Built for trust, scale & clarity",
        [
            "A premium corporate digital presence for investors, partners & sponsors",
            "Every fact on the site is verified against official Lake Group sources",
            "Fast, secure static architecture — hosted on Firebase CDN",
            "Works on phones, tablets & desktop — including spotty connections",
        ],
        note="Full technical reference: DEVELOPER_GUIDE.pdf in the project repository",
    )
    slide_content(
        prs,
        "How the platform is structured",
        [
            "Static multi-page site — each section is its own page (no login required)",
            "Shared navigation, footer & language switcher on every page",
            "Homepage: flagship hero + 3D globe experience",
            "Interior pages: unified Meridian design system",
        ],
    )

    # 02 — Design
    slide_section(prs, 2, "Design & Brand Experience", "Meridian — precision-engineering editorial")
    slide_content(
        prs,
        "Meridian design language",
        [
            "Ink navy & warm paper — corporate, not cluttered",
            "Bebas Neue display type + Inter body text",
            "Lake Gold (#FFD700) used sparingly — ticks, CTAs, key numbers",
            "Sharp geometry, hairline rules, numbered section markers",
        ],
    )
    slide_content(
        prs,
        "Motion & interaction — subtle, not distracting",
        [
            "Scroll-reveal animations as you move down each page",
            "Gentle hover effects on buttons, cards & links",
            "Respects “reduced motion” user preferences",
            "Homepage & interior pages each have tailored motion systems",
        ],
    )

    # 03 — 3D
    slide_section(prs, 3, "3D Global Operations", "Homepage cinematic experience")
    slide_content(
        prs,
        "An interactive Earth — not decoration",
        [
            "Real NASA satellite imagery on a 3D globe",
            "Shows Lake Group’s verified operational footprint",
            "~39 second autonomous story loop on the homepage",
            "Pauses when off-screen — saves battery & performance",
        ],
    )
    slide_content(
        prs,
        "Four chapters of the 3D story",
        [
            "① Planet — Earth at distance, Africa rotates into view",
            "② Footprint — 9 countries light up from Dar es Salaam HQ",
            "③ Operations — facility callouts (Tanga LPG, Dar port, Kibaha steel…)",
            "④ Identity — Lake Group logo & tagline finale",
        ],
    )
    slide_two_col(
        prs,
        "Verified data only",
        "9 operational sites",
        [
            "Tanzania (HQ) · Kenya · Rwanda",
            "Burundi · DR Congo · Zambia",
            "Ethiopia · Mozambique · Dubai",
        ],
        "4 facility highlights",
        [
            "Tanga LPG Terminal",
            "Dar es Salaam Port",
            "Lake Steel · Kibaha",
            "GCCP · Dar es Salaam",
        ],
    )

    # 04 — Languages
    slide_section(prs, 4, "Languages & Reach", "One site, three audiences")
    slide_content(
        prs,
        "Trilingual by design",
        [
            "English · French · Swahili — full site coverage",
            "Language choice remembered across pages",
            "One click on any page — instant switch",
            "~1,370 translated content keys",
        ],
    )
    slide_content(
        prs,
        "Why three languages matter",
        [
            "English — regional & international business",
            "French — Central & East African Francophone markets",
            "Swahili — East African local engagement",
            "Assistant & 3D labels follow the active language",
        ],
    )

    # 05 — PWA
    slide_section(prs, 5, "Progressive Web App", "App-like experience, no app store")
    slide_content(
        prs,
        "What PWA means for Lake Group",
        [
            "Visitors can add the site to their phone home screen",
            "Opens full-screen — looks & feels like a native app",
            "Core pages work offline after first visit",
            "Branded offline page when connection is lost",
        ],
    )
    slide_content(
        prs,
        "Smart caching — fast & always fresh",
        [
            "Pages try the network first — content stays up to date",
            "Fonts & icons cached — instant repeat visits",
            "Users get a gentle “new version available” prompt on updates",
            "No forced reloads mid-browsing",
        ],
    )

    # 06 — SEO
    slide_section(prs, 6, "Search & Discoverability", "Found by Google & partners")
    slide_content(
        prs,
        "SEO foundations",
        [
            "26-page sitemap submitted to search engines",
            "Unique title & description on every public page",
            "Social sharing previews (LinkedIn, WhatsApp, Twitter)",
            "Canonical URLs — no duplicate-content penalties",
        ],
    )
    slide_content(
        prs,
        "Structured data (Schema.org)",
        [
            "Google understands Lake Group as an Organization",
            "Each service page marked as a Service (fuel, LPG, steel…)",
            "Contact page flagged as ContactPage",
            "Breadcrumb trails on every inner page",
        ],
    )

    # 07 — Assistant
    slide_section(prs, 7, "Knowledge Assistant", "Instant answers, works offline")
    slide_content(
        prs,
        "Lake Assistant — on every page",
        [
            "Floating chat widget — desktop panel, mobile bottom sheet",
            "Answers from verified company facts & page content",
            "Works without internet after first load",
            "Available in English, French & Swahili",
        ],
        note="Retrieval-based — cites real content, does not invent answers",
    )

    # 08 — Pages
    slide_section(prs, 8, "Content & Pages", "Complete corporate footprint online")
    slide_two_col(
        prs,
        "Company & corporate",
        "Who we are",
        [
            "About · History · Leadership",
            "CSR · Sustainability · Investors",
            "Careers · Contact · Projects",
        ],
        "Services & divisions",
        [
            "Fuel & Petroleum · LPG · Lubricants",
            "Lake Steel · GCCP Concrete",
            "Logistics · Container Services",
            "Services hub · Fleet",
        ],
    )
    slide_two_col(
        prs,
        "Network & media",
        "Where we operate",
        [
            "Africa Network — interactive map",
            "Station Locator",
            "Our Story — cinematic brand film",
        ],
        "News & gallery",
        [
            "News & Events — 20 articles",
            "Media Center · Photo Gallery",
            "Press-ready assets",
        ],
    )
    slide_content(
        prs,
        "Eight business divisions — one platform",
        [
            "Lake Oil · Lake Gas · Lake Trans · Lake Steel",
            "GCCP Concrete · Lake Lubes · AFICD Containers · MERM Dubai",
            "Each division has a dedicated service page",
            "Consistent branding, unique content per division",
        ],
    )

    # 09 — Maps & news
    slide_section(prs, 9, "Maps, News & Media", "Interactive & up to date")
    slide_content(
        prs,
        "Africa Network map",
        [
            "Full-width satellite map on africa-network.html",
            "30+ verified facilities — ports, depots, mills, HQ",
            "Filter by country · tap markers for details",
            "Powered by Leaflet — industry-standard mapping",
        ],
    )
    slide_content(
        prs,
        "News & events system",
        [
            "20 news articles with photos & optional video",
            "Search & filter by category or country",
            "Dedicated article pages with related stories",
            "YouTube embed support for video announcements",
        ],
    )

    # 10 — A11y, security, hosting
    slide_section(prs, 10, "Accessibility, Security & Hosting", "Enterprise-grade foundations")
    slide_content(
        prs,
        "Accessibility built in",
        [
            "Reduced-motion mode disables animations",
            "Screen-reader labels on assistant & navigation",
            "Semantic HTML structure throughout",
            "3D hero falls back to static logo when needed",
        ],
    )
    slide_content(
        prs,
        "Security & privacy",
        [
            "No user tracking scripts in the codebase",
            "Assistant conversations stored locally only",
            "Service worker never caches sensitive URLs",
            "Demo dashboard excluded from search engines",
        ],
    )
    slide_content(
        prs,
        "Hosting & deployment",
        [
            "Firebase Hosting — global CDN, HTTPS by default",
            "One-command deploy: npm run deploy",
            "Versioned service worker — clean updates",
            "Production URL: www.lakeoilgroup.com",
        ],
    )

    # 11 — Summary
    slide_section(prs, 11, "Summary", "What sponsors & partners should remember")
    slide_content(
        prs,
        "Key takeaways",
        [
            "Premium, verified corporate platform — 29 pages, 3 languages",
            "3D homepage tells the Africa operations story visually",
            "Installable PWA — works offline, updates gracefully",
            "SEO-ready — discoverable, shareable, structured for Google",
            "Knowledge assistant — instant answers for visitors",
        ],
    )
    slide_content(
        prs,
        "Documentation & maintenance",
        [
            "DEVELOPER_GUIDE.pdf — full technical reference (80+ pages)",
            "Content verified against official Lake Group facts",
            "Build scripts for translations, assistant & 3D bundle",
            "Designed for long-term maintainability",
        ],
        note="Repository: github.com/Smarderve/Lake.Group.Web",
    )
    slide_closing(prs)

    prs.save(OUT)
    print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes, {len(prs.slides)} slides)")


if __name__ == "__main__":
    build()
