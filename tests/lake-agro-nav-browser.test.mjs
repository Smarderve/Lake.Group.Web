import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

test('Lake Agro renders a transparent nav before scroll and a branded nav after scroll', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    await page.goto(new URL('../lake-agro.html', import.meta.url).href, { waitUntil: 'networkidle' });

    const nav = page.locator('.site-nav');
    const atTop = await nav.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { backgroundColor: styles.backgroundColor, borderBottomWidth: styles.borderBottomWidth };
    });
    assert.equal(atTop.backgroundColor, 'rgba(0, 0, 0, 0)');
    assert.equal(atTop.borderBottomWidth, '0px');

    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(100);
    const afterScroll = await nav.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { backgroundColor: styles.backgroundColor, backdropFilter: styles.backdropFilter };
    });
    assert.equal(afterScroll.backgroundColor, 'rgba(0, 75, 30, 0.96)');
    assert.match(afterScroll.backdropFilter, /blur\(10px\)/);
  } finally {
    await browser.close();
  }
});
