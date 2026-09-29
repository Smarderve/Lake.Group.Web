# Lake Cylinders — Design Correction Report

**Date:** August 29, 2026  
**Page:** `lake-cylinders.html`  
**Status:** Complete — Local commit only

---

## 1. Hero Asset Changed

| Item | Before | After |
|------|--------|-------|
| Hero image | `assets/images/lakegas/ops/cylinder-stacks.jpg` | `assets/images/lakegas/ops/cylinder-hero.webp` |
| Focal position | Default center | `background-position: center 35%` |
| Overlay | Default gradient | Lighter gradient (32% → 58%) for better worker/cylinder visibility |

The new hero shows blue LPG cylinders, production line, worker in blue PPE, and industrial factory environment (IMAGE 2). Desktop keeps worker and production line visible; mobile avoids cropping out the worker entirely.

---

## 2. Operations Section — Lake Gas Design Reuse

**Approach:** Adapted the Lake Gas `info-panel` grid pattern.

Key changes:
- Added `info-rows` container class (matching Lake Gas)
- Converted `info-row` from flex to `grid-template-columns: minmax(105px,.9fr) minmax(150px,1.1fr)` layout
- Added responsive breakpoint at 600px for single-column fallback
- Maintained Lake Cylinders country data (Tanzania, DR Congo, Rwanda, Zambia)
- Retained yellow badge accent treatment

The Lake Gas `info-panel` pattern (rounding, decorative corner elements, heading border) was already shared via the page-level CSS. The grid layout now matches the Lake Gas country operations panel proportions.

---

## 3. Contrast Root Cause

**Root cause:** `.fs-check li` uses `color: var(--mute)` which resolves to `#5A6478` (dark gray-blue). Inside `.fs-on-dark` sections, this dark text sits on the `--ink` (navy) background, creating severe contrast failure.

Similarly, `.val-mini-tile p` uses `var(--ink-mute)` at 50% opacity, which can be too faint.

**Fix applied (Lake Cylinders page only):**
```css
.fs-on-dark .fs-check li { color: rgba(233,237,248,0.92) !important; }
.fs-on-dark p { color: rgba(233,237,248,0.9) !important; }
.fs-on-dark .val-mini-tile p { color: var(--ink-mute) !important; }
```

These overrides are scoped to `.fs-on-dark` and do not affect other pages.

---

## 4. Leadership Placeholder Removal

**Before:** Large grey placeholder image boxes (`ld-person-photo`) above each leader name, with `Read more` links.

**After:** Clean text-only cards showing only:
- **Zaki Othman** — General Manager · Lake Cylinders
- **Jishnu Jayachandran** — Plant Manager · Lake Cylinders

Changes:
- Removed `ld-person-photo` div and `<img>` elements
- Removed `Read more` links (no standalone profile pages exist)
- Removed unused CSS for photo placeholders and `ld-person-more` arrows
- Cards use compact `background: var(--surface)` with border

---

## 5. Removed Sections

### IMAGE 7 — Services Offered (formerly Section 03)
Removed entirely:
- 6 service cards with images (LPG Cylinder Manufacturing, Revalidation & Refurbishment, Repair & Maintenance, Quality Inspection, Customized Solutions, Supply & Distribution)
- Section marker `03` removed
- All associated markup deleted
- Sections renumbered (03→Products, 04→Leadership, 05→Projects, 06→Contact, 07→Gallery)

### IMAGE 9 — Capabilities (formerly Section 07)
Removed entirely:
- `stat-panel2` "At a Glance" panel with 4 stats
- Production Capabilities and Operational Strengths checklists
- Unused `stat-panel2` and related CSS removed from page styles

---

## 6. Product Redesign

**Before:** Large `prod-catalog-card` with 64px icon boxes, generous padding, generic SaaS-feature-card feel.

**After:** Compact `prod-compact-card` with:
- 44px centered icon glyph
- Compact padding
- Centered text alignment
- Reduced font sizes (1rem title, 0.82rem body)
- Professional industrial catalogue aesthetic

Product data unchanged:
- 6 kg LPG Cylinders
- 15 kg LPG Cylinders
- 38 kg LPG Cylinders

---

## 7. Contact Redesign

**Before:** Full-width `ct-info` block with large vertical space and oversized title.

**After:** Compact `ct-compact` grid layout:
- Uses `grid-template-columns: 1fr 1fr` on desktop
- Single column on mobile (700px breakpoint)
- Smaller icons (18px), tighter spacing
- Same approved contact data preserved

---

## 8. Responsive QA

Tested section behavior at:

| Width | Sections verified |
|-------|-------------------|
| 430px, 412px, 390px, 375px, 360px, 320px | Hero crop, operations single-column, products stacked, leadership single-column, contact single-column, gallery 1-column |
| 1920px, 1600px, 1440px, 1366px, 1280px, 1024px | Consistent section widths, 3-column products, 2-column leadership, 2-column contact |

No horizontal overflow. No blank gaps from removed sections.

---

## 9. Tests

17 tests in `tests/lake-cylinders-content.test.js`:
- ✅ Approved company facts and contacts preserved
- ✅ No unsupported legacy claims
- ✅ Hero image is IMAGE 2
- ✅ Operations by Country uses Lake Gas design
- ✅ No leader image placeholders
- ✅ Leader names preserved
- ✅ No invalid Read More links
- ✅ Services Offered section removed
- ✅ Capabilities section removed
- ✅ Company Objectives readable contrast
- ✅ Projects section readable contrast
- ✅ Product cards correct count/labels
- ✅ Contact section retains approved data
- ✅ Contact uses compact design
- ✅ No giant placeholder boxes
- ✅ Gallery preserved
- ✅ Leadership uses text-only cards

---

## 10. Remaining Risks

1. **Shared CSS variable fix:** The contrast fix is applied only to Lake Cylinders page. Other company pages with `.fs-on-dark` may have the same low-contrast bug but are outside this scope.
2. **Hero image optimization:** The new `cylinder-hero.webp` was copied from the user's local machine. A production-quality version may need CDN optimization.
3. **Mobile hero focal point:** `background-position: center 35%` was chosen to keep the worker visible; pixel-perfect alignment may need tuning on specific devices.
