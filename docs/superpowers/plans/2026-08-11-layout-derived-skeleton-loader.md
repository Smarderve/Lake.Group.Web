# Layout-Derived Skeleton Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public Lake Group page render a skeleton matching its live interface without page-specific markup.

**Architecture:** `assets/skeleton.js` will derive placeholder blocks from the live document’s visible geometry and mount them in one inert fixed overlay. `assets/skeleton.css` will provide the overlay, placeholder variants, reduced-motion behavior, and cleanup transition. A Playwright smoke test will exercise this behavior across every shipping page.

**Tech Stack:** Static HTML, vanilla JavaScript, CSS, Playwright 1.62.

## Global Constraints

- Do not modify individual page layouts or duplicate page-specific skeleton markup.
- Use live DOM geometry after layout is available; batch reads once per loading cycle.
- The overlay must be `aria-hidden`, inert, and non-interactive.
- Disable shimmer under `prefers-reduced-motion: reduce`.
- Preserve the existing timeout/resource completion behavior.

---

### Task 1: Establish layout-derived skeleton contract

**Files:**
- Create: `tests/skeleton-loader.spec.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: each root `*.html` page and `assets/skeleton.js`.
- Produces: `npm run test:skeleton`, which runs browser coverage for the loader.

- [ ] **Step 1: Write the failing test**

```js
test('mounts an inert layout-derived overlay for every public page', async ({ page }) => {
  await page.goto(`/index.html?lg-skeleton-test=1`);
  await expect(page.locator('[data-lg-skeleton-overlay]')).toBeVisible();
  await expect(page.locator('[data-lg-skeleton-block]').first()).toBeVisible();
  await expect(page.locator('[data-lg-skeleton-overlay]')).toHaveAttribute('aria-hidden', 'true');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skeleton-loader.spec.js`

Expected: FAIL because no element has `data-lg-skeleton-overlay`.

- [ ] **Step 3: Add the narrow test command**

```json
"test:skeleton": "playwright test tests/skeleton-loader.spec.js"
```

- [ ] **Step 4: Run test to verify the failure remains behavioral**

Run: `npm run test:skeleton`

Expected: FAIL only because the overlay has not been implemented.

### Task 2: Replace route templates with geometry-derived blocks

**Files:**
- Modify: `assets/skeleton.js`
- Modify: `assets/skeleton.css`
- Test: `tests/skeleton-loader.spec.js`

**Interfaces:**
- Consumes: `collectSkeletonTargets(root)`, `buildSkeletonOverlay(targets)`, and the existing resource-completion lifecycle.
- Produces: an overlay marked `data-lg-skeleton-overlay` with children marked `data-lg-skeleton-block`.

- [ ] **Step 1: Extend the failing test for structural coverage**

```js
const blockKinds = await page.locator('[data-lg-skeleton-block]').evaluateAll(
  (blocks) => [...new Set(blocks.map((block) => block.dataset.lgSkeletonBlock))]
);
expect(blockKinds).toEqual(expect.arrayContaining(['text', 'media', 'surface']));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:skeleton`

Expected: FAIL because no geometry-derived blocks exist.

- [ ] **Step 3: Implement the minimal shared engine**

```js
function collectSkeletonTargets(root) {
  return Array.from(root.querySelectorAll('img, video, h1, h2, h3, p, a, button, input, textarea, select, [class*="card"], [class*="map"]'));
}

function buildSkeletonOverlay(targets) {
  var overlay = document.createElement('div');
  overlay.dataset.lgSkeletonOverlay = '';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.inert = true;
  return overlay;
}
```

Classify targets by semantic element first, then visual surface classes; ignore hidden, zero-area, and loader-owned elements. For each qualifying target, create an absolutely positioned block from its viewport rectangle. Use `document.createDocumentFragment()` and separate the read pass from the write pass.

- [ ] **Step 4: Add overlay styles**

```css
[data-lg-skeleton-overlay] { position: fixed; inset: 0; z-index: 99990; pointer-events: none; }
[data-lg-skeleton-block] { position: absolute; border-radius: var(--lg-skel-radius, 0.5rem); }
@media (prefers-reduced-motion: reduce) { [data-lg-skeleton-block] { animation: none; } }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:skeleton`

Expected: PASS.

### Task 3: Verify cleanup and all-page coverage

**Files:**
- Modify: `tests/skeleton-loader.spec.js`
- Modify: `assets/skeleton.js`
- Test: `tests/skeleton-loader.spec.js`

**Interfaces:**
- Consumes: current loader completion behavior.
- Produces: overlay removal after loading and full public-page coverage.

- [ ] **Step 1: Write the failing lifecycle test**

```js
test('removes the overlay after loading completes', async ({ page }) => {
  await page.goto('/index.html?lg-skeleton-test=1');
  await expect(page.locator('[data-lg-skeleton-overlay]')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('load')));
  await expect(page.locator('[data-lg-skeleton-overlay]')).toHaveCount(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:skeleton`

Expected: FAIL because the generated overlay is not removed by loader cleanup.

- [ ] **Step 3: Make cleanup remove generated overlay**

```js
function hide() {
  var overlay = document.querySelector('[data-lg-skeleton-overlay]');
  if (overlay) overlay.remove();
  html.classList.remove('lg-loading');
  html.classList.add('lg-skel-done');
}
```

- [ ] **Step 4: Expand the test page list from the root HTML files**

```js
const publicPages = fs.readdirSync(projectRoot)
  .filter((name) => name.endsWith('.html') && !['offline.html', '404.html'].includes(name));
```

For each page, assert the overlay mounts, has at least one block, is non-interactive, and has no visible blocks outside the viewport.

- [ ] **Step 5: Run all skeleton tests**

Run: `npm run test:skeleton`

Expected: PASS for every shipping public page.

- [ ] **Step 6: Review the diff and commit only task files when the worktree permits**

Run: `git diff -- assets/skeleton.js assets/skeleton.css tests/skeleton-loader.spec.js package.json`

Expected: route-specific skeleton generators removed; no page HTML changed.
