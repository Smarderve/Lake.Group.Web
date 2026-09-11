import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const qa = path.join(root, 'docs', 'qa');
const videoDir = path.join(qa, '_history-scroll-sync-video');
const sizes = [[390, 844], [430, 900], [768, 950], [1024, 1000], [1280, 900], [1366, 900], [1440, 1000], [1536, 960], [1920, 1080]];
const expectedAngles = { 2006: 135, 2008: 72, 2010: 45, 2011: 155, 2013: 105, 2014: 30, 2016: 165, 2017: 25, 2018: 92, 2019: 120, 2020: 60, 2021: 145, 2023: 38, 2025: 112, 2026: 68 };

await fs.mkdir(qa, { recursive: true });
await fs.rm(videoDir, { recursive: true, force: true });
await fs.mkdir(videoDir, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  const requestPath = pathname === '/' ? 'history.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, requestPath);
  if (!file.startsWith(root) || !fsSync.existsSync(file) || fsSync.statSync(file).isDirectory()) {
    response.writeHead(404); response.end(); return;
  }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fsSync.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(4176, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const makeContext = (viewport, recordVideo = false) => browser.newContext({ viewport, deviceScaleFactor: 1, ...(recordVideo ? { recordVideo: { dir: videoDir, size: viewport } } : {}) });
const gotoHistory = async (page) => {
  await page.goto('http://127.0.0.1:4176/history.html?qa=scroll-sync', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.history-branch');
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const scrollToYearOffset = async (page, year, offset = 0) => {
  await page.evaluate(({ year, offset }) => {
    const group = [...document.querySelectorAll('.history-year-group')].find((item) => item.querySelector('.history-year')?.textContent.trim() === String(year));
    const node = group?.querySelector('.history-node');
    if (!node) throw new Error(`Missing year ${year}`);
    const nodeY = node.getBoundingClientRect().top + scrollY + node.offsetHeight / 2;
    scrollTo({ top: nodeY - innerHeight * 0.42 + offset, behavior: 'instant' });
  }, { year, offset });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const yearState = (page, year) => page.evaluate((year) => {
  const group = [...document.querySelectorAll('.history-year-group')].find((item) => item.querySelector('.history-year')?.textContent.trim() === String(year));
  const timeline = document.querySelector('[data-history-timeline]');
  if (!group || !timeline) throw new Error(`Missing year ${year}`);
  const branches = [...group.querySelectorAll('.history-branch')];
  const reveals = [...group.querySelectorAll('.history-event-reveal')];
  const lineHeight = Number.parseFloat(getComputedStyle(timeline).getPropertyValue('--timeline-line-height'));
  const timelineTop = timeline.getBoundingClientRect().top + scrollY;
  const node = group.querySelector('.history-node');
  const nodeOffset = node.getBoundingClientRect().top + scrollY + node.offsetHeight / 2 - timelineTop - Number.parseFloat(getComputedStyle(timeline).getPropertyValue('--timeline-axis-start'));
  return {
    scrollY,
    lineError: Math.abs(lineHeight - Math.max(0, scrollY + innerHeight * 0.42 - (timelineTop + Number.parseFloat(getComputedStyle(timeline).getPropertyValue('--timeline-axis-start'))))),
    nodeReached: lineHeight >= nodeOffset - 0.5,
    classes: group.className,
    branchProgress: branches.map((branch) => {
      const length = Number.parseFloat(branch.style.getPropertyValue('--branch-length'));
      const offset = Number.parseFloat(branch.style.getPropertyValue('--branch-offset'));
      return Number((1 - offset / length).toFixed(3));
    }),
    cardProgress: reveals.map((reveal) => Number.parseFloat(reveal.style.getPropertyValue('--card-reveal-opacity'))),
  };
}, year);

const breakpointResults = [];
for (const [width, height] of sizes) {
  const context = await makeContext({ width, height });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await gotoHistory(page);
  await scrollToYearOffset(page, 2019, 190);
  const result = await page.evaluate(({ width, height, expectedAngles, errors }) => {
    const groups = [...document.querySelectorAll('.history-year-group')];
    const years = Object.fromEntries(groups.map((group) => [group.querySelector('.history-year').textContent.trim(), Number.parseFloat(getComputedStyle(group).getPropertyValue('--history-gradient-angle'))]));
    const branches = [...document.querySelectorAll('.history-branch')];
    const cards2019 = groups.find((group) => group.querySelector('.history-year').textContent.trim() === '2019');
    const node = cards2019.querySelector('.history-node').getBoundingClientRect();
    const paths = [...cards2019.querySelectorAll('.history-branch')];
    const cards = [...cards2019.querySelectorAll('.history-event')];
    const directBranches = paths.length === cards.length && paths.every((branch) => {
      const match = branch.getAttribute('d').match(/^M\s+([\d.]+)\s+([\d.]+)/);
      return match && Math.abs(Number(match[1]) - (node.left + node.width / 2 - cards2019.getBoundingClientRect().left)) < 1;
    });
    return {
      width, height, errors,
      groupCount: groups.length,
      branchCount: branches.length,
      wrapperCount: document.querySelectorAll('.history-event-reveal').length,
      cardCount: document.querySelectorAll('.history-event').length,
      yearAnglesMatch: Object.entries(expectedAngles).every(([year, angle]) => years[year] === angle),
      historicalGradientColorsValid: [...document.querySelectorAll('.history-event:not(:has(.history-status))')].every((card) => {
        const background = getComputedStyle(card).backgroundImage;
        return background.includes('rgb(1, 129, 187)') && background.includes('rgb(5, 153, 211)');
      }),
      upcomingPreserved: getComputedStyle(document.querySelector('.history-event:has(.history-status)')).backgroundImage.includes('rgb(255, 255, 255)'),
      direct2019Branches: directBranches,
      five2019Branches: paths.length === 5,
      scrollListenersPerCard: [...document.querySelectorAll('.history-event')].every((card) => !card.hasAttribute('onscroll')),
    };
  }, { width, height, expectedAngles, errors });
  breakpointResults.push(result);
  if ([390, 768, 1920].includes(width)) {
    await page.locator('.history-year-group', { hasText: '2019' }).screenshot({ path: path.join(qa, `history-scroll-sync-2019-${width}.png`) });
  }
  await context.close();
}

const behaviorContext = await makeContext({ width: 1440, height: 1000 });
const behaviorPage = await behaviorContext.newPage();
await gotoHistory(behaviorPage);
await scrollToYearOffset(behaviorPage, 2019, -1);
const beforeSlow = await yearState(behaviorPage, 2019);
const slowSamples = [];
for (const offset of [18, 36, 54, 72, 90, 108, 126, 144, 162, 180]) {
  await scrollToYearOffset(behaviorPage, 2019, offset);
  slowSamples.push(await yearState(behaviorPage, 2019));
  await behaviorPage.waitForTimeout(80);
}
await scrollToYearOffset(behaviorPage, 2017, 0);
await behaviorPage.evaluate(() => scrollBy(0, 1800));
await behaviorPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
const fastStop = await yearState(behaviorPage, 2021);
await scrollToYearOffset(behaviorPage, 2020, 155);
const reverseBefore = await yearState(behaviorPage, 2020);
await scrollToYearOffset(behaviorPage, 2020, -2);
const reverseAfter = await yearState(behaviorPage, 2020);
await behaviorContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await gotoHistory(reducedPage);
await scrollToYearOffset(reducedPage, 2019, 50);
const reducedMotionState = await reducedPage.evaluate(() => {
  const group = [...document.querySelectorAll('.history-year-group')].find((item) => item.querySelector('.history-year')?.textContent.trim() === '2019');
  const reveal = group.querySelector('.history-event-reveal');
  const branch = group.querySelector('.history-branch');
  return { revealTransform: getComputedStyle(reveal).transform, branchTransition: getComputedStyle(branch).transitionDuration };
});
await reducedContext.close();

const stillAtStop = async (page, year) => {
  const first = await yearState(page, year);
  await page.waitForTimeout(900);
  const second = await yearState(page, year);
  return { first, second, unchanged: JSON.stringify(first.branchProgress) === JSON.stringify(second.branchProgress) && JSON.stringify(first.cardProgress) === JSON.stringify(second.cardProgress) };
};
const stopContext = await makeContext({ width: 1440, height: 1000 });
const stopPage = await stopContext.newPage();
await gotoHistory(stopPage);
await scrollToYearOffset(stopPage, 2019, 102);
const stopState = await stillAtStop(stopPage, 2019);
await scrollToYearOffset(stopPage, 2019, 190);
await stopPage.locator('.history-year-group', { hasText: '2019' }).screenshot({ path: path.join(qa, 'history-scroll-sync-2019.png') });
await scrollToYearOffset(stopPage, 2026, 190);
await stopPage.locator('.history-year-group', { hasText: '2026' }).screenshot({ path: path.join(qa, 'history-scroll-sync-2026.png') });
await stopContext.close();

const videoContext = await makeContext({ width: 1440, height: 900 }, true);
const videoPage = await videoContext.newPage();
await gotoHistory(videoPage);
await scrollToYearOffset(videoPage, 2017, -30);
await videoPage.waitForTimeout(500);
for (let offset = -10; offset <= 180; offset += 10) {
  await scrollToYearOffset(videoPage, 2017, offset);
  await videoPage.waitForTimeout(90);
}
for (const year of [2018, 2019]) {
  await scrollToYearOffset(videoPage, year, 190);
  await videoPage.waitForTimeout(450);
}
await scrollToYearOffset(videoPage, 2021, 180);
await videoPage.waitForTimeout(500);
for (const offset of [150, 120, 90, 60, 30, 0, -20]) {
  await scrollToYearOffset(videoPage, 2020, offset);
  await videoPage.waitForTimeout(120);
}
await scrollToYearOffset(videoPage, 2026, 190);
await videoPage.waitForTimeout(1000);
const video = videoPage.video();
await videoContext.close();
const recorded = await video.path();
await browser.close();
server.close();

const finalVideo = path.join(qa, 'history-scroll-sync-qa.mp4');
const converted = spawnSync('ffmpeg', ['-y', '-i', recorded, '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', finalVideo], { encoding: 'utf8' });
if (converted.status !== 0) throw new Error(converted.stderr);
const contactSheet = path.join(qa, 'history-scroll-sync-contact-sheet.png');
const sheet = spawnSync('ffmpeg', ['-y', '-i', finalVideo, '-vf', 'fps=1/1.4,scale=480:-1,tile=4x3', '-frames:v', '1', contactSheet], { encoding: 'utf8' });
if (sheet.status !== 0) throw new Error(sheet.stderr);
await fs.rm(videoDir, { recursive: true, force: true });

const slowProgressive = slowSamples.some((sample) => sample.branchProgress[0] > 0 && sample.branchProgress[0] < 1) && slowSamples.some((sample) => sample.cardProgress[0] > 0 && sample.cardProgress[0] < 1);
const reverseWorks = reverseBefore.branchProgress[0] === 1 && reverseBefore.cardProgress[0] === 1 && reverseAfter.branchProgress.every((value) => value === 0) && reverseAfter.cardProgress.every((value) => value === 0) && reverseAfter.classes.includes('is-future');
const source = await fs.readFile(path.join(root, 'assets', 'history-timeline.js'), 'utf8');
const html = await fs.readFile(path.join(root, 'history.html'), 'utf8');
const sourceArchitecture = {
  oneScrollListener: (source.match(/addEventListener\('scroll'/g) || []).length === 1,
  noTimersOrObservers: !/setTimeout|IntersectionObserver/.test(source),
  noLaggingTargetState: !/targetProgress|renderedProgress|smoothing/.test(source),
  noTimedRevealCss: !/branch-delay|card-reveal-delay|stroke-dashoffset[^}]*transition/.test(html),
};
const assertions = {
  allBreakpoints: breakpointResults.every((item) => item.errors.length === 0 && item.branchCount === item.cardCount && item.wrapperCount === item.cardCount),
  gradients: breakpointResults.every((item) => item.yearAnglesMatch && item.historicalGradientColorsValid && item.upcomingPreserved),
  direct2019Branches: breakpointResults.every((item) => item.direct2019Branches && item.five2019Branches),
  slowProgressive,
  fastImmediate: fastStop.lineError < 2,
  reverseWorks,
  noCatchUpAfterStop: stopState.unchanged,
  noCardScrollListeners: breakpointResults.every((item) => item.scrollListenersPerCard),
  reducedMotion: reducedMotionState.revealTransform === 'none' && Number.parseFloat(reducedMotionState.branchTransition) <= 0.001,
  sourceArchitecture: Object.values(sourceArchitecture).every(Boolean),
};
const report = { generatedAt: new Date().toISOString(), assertions, sourceArchitecture, reducedMotionState, expectedAngles, beforeSlow, slowSamples, fastStop, reverseBefore, reverseAfter, stopState, breakpointResults, recordingBytes: (await fs.stat(finalVideo)).size };
await fs.writeFile(path.join(qa, 'history-scroll-sync-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ assertions, breakpoints: breakpointResults.length, recordingBytes: report.recordingBytes }, null, 2));
if (!Object.values(assertions).every(Boolean)) process.exitCode = 1;
