const { chromium } = require("playwright");

async function probe(page, label) {
  console.log("===== PAGE: " + label + " =====");
  const nav = await page.evaluate(() => {
    const img = document.querySelector(".site-nav .nav-logo img");
    if (!img) return { found: false };
    const cs = getComputedStyle(img);
    const r = img.getBoundingClientRect();
    return {
      found: true,
      height: cs.height,
      maxHeight: cs.maxHeight,
      classList: Array.from(img.classList),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      rectHeight: r.height,
      rectWidth: r.width,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom },
    };
  });
  console.log("NAV_LOGO_IMG:", JSON.stringify(nav, null, 2));

  const footer = await page.evaluate(() => {
    const img = document.querySelector(".footer-logo img");
    if (!img) return { found: false };
    const cs = getComputedStyle(img);
    const r = img.getBoundingClientRect();
    return {
      found: true,
      height: cs.height,
      maxHeight: cs.maxHeight,
      classList: Array.from(img.classList),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom },
    };
  });
  console.log("FOOTER_LOGO_IMG:", JSON.stringify(footer, null, 2));

  if (label.includes("index")) {
    const mq = await page.evaluate(() => {
      const wrap = document.querySelector(".marquee-wrap");
      const img = document.querySelector(".logoloop__item img");
      const list = document.querySelector(".logoloop__list, .marquee-wrap ul, .logoloop ul, .logoloop");
      const items = document.querySelectorAll(".logoloop__item, .marquee-wrap li, .logoloop li");
      const wrapCs = wrap ? getComputedStyle(wrap) : null;
      const imgCs = img ? getComputedStyle(img) : null;
      const listCs = list ? getComputedStyle(list) : null;
      const firstLi = items[0];
      const liCs = firstLi ? getComputedStyle(firstLi) : null;
      return {
        marqueeWrap: wrap
          ? {
              backgroundColor: wrapCs.backgroundColor,
              height: wrapCs.height,
              rectHeight: wrap.getBoundingClientRect().height,
            }
          : null,
        logoloopItemImg: img
          ? {
              height: imgCs.height,
              maxHeight: imgCs.maxHeight,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              rectHeight: img.getBoundingClientRect().height,
            }
          : null,
        listStyle: list
          ? {
              tag: list.tagName,
              className: list.className,
              listStyleType: listCs.listStyleType,
              listStyle: listCs.listStyle,
              listStylePosition: listCs.listStylePosition,
            }
          : null,
        firstItemListStyle: liCs
          ? {
              tag: firstLi.tagName,
              className: firstLi.className,
              listStyleType: liCs.listStyleType,
              listStyle: liCs.listStyle,
              display: liCs.display,
            }
          : null,
        bulletLikely:
          !!(listCs && listCs.listStyleType && listCs.listStyleType !== "none") ||
          !!(liCs && liCs.listStyleType && liCs.listStyleType !== "none"),
      };
    });
    console.log("INDEX_MARQUEE:", JSON.stringify(mq, null, 2));
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  await page.goto("http://127.0.0.1:8765/lake-lubes.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await probe(page, "lake-lubes.html");

  await page.goto("http://127.0.0.1:8765/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await probe(page, "index.html");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
