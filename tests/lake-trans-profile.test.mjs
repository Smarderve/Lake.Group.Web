import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const pageUrl = pathToFileURL(resolve('lake-trans.html')).href;

test('Lake Trans profile displays five local transport photos from the company profile', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(pageUrl);
    const photos = page.locator('img[data-profile-photo]');

    assert.equal(await photos.count(), 5);
    await photos.last().scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('img[data-profile-photo]')].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    for (const photo of await photos.all()) {
      const result = await photo.evaluate((image) => ({
        loaded: image.complete && image.naturalWidth > 0,
        src: image.getAttribute('src') ?? '',
        alt: image.getAttribute('alt') ?? '',
      }));
      assert.equal(result.loaded, true);
      assert.match(result.src, /^assets\/images\/laketrans\/profile\//);
      assert.doesNotMatch(result.src, /logo/i);
      assert.notEqual(result.alt.trim(), '');
    }
  } finally {
    await browser.close();
  }
});

test('Lake Trans profile shows the supplied fleet and capacity facts', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(pageUrl);
    const text = await page.locator('main, .page-wrapper').innerText();

    assert.match(text, /established in 2008/i);
    assert.match(text, /650 vehicles/i);
    assert.match(text, /12,000 to 40,000 litres/i);
    assert.match(text, /Congo, Burundi and Zambia/i);
  } finally {
    await browser.close();
  }
});
