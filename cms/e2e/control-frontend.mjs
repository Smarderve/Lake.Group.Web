import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { chromium } from "playwright";
import axe from "axe-core";
import { makeApp, makeUser } from "../../backend/tests/helpers.js";
import { buildCmsV2SeedDataset } from "../../backend/src/lib/cms-v2-seed.js";
import {
  CMS_V2_DOCUMENTS,
  CMS_V2_PAGE_DEFINITIONS,
} from "../../backend/src/lib/cms-v2-content.js";
import { reviewContentRelease } from "../../backend/src/lib/cms-v2-release-review.js";
import { createDefaultComposition } from "../../backend/src/lib/cms-v2-components.js";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const cmsRoot = fileURLToPath(new URL("../", import.meta.url));
const screenshotRoot = resolve(root, "docs/qa/control-frontend/screenshots");
const backendPort = 4191;
const cmsPort = 5191;
const sitePort = 4192;
const cmsOrigin = `http://127.0.0.1:${cmsPort}`;
process.env.CMS_PROXY_TARGET = `http://127.0.0.1:${backendPort}`;
process.env.VITE_PUBLIC_SITE_URL = `http://127.0.0.1:${sitePort}`;

const dataset = await buildCmsV2SeedDataset({ root });
for (const page of CMS_V2_PAGE_DEFINITIONS)
  dataset[page.key].composition = createDefaultComposition(
    page.label,
    dataset[page.key],
  );
const revision = {
  id: "seed-home",
  data: dataset.home,
  createdAt: "2026-09-18T12:00:00.000Z",
};
const state = {
  home: revision,
  "lake-aviation": {
    id: "seed-aviation",
    data: dataset["lake-aviation"],
    createdAt: revision.createdAt,
  },
  global: {
    id: "seed-global",
    data: dataset.global,
    createdAt: revision.createdAt,
  },
};
for (const definition of CMS_V2_PAGE_DEFINITIONS)
  state[definition.key] ??= {
    id: `qa-${definition.key}`,
    data: dataset[definition.key],
    createdAt: revision.createdAt,
  };
const service = {
  readDocument: async (key) => ({
    key,
    currentDraftRevisionId: state[key]?.id ?? null,
    currentPublishedRevisionId:
      key === "home"
        ? revision.id
        : key === "lake-aviation"
          ? "seed-aviation"
          : null,
    currentDraftRevision: state[key] ?? null,
    currentPublishedRevision: state[key] ?? null,
    updatedAt: state[key] ? new Date(state[key].createdAt) : null,
  }),
  readPageSource: async (key) => {
    const route = CMS_V2_PAGE_DEFINITIONS.find(
      (page) => page.key === key,
    )?.route;
    if (!route) throw new Error("Unknown page");
    return {
      sourceUrl: `http://127.0.0.1:${sitePort}/${route}`,
      html: await readFile(join(root, route), "utf8"),
    };
  },
  listRevisions: async (key) => (state[key] ? [state[key]] : []),
  // Test-only saved snapshots exercise history UI; no database entries are created.
  listReleases: async () => [
    {
      id: "qa-release-current",
      publishedAt: "2026-09-20T12:00:00Z",
      key: "home",
      integrity: "qa-fixture",
      snapshot: { schemaVersion: 1, documents: { home: dataset.home } },
    },
    {
      id: "qa-release-previous",
      publishedAt: "2026-09-18T12:00:00Z",
      key: "home",
      integrity: "qa-fixture",
      snapshot: {
        schemaVersion: 1,
        documents: {
          home: {
            ...dataset.home,
            hero: { ...dataset.home.hero, heading: "QA previous heading" },
          },
        },
      },
    },
  ],
  reviewRelease: async ({ key }) =>
    reviewContentRelease({
      definition: CMS_V2_DOCUMENTS[key],
      draft: state[key].data,
      published: revision.data,
    }),
  saveDraft: async ({ key, data }) => {
    state[key] = {
      id: `revision-${Date.now()}`,
      data,
      createdAt: new Date().toISOString(),
    };
    return state[key];
  },
  saveDraftBatch: async ({ documents }) =>
    documents.map((document) => {
      state[document.key] = {
        id: `revision-${document.key}-${Date.now()}`,
        data: document.data,
        createdAt: new Date().toISOString(),
      };
      return state[document.key];
    }),
  publish: async ({ revisionId }) => ({
    id: `release-${Date.now()}`,
    revisionId,
    publishedAt: new Date().toISOString(),
    integrity: "sha256-test",
  }),
};
const user = await makeUser({
  email: "control-qa@lakegroup.test",
  password: "control-qa-password",
  role: "SUPER_ADMIN",
});
user.cmsAccessLevel = "IT_ADMIN";
const { app } = makeApp({
  users: [user],
  options: {
    logger: undefined,
    // Test-only matrix makes hundreds of reads against the in-memory service.
    adminLimiter: (_req, _res, next) => next(),
    cmsV2Service: service,
    csrfAllowedOrigins: [cmsOrigin],
    cmsAllowedOrigins: [cmsOrigin],
  },
});
const backend = await new Promise((resolveServer, reject) => {
  const server = app.listen(backendPort, "127.0.0.1", () =>
    resolveServer(server),
  );
  server.once("error", reject);
});
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
};
const site = createHttpServer(async (req, res) => {
  const path = new URL(req.url, `http://127.0.0.1:${sitePort}`).pathname;
  const target = resolve(root, `.${path === "/" ? "/index.html" : path}`);
  if (!(target === root || target.startsWith(root + sep))) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (!(await stat(target)).isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "content-type": mime[extname(target)] || "application/octet-stream",
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolveServer, reject) => {
  site.listen(sitePort, "127.0.0.1", resolveServer);
  site.once("error", reject);
});
const vite = await createViteServer({
  configFile: join(cmsRoot, "vite.config.ts"),
  root: cmsRoot,
  server: { host: "127.0.0.1", port: cmsPort, strictPort: true },
});
let browser;
try {
  await vite.listen();
  await mkdir(screenshotRoot, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await page.route("**/admin/media", (route) =>
    route.fulfill({
      json: {
        media: [
          {
            id: "qa-logo",
            url: "assets/images/logos/LAKE_GROUP_LOGO.png",
            altText: "Lake Group logo",
            caption: "QA asset fixture",
            mimeType: "image/png",
            sizeBytes: null,
            width: null,
            height: null,
            tags: [],
            variants: null,
            folderId: null,
            status: "PUBLISHED",
            createdAt: revision.createdAt,
            updatedAt: revision.createdAt,
          },
        ],
      },
    }),
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${cmsOrigin}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Email/).fill(user.email);
  await page.getByLabel(/^Password/).fill("control-qa-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${cmsOrigin}/app`);
  const viewports = [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1280, 800],
    [1024, 768],
    [768, 1024],
    [430, 932],
    [390, 844],
    [360, 800],
  ];
  const routes = [
    ["overview", "/control"],
    ["pages", "/control/pages"],
    ["editor", "/control/pages/lake-aviation"],
    ["navigation", "/control/navigation"],
    ["global-data", "/control/global-data"],
    ["media", "/control/media"],
    ["history", "/control/history"],
    ["settings", "/control/settings"],
  ];
  const checks =
    process.env.CMS_QA_RESUME === "true"
      ? JSON.parse(
          await readFile(
            join(screenshotRoot, "../matrix-progress.json"),
            "utf8",
          ),
        )
      : process.env.CMS_QA_MOBILE_ONLY === "true"
        ? JSON.parse(
            await readFile(
              join(screenshotRoot, "../matrix-progress.json"),
              "utf8",
            ),
          ).filter((check) => check.width > 430)
        : [];
  for (const [width, height] of viewports.filter(
    ([width]) => process.env.CMS_QA_MOBILE_ONLY !== "true" || width <= 430,
  )) {
    await page.setViewportSize({ width, height });
    for (const [name, route] of routes) {
      if (
        process.env.CMS_QA_RESUME === "true" &&
        checks.some(
          (check) => check.workspace === name && check.width === width,
        )
      )
        continue;
      await page.goto(`${cmsOrigin}${route}`, {
        waitUntil: "domcontentloaded",
      });
      try {
        await page
          .locator(".control-page-heading h1,.control-editor-top h1")
          .waitFor();
      } catch (cause) {
        await page.screenshot({
          path: join(screenshotRoot, `${name}-${width}-failure.png`),
          fullPage: true,
        });
        console.log(
          `${name} at ${width}:`,
          await page.locator("body").innerText(),
        );
        throw cause;
      }
      await page.waitForTimeout(500);
      if (
        !(await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ))
      ) {
        await page.screenshot({
          path: join(screenshotRoot, `${name}-${width}-overflow.png`),
          fullPage: true,
        });
        console.log(
          await page.evaluate(() =>
            Array.from(document.querySelectorAll("*"))
              .filter(
                (element) =>
                  element.getBoundingClientRect().right > innerWidth + 1,
              )
              .slice(0, 20)
              .map((element) => ({
                tag: element.tagName,
                classes: element.className,
                width: element.getBoundingClientRect().width,
                right: element.getBoundingClientRect().right,
              })),
          ),
        );
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${name}: overflow at ${width}`,
      );
      await page.evaluate(axe.source);
      const result = await page.evaluate(async () =>
        window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      const serious = result.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact),
      );
      assert.deepEqual(
        serious.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => node.target),
        })),
        [],
        `${name}: accessibility at ${width}`,
      );
      await page.screenshot({
        path: join(screenshotRoot, `${name}-${width}.png`),
        fullPage: true,
      });
      checks.push({
        workspace: name,
        width,
        height,
        overflow: false,
        accessibilityViolations: result.violations.map((item) => item.id),
      });
      await writeFile(
        join(screenshotRoot, "../matrix-progress.json"),
        JSON.stringify(checks, null, 2),
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${cmsOrigin}/control/pages`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("textbox", { name: "Search pages" })
    .fill("no-such-page-qa");
  await page.getByText("No pages match this search.").waitFor();
  await page.screenshot({
    path: join(screenshotRoot, "pages-no-results.png"),
    fullPage: true,
  });
  await page.goto(`${cmsOrigin}/control/pages/lake-aviation`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .frameLocator("iframe")
    .locator('[data-cms-node-id="hero"]')
    .waitFor();
  await page
    .getByRole("button", { name: "mobile preview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Insert component", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Service card/ })
    .click();
  await page.getByRole("button", { name: "layout", exact: true }).click();
  await page.getByLabel("Grid span").selectOption("6");
  await page.getByText("Override", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Reset to inherited" }).click();
  await page.getByText("Inherited from desktop", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByLabel("Canvas zoom").selectOption("75");
  await page.screenshot({
    path: join(screenshotRoot, "editor-responsive-override.png"),
    fullPage: true,
  });
  await page.keyboard.press("Control+k");
  await page.getByRole("dialog", { name: "Search CMS" }).waitFor();
  await page
    .getByRole("textbox", {
      name: "Search pages, values, media and workspaces",
    })
    .fill("navigation");
  await page.screenshot({
    path: join(screenshotRoot, "command-palette.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.goto(`${cmsOrigin}/control/navigation`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel("Label", { exact: true }).fill("QA local menu item");
  assert.equal(
    state.global.data.navigation?.some(
      (item) => item.label === "QA local menu item",
    ) ?? false,
    false,
    "Local nav preview must not persist",
  );
  await page.getByRole("button", { name: "Add child", exact: true }).click();
  await page.getByLabel("Label", { exact: true }).fill("QA nested item");
  await page.getByRole("button", { name: "mobile", exact: true }).click();
  await page.screenshot({
    path: join(screenshotRoot, "navigation-nested-preview.png"),
    fullPage: true,
  });
  await page.goto(`${cmsOrigin}/control/media`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Upload media", exact: true }).click();
  await page.getByRole("dialog", { name: "Upload media" }).waitFor();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page
      .getByRole("dialog")
      .evaluate((dialog) => dialog.contains(document.activeElement)),
    true,
    "Dialog focus stays inside",
  );
  await page.screenshot({
    path: join(screenshotRoot, "media-upload-preview.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.goto(`${cmsOrigin}/control/media`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(".media-grid button").first().click();
  await page.getByLabel("Alternative text").fill("QA local alternative text");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await page.screenshot({
    path: join(screenshotRoot, "media-selected-list.png"),
    fullPage: true,
  });
  await page.goto(`${cmsOrigin}/control/history`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("button", { name: "Compare with previous", exact: true })
    .click();
  await page.locator(".version-comparison").waitFor();
  await page.screenshot({
    path: join(screenshotRoot, "history-comparison.png"),
    fullPage: true,
  });
  await page.goto(`${cmsOrigin}/control/global-data`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("button", { name: "Review impact", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Review global change" }).waitFor();
  await page.screenshot({
    path: join(screenshotRoot, "global-impact-preview.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.goto(`${cmsOrigin}/control/pages/home`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("button", { name: "Home globe Protected", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Home globe", exact: true })
    .waitFor();
  await page.screenshot({
    path: join(screenshotRoot, "protected-globe-inspector.png"),
    fullPage: true,
  });
  // Exercise intentional connection, empty and loading presentations using test-only responses.
  const failedMedia = (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "QA fixture unavailable",
        },
      },
    });
  await page.route("**/admin/media", failedMedia);
  await page.goto(`${cmsOrigin}/control/media`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(".control-page .control-error").waitFor();
  await page.screenshot({
    path: join(screenshotRoot, "media-error-state.png"),
    fullPage: true,
  });
  await page.unroute("**/admin/media", failedMedia);
  const emptyMedia = (route) => route.fulfill({ json: { media: [] } });
  await page.route("**/admin/media", emptyMedia);
  await page.goto(`${cmsOrigin}/control/media`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByText("Your media library is empty", { exact: true })
    .waitFor();
  await page.screenshot({
    path: join(screenshotRoot, "media-empty-state.png"),
    fullPage: true,
  });
  await page.unroute("**/admin/media", emptyMedia);
  const slowMedia = async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await route.fulfill({ json: { media: [] } });
  };
  await page.route("**/admin/media", slowMedia);
  await page.goto(`${cmsOrigin}/control/media`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByText("Loading workspace…", { exact: true }).waitFor();
  await page.screenshot({
    path: join(screenshotRoot, "media-loading-state.png"),
    fullPage: true,
  });
  await page
    .getByText("Your media library is empty", { exact: true })
    .waitFor();
  await page.unroute("**/admin/media", slowMedia);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${cmsOrigin}/control/pages/lake-aviation`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "layers", exact: true }).click();
  await page.screenshot({
    path: join(screenshotRoot, "editor-mobile-layers.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "inspector", exact: true }).click();
  await page.screenshot({
    path: join(screenshotRoot, "editor-mobile-inspector.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.screenshot({
    path: join(screenshotRoot, "mobile-navigation.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  await writeFile(
    join(screenshotRoot, "../results.json"),
    JSON.stringify(
      {
        checks,
        interactions: [
          "page search",
          "responsive span reset",
          "undo redo",
          "canvas zoom",
          "command palette escape",
          "local nested navigation",
          "upload dialog focus",
          "global impact review",
          "release content comparison",
          "protected globe inspector",
          "media loading empty error states",
          "mobile panel switching",
        ],
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `Control frontend QA passed: ${checks.length} workspace/viewport checks, axe accessibility, local editing and overlays.`,
  );
} finally {
  if (browser) await browser.close();
  await vite.close();
  await new Promise((resolveServer) => site.close(resolveServer));
  await new Promise((resolveServer) => backend.close(resolveServer));
}
