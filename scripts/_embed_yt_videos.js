'use strict';
/* Embed Lake Group YouTube videos into company pages.
 * Videos from https://www.youtube.com/@lakegroup6790
 *
 * Mapping (video id -> page):
 *   nrnAJL_2FD4 Lake Oil Mozambique  -> lake-oil.html
 *   E6O14yN25CQ Lake Steel Video      -> lake-steel.html
 *   KS_IdCfeDHk Lake Gas              -> lake-gas.html
 *   9e9Nd7UtbFc Lake Gas              -> lake-gas.html (2-up)
 *   b191H5fexbM LAKE BLOW MOLDING     -> lake-pipes.html
 *   LjmQvb-jQJk Lake Lubes            -> lake-lubes.html
 *   WxsF6OYU4hA Lake Group Mozambique -> africa-network.html
 *   Zy3N7l7Uiek Lake Group Profile    -> about.html
 *   MiUFvZIDGhU Jerusalema Dance      -> careers.html
 */
const fs = require('fs');

const COMPANY_VIDEOS = [
  {
    page: 'lake-oil.html',
    videoId: 'nrnAJL_2FD4',
    title: 'Lake Oil Mozambique',
    head: 'Watch Lake Oil in Action',
    eyebrow: 'In Action',
  },
  {
    page: 'lake-steel.html',
    videoId: 'E6O14yN25CQ',
    title: 'Lake Steel Video',
    head: 'Watch Lake Steel in Action',
    eyebrow: 'In Action',
  },
  {
    page: 'lake-gas.html',
    videos: [
      { videoId: 'KS_IdCfeDHk', title: 'Lake Gas' },
      { videoId: '9e9Nd7UtbFc', title: 'Lake Gas' },
    ],
    head: 'Watch Lake Gas in Action',
    eyebrow: 'In Action',
  },
  {
    page: 'lake-lubes.html',
    videoId: 'LjmQvb-jQJk',
    title: 'Lake Lubes',
    head: 'Watch Lake Lubes in Action',
    eyebrow: 'In Action',
  },
  {
    page: 'lake-pipes.html',
    videoId: 'b191H5fexbM',
    title: 'LAKE BLOW MOLDING',
    head: 'Watch Lake Pipes in Action',
    eyebrow: 'In Action',
  },
];

function iframe(id, title, multi) {
  return (
    '      <div class="fs-video' + (multi ? '' : '') + '">\n' +
    '        <iframe src="https://www.youtube-nocookie.com/embed/' + id +
    '" title="' + title + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>\n' +
    '      </div>'
  );
}

function videoSection(cfg, markerNo) {
  let media;
  if (cfg.videos) {
    media = '    <div class="fs-videos">\n' + cfg.videos.map((v) => iframe(v.videoId, v.title, true)).join('\n') + '\n    </div>';
  } else {
    media = '    ' + iframe(cfg.videoId, cfg.title, false);
  }
  return (
    '<section class="fs-section">\n' +
    '  <div class="container">\n' +
    '    <div class="fs-marker"><span class="fs-marker-no">' + markerNo + '</span><span class="fs-eyebrow">' + cfg.eyebrow + '</span></div>\n' +
    '    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">' + cfg.head + '</h2>\n' +
    media + '\n' +
    '  </div>\n' +
    '</section>'
  );
}

/* ---- 1. Company pages: insert Watch section (05) before Gallery, renumber Gallery 07 -> 06 ---- */
for (const cfg of COMPANY_VIDEOS) {
  const f = cfg.page;
  let h = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  if (h.includes('youtube-nocookie.com/embed/' + (cfg.videoId || cfg.videos[0].videoId))) {
    console.log(f + ': already has video, skipping');
    continue;
  }
  const sec = videoSection(cfg, '05');
  const galleryMarker = '<div class="fs-marker"><span class="fs-marker-no">07</span><span class="fs-eyebrow">Images</span></div>';
  const gIdx = h.indexOf(galleryMarker);
  if (gIdx === -1) { console.log(f + ': gallery marker not found!'); continue; }
  // renumber 07 -> 06
  h = h.replace(galleryMarker, '<div class="fs-marker"><span class="fs-marker-no">06</span><span class="fs-eyebrow">Images</span></div>');
  // insert before the gallery <section ...> opening tag
  const secOpen = h.lastIndexOf('<section class="fs-section section-light">', gIdx);
  if (secOpen === -1) { console.log(f + ': section-open not found!'); continue; }
  h = h.slice(0, secOpen) + sec + '\n\n' + h.slice(secOpen);
  fs.writeFileSync(f, h.replace(/\n/g, '\r\n'));
  console.log(f + ': video section inserted before Gallery (gallery -> 06)');
}

/* ---- 2. africa-network.html: Mozambique video after the map section ---- */
{
  const f = 'africa-network.html';
  let h = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  if (!h.includes('WxsF6OYU4hA')) {
    const sec =
      '<section class="section section-light">\n' +
      '  <div class="container">\n' +
      '    <div class="text-center" style="margin-bottom:40px">\n' +
      '      <div class="section-label" style="justify-content:center">In Action</div>\n' +
      '      <h2 class="section-title">Watch Our Mozambique Operations</h2>\n' +
      '      <p class="section-subtitle" style="margin:12px auto 0;max-width:56ch">From haulage and fuel distribution to the communities we serve, see Lake Group working across the region.</p>\n' +
      '    </div>\n' +
      '    ' + iframe('WxsF6OYU4hA', 'Lake Group Mozambique', false) + '\n' +
      '  </div>\n' +
      '</section>';
    // insert right before the Values section
    const anchor = '<section class="section section-light">\n  <div class="container">\n    <div class="text-center" style="margin-bottom:40px">\n      <div data-i18n="africa_network.102"';
    const at = h.indexOf(anchor);
    if (at > -1) {
      h = h.slice(0, at) + sec + '\n\n' + h.slice(at);
      fs.writeFileSync(f, h.replace(/\n/g, '\r\n'));
      console.log(f + ': Mozambique video section inserted before Values');
    } else {
      console.log(f + ': Values anchor not found');
    }
  } else {
    console.log(f + ': already has video');
  }
}

/* ---- 3. about.html: Group Profile video after the story section ---- */
{
  const f = 'about.html';
  let h = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  if (!h.includes('Zy3N7l7Uiek')) {
    const sec =
      '<section class="fs-section">\n' +
      '  <div class="container">\n' +
      '    <div class="fs-marker"><span class="fs-marker-no">04</span><span class="fs-eyebrow">In Action</span></div>\n' +
      '    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">The Lake Group Story on Film</h2>\n' +
      '    ' + iframe('Zy3N7l7Uiek', 'Lake Group Profile', false) + '\n' +
      '  </div>\n' +
      '</section>';
    const anchor = '<footer class="site-footer" role="contentinfo">';
    const at = h.indexOf(anchor);
    if (at > -1) {
      h = h.slice(0, at) + sec + '\n\n' + h.slice(at);
      fs.writeFileSync(f, h.replace(/\n/g, '\r\n'));
      console.log(f + ': Group Profile video inserted before About section');
    } else {
      console.log(f + ': About anchor not found');
    }
  } else {
    console.log(f + ': already has video');
  }
}

/* ---- 4. careers.html: culture video before the Apply section ---- */
{
  const f = 'careers.html';
  let h = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  if (!h.includes('MiUFvZIDGhU')) {
    const sec =
      '<section class="section section-light">\n' +
      '  <div class="container">\n' +
      '    <div class="text-center" style="margin-bottom:40px">\n' +
      '      <div class="section-label" style="justify-content:center">Life at Lake Group</div>\n' +
      '      <h2 class="section-title">One Team, One Rhythm</h2>\n' +
      '      <p class="section-subtitle" style="margin:12px auto 0;max-width:56ch">30,000+ colleagues across 9 countries — and we know how to celebrate together.</p>\n' +
      '    </div>\n' +
      '    ' + iframe('MiUFvZIDGhU', 'Lake Group Best Jerusalema Dance Challenge', false) + '\n' +
      '  </div>\n' +
      '</section>';
    const anchor = '<section id="apply" class="section section-light">';
    const at = h.indexOf(anchor);
    if (at > -1) {
      h = h.slice(0, at) + sec + '\n\n' + h.slice(at);
      fs.writeFileSync(f, h.replace(/\n/g, '\r\n'));
      console.log(f + ': culture video inserted before Apply section');
    } else {
      console.log(f + ': Apply anchor not found');
    }
  } else {
    console.log(f + ': already has video');
  }
}

console.log('done');
