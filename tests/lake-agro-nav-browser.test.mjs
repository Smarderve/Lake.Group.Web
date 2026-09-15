import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

test('Lake Agro renders the approved transparent nav at page load', async () => {
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

  } finally {
    await browser.close();
  }
});

test('Lake Agro Business Verticals is a desktop dropdown trigger, not a Home link', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const pageUrl = new URL('../lake-agro.html', import.meta.url).href;
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    const trigger = page.locator('#nav-companies-trigger');
    await trigger.click();
    await page.waitForTimeout(50);
    assert.equal(page.url(), pageUrl);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(await trigger.locator('xpath=..').evaluate((item) => item.classList.contains('is-open')), true);

    await page.locator('#nav-companies-trigger').locator('xpath=..').getByRole('tab', { name: 'Manufacturing Sector' }).click();
    await page.getByRole('link', { name: 'Lake Steel' }).first().click();
    await page.waitForLoadState('networkidle');
    assert.match(page.url(), /lake-steel\.html$/);
  } finally {
    await browser.close();
  }
});

test('Lake Agro mobile Business Verticals opens its submenu without navigating Home', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const pageUrl = new URL('../lake-agro.html', import.meta.url).href;
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    await page.locator('#nav-toggle').click();
    const trigger = page.locator('.mob-primary[aria-controls="mob-subsidiaries"]');
    await trigger.click();
    await page.waitForTimeout(50);
    assert.equal(page.url(), pageUrl);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#mob-subsidiaries').evaluate((panel) => panel.hidden), false);
  } finally {
    await browser.close();
  }
});
