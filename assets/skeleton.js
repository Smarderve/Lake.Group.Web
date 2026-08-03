/* Lake Group — sitewide skeleton loader (pair with assets/skeleton.css) */
(function () {
  'use strict';

  if (window.__lgSkelInit) return;
  window.__lgSkelInit = true;

  var html = document.documentElement;
  if (html.classList.contains('lg-skel-done')) return;

  html.classList.add('lg-loading');

  var MAX_MS = 8000;
  var FADE_MS = 380;
  var hidden = false;

  function pagePath() {
    return (location.pathname || '').replace(/\\/g, '/').toLowerCase();
  }

  function pageFile() {
    return (pagePath().split('/').pop() || 'index.html').split('?')[0];
  }

  function isHome() {
    var path = pagePath();
    return /(?:^|\/)(index\.html)?$/.test(path) || path === '/' || path.endsWith('/lake.group.web/');
  }

  function isGallery() {
    return /gallery\.html$/.test(pagePath());
  }

  function isNews() {
    return /news\.html$/.test(pagePath());
  }

  function isLeadership() {
    return /leadership\.html$/.test(pagePath());
  }

  function isLeadershipProfile() {
    return /leadership-[\w-]+\.html$/.test(pagePath());
  }

  function isContact() {
    return /contact\.html$/.test(pagePath());
  }

  function isHistory() {
    return /history\.html$/.test(pagePath());
  }

  function isOperations() {
    return /africa-network\.html$/.test(pagePath());
  }

  function isCompanyPage() {
    return /(lake-oil|lake-gas|lake-steel|lake-lubes|lake-trans|lake-agro|lake-aviation|lake-buildings|lake-plastics|lake-cylinders|lake-premix-cement|aficd|aill|atl|gulf-aggregates|cross-country|ocean-galleria)\.html$/.test(pagePath());
  }

  function isInvestors() {
    return /investors\.html$/.test(pagePath());
  }

  function isStationLocator() {
    return /station-locator\.html$/.test(pagePath());
  }

  function isSustainability() {
    return /sustainability\.html$/.test(pagePath());
  }

  function isAbout() {
    return /about\.html$/.test(pagePath());
  }

  function isProjects() {
    return /projects\.html$/.test(pagePath());
  }

  function isCareers() {
    return /careers\.html$/.test(pagePath());
  }

  function isMediaCenter() {
    return /media-center\.html$/.test(pagePath());
  }

  function isNewsArticle() {
    return /news-article\.html$/.test(pagePath());
  }

  function footCol() {
    return (
      '<div class="lg-skel-foot-col">' +
      '<div class="lg-skel-foot-line lg-skel-shimmer"></div>' +
      '<div class="lg-skel-foot-line sm lg-skel-shimmer"></div>' +
      '<div class="lg-skel-foot-line sm lg-skel-shimmer"></div>' +
      '</div>'
    );
  }

  function coverflowBlock() {
    return (
      '<div class="lg-skel-coverflow" aria-hidden="true">' +
      '<div class="lg-skel-cf-tile lg-skel-shimmer"></div>' +
      '<div class="lg-skel-cf-tile lg-skel-shimmer"></div>' +
      '<div class="lg-skel-cf-tile lg-skel-shimmer"></div>' +
      '<div class="lg-skel-cf-tile lg-skel-shimmer"></div>' +
      '<div class="lg-skel-cf-tile lg-skel-shimmer"></div>' +
      '</div>'
    );
  }

  function galleryBlock() {
    var cells = '';
    for (var i = 0; i < 12; i++) {
      cells += '<div class="lg-skel-g-cell lg-skel-shimmer"></div>';
    }
    return (
      '<div class="lg-skel-gallery">' +
      '<div class="lg-skel-g-eyebrow lg-skel-shimmer"></div>' +
      '<div class="lg-skel-g-title lg-skel-shimmer"></div>' +
      '<div class="lg-skel-g-lede lg-skel-shimmer"></div>' +
      '<div class="lg-skel-g-tabs">' +
      '<div class="lg-skel-g-tab lg-skel-shimmer"></div>'.repeat(6) +
      '</div>' +
      '<div class="lg-skel-g-grid">' + cells + '</div>' +
      '</div>'
    );
  }

  /* ---------- Page-specific skeleton generators ---------- */

  /** Compact page-hero skeleton (shared by all sub-pages) */
  function compactHero() {
    return (
      '<div class="lg-skel-hero lg-skel-hero--compact">' +
      '<div class="lg-skel-breadcrumb lg-skel-shimmer"></div>' +
      '<div class="lg-skel-line lg-skel-eyebrow lg-skel-shimmer"></div>' +
      '<div class="lg-skel-line lg-skel-title-sm lg-skel-shimmer" style="width:min(320px,60%)"></div>' +
      '<div class="lg-skel-line lg-skel-lede lg-skel-shimmer" style="width:min(400px,55%)"></div>' +
      '</div>'
    );
  }

  /** News page: compact hero + featured card + sidebar + card grid */
  function newsBlock() {
    return (
      '<div class="lg-skel-main lg-skel-main--subpage">' +
      compactHero() +
      '<div class="lg-skel-news-hub">' +
      '<div class="lg-skel-news-top">' +
      /* Featured card */
      '<div class="lg-skel-news-featured">' +
        '<div class="lg-skel-news-feat-body">' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:80px;height:14px"></div>' +
          '<div class="lg-skel-line lg-skel-shimmer lg-skel-title-sm" style="width:min(280px,80%);margin:8px 0"></div>' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:100%;height:10px"></div>' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:80%;height:10px;margin-top:4px"></div>' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:90px;height:12px;margin-top:8px"></div>' +
        '</div>' +
        '<div class="lg-skel-news-feat-media lg-skel-shimmer"></div>' +
      '</div>' +
      /* Sidebar */
      '<div class="lg-skel-news-sidebar">' +
        '<div class="lg-skel-news-events">' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:120px;height:10px;margin-bottom:10px"></div>' +
          '<div class="lg-skel-ev-row lg-skel-shimmer"></div>' +
          '<div class="lg-skel-ev-row lg-skel-shimmer"></div>' +
          '<div class="lg-skel-ev-row lg-skel-shimmer"></div>' +
          '<div class="lg-skel-ev-row lg-skel-shimmer"></div>' +
          '<div class="lg-skel-ev-row lg-skel-shimmer"></div>' +
        '</div>' +
        '<div class="lg-skel-news-topics">' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:80px;height:10px;margin-bottom:8px"></div>' +
          '<div class="lg-skel-topic-row lg-skel-shimmer"></div>' +
          '<div class="lg-skel-topic-row lg-skel-shimmer"></div>' +
          '<div class="lg-skel-topic-row lg-skel-shimmer"></div>' +
        '</div>' +
        '<div class="lg-skel-news-media">' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:130px;height:10px;margin-bottom:8px"></div>' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:100%;height:8px"></div>' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:90px;height:10px;margin-top:10px"></div>' +
        '</div>' +
      '</div>' +
      '</div>' +
      /* Card grid */
      '<div class="lg-skel-news-grid">' +
      '<div class="lg-skel-news-card lg-skel-shimmer"></div>'.repeat(6) +
      '</div>' +
      '</div></div>'
    );
  }

  /** Company page: compact hero + stat tiles + content blocks */
  function companyBlock() {
    return (
      '<div class="lg-skel-main lg-skel-main--subpage">' +
      compactHero() +
      '<div class="lg-skel-company-content">' +
      /* Stat tiles row */
      '<div class="lg-skel-stats-row">' +
        '<div class="lg-skel-stat-tile lg-skel-shimmer"></div>' +
        '<div class="lg-skel-stat-tile lg-skel-shimmer"></div>' +
        '<div class="lg-skel-stat-tile lg-skel-shimmer"></div>' +
        '<div class="lg-skel-stat-tile lg-skel-shimmer"></div>' +
      '</div>' +
      /* About section */
      '<div class="lg-skel-company-about">' +
        '<div class="lg-skel-line lg-skel-shimmer" style="width:140px;height:10px"></div>' +
        '<div class="lg-skel-line lg-skel-shimmer lg-skel-title-sm" style="width:min(400px,70%);margin:10px 0 6px"></div>' +
        '<div class="lg-skel-line lg-skel-shimmer" style="width:100%;height:10px"></div>' +
        '<div class="lg-skel-line lg-skel-shimmer" style="width:95%;height:10px;margin-top:4px"></div>' +
        '<div class="lg-skel-line lg-skel-shimmer" style="width:70%;height:10px;margin-top:4px"></div>' +
      '</div>' +
      /* Services grid */
      '<div class="lg-skel-company-services">' +
        '<div class="lg-skel-svc-card lg-skel-shimmer"></div>'.repeat(3) +
      '</div>' +
      '</div></div>'
    );
  }

  /** Leadership page: compact hero + team grid */
  function leadershipBlock() {
    return (
      '<div class="lg-skel-main lg-skel-main--subpage">' +
      compactHero() +
      '<div class="lg-skel-leadership-content">' +
      '<div class="lg-skel-leader-grid">' +
        '<div class="lg-skel-leader-card lg-skel-shimmer"></div>'.repeat(7) +
      '</div>' +
      '</div></div>'
    );
  }

  /** Contact page: compact hero + form + map + details */
  function contactBlock() {
    return (
      '<div class="lg-skel-main lg-skel-main--subpage">' +
      compactHero() +
      '<div class="lg-skel-contact-content">' +
      '<div class="lg-skel-contact-grid">' +
        '<div class="lg-skel-contact-form">' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:120px;height:10px;margin-bottom:12px"></div>' +
          '<div class="lg-skel-form-field lg-skel-shimmer"></div>' +
          '<div class="lg-skel-form-field lg-skel-shimmer"></div>' +
          '<div class="lg-skel-form-field lg-skel-shimmer lg-skel-form-tall"></div>' +
          '<div class="lg-skel-line lg-skel-shimmer" style="width:120px;height:36px;margin-top:10px"></div>' +
        '</div>' +
        '<div class="lg-skel-contact-details">' +
          '<div class="lg-skel-contact-map lg-skel-shimmer"></div>' +
          '<div class="lg-skel-contact-info">' +
            '<div class="lg-skel-line lg-skel-shimmer" style="width:100%;height:10px"></div>' +
            '<div class="lg-skel-line lg-skel-shimmer" style="width:80%;height:10px;margin-top:6px"></div>' +
            '<div class="lg-skel-line lg-skel-shimmer" style="width:60%;height:10px;margin-top:6px"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '</div></div>'
    );
  }

  /** History page: compact hero + timeline */
  function historyBlock() {
    return (
      '<div class="lg-skel-main lg-skel-main--subpage">' +
      compactHero() +
      '<div class="lg-skel-history-content">' +
      '<div class="lg-skel-timeline">' +
        '<div class="lg-skel-timeline-item lg-skel-shimmer"></div>' +
        '<div class="lg-skel-timeline-item lg-skel-shimmer"></div>' +
        '<div class="lg-skel-timeline-item lg-skel-shimmer"></div>' +
        '<div class="lg-skel-timeline-item lg-skel-shimmer"></div>' +
        '<div class="lg-skel-timeline-item lg-skel-shimmer"></div>' +
      '</div>' +
      '</div></div>'
    );
  }

  /** Operations/Map page: compact hero + map + country cards */
  function operationsBlock() {
    return (
      '<div class="lg-skel-main lg-skel-main--subpage">' +
      compactHero() +
      '<div class="lg-skel-ops-content">' +
      '<div class="lg-skel-ops-map lg-skel-shimmer"></div>' +
      '<div class="lg-skel-ops-countries">' +
        '<div class="lg-skel-ops-country lg-skel-shimmer"></div>'.repeat(4) +
      '</div>' +
      '</div></div>'
    );
  }

  /** Generic sub-page fallback: compact hero + 2-column content */
  function genericSubpageBlock() {
    return (
      '<div class="lg-skel-main lg-skel-main--subpage">' +
      compactHero() +
      '<div class="lg-skel-generic-content">' +
      '<div class="lg-skel-line lg-skel-shimmer" style="width:100%;height:10px"></div>' +
      '<div class="lg-skel-line lg-skel-shimmer" style="width:90%;height:10px;margin-top:6px"></div>' +
      '<div class="lg-skel-line lg-skel-shimmer" style="width:95%;height:10px;margin-top:6px"></div>' +
      '<div class="lg-skel-line lg-skel-shimmer" style="width:75%;height:10px;margin-top:6px"></div>' +
      '<div class="lg-skel-blocks" style="margin-top:32px">' +
      '<div class="lg-skel-card lg-skel-shimmer"></div>'.repeat(3) +
      '</div>' +
      '</div></div>'
    );
  }

  /* ---------- Determine layout ---------- */

  function detectLayout() {
    if (isHome()) return 'home';
    if (isGallery()) return 'gallery';
    if (isNews() || isNewsArticle() || isMediaCenter()) return 'news';
    if (isCompanyPage()) return 'company';
    if (isLeadership() || isLeadershipProfile()) return 'leadership';
    if (isContact()) return 'contact';
    if (isHistory()) return 'history';
    if (isOperations()) return 'operations';
    if (isAbout() || isSustainability() || isInvestors() || isStationLocator() || isProjects() || isCareers()) return 'generic-subpage';
    return 'generic-subpage';
  }

  function buildMainInner(layout) {
    switch (layout) {
      case 'gallery': return '<div class="lg-skel-main lg-skel-main--gallery">' + galleryBlock() + '</div>';
      case 'home':
        return (
          '<div class="lg-skel-main">' +
          '<div class="lg-skel-hero">' +
          '<div class="lg-skel-line lg-skel-eyebrow lg-skel-shimmer"></div>' +
          '<div class="lg-skel-line lg-skel-title lg-skel-shimmer"></div>' +
          '<div class="lg-skel-line lg-skel-title-sm lg-skel-shimmer"></div>' +
          '<div class="lg-skel-line lg-skel-lede lg-skel-shimmer"></div>' +
          '<div class="lg-skel-cta">' +
          '<div class="lg-skel-btn lg-skel-shimmer"></div>' +
          '<div class="lg-skel-btn-ghost lg-skel-shimmer"></div>' +
          '</div></div>' +
          '<div class="lg-skel-home-action">' +
          '<div class="lg-skel-line lg-skel-eyebrow lg-skel-shimmer" style="margin:0 auto 12px"></div>' +
          '<div class="lg-skel-line lg-skel-title-sm lg-skel-shimmer" style="margin:0 auto 18px;width:min(420px,70%)"></div>' +
          coverflowBlock() +
          '</div></div>'
        );
      case 'news': return newsBlock();
      case 'company': return companyBlock();
      case 'leadership': return leadershipBlock();
      case 'contact': return contactBlock();
      case 'history': return historyBlock();
      case 'operations': return operationsBlock();
      default: return genericSubpageBlock();
    }
  }

  /* ---------- Mount & hide ---------- */

  /* ---------- Progress bar ---------- */
  var progressBar = null;
  var progressFill = null;
  var progressValue = 0;
  var progressTarget = 0;
  var progressRaf = null;
  var progressObserver = null;

  function createProgressBar() {
    var bar = document.createElement('div');
    bar.className = 'lg-skel-progress';
    bar.innerHTML = '<div class="lg-skel-progress__fill"></div>';
    bar.setAttribute('aria-hidden', 'true');
    progressBar = bar;
    progressFill = bar.firstChild;
    return bar;
  }

  function animateProgress() {
    if (!progressFill) return;
    /* Ease toward target — smooth rubber-band feel */
    progressValue += (progressTarget - progressValue) * 0.12;
    /* Snap when very close */
    if (progressTarget - progressValue < 0.3) {
      progressValue = progressTarget;
    }
    progressFill.style.width = progressValue + '%';
    if (progressValue < 100) {
      progressRaf = requestAnimationFrame(animateProgress);
    }
  }

  function setProgress(pct) {
    progressTarget = Math.min(pct, 100);
    if (!progressRaf) animateProgress();
  }

  /**
   * Track <img>, <link rel=stylesheet>, <script>, and background-image
   * loads to build a rough progress percentage.
   */
  function trackResources() {
    var resources = [];
    /* Collect visible resources already in the DOM */
    var imgs = document.querySelectorAll('img[src]');
    for (var i = 0; i < imgs.length; i++) {
      resources.push(imgs[i]);
    }
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var j = 0; j < links.length; j++) {
      resources.push(links[j]);
    }
    var scripts = document.querySelectorAll('script[src]');
    for (var k = 0; k < scripts.length; k++) {
      resources.push(scripts[k]);
    }

    /* Add inline CSS background-image elements */
    var allEls = document.querySelectorAll('[style*="background-image"]');
    for (var m = 0; m < allEls.length; m++) {
      resources.push(allEls[m]);
    }

    var total = resources.length;
    if (total === 0) { setProgress(100); return; }

    var loaded = 0;
    function onDone() {
      loaded++;
      setProgress((loaded / total) * 100);
    }

    for (var n = 0; n < total; n++) {
      var r = resources[n];
      if (r.tagName === 'IMG') {
        if (r.complete) { onDone(); continue; }
        r.addEventListener('load', onDone, { once: true });
        r.addEventListener('error', onDone, { once: true });
      } else if (r.tagName === 'LINK') {
        if (r.sheet) { onDone(); continue; }
        r.addEventListener('load', onDone, { once: true });
        r.addEventListener('error', onDone, { once: true });
      } else if (r.tagName === 'SCRIPT') {
        if (r.readyState === 'complete' || r.readyState === 'loaded') {
          onDone(); continue;
        }
        r.addEventListener('load', onDone, { once: true });
        r.addEventListener('error', onDone, { once: true });
      } else {
        /* background-image elements — approximate with 200ms delay */
        setTimeout(onDone, 200);
      }
    }

    /* Also watch for late-injected resources */
    var mo = new MutationObserver(function (mutations) {
      for (var p = 0; p < mutations.length; p++) {
        var added = mutations[p].addedNodes;
        for (var q = 0; q < added.length; q++) {
          var node = added[q];
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'IMG' && node.src) {
            total++;
            if (node.complete) { onDone(); continue; }
            node.addEventListener('load', onDone, { once: true });
            node.addEventListener('error', onDone, { once: true });
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    progressObserver = mo;

    /* Safety: force 100% after MAX_MS */
    setTimeout(function () { setProgress(100); }, MAX_MS);
  }

  function mount() {
    if (document.getElementById('lg-skel')) return;
    var host = document.body;
    if (!host) return;

    var layout = detectLayout();

    var el = document.createElement('div');
    el.id = 'lg-skel';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-layout', layout);

    var mainInner = buildMainInner(layout);

    el.innerHTML =
      '<div class="lg-skel-nav">' +
      '<div class="lg-skel-logo lg-skel-shimmer"></div>' +
      '<div class="lg-skel-nav-links">' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '</div></div>' +
      createProgressBar().outerHTML +
      mainInner +
      '<div class="lg-skel-footer">' +
      '<div class="lg-skel-foot-col">' +
      '<div class="lg-skel-foot-logo lg-skel-shimmer"></div>' +
      '<div class="lg-skel-foot-line lg-skel-shimmer"></div>' +
      '<div class="lg-skel-foot-line sm lg-skel-shimmer"></div>' +
      '</div>' +
      footCol() + footCol() + footCol() +
      '</div>';

    host.insertBefore(el, host.firstChild);

    /* Re-acquire the fill element from the inserted DOM */
    var inserted = document.getElementById('lg-skel');
    progressBar = inserted.querySelector('.lg-skel-progress');
    progressFill = inserted.querySelector('.lg-skel-progress__fill');

    trackResources();
  }

  function hide() {
    if (hidden) return;
    hidden = true;
    /* Clean up progress bar tracking */
    if (progressObserver) { progressObserver.disconnect(); progressObserver = null; }
    if (progressRaf) { cancelAnimationFrame(progressRaf); progressRaf = null; }
    setProgress(100);
    html.classList.remove('lg-loading');
    html.classList.add('lg-skel-done');
    var el = document.getElementById('lg-skel');
    if (!el) return;
    el.classList.add('lg-skel-hide');
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, FADE_MS);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  if (document.readyState === 'complete') {
    window.requestAnimationFrame(hide);
  } else {
    window.addEventListener('load', hide);
  }

  window.setTimeout(hide, MAX_MS);
})();
