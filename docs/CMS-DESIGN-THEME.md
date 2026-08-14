# CMS Design Theme (Theme Lock)

Source of truth for the CMS visual language. These values come from the existing
implementation (`cms/src/styles/index.css` tokens + shared `components/ui/*`); they were
**discovered, not invented**. Do not introduce new colors, radii, shadows, or spacing
without updating this document and getting human review.

Hard rule: **Existing Lake Group theme first. Component library second. AI suggestion last.**

## 1. Brand anchors (from the public site)

| Token | Hex | Use |
|---|---|---|
| Lake green | `#008435` (brand-600) | Primary actions, active navigation, focus rings, selected states, PUBLISHED status |
| Lake blue | `#016694` (lake-600) | Secondary identity, links, APPROVED status |
| Signature yellow | `#FFF200` | Reserved for rare emphasis only; never a text or background fill (too low contrast) |

## 2. Color tokens

### Brand scale (green)
`brand-50 #f0f9f2 · brand-100 #dcf1e0 · brand-200 #bce3c5 · brand-300 #8ccd9d ·
brand-400 #55b06f · brand-500 #2e9a52 · brand-600 #008435 · brand-700 #026b2e ·
brand-800 #075528 · brand-900 #094623 · brand-950 #03270f`

### Lake scale (blue)
`lake-50 #eef7fc · lake-100 #d9edf8 · lake-200 #b3daf0 · lake-300 #7cc0e4 ·
lake-400 #3d9fd2 · lake-500 #1a83ba · lake-600 #016694 · lake-700 #01537c ·
lake-800 #064562 · lake-900 #0a3a52`

### Surfaces & ink (cool neutral family that sits with the green)
| Token | Hex | Use |
|---|---|---|
| `canvas` | `#f4f6f5` | App background |
| `surface` | `#ffffff` | Cards, dialogs, header |
| `surface-muted` | `#eef1f0` | Wells, secondary fills |
| `ink` | `#18211d` | Primary text |
| `ink-muted` | `#55625c` | Secondary text |
| `ink-faint` | `#84928b` | Metadata, placeholders |
| `border` | `#e0e6e2` | Hairlines |
| `border-strong` | `#c6cfca` | Active borders, inputs |

### Semantic status colors (never color-only — always paired with a text label)
| State | Tone | Badge classes |
|---|---|---|
| DRAFT | neutral | `border-border bg-surface-muted text-ink-muted` |
| IN_REVIEW | amber | `border-amber-200 bg-amber-50 text-amber-800` |
| APPROVED | blue (lake) | `border-lake-200 bg-lake-50 text-lake-800` |
| PUBLISHED | green (brand) | `border-brand-200 bg-brand-50 text-brand-800` |
| ARCHIVED | gray | `border-zinc-200 bg-zinc-100 text-zinc-700` |
| Error / destructive | red | `red-600/700` fills, `red-200/50/800` outlines |

## 3. Typography

- **Sans:** `"Geist Variable"`, ui-sans-serif, system fallbacks. **Mono:** `"Geist Mono Variable"` for code/data only.
- Base: 14px (`text-sm`), `font-feature-settings: "cv11", "ss01"`, antialiased.
- Hierarchy scale (no random sizes):
  - Page title — `text-lg font-semibold tracking-tight` (PageHeader)
  - Section title — `text-sm font-semibold`
  - Card title — `text-sm font-semibold`
  - Body — `text-sm`
  - Supporting / muted — `text-sm text-ink-muted`
  - Label — `text-sm font-medium` / field labels `text-sm`
  - Table text — `text-sm` (headers `text-xs font-medium text-ink-faint`)
  - Metadata — `text-xs text-ink-faint`
  - Section eyebrows — `text-[11px] font-semibold uppercase tracking-wider text-ink-faint` (dashboard feed headers only)
- Weights limited to 400/500/600. No bold-everything.

## 4. Spacing

Tailwind's 4px base scale (`space-*`, `gap-*`, `p-*`, `m-*`): `0, 1(4), 1.5(6), 2(8), 2.5(10), 3(12), 3.5(14), 4(16), 5(20), 6(24), 8(32), 10(40), 12(48), 16(64)`.
- Page content rhythm: `space-y-6` sections, `mt-6` between header and content, `gap-4` grids.
- Card padding: `p-5`; control heights: `h-8` (sm) / `h-9` (md) / `h-10` (lg).

## 5. Radius

- `rounded-lg` (8px) — buttons, inputs, cards, dialogs, tables (moderate, per spec).
- `rounded-xl` (12px) — large containers (calendar, review panels).
- `rounded-full` — only status badge pills and the calendar "today" marker.
- No `rounded-2xl/3xl`, no pill buttons.

## 6. Shadows / elevation (quiet, tinted green)

- `shadow-card` — `0 1px 2px rgb(9 70 35 / .04), 0 1px 3px rgb(9 70 35 / .06)` — cards, primary buttons
- `shadow-pop` — `0 4px 12px -2px rgb(9 70 35 / .12), 0 2px 4px -2px rgb(9 70 35 / .08)` — dropdowns/popovers
- `shadow-dialog` — `0 12px 32px -8px rgb(9 70 35 / .2)` — modals/drawers
- Shadows only where elevation is real (floating surfaces). No shadows on plain rows or text.

## 7. Icons

- **Single family:** `@iconify/react` + `@iconify-icons/mdi/*` (Material Design Icons) everywhere. No mixing, no emoji, no hand-rolled SVGs.
- Size scale: `h-3.5 (14) · h-4 (16) · h-5 (20)` — icons in buttons/rows `h-4`, row metadata `h-3.5`, empty states `h-5`.
- Icons always paired with a text label where recognition matters (sidebar, buttons, table headers); decorative-only icons are not added.

## 8. Buttons (Button.tsx)

Variants: `primary` (brand-600, white), `secondary` (surface + border-strong), `outline`, `ghost`, `destructive` (red-600 solid), `destructiveOutline` (red frame — archive/remove).
Sizes: `sm h-8 · md h-9 · lg h-10 · icon h-8 w-8`.
Feedback: `transition-[…] duration-150`, `active:scale-[0.98]`, visible `focus-visible` ring (brand-600, offset 2px).

## 9. Status & alerts

- `StatusBadge` — text label + dot; tone from the semantic map above (color is never the only channel).
- `Badge` tones: neutral / amber / blue / green / red / gray, `rounded-full border` pills used sparingly for real state only.
- `Alert` tones: info / warning / success / error / neutral — one shared component, title + body + optional dismiss. No per-page alert designs.
- Notifications: toast (transient) vs notification center (persistent). Short factual copy.

## 10. Navigation

- Sidebar ~240px, quiet; section labels (uppercase `text-[11px] tracking-wider text-ink-faint`), icons at `h-4` + label; one restrained active state (`bg-brand-50 text-brand-700` style emphasis only on the active destination); account + Visit Website + Logout at the bottom.
- Top bar ~64px: breadcrumb/context, global search, notifications, user menu. No widgets, greetings, stats, or competing CTAs.

## 11. Tables

- Table is the primary collection surface: header row `text-xs font-medium text-ink-faint`, rows `text-sm`, `divide-y divide-border` hairlines (no per-row cards, no alternating stripes by default), `rounded-xl border` container only.
- Search / filters / sort / pagination / row selection via shared `CollectionPage` toolbar; row actions as restrained icon/ghost buttons.

## 12. Forms

- `Field` = label above input + optional hint + inline error below; inputs `h-9 rounded-lg border-border-strong`; two-column grids on desktop (`sm:grid-cols-2`), single-column for long text.
- Sections grouped with `Card`/`SectionHeader`; sticky/persistent action area (Save / Cancel) at the end.
- `SaveBar`, `ConfirmDialog`, `Dialog`, `Drawer` shared; no per-page variants.

## 13. Motion

Only: hover/focus feedback (`duration-150`), skeleton shimmer, toast slide-in, dialog/dropdown fade (`cms-animate-*`, transform/opacity only). All gated behind `prefers-reduced-motion: reduce`. No bounce, no animated gradients, no pulsing decorations.

## 14. Focus & accessibility

- Global `:focus-visible { outline: 2px solid brand-600; outline-offset: 2px }` (WCAG 2.2, focus not obscured).
- Contrast: `ink` on `canvas` ≈ 13:1; `ink-muted` on `surface` ≈ 7:1; `ink-faint` used only for metadata/placeholders.
- Status never color-only; reduced motion respected globally; semantic HTML throughout.
