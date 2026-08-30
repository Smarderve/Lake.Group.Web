(function () {
  /* Full-bleed ops photo . never the logo-on-white assets used as fake banners. */
  var NEWS_FALLBACK_IMAGE = 'assets/images/news/6/photo_1.jpg';
  var WEAK_BANNER_RE = /LAKE_GROUP_LOGO|\/logos\//i;

  /* --- Pagination state --- */
  var PAGE_SIZE = 9;           /* 1 featured + 8 cards on page 1, then 9 cards/page */
  var currentPage = 1;
  var lastFilteredList = null; /* cached filtered list so pagination doesn't re-filter */
  var LOAD_INCREMENT = 9;
  var VIEW_MODE_KEY = 'lakeNewsViewMode';
  var LM_LOADED_KEY = 'lakeNewsLoaded';
  var LM_SCROLL_KEY = 'lakeNewsScroll';
  var LM_SCROLL_POS_KEY = 'lakeNewsScrollPos';
  var _suppressSync = false;
  var currentMonth = '';
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* --- Duplicate suppression ---
     Track article ids already shown by the curated sections (trending, lead,
     top news, tabs, tech) so no story - and therefore no image - renders twice
     on the page. Curated sections consume from this set; the archive feed is
     left complete on purpose. */
  var featuredUsedIds = {};
  function markFeaturedIds(list) {
    (list || []).forEach(function (a) {
      if (a && a.id != null) featuredUsedIds[String(a.id)] = true;
    });
  }
  function isFeatured(article) {
    return !!(article && article.id != null && featuredUsedIds[String(article.id)]);
  }
  function notFeatured(article) {
    return !isFeatured(article);
  }

  document.addEventListener('load', function (event) {
    var image = event.target;
    if (image && image.matches && image.matches('img[data-news-fallback]')) {
      image.classList.add('is-loaded');
    }
  }, true);

  document.addEventListener('error', function (event) {
    var image = event.target;
    if (!image || !image.matches || !image.matches('img[data-news-fallback]')) return;
    if (image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = '1';
    image.src = image.dataset.newsFallback || NEWS_FALLBACK_IMAGE;
  }, true);

  function getArticleId() {
    var params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id') || params.get('newsid') || '0', 10);
  }

  function excerpt(article) {
    if (article.description && article.description.length) {
      return article.description[0];
    }
    if (article.images && article.images.length) {
      return 'View photos from this Lake Group event and announcement.';
    }
    if (article.video) {
      return 'Watch the Lake Gas feature video from this announcement.';
    }
    return 'Read the full story from Lake Group news and events.';
  }

  function shortExcerpt(article, maxLen) {
    var text = excerpt(article);
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).replace(/\s+\S*$/, '') + "\u2026";
  }

  function articleUrl(id) {
    return 'news-article.html?id=' + id;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isWeakBanner(src) {
    return !src || WEAK_BANNER_RE.test(String(src));
  }

  function getThumbnail(imageSrc) {
    if (!imageSrc || !window.NEWS_THUMBNAILS) return '';
    var clean = imageSrc.replace(/\?.*$/, '').replace(/\\/g, '/');
    return window.NEWS_THUMBNAILS[clean] || '';
  }

  function resolveArticleImage(article) {
    if (!article) return NEWS_FALLBACK_IMAGE;
    var candidates = [];
    if (article.bannerImage) candidates.push(article.bannerImage);
    if (article.images && article.images.length) {
      for (var i = 0; i < article.images.length; i++) {
        candidates.push(article.images[i]);
      }
    }
    for (var j = 0; j < candidates.length; j++) {
      if (!isWeakBanner(candidates[j])) return candidates[j];
    }
    return NEWS_FALLBACK_IMAGE;
  }

  function mediaImgTag(src, alt, loading, thumbDataUri) {
    var safeSrc = escapeHtml(src || NEWS_FALLBACK_IMAGE);
    var safeAlt = escapeHtml(alt || '');
    var load = loading || 'lazy';
    var thumbAttr = thumbDataUri ? ' data-thumbnail="' + escapeHtml(thumbDataUri) + '"' : '';
    return (
      '<img src="' + safeSrc + '" alt="' + safeAlt + '"' +
      ' loading="' + load + '" decoding="async"' +
      thumbAttr +
      ' data-news-fallback="' + escapeHtml(NEWS_FALLBACK_IMAGE) + '">'
    );
  }

  function youtubeEmbed(url) {
    var match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (!match) return '';
    return 'https://www.youtube.com/embed/' + match[1];
  }

  var COUNTRY_KEYWORDS = {
    Tanzania: ['tanzania', 'dar es salaam', 'dodoma'],
    Kenya: ['kenya', 'nairobi'],
    Zambia: ['zambia', 'lusaka'],
    DRC: ['drc', 'congo', 'kinshasa'],
    Rwanda: ['rwanda', 'kigali'],
    Burundi: ['burundi', 'bujumbura'],
    Mozambique: ['mozambique', 'beira', 'maputo'],
    Ethiopia: ['ethiopia', 'addis']
  };

  var COUNTRY_FLAGS = {
    Tanzania: '🇹🇿',
    Kenya: '🇰🇪',
    Zambia: '🇿🇲',
    DRC: '🇨🇩',
    Rwanda: '🇷🇼',
    Burundi: '🇧🇮',
    Mozambique: '🇲🇿',
    Ethiopia: '🇪🇹'
  };

  /* City keyword → display name mapping, in order of specificity (longer first) */
  var CITY_KEYWORDS = [
    { match: 'dar es salaam', name: 'Dar es Salaam' },
    { match: 'addis ababa', name: 'Addis Ababa' },
    { match: 'addis', name: 'Addis Ababa' },
    { match: 'dodoma', name: 'Dodoma' },
    { match: 'nairobi', name: 'Nairobi' },
    { match: 'lusaka', name: 'Lusaka' },
    { match: 'kinshasa', name: 'Kinshasa' },
    { match: 'kigali', name: 'Kigali' },
    { match: 'bujumbura', name: 'Bujumbura' },
    { match: 'beira', name: 'Beira' },
    { match: 'maputo', name: 'Maputo' },
    { match: 'kibaha', name: 'Kibaha' },
    { match: 'vipingo', name: 'Vipingo' },
    { match: 'tanga', name: 'Tanga' },
    { match: 'mombasa', name: 'Mombasa' },
    { match: 'kampala', name: 'Kampala' }
  ];

  function articleCities(article) {
    var hay = (article.title + ' ' + excerpt(article) + ' ' + article.category).toLowerCase();
    var found = [];
    var seen = {};
    for (var i = 0; i < CITY_KEYWORDS.length; i++) {
      var entry = CITY_KEYWORDS[i];
      if (hay.indexOf(entry.match) !== -1 && !seen[entry.name]) {
        seen[entry.name] = true;
        found.push(entry.name);
      }
    }
    return found;
  }

  function renderCountryFlags(article, showLabels) {
    var countries = articleCountries(article);
    if (!countries.length) return '';
    var MAX_VISIBLE = 3;
    var visible = countries.slice(0, MAX_VISIBLE);
    var extra = countries.length - MAX_VISIBLE;
    var allCountriesAttr = escapeHtml(countries.join(','));
    var html = '<span class="news-flags' + (showLabels ? ' news-flags--labeled' : '') + '" aria-label="Countries: ' + escapeHtml(countries.join(', ')) + '" data-all-countries="' + allCountriesAttr + '">';
    for (var i = 0; i < visible.length; i++) {
      var flag = COUNTRY_FLAGS[visible[i]] || '';
      var name = escapeHtml(visible[i]);
      html += '<span class="news-flag" data-country="' + name + '" title="' + name + '">';
      html += '<span class="news-flag__emoji" aria-hidden="true">' + flag + '</span>';
      if (showLabels) {
        html += '<span class="news-flag__label">' + name + '</span>';
      }
      html += '</span>';
    }
    if (extra > 0) {
      var hiddenCountries = countries.slice(MAX_VISIBLE);
      html += '<span class="news-flag news-flag--more news-flag--expandable" tabindex="0" role="button" data-expandable="country">';
      html += '<svg class="news-globe-icon" viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><ellipse cx="8" cy="8" rx="2.8" ry="6.5"/><line x1="1.5" y1="8" x2="14.5" y2="8"/></svg>+' + extra;
      html += '<span class="news-more-popup" role="tooltip">';
      for (var hi = 0; hi < hiddenCountries.length; hi++) {
        var hc = hiddenCountries[hi];
        var hf = COUNTRY_FLAGS[hc] || '';
        html += '<span class="news-more-popup__row">' + (hf ? '<span class="news-more-popup__flag">' + hf + '</span>' : '') + '<span class="news-more-popup__name">' + escapeHtml(hc) + '</span></span>';
      }
      html += '</span>';
      html += '</span>';
    }

    /* City labels . show detected cities below the flags */
    var cities = articleCities(article);
    if (cities.length) {
      var MAX_CITIES = 2;
      var cityVisible = cities.slice(0, MAX_CITIES);
      var cityExtra = cities.length - MAX_CITIES;
      var allCitiesAttr = escapeHtml(cities.join(','));
      html += '<span class="news-city" aria-label="Cities: ' + escapeHtml(cities.join(', ')) + '" data-all-cities="' + allCitiesAttr + '">';
      for (var ci = 0; ci < cityVisible.length; ci++) {
        html += '<span class="news-city__name" title="' + escapeHtml(cityVisible[ci]) + '">' +
          '<span class="news-city__pin" aria-hidden="true">\uD83D\uDCCD</span> ' +
          escapeHtml(cityVisible[ci]) +
        '</span>';
      }
      if (cityExtra > 0) {
        var hiddenCities = cities.slice(MAX_CITIES);
        html += '<span class="news-city__more news-city__more--expandable" tabindex="0" role="button" data-expandable="city">';
        html += '<svg class="news-globe-icon" viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><ellipse cx="8" cy="8" rx="2.8" ry="6.5"/><line x1="1.5" y1="8" x2="14.5" y2="8"/></svg>+' + cityExtra;
        html += '<span class="news-more-popup" role="tooltip">';
        for (var hi2 = 0; hi2 < hiddenCities.length; hi2++) {
          html += '<span class="news-more-popup__row"><span class="news-more-popup__pin" aria-hidden="true">\uD83D\uDCCD</span><span class="news-more-popup__name">' + escapeHtml(hiddenCities[hi2]) + '</span></span>';
        }
        html += '</span>';
        html += '</span>';
      }
      html += '</span>';
    }

    return html + '</span>';
  }

  function articleCountries(article) {
    var hay = (article.title + ' ' + excerpt(article) + ' ' + article.category).toLowerCase();
    return Object.keys(COUNTRY_KEYWORDS).filter(function (c) {
      return COUNTRY_KEYWORDS[c].some(function (k) { return hay.indexOf(k) !== -1; });
    });
  }

  /* Share bar for article pages */
  function shareBarArticle(article) {
    var rawUrl = (function() { try { return new URL(articleUrl(article.id), window.location.href).href; } catch(e) { return articleUrl(article.id); } })();
    var encodedUrl = encodeURIComponent(rawUrl);
    var title = encodeURIComponent(article.title);
    var safeUrl = escapeHtml(rawUrl);
    var wa = '<a href="https://wa.me/?text=' + title + '%20' + encodedUrl + '" target="_blank" rel="noopener" class="article-share-btn" title="Share on WhatsApp" aria-label="Share on WhatsApp">WA</a>';
    var cp = '<button type="button" class="article-share-btn article-share-btn--copy" title="Copy link" aria-label="Copy link to clipboard" data-copy-url="' + safeUrl + '">\uD83D\uDD17<span class="article-share-copy-tip">Copied!</span></button>';
    return '<div class="article-share-bar" aria-label="Share this article"><span class="article-share-bar__label">Share</span>' + wa + cp + '</div>';
  }

  function renderFeatured(article) {
    if (!article) return '';
    var title = escapeHtml(article.title);
    var cat = escapeHtml(article.category);
    var date = escapeHtml(article.date);
    var url = articleUrl(article.id);
    var image = resolveArticleImage(article);
    var thumbUri = getThumbnail(image);
    var bgStyle = thumbUri ? ' style="background-image:url(' + thumbUri + ')"' : '';
    var flagsHtml = renderCountryFlags(article, true);
    return (
      '<article class="news-featured" data-category="' + cat + '" data-countries="' + articleCountries(article).join(',') + '">' +
        '<div class="news-featured__body">' +
          '<div class="news-featured__meta">' +
            '<span class="news-pill">' + cat + '</span>' +
            '<span class="news-featured__date">' + date + '</span>' +
            flagsHtml +
          '</div>' +
          '<h2 class="news-featured__title"><a href="' + url + '">' + title + '</a></h2>' +
          '<p class="news-featured__excerpt">' + escapeHtml(shortExcerpt(article, 220)) + '</p>' +
          '<a href="' + url + '" class="news-featured__cta">Read more <span aria-hidden="true">\u2192</span></a>' +
        '</div>' +
        '<a href="' + url + '" class="news-featured__media" aria-hidden="true" tabindex="-1"' + bgStyle + '>' +
          mediaImgTag(image, '', 'eager', thumbUri) +
        '</a>' +
      '</article>'
    );
  }

  /* ==========================================================================
     News feature board: Top News sidebar, Most Viewed/Popular/Commented tabs,
     and Technology section. Renders directly into the new containers added
     in news.html (Top News / Tabs / Technology).
     ========================================================================== */

  /* Map a Lake news category to a CSS modifier class. Drives the small colored
     pill shown on each thumbnail/card. Falls back to a neutral slate. */
  function categoryClass(category) {
    if (!category) return 'news-cat-default';
    var c = String(category).toLowerCase();
    if (c.indexOf('award') !== -1) return 'news-cat-awards';
    if (c.indexOf('expan') !== -1) return 'news-cat-expansion';
    if (c.indexOf('lpg') !== -1 || c.indexOf('gas') !== -1) return 'news-cat-lpg';
    if (c.indexOf('busi') !== -1) return 'news-cat-business';
    if (c.indexOf('logi') !== -1) return 'news-cat-logistics';
    if (c.indexOf('event') !== -1) return 'news-cat-events';
    if (c.indexOf('csr') !== -1 || c.indexOf('sustain') !== -1) return 'news-cat-csr';
    return 'news-cat-default';
  }

  /* Deterministic pseudo-metrics per article. We don't track real views /
     comments for the static dataset, so we derive stable numbers from the
     article id so each tab's ranking stays consistent across renders. */
  function articleMetrics(article) {
    var id = parseInt(article && article.id, 10) || 0;
    var seed = Math.abs(id) || 1;
    var views = 8 + ((seed * 137) % 280);          /* 8..287 */
    var comments = 2 + ((seed * 41) % 30);          /* 2..31  */
    var popularity = views + comments * 5;
    return { views: views, comments: comments, popularity: popularity };
  }

  function compareBy(prop, desc) {
    return function (a, b) {
      var av = a && a[prop] != null ? a[prop] : 0;
      var bv = b && b[prop] != null ? b[prop] : 0;
      return desc ? (bv - av) : (av - bv);
    };
  }

  /* Sort the most-recent first base list (assumed already date-sorted) and
     return a new array with deterministic metrics attached. */
  function withMetrics(list) {
    if (!list) return [];
    return list.map(function (a) {
      var m = articleMetrics(a);
      return Object.assign({}, a, m);
    });
  }

  function formatCount(n) {
    if (n == null) return '';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  /* --- Featured slider (template reference: the recording's main-column
         slideshow). A big photo with a red category badge, overlaid title and
         date/views meta, plus pagination bars below. Auto-advances, pauses on
         hover/focus, respects prefers-reduced-motion. --- */
  var sliderTimer = null;
  var sliderIndex = 0;
  var sliderCount = 0;

  function sliderAdvance(step) {
    if (!sliderCount) return;
    sliderIndex = (sliderIndex + step + sliderCount) % sliderCount;
    sliderShow(sliderIndex);
  }

  function sliderShow(index) {
    sliderIndex = index;
    var slides = document.querySelectorAll('.news-slider__slide');
    var bars = document.querySelectorAll('.news-slider__bar');
    slides.forEach(function (s, i) {
      var active = i === sliderIndex;
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active) {
        var activeImg = s.querySelector('img');
        if (activeImg) activeImg.setAttribute('loading', 'eager');
      }
    });
    bars.forEach(function (b, i) {
      b.classList.toggle('is-active', i === sliderIndex);
      b.setAttribute('aria-selected', i === sliderIndex ? 'true' : 'false');
      b.setAttribute('tabindex', i === sliderIndex ? '0' : '-1');
    });
  }

  function sliderStartAutoplay() {
    sliderStopAutoplay();
    if (sliderCount < 2) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sliderTimer = setInterval(function () { sliderAdvance(1); }, 6000);
  }

  function sliderStopAutoplay() {
    if (sliderTimer) {
      clearInterval(sliderTimer);
      sliderTimer = null;
    }
  }

  function renderSliderItem(article) {
    var title = escapeHtml(article.title);
    var cat = escapeHtml(article.category || 'News');
    var date = escapeHtml(article.date || '');
    var url = articleUrl(article.id);
    var image = resolveArticleImage(article);
    var thumbUri = getThumbnail(image);
    var m = articleMetrics(article);
    var dateIco = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="3.5" width="12" height="11" rx="1"/><line x1="2" y1="6.5" x2="14" y2="6.5"/><line x1="5" y1="2" x2="5" y2="5"/><line x1="11" y1="2" x2="11" y2="5"/></svg>';
    var heartIco = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 13.8 2.9 9.2C1.4 7.9 1.3 5.7 2.7 4.3c1.3-1.3 3.4-1.3 4.7 0l.6.6.6-.6c1.3-1.3 3.4-1.3 4.7 0 1.4 1.4 1.3 3.6-.2 4.9L8 13.8z"/></svg>';
    var imgTag = mediaImgTag(image, title, 'lazy', thumbUri);
    return (
      '<div class="news-slider__slide" role="tabpanel" aria-hidden="true">' +
        '<a class="news-slider__link" href="' + url + '">' +
          imgTag +
          '<span class="news-slider__scrim" aria-hidden="true"></span>' +
          '<span class="news-slider__body">' +
            '<span class="news-slider__cat">' + cat + '</span>' +
            '<span class="news-slider__title">' + title + '</span>' +
            '<span class="news-slider__meta">' +
              '<span class="news-slider__date">' + dateIco + ' ' + date + '</span>' +
              '<span class="news-slider__likes" title="Likes">' + heartIco + ' ' + formatCount(m.views) + '</span>' +
            '</span>' +
          '</span>' +
        '</a>' +
      '</div>'
    );
  }

  function renderSliderBars(count) {
    var host = document.getElementById('news-slider-bars');
    if (!host) return;
    host.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var bar = document.createElement('button');
      bar.type = 'button';
      bar.className = 'news-slider__bar' + (i === 0 ? ' is-active' : '');
      bar.setAttribute('role', 'tab');
      bar.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      bar.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      bar.setAttribute('tabindex', i === 0 ? '0' : '-1');
      bar.addEventListener('click', function (idx) {
        return function () { sliderShow(idx); sliderStartAutoplay(); };
      }(i));
      host.appendChild(bar);
    }
  }

  function renderSliderSection(list) {
    var track = document.getElementById('news-slider-track');
    if (!track) return;
    var section = track.closest('.news-slider');
    if (!list || !list.length) {
      if (section) section.style.display = 'none';
      return;
    }
    /* Newest first; skip anything already featured elsewhere and mark the
       picks so the sections below never repeat them. */
    var slice = list.filter(notFeatured).slice(0, 4);
    if (!slice.length) {
      if (section) section.style.display = 'none';
      return;
    }
    markFeaturedIds(slice);
    track.innerHTML = slice.map(renderSliderItem).join('');
    sliderCount = slice.length;
    sliderIndex = 0;
    renderSliderBars(sliderCount);
    sliderShow(0);
    /* Pause on hover / focus, resume on leave. */
    if (section) {
      section.addEventListener('mouseenter', sliderStopAutoplay);
      section.addEventListener('mouseleave', sliderStartAutoplay);
      section.addEventListener('focusin', sliderStopAutoplay);
      section.addEventListener('focusout', sliderStartAutoplay);
    }
    sliderStartAutoplay();
  }

  /* --- Top News sidebar item --- */
  function renderTopNewsItem(article) {
    var title = escapeHtml(article.title);
    var cat = escapeHtml(article.category || 'News');
    var date = escapeHtml(article.date || '');
    var url = articleUrl(article.id);
    var image = resolveArticleImage(article);
    var thumbUri = getThumbnail(image);
    var bgStyle = thumbUri ? ' style="background-image:url(' + thumbUri + ')"' : '';
    var catClass = categoryClass(article.category);
    var m = articleMetrics(article);
    var dateIco = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="3.5" width="12" height="11" rx="1"/><line x1="2" y1="6.5" x2="14" y2="6.5"/><line x1="5" y1="2" x2="5" y2="5"/><line x1="11" y1="2" x2="11" y2="5"/></svg>';
    var eyeIco = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>';
    return (
      '<li class="news-top-news__item">' +
        '<a class="news-top-news__media' + bgStyle + '" href="' + url + '" aria-hidden="true" tabindex="-1">' +
          '<span class="news-top-news__cat ' + catClass + '">' + cat + '</span>' +
          mediaImgTag(image, title, 'lazy', thumbUri) +
        '</a>' +
        '<div class="news-top-news__body">' +
          '<h3 class="news-top-news__heading"><a href="' + url + '">' + title + '</a></h3>' +
          '<div class="news-top-news__meta">' +
            '<span class="news-top-news__date">' + dateIco + ' ' + date + '</span>' +
            '<span class="sep" aria-hidden="true">|</span>' +
            '<span class="views" title="Views">' + eyeIco + ' ' + formatCount(m.views) + '</span>' +
          '</div>' +
        '</div>' +
      '</li>'
    );
  }

  function renderTopNews(list) {
    var host = document.getElementById('news-top-news-list');
    if (!host) return;
    if (!list || !list.length) {
      host.innerHTML = '';
      return;
    }
    /* Skip the featured lead and anything already used above (trending) so
       the same story + image never appears twice. */
    var slice = list.filter(notFeatured).slice(0, 4);
    markFeaturedIds(slice);
    host.innerHTML = slice.map(renderTopNewsItem).join('');
  }

  /* --- Featured card used in the Most Viewed/Popular/Commented tabs --- */
  function renderFeatureCard(article) {
    var title = escapeHtml(article.title);
    var cat = escapeHtml(article.category || 'News');
    var date = escapeHtml(article.date || '');
    var url = articleUrl(article.id);
    var image = resolveArticleImage(article);
    var thumbUri = getThumbnail(image);
    var bgStyle = thumbUri ? ' style="background-image:url(' + thumbUri + ')"' : '';
    var catClass = categoryClass(article.category);
    var m = articleMetrics(article);
    var dateIco = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="3.5" width="12" height="11" rx="1"/><line x1="2" y1="6.5" x2="14" y2="6.5"/><line x1="5" y1="2" x2="5" y2="5"/><line x1="11" y1="2" x2="11" y2="5"/></svg>';
    var eyeIco = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>';
    var excerptText = escapeHtml(shortExcerpt(article, 130));
    return (
      '<article class="news-feature-card">' +
        '<a class="news-feature-card__media' + bgStyle + '" href="' + url + '" aria-hidden="true" tabindex="-1">' +
          '<span class="news-feature-card__cat ' + catClass + '">' + cat + '</span>' +
          mediaImgTag(image, title, 'lazy', thumbUri) +
        '</a>' +
        '<div class="news-feature-card__body">' +
          '<h3 class="news-feature-card__heading"><a href="' + url + '">' + title + '</a></h3>' +
          '<div class="news-feature-card__meta">' +
            '<span class="news-feature-card__date">' + dateIco + ' ' + date + '</span>' +
            '<span class="sep" aria-hidden="true">|</span>' +
            '<span class="views" title="Views">' + eyeIco + ' ' + formatCount(m.views) + '</span>' +
          '</div>' +
          '<p class="news-feature-card__excerpt"><a href="' + url + '">' + excerptText + '</a></p>' +
        '</div>' +
      '</article>'
    );
  }

  function renderFeaturedTabs(baseList) {
    var panels = {
      viewed: document.getElementById('news-featured-panel-viewed'),
      popular: document.getElementById('news-featured-panel-popular'),
      commented: document.getElementById('news-featured-panel-commented')
    };
    if (!panels.viewed) return;
    var withM = withMetrics(baseList || []);
    if (!withM.length) {
      Object.keys(panels).forEach(function (k) { if (panels[k]) panels[k].innerHTML = ''; });
      return;
    }
    /* Each panel picks its top 3 from stories not already shown, and panels
       are marked sequentially so no story repeats across the three tabs. */
    var topViewed = withM.filter(notFeatured).sort(compareBy('views', true)).slice(0, 3);
    markFeaturedIds(topViewed);
    var topPopular = withM.filter(notFeatured).sort(compareBy('popularity', true)).slice(0, 3);
    markFeaturedIds(topPopular);
    var topCommented = withM.filter(notFeatured).sort(compareBy('comments', true)).slice(0, 3);
    markFeaturedIds(topCommented);
    if (panels.viewed) panels.viewed.innerHTML = '<div class="news-featured-tabs__grid">' + topViewed.map(renderFeatureCard).join('') + '</div>';
    if (panels.popular) panels.popular.innerHTML = '<div class="news-featured-tabs__grid">' + topPopular.map(renderFeatureCard).join('') + '</div>';
    if (panels.commented) panels.commented.innerHTML = '<div class="news-featured-tabs__grid">' + topCommented.map(renderFeatureCard).join('') + '</div>';
  }

  /* --- Technology section: curated 3-up row. Prefer Business/Expansion/LPG
       categories; fall back to the next-most-recent items if not enough.
       Excludes stories already featured so the section stays fresh. --- */
  function pickTechArticles(list) {
    if (!list || !list.length) return [];
    var techy = list.filter(function (a) {
      if (isFeatured(a)) return false;
      var c = String(a.category || '').toLowerCase();
      return c === 'business' || c === 'expansion' || c === 'lpg' || c === 'logistics';
    });
    var source = techy.length >= 3 ? techy : list.filter(notFeatured);
    return source.slice(0, 3);
  }

  function renderTechSection(list) {
    var host = document.getElementById('news-tech-grid');
    if (!host) return;
    var picked = pickTechArticles(list);
    if (!picked.length) {
      host.innerHTML = '<p class="news-tech-section__empty">No technology stories available.</p>';
      return;
    }
    markFeaturedIds(picked);
    host.innerHTML = picked.map(renderFeatureCard).join('');
  }

  /* Master renderer. Called from initNewsPage with the base (newest-first)
     news list. Trending is marked first (it renders above the edition grid),
     then the lead story, then the remaining curated sections. */
  function renderFeatureBoard(baseList) {
    if (!baseList || !baseList.length) return;
    markFeaturedIds([baseList[0]]); /* featured lead */
    renderTopNews(baseList);
    renderFeaturedTabs(baseList);
    renderTechSection(baseList);
  }

  /* ==========================================================================
     TRENDING tile grid
     ========================================================================== */

  /* TRENDING picks the 8 articles with the highest view counts (deterministic
     from id when real metrics aren't tracked). The tiles render in a
     4-col grid; duplicate cards across rows are fine since this is a
     curated strip, not the full feed. */
  function pickTrendingArticles(list) {
    if (!list || !list.length) return [];
    return withMetrics(list).sort(compareBy('views', true)).slice(0, 8);
  }

  function renderTrendingTile(article) {
    var title = escapeHtml(article.title);
    var cat = escapeHtml(article.category || 'News');
    var date = escapeHtml(article.date || '');
    var url = articleUrl(article.id);
    var image = resolveArticleImage(article);
    var thumbUri = getThumbnail(image);
    var bgStyle = thumbUri ? ' style="background-image:url(' + thumbUri + ')"' : '';
    var catClass = categoryClass(article.category);
    var m = articleMetrics(article);
    var dateIco = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="3.5" width="12" height="11" rx="1"/><line x1="2" y1="6.5" x2="14" y2="6.5"/><line x1="5" y1="2" x2="5" y2="5"/><line x1="11" y1="2" x2="11" y2="5"/></svg>';
    var eyeIco = '<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>';
    return (
      '<article class="news-trending-tile">' +
        '<a class="news-trending-tile__media' + bgStyle + '" href="' + url + '" aria-hidden="true" tabindex="-1">' +
          '<span class="news-trending-tile__cat ' + catClass + '">' + cat + '</span>' +
          mediaImgTag(image, title, 'lazy', thumbUri) +
        '</a>' +
        '<div class="news-trending-tile__body">' +
          '<h3 class="news-trending-tile__heading"><a href="' + url + '">' + title + '</a></h3>' +
          '<div class="news-trending-tile__meta">' +
            '<span>' + dateIco + ' ' + date + '</span>' +
            '<span class="sep" aria-hidden="true">|</span>' +
            '<span title="Views">' + eyeIco + ' ' + formatCount(m.views) + '</span>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderTrendingSection(list) {
    var host = document.getElementById('news-trending-grid');
    if (!host) return;
    var picked = pickTrendingArticles(list);
    if (!picked.length) {
      host.innerHTML = '<p class="news-trending__empty">No trending stories available.</p>';
      return;
    }
    markFeaturedIds(picked);
    host.innerHTML = picked.map(renderTrendingTile).join('');
  }

  /* Wire up the tab buttons (Most Viewed / Most Popular / Most Commented) */
  function initFeatureTabs() {
    var tablist = document.querySelector('.news-featured-tabs__tabs');
    if (!tablist) return;
    var tabs = tablist.querySelectorAll('.news-featured-tab');
    if (!tabs.length) return;

    function activate(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panelId = t.getAttribute('aria-controls');
        if (panelId) {
          var panel = document.getElementById(panelId);
          if (panel) {
            panel.classList.toggle('is-active', on);
            if (on) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
          }
        }
      });
    }

    tablist.addEventListener('click', function (e) {
      var tab = e.target.closest('.news-featured-tab');
      if (!tab) return;
      activate(tab);
    });
    tablist.addEventListener('keydown', function (e) {
      var current = document.activeElement && document.activeElement.closest('.news-featured-tab');
      if (!current) return;
      var all = Array.prototype.slice.call(tabs);
      var idx = all.indexOf(current);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        var next = all[(idx + 1) % all.length];
        next.focus(); activate(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = all[(idx - 1 + all.length) % all.length];
        prev.focus(); activate(prev);
      } else if (e.key === 'Home') {
        e.preventDefault(); all[0].focus(); activate(all[0]);
      } else if (e.key === 'End') {
        e.preventDefault(); all[all.length - 1].focus(); activate(all[all.length - 1]);
      }
    });
  }

  function yearHeaderHtml(year) {
    if (!year) return '';
    return '<div class="news-year-header" role="heading" aria-level="2"><span class="news-year-header__label">' + escapeHtml(year) + '</span></div>';
  }

  /* Group an already-sorted (newest first) article slice into year sections.
     `prevYear` lets a later batch know the year of the last already-rendered
     article so it only emits a header when the year actually changes. */
  function renderCardsByYear(articles, prevYear) {
    if (!articles || !articles.length) return '';
    var html = '';
    var year = prevYear || '';
    for (var i = 0; i < articles.length; i++) {
      var y = extractYear(articles[i].date);
      if (y && y !== year) {
        html += yearHeaderHtml(y);
        year = y;
      }
      html += renderCard(articles[i]);
    }
    return html;
  }

  function renderCard(article) {
    var title = escapeHtml(article.title);
    var cat = escapeHtml(article.category);
    var date = escapeHtml(article.date);
    var url = articleUrl(article.id);
    var image = resolveArticleImage(article);
    var thumbUri = getThumbnail(image);
    var bgStyle = thumbUri ? ' style="background-image:url(' + thumbUri + ')"' : '';
    var flagsHtml = renderCountryFlags(article);
    return (
      '<article class="news-card" data-category="' + cat + '" data-countries="' + articleCountries(article).join(',') + '">' +
        '<a href="' + url + '" class="news-card__media"' + bgStyle + '>' +
          mediaImgTag(image, title, 'lazy', thumbUri) +
        '</a>' +
        '<div class="news-card__body">' +
          '<div class="news-card__meta">' +
            '<span class="news-pill news-pill--muted">' + cat + '</span>' +
            '<span class="news-card__date">' + date + '</span>' +
            flagsHtml +
          '</div>' +
          '<h3 class="news-card__title"><a href="' + url + '">' + title + '</a></h3>' +
          '<p class="news-card__excerpt">' + escapeHtml(shortExcerpt(article, 110)) + '</p>' +
          '<div class="news-card__foot">' +
            '<a href="' + url + '" class="news-card__more">Read more</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderRelated(articles) {
    var host = document.getElementById('news-related');
    var grid = document.getElementById('news-related-grid');
    if (!host || !grid) return;
    if (!articles || articles.length < 2) {
      host.hidden = true;
      grid.innerHTML = '';
      return;
    }
    var slice = articles.slice(0, 3);
    host.hidden = false;
    grid.innerHTML = slice.map(renderCard).join('');
  }

  /* --- Prefetch next page images on hover --- */
  function prefetchPage(pageNum) {
    var list = lastFilteredList || window.LAKE_NEWS;
    if (!list) return;
    var startIdx = (pageNum - 1) * PAGE_SIZE;
    var pageItems = list.slice(startIdx, startIdx + PAGE_SIZE);
    pageItems.forEach(function (a) {
      var src = resolveArticleImage(a);
      if (src && !isWeakBanner(src)) {
        var img = new Image();
        img.src = src;
      }
    });
  }


  function renderCurrentPage() {
    var list = lastFilteredList || window.LAKE_NEWS;
    if (!list) return;
    var container = document.getElementById('news-list');
    if (!container) return;

    var startIdx = (currentPage - 1) * PAGE_SIZE;
    var pageItems = list.slice(startIdx, startIdx + PAGE_SIZE);

    var featuredHost = document.getElementById('news-featured');
    var featured = (currentPage === 1 && pageItems.length > 0) ? pageItems[0] : null;
    var rest = featured ? pageItems.slice(1) : pageItems;

    if (featuredHost) {
      featuredHost.innerHTML = featured ? renderFeatured(featured) : '';
      featuredHost.hidden = !featured;
    }

    if (!rest.length) {
      container.innerHTML = featured
        ? '<p class="news-empty news-empty--soft">More stories will appear here as they are published.</p>'
        : '<p class="news-empty">No articles match your filters.</p>';
    } else {
      container.innerHTML = renderCardsByYear(rest);
    }

    /* Related: only on page 1. Pick from the full list, excluding every
       story already on screen (curated sections + current page) so the
       section never repeats a card from the feed above it. */
    if (currentPage === 1) {
      var onPage = {};
      pageItems.forEach(function (a) { if (a && a.id != null) onPage[String(a.id)] = true; });
      var relatedPool = (lastFilteredList || window.LAKE_NEWS || []).filter(function (a) {
        return a && a.id != null && !onPage[String(a.id)] && notFeatured(a);
      }).slice(0, 3);
      renderRelated(relatedPool);
    } else {
      renderRelated([]);
    }

    renderLoadMoreButton();

    updateResultCount(list.length);
    renderActiveFilterTags();

    if (window.LakeSite && window.LakeSite.refreshMotion) {
      window.LakeSite.refreshMotion();
    } else if (window.LakeSite && window.LakeSite.initReveal) {
      window.LakeSite.initReveal();
    }
  }

  /* --- Skeleton card placeholders for slow connections --- */
  function renderSkeletonCards(batch) {
    /* batch is an array of article objects whose images will appear in these slots */
    var html = '';
    for (var i = 0; i < batch.length; i++) {
      var image = resolveArticleImage(batch[i]);
      var thumbUri = getThumbnail(image);
      var bgStyle = thumbUri ? ' style="background-image:url(' + thumbUri + ')"' : '';
      html += '<article class="news-card news-card--skeleton" aria-hidden="true">' +
        '<div class="news-card__media"' + bgStyle + '><div class="skeleton-shimmer"></div></div>' +
        '<div class="news-card__body">' +
          '<div class="skeleton-line skeleton-line--meta"></div>' +
          '<div class="skeleton-line skeleton-line--title"></div>' +
          '<div class="skeleton-line skeleton-line--title skeleton-line--short"></div>' +
          '<div class="skeleton-line skeleton-line--excerpt"></div>' +
          '<div class="skeleton-line skeleton-line--excerpt skeleton-line--short"></div>' +
        '</div>' +
      '</article>';
    }
    return html;
  }

  /* --- Load More button --- */
  function renderLoadMoreButton() {
    var host = document.getElementById('news-loadmore');
    if (!host) return;
    var list = lastFilteredList || window.LAKE_NEWS;
    if (!list) { host.hidden = true; return; }
    /* Only show load-more when there are items beyond current page and user is on page 1 */
    if (currentPage !== 1 || list.length <= PAGE_SIZE) {
      host.hidden = true;
      return;
    }
    var totalShown = currentPage * PAGE_SIZE;
    var remaining = list.length - totalShown;
    if (remaining <= 0) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    var btn = host.querySelector('.news-loadmore-btn');
    if (!btn) return;
    btn.innerHTML = 'Load More <span class="news-loadmore-remaining">(' + remaining + ' remaining)</span>';
    btn.disabled = false;
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', function () {
      newBtn.disabled = true;
      var totalShownNow = currentPage * PAGE_SIZE;
      var endIdx = Math.min(totalShownNow + LOAD_INCREMENT, list.length);
      var toRemaining = list.length - endIdx;

      /* Insert skeleton cards immediately */
      var container = document.getElementById('news-list');
      var batch = list.slice(totalShownNow, endIdx);
      if (container) {
        container.insertAdjacentHTML('beforeend', renderSkeletonCards(batch));
      }

      /* Collect unique image URLs from the batch */
      var batch = list.slice(totalShownNow, endIdx);
      var imageUrls = [];
      var urlSet = {};
      batch.forEach(function (a) {
        var src = resolveArticleImage(a);
        if (src && !isWeakBanner(src) && !urlSet[src]) {
          urlSet[src] = true;
          imageUrls.push(src);
        }
      });

      var totalImages = imageUrls.length;
      var loadedCount = 0;

      function updateProgress() {
        var rem = totalImages - loadedCount;
        newBtn.innerHTML = 'Loading <span class="news-loadmore-remaining">(' + rem + ' remaining)</span>';
      }

      function onImageDone() {
        loadedCount++;
        updateProgress();
        if (loadedCount >= totalImages) {
          finalizeLoad();
        }
      }

      function finalizeLoad() {
        /* Remove skeleton cards */
        var skeletons = container ? container.querySelectorAll('.news-card--skeleton') : null;
        if (skeletons) {
          Array.prototype.forEach.call(skeletons, function (el) { el.remove(); });
        }
        /* Shift existing cards up slightly to make room */
        var existingCards = container ? container.querySelectorAll('.news-card') : null;
        if (existingCards && existingCards.length) {
          Array.prototype.forEach.call(existingCards, function (card) {
            card.classList.add('news-card--shift-up');
            setTimeout(function () { card.classList.remove('news-card--shift-up'); }, 500);
          });
        }
        /* Append real cards with staggered appear animation */
        if (container) {
          var prevYear = '';
          var prevIdx = totalShownNow - 1;
          if (prevIdx >= 0 && list[prevIdx]) prevYear = extractYear(list[prevIdx].date);
          var groupedHtml = renderCardsByYear(batch, prevYear);
          /* Only animate the cards themselves, not the year headers */
          var cardIdx = 0;
          groupedHtml = groupedHtml.replace(/<article class="news-card"/g, function () {
            var delay = (cardIdx * 70) + 'ms';
            cardIdx++;
            return '<article class="news-card news-card--appear" style="animation-delay:' + delay + '"';
          });
          container.insertAdjacentHTML('beforeend', groupedHtml);
        }
        if (window.LakeSite && window.LakeSite.refreshMotion) {
          window.LakeSite.refreshMotion();
        } else if (window.LakeSite && window.LakeSite.initReveal) {
          window.LakeSite.initReveal();
        }          localStorage.setItem(VIEW_MODE_KEY, 'loadmore');
          sessionStorage.setItem(LM_LOADED_KEY, endIdx);
          try { sessionStorage.setItem(LM_SCROLL_KEY, window.scrollY); } catch (e) {}
          try { localStorage.setItem(LM_SCROLL_POS_KEY, window.scrollY); } catch (e) {}
          if (toRemaining <= 0) {
            host.hidden = true;
          } else {
            host.hidden = false;
            newBtn.innerHTML = 'Load More <span class="news-loadmore-remaining">(' + toRemaining + ' remaining)</span>';
            newBtn.disabled = false;
          }
          /* Notify back-to-top button */
          document.dispatchEvent(new CustomEvent('news:loadmore'));
      }

      /* If no images to preload (all weak banners or fallback), finalize immediately */
      if (totalImages === 0) {
        finalizeLoad();
        return;
      }

      /* Preload all images and track completion via onload/onerror */
      imageUrls.forEach(function (url) {
        var img = new Image();
        img.onload = onImageDone;
        img.onerror = onImageDone;
        img.src = url;
      });

      updateProgress();
    });
  }

  function renderNewsList(container, articles, options) {
    if (!window.LAKE_NEWS || !container) return;
    var list = articles || window.LAKE_NEWS;
    var opts = options || {};

    lastFilteredList = list;
    currentPage = 1;

    if (!list.length) {
      var featuredHost = document.getElementById('news-featured');
      if (featuredHost) { featuredHost.innerHTML = ''; featuredHost.hidden = true; }
      container.innerHTML = '<p class="news-empty">No articles match your filters.</p>';
      renderRelated([]);
        var lm = document.getElementById('news-loadmore');
      if (lm) lm.hidden = true;
      updateResultCount(0);
      renderActiveFilterTags();
      return;
    }

    renderCurrentPage();
  }

  /* --- Active filter tags --- */
  function renderActiveFilterTags() {
    var host = document.getElementById('news-active-tags');
    if (!host) return;
    var f = currentFilters();
    var tags = [];

    if (f.cat) {
      tags.push({ type: 'cat', label: 'Category', value: f.cat });
    }
    if (f.country) {
      tags.push({ type: 'country', label: 'Country', value: f.country });
    }
    if (f.year) {
      tags.push({ type: 'year', label: 'Year', value: f.year });
    }
    if (f.month) {
      tags.push({ type: 'month', label: 'Month', value: f.month });
    }
    if (f.q) {
      tags.push({ type: 'q', label: 'Search', value: f.q });
    }

    if (!tags.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    var html = '';
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i];
      var cls = 'news-tag' + (t.type === 'q' ? ' news-tag--search' : '');
      html += '<span class="' + cls + '" data-filter-type="' + t.type + '" data-filter-value="' + escapeHtml(t.value) + '">' +
        '<span class="news-tag__label">' + escapeHtml(t.label) + ':</span> ' +
        '<span class="news-tag__value">' + escapeHtml(truncateTag(t.value)) + '</span>' +
        '<button type="button" class="news-tag__dismiss" data-filter-type="' + t.type + '" aria-label="Remove ' + escapeHtml(t.label) + ' filter">&times;</button>' +
      '</span>';
    }
    host.innerHTML = html;
    host.hidden = false;
  }

  function truncateTag(str) {
    if (!str) return '';
    return str.length > 24 ? str.slice(0, 22) + '\u2026' : str;
  }

  function updateResultCount(shown) {
    var el = document.getElementById('news-result-count');
    if (!el || !window.LAKE_NEWS) return;
    var clearBtn = document.getElementById('news-clear-filters');
    var total = window.LAKE_NEWS.length;
    var f = currentFilters();
    var active = f.cat || f.country || f.year || f.month || f.q;
    if (!active && shown === total) {
      el.textContent = '';
      el.classList.remove('is-active');
      if (clearBtn) clearBtn.hidden = true;
      return;
    }
    el.textContent = 'Showing ' + shown + ' of ' + total + ' articles';
    el.classList.add('is-active');
    if (clearBtn) {
      clearBtn.hidden = false;
      /* Count active filters and show in button text */
      var count = 0;
      if (f.cat) count++;
      if (f.country) count++;
      if (f.year) count++;
      if (f.month) count++;
      if (f.q) count++;
      clearBtn.innerHTML = 'Clear all filters (' + count + ') <span aria-hidden="true">&times;</span>';
    }
  }

  function extractYear(dateStr) {
    if (!dateStr) return '';
    var m = dateStr.match(/(\d{4})/);
    return m ? m[1] : '';
  }

  function extractMonth(dateStr) {
    if (!dateStr) return '';
    var m = dateStr.match(/^\d{1,2}\s+(\w{3})/i);
    return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1,3).toLowerCase() : '';
  }

  function getMonthsForYear(year) {
    var months = {};
    (window.LAKE_NEWS || []).forEach(function (a) {
      if (extractYear(a.date) === year) {
        var mon = extractMonth(a.date);
        if (mon) months[mon] = true;
      }
    });
    return Object.keys(months);
  }

  function renderMonthTabs(year) {
    var host = document.getElementById('news-month-tabs');
    if (!host) return;
    if (!year) {
      host.hidden = true;
      return;
    }
    var avail = getMonthsForYear(year);
    var availSet = {};
    avail.forEach(function (m) { availSet[m] = true; });
    var html = '';
    MONTH_NAMES.forEach(function (m) {
      var has = availSet[m] || false;
      var active = (m === currentMonth) ? ' is-active' : '';
      var empty = has ? '' : ' is-empty';
      html += '<button type="button" class="news-month-tab' + active + empty + '" data-month="' + m + '" role="tab" aria-selected="' + (m === currentMonth ? 'true' : 'false') + '"' + (has ? '' : ' tabindex="-1"') + '>' + m + '</button>';
    });
    host.innerHTML = html;
    host.hidden = false;
  }

  function uniqueYears() {
    var years = {};
    (window.LAKE_NEWS || []).forEach(function (a) {
      var y = extractYear(a.date);
      if (y) years[y] = true;
    });
    return Object.keys(years).sort().reverse();
  }

  function currentFilters() {
    var searchEl = document.getElementById('news-search');
    var catEl = document.querySelector('.news-filter-pill.is-active');
    var countryEl = document.getElementById('news-country');
    var yearEl = document.getElementById('news-year');
    var q = (searchEl && searchEl.value || '').toLowerCase().trim();
    var cat = (catEl && catEl.getAttribute('data-category')) || '';
    var country = countryEl && countryEl.value || '';
    var year = yearEl && yearEl.value || '';
    var month = currentMonth;
    var active = !!(q || cat || country || year || month);
    return { q: q, cat: cat, country: country, year: year, month: month, active: active };
  }

  /* --- URL <-> filter sync --- */
  function syncFiltersToURL() {
    if (_suppressSync) return;
    var f = currentFilters();
    var params = [];
    if (f.cat) params.push('cat=' + encodeURIComponent(f.cat));
    if (f.country) params.push('country=' + encodeURIComponent(f.country));
    if (f.year) params.push('year=' + encodeURIComponent(f.year));
    if (f.month) params.push('month=' + encodeURIComponent(f.month));
    if (f.q) params.push('q=' + encodeURIComponent(f.q));
    var qs = params.join('&');
    var url = window.location.pathname + (qs ? '?' + qs : '');
    history.pushState({ filters: f, newsFilter: 1 }, '', url);
  }

  function readFiltersFromURL() {
    var p = new URLSearchParams(window.location.search);
    return {
      cat: p.get('cat') || '',
      country: p.get('country') || '',
      year: p.get('year') || '',
      month: p.get('month') || '',
      q: (p.get('q') || '').toLowerCase().trim()
    };
  }

  function resetFilterUI() {
    /* Reset category pills to All */
    var bar = document.getElementById('news-filter-pills');
    if (bar) {
      Array.prototype.forEach.call(bar.querySelectorAll('.news-filter-pill'), function (b) {
        var isDefault = !b.getAttribute('data-category');
        b.classList.toggle('is-active', isDefault);
        b.setAttribute('aria-pressed', isDefault ? 'true' : 'false');
      });
    }
    /* Clear dropdowns */
    var yearEl = document.getElementById('news-year');
    if (yearEl) { yearEl.value = ''; renderMonthTabs(''); currentMonth = ''; }
    var countryEl = document.getElementById('news-country');
    if (countryEl) countryEl.value = '';
    /* Clear search */
    var searchEl = document.getElementById('news-search');
    if (searchEl) searchEl.value = '';
  }

  function applyFiltersFromURL() {
    var f = readFiltersFromURL();
    if (!f.cat && !f.country && !f.year && !f.q) {
      /* Popstate to clean URL . reset UI to defaults */
      resetFilterUI();
      return false;
    }

    /* Activate category pill from URL */
    if (f.cat) {
      var bar = document.getElementById('news-filter-pills');
      if (bar) {
        Array.prototype.forEach.call(bar.querySelectorAll('.news-filter-pill'), function (b) {
          var match = b.getAttribute('data-category') === f.cat;
          b.classList.toggle('is-active', match);
          b.setAttribute('aria-pressed', match ? 'true' : 'false');
        });
      }
    }

    /* Set year dropdown */
    if (f.year) {
      var yearEl = document.getElementById('news-year');
      if (yearEl) yearEl.value = f.year;
    }
    /* Set month */
    if (f.month) {
      currentMonth = f.month;
    } else {
      currentMonth = '';
    }

    /* Set country dropdown */
    if (f.country) {
      var countryEl = document.getElementById('news-country');
      if (countryEl) countryEl.value = f.country;
    }

    /* Set search input */
    if (f.q) {
      var searchEl = document.getElementById('news-search');
      if (searchEl) searchEl.value = f.q;
    }

    return true;
  }

  function restoreLoadMoreState() {
    var list = lastFilteredList || window.LAKE_NEWS;
    if (!list || list.length <= PAGE_SIZE) return;
    var loaded = parseInt(sessionStorage.getItem(LM_LOADED_KEY), 10);
    if (!loaded || loaded <= PAGE_SIZE || loaded > list.length) {
      sessionStorage.removeItem(LM_LOADED_KEY);
      sessionStorage.removeItem(LM_SCROLL_KEY);
      return;
    }
    var container = document.getElementById('news-list');
    if (!container) return;
    var extra = list.slice(PAGE_SIZE, loaded);
    if (!extra.length) return;
    var prevYear = '';
    if (list[PAGE_SIZE - 1]) prevYear = extractYear(list[PAGE_SIZE - 1].date);
    container.insertAdjacentHTML('beforeend', renderCardsByYear(extra, prevYear));
    var host = document.getElementById('news-loadmore');
    if (host) {
      if (loaded >= list.length) {
        host.hidden = true;
      } else {
        host.hidden = false;
        var btn = host.querySelector('.news-loadmore-btn');
        if (btn) {
          var rem = list.length - loaded;
          btn.innerHTML = 'Load More <span class="news-loadmore-remaining">(' + rem + ' remaining)</span>';
          btn.disabled = false;
        }
      }
    }
    updateResultCount(list.length);
    renderActiveFilterTags();

    if (window.LakeSite && window.LakeSite.refreshMotion) {
      window.LakeSite.refreshMotion();
    } else if (window.LakeSite && window.LakeSite.initReveal) {
      window.LakeSite.initReveal();
    }
    /* Restore scroll . try sessionStorage first (same session), then localStorage (return visitor) */
    var scrollY = sessionStorage.getItem(LM_SCROLL_KEY) || localStorage.getItem(LM_SCROLL_POS_KEY);
    if (scrollY) {
      setTimeout(function () { window.scrollTo(0, parseInt(scrollY, 10)); }, 50);
    }
  }

  function filterNews() {
    var container = document.getElementById('news-list');
    if (!container || !window.LAKE_NEWS) return;

    /* Clear load-more session when filters change */
    sessionStorage.removeItem(LM_LOADED_KEY);
    sessionStorage.removeItem(LM_SCROLL_KEY);
    try { localStorage.removeItem(LM_SCROLL_POS_KEY); } catch (e) {}

    var f = currentFilters();
    var filtered = window.LAKE_NEWS.filter(function (article) {
      if (f.cat && article.category !== f.cat) return false;
      if (f.country && articleCountries(article).indexOf(f.country) === -1) return false;
      if (f.year && extractYear(article.date) !== f.year) return false;
      if (f.month && extractMonth(article.date) !== f.month) return false;
      if (f.q) {
        var hay = (article.title + ' ' + excerpt(article) + ' ' + article.category).toLowerCase();
        if (hay.indexOf(f.q) === -1) return false;
      }
      return true;
    });

    renderNewsList(container, filtered);
    syncFiltersToURL();
  }

  function initYearFilter() {
    var el = document.getElementById('news-year');
    if (!el || !window.LAKE_NEWS) return;
    var years = uniqueYears();
    var html = '<option value="" data-i18n="news.allYears">All Years</option>';
    years.forEach(function (y) {
      html += '<option value="' + y + '">' + y + '</option>';
    });
    el.innerHTML = html;
    el.addEventListener('change', function () {
      currentMonth = '';
      renderMonthTabs(el.value);
      filterNews();
    });
  }

  function initCategoryPills() {
    var bar = document.getElementById('news-filter-pills');
    if (!bar || !window.LAKE_NEWS) return;

    var cats = [];
    window.LAKE_NEWS.forEach(function (a) {
      if (a.category && cats.indexOf(a.category) === -1) cats.push(a.category);
    });

    var html = '<button type="button" class="news-filter-pill is-active" data-category="" aria-pressed="true">All</button>';
    cats.forEach(function (c) {
      html += '<button type="button" class="news-filter-pill" data-category="' + escapeHtml(c) + '" aria-pressed="false">' + escapeHtml(c) + '</button>';
    });
    bar.innerHTML = html;

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.news-filter-pill');
      if (!btn) return;
      bar.querySelectorAll('.news-filter-pill').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      filterNews();
    });
  }

  function initNewsFilters() {
    var searchEl = document.getElementById('news-search');
    var countryEl = document.getElementById('news-country');
    if (searchEl) searchEl.addEventListener('input', function () {
      filterNews();
      /* Search keystrokes shouldn't flood history . replace instead of push */
      var sf = currentFilters();
      var sp = [];
      if (sf.cat) sp.push('cat=' + encodeURIComponent(sf.cat));
      if (sf.country) sp.push('country=' + encodeURIComponent(sf.country));
      if (sf.year) sp.push('year=' + encodeURIComponent(sf.year));
      if (sf.q) sp.push('q=' + encodeURIComponent(sf.q));
      history.replaceState({ filters: sf, newsFilter: 1 }, '', window.location.pathname + (sp.length ? '?' + sp.join('&') : ''));
    });
    if (countryEl) countryEl.addEventListener('change', filterNews);
  }

  /* =================================================================
   * Article page enhancements: scroll-in reveal, sticky TOC, lightbox
   * ================================================================= */
  var _articleRevealIO = null;
  var _tocScrollHandler = null;
  var _lbKeydownHandler = null;
  var _carouselScrollHandler = null;
  var _lbCreated = false;
  var _lbInstance = null;
  var _lbImages = [];
  var _lbCurrentIdx = 0;
  var _lbTriggerFigure = null;

  function initArticleReveal() {
    if (_articleRevealIO) { _articleRevealIO.disconnect(); _articleRevealIO = null; }
    var targets = document.querySelectorAll(
      '.news-article-text > *, .news-article-banner, .news-article-gallery, .news-article-video, .news-article-back'
    );
    if (!targets.length) return;
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      targets.forEach(function(el) { el.classList.add('article-revealed'); });
      return;
    }
    _articleRevealIO = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('article-revealed');
          _articleRevealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    targets.forEach(function(el, i) {
      el.style.setProperty('--article-delay', (i * 0.08).toFixed(2) + 's');
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('article-revealed');
      } else {
        _articleRevealIO.observe(el);
      }
    });
  }

  function initArticleTOC(article) {
    if (!article || !article.description || article.description.length < 2) return;
    var articleEl = document.querySelector('.news-article');
    if (!articleEl) return;

    /* Reading time: ~200 wpm */
    var totalWords = 0;
    article.description.forEach(function(p) { totalWords += p.split(/\s+/).length; });
    if (article.video) totalWords += 100;
    var readMin = Math.max(1, Math.round(totalWords / 200));

    /* Generate section labels from paragraph starts */
    var sections = [];
    article.description.forEach(function(p, i) {
      var label = p.substring(0, 48).replace(/[\s]+\S*$/, '') + '\u2026';
      sections.push({ id: 'article-para-' + i, label: label });
    });
    if (article.images && article.images.length > 0) {
      sections.push({ id: 'article-gallery', label: 'Photo Gallery' });
    }

    var tocHtml =
      '<div class="news-toc" id="news-toc">' +
        '<div class="news-toc__title">In This Article</div>' +
        '<div class="news-toc__reading">' + readMin + ' min read</div>' +
        '<div class="news-toc__progress"><div class="news-toc__progress-bar" id="news-toc-progress"></div></div>' +
        '<ul class="news-toc__list">';
    sections.forEach(function(s, i) {
      tocHtml += '<li><a href="#' + s.id + '" class="news-toc__link" data-toc-idx="' + i + '">' +
        '<span class="news-toc__num">' + (i + 1) + '</span>' +
        '<span>' + escapeHtml(s.label) + '</span></a></li>';
    });
    tocHtml += '</ul>' +
    '</div>';

    /* Insert TOC after the article back link, before carousel */
    var backLink = articleEl.querySelector('.news-article-back');
    if (backLink) {
      backLink.insertAdjacentHTML('afterend', tocHtml);
    }

    /* Reading progress bar . clean up previous handler */
    if (_tocScrollHandler) { window.removeEventListener('scroll', _tocScrollHandler); _tocScrollHandler = null; }
    var progressBar = document.getElementById('news-toc-progress');
    if (progressBar) {
      if (articleEl) {
        _tocScrollHandler = function() {
          var rect = articleEl.getBoundingClientRect();
          var total = rect.height - window.innerHeight;
          var scrolled = -rect.top;
          var pct = Math.max(0, Math.min(100, (scrolled / total) * 100));
          progressBar.style.width = pct + '%';
        };
        window.addEventListener('scroll', _tocScrollHandler, { passive: true });
      }
    }

    /* Active section highlight on scroll */
    var tocLinks = document.querySelectorAll('.news-toc__link');
    if (tocLinks.length && 'IntersectionObserver' in window) {
      var sectionIO = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            tocLinks.forEach(function(link) {
              link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
            });
          }
        });
      }, { threshold: 0.3, rootMargin: '-20% 0px -60% 0px' });
      sections.forEach(function(s) {
        var el = document.getElementById(s.id);
        if (el) sectionIO.observe(el);
      });
    }
  }

  function initArticleLightbox() {
    var gallery = document.querySelector('.news-article-gallery');
    if (!gallery) return;
    var figures = gallery.querySelectorAll('figure');
    if (!figures.length) return;

    /* Collect image sources */
    _lbImages = [];
    figures.forEach(function(fig) {
      var img = fig.querySelector('img');
      if (img) _lbImages.push({ src: img.src, alt: img.alt || '' });
    });
    if (!_lbImages.length) return;

    /* Reuse existing lightbox DOM or create new one */
    var lb = _lbInstance;
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'news-lightbox';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-label', 'Image lightbox');
      lb.innerHTML =
        '<button type="button" class="news-lightbox__close" aria-label="Close lightbox">&times;</button>' +
        '<button type="button" class="news-lightbox__nav news-lightbox__prev" aria-label="Previous image">&#8249;</button>' +
        '<div class="news-lightbox__img-wrap">' +
          '<img class="news-lightbox__img" src="" alt="">' +
        '</div>' +
        '<button type="button" class="news-lightbox__nav news-lightbox__next" aria-label="Next image">&#8250;</button>' +
        '<div class="news-lightbox__counter"></div>';
      document.body.appendChild(lb);
      _lbInstance = lb;

      /* Close button */
      lb.querySelector('.news-lightbox__close').addEventListener('click', closeLightbox);

      /* Click backdrop to close */
      lb.addEventListener('click', function(e) {
        if (e.target === lb || e.target === lb.querySelector('.news-lightbox__img-wrap')) {
          closeLightbox();
        }
      });

      /* Nav buttons */
      lb.querySelector('.news-lightbox__prev').addEventListener('click', function(e) {
        e.stopPropagation();
        showImage((_lbCurrentIdx - 1 + _lbImages.length) % _lbImages.length);
      });
      lb.querySelector('.news-lightbox__next').addEventListener('click', function(e) {
        e.stopPropagation();
        showImage((_lbCurrentIdx + 1) % _lbImages.length);
      });

      /* Touch swipe support */
      var touchStartX = 0;
      lb.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });
      lb.addEventListener('touchend', function(e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) {
          if (dx < 0) showImage((_lbCurrentIdx + 1) % _lbImages.length);
          else showImage((_lbCurrentIdx - 1 + _lbImages.length) % _lbImages.length);
        }
      }, { passive: true });
    }

    /* Remove old figure click handlers and re-bind to new figures */
    figures.forEach(function(fig, i) {
      fig.style.cursor = 'pointer';
      fig.addEventListener('click', function(e) {
        e.preventDefault();
        _lbTriggerFigure = fig;
        openLightbox(i);
      });
    });

    /* Keyboard nav . single handler, replaced on each init */
    if (_lbKeydownHandler) document.removeEventListener('keydown', _lbKeydownHandler);
    _lbKeydownHandler = function(e) {
      if (!_lbInstance || !_lbInstance.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showImage((_lbCurrentIdx - 1 + _lbImages.length) % _lbImages.length);
      else if (e.key === 'ArrowRight') showImage((_lbCurrentIdx + 1) % _lbImages.length);
      /* Trap focus inside lightbox */
      if (e.key === 'Tab') {
        var focusable = _lbInstance.querySelectorAll('button');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', _lbKeydownHandler);

    function showImage(idx) {
      if (idx < 0 || idx >= _lbImages.length) return;
      _lbCurrentIdx = idx;
      var lbImg = _lbInstance.querySelector('.news-lightbox__img');
      var lbCounter = _lbInstance.querySelector('.news-lightbox__counter');
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        lbImg.src = _lbImages[idx].src;
        lbImg.alt = _lbImages[idx].alt;
      } else {
        lbImg.style.opacity = '0';
        lbImg.style.transform = 'scale(0.95)';
        setTimeout(function() {
          lbImg.src = _lbImages[idx].src;
          lbImg.alt = _lbImages[idx].alt;
          lbImg.style.opacity = '1';
          lbImg.style.transform = 'scale(1)';
        }, 120);
      }
      lbCounter.textContent = (idx + 1) + ' / ' + _lbImages.length;
    }

    function openLightbox(idx) {
      showImage(idx);
      _lbInstance.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      /* Focus the close button for accessibility */
      var closeBtn = _lbInstance.querySelector('.news-lightbox__close');
      if (closeBtn) setTimeout(function() { closeBtn.focus(); }, 100);
    }

    function closeLightbox() {
      _lbInstance.classList.remove('is-open');
      document.body.style.overflow = '';
      /* Restore focus to the triggering figure */
      if (_lbTriggerFigure) { _lbTriggerFigure.focus(); _lbTriggerFigure = null; }
    }
  }

  function renderNewsArticle() {
    var root = document.getElementById('news-article');
    if (!root || !window.LAKE_NEWS) return;

    var id = getArticleId();
    var article = window.LAKE_NEWS.find(function (a) { return a.id === id; });
    if (!article) {
      root.innerHTML =
        '<div class="news-article-empty">' +
          '<h2>Article not found</h2>' +
          '<p>The news story you are looking for could not be found.</p>' +
          '<a href="news.html" class="btn btn-primary btn-sm">Back to News</a>' +
        '</div>';
      return;
    }

    document.title = article.title + ' | Lake Group';

    var banner = resolveArticleImage(article);
    var hero = document.getElementById('article-hero-photo');
    if (hero) hero.style.backgroundImage = "url('" + banner + "')";

    var breadcrumbTitle = document.getElementById('article-breadcrumb-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = article.title;

    /* Left column: article text + embedded video */
    var mainHtml = '';
    if (article.description.length) {
      mainHtml += '<div class="news-article-text">';
      article.description.forEach(function (p, pi) {
        mainHtml += '<p id="article-para-' + pi + '">' + p + '</p>';
      });
      mainHtml += '</div>';
    }

    if (article.video) {
      var embed = youtubeEmbed(article.video);
      if (embed) {
        mainHtml += '<div class="news-article-video"><iframe src="' + embed + '" title="' + escapeHtml(article.title) + '" allowfullscreen loading="lazy"></iframe></div>';
      }
    }

    /* Gallery: extra photos go bottom-left, after the words */
    var galleryHtml = '';
    if (article.images.length) {
      var figures = '';
      article.images.forEach(function (src) {
        if (isWeakBanner(src)) return;
        figures += '<figure>' + mediaImgTag(src, article.title + ' photo', 'lazy') + '</figure>';
      });
      if (figures) {
        galleryHtml = '<div class="news-article-gallery" id="article-gallery">' + figures + '</div>';
      }
    }

    if (!mainHtml && !galleryHtml) {
      mainHtml = '<p class="news-article-text">Photos and coverage from this Lake Group announcement.</p>';
    }

    /* Profile-style two-column body: writing left, main picture right. The
       gallery sits at the bottom of the text column so images never overlap. */
    var bodyLayout =
      '<div class="news-article-body">' +
        '<div class="news-article-main">' + mainHtml + galleryHtml + '</div>' +
        '<aside class="news-article-media">' +
          '<div class="news-article-banner">' + mediaImgTag(banner, article.title, 'eager') + '</div>' +
        '</aside>' +
      '</div>';

    var others = window.LAKE_NEWS.filter(function (a) { return a.id !== article.id; }).slice(0, 5);
    var carouselCardsHtml = others.map(function (a) {
      return (
        '<a href="' + articleUrl(a.id) + '" class="news-carousel-card">' +
          '<div class="news-carousel-card-img">' + mediaImgTag(resolveArticleImage(a), escapeHtml(a.title), 'lazy') + '</div>' +
          '<div class="news-carousel-card-body">' +
            '<span class="news-carousel-card-date">' + escapeHtml(a.date) + '</span>' +
            '<h4 class="news-carousel-card-title">' + escapeHtml(a.title) + '</h4>' +
          '</div>' +
        '</a>'
      );
    }).join('');
    var carouselHtml = carouselCardsHtml ? (
      '<div class="news-carousel-section">' +
        '<div class="news-carousel-header"><h3>More Stories</h3></div>' +
        '<div class="news-carousel-wrap">' +
          '<div class="news-carousel-track" id="news-carousel-track" tabindex="0" role="region" aria-label="Related articles">' + carouselCardsHtml + '</div>' +
          '<div class="news-carousel-nav">' +
            '<button type="button" class="news-carousel-btn" data-carousel-dir="-1" aria-label="Previous">\u2190</button>' +
            '<button type="button" class="news-carousel-btn" data-carousel-dir="1" aria-label="Next">\u2192</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    ) : '';

    root.innerHTML =
      '<article class="news-article">' +
        '<div class="news-article-meta">' +
          '<span class="badge badge-amber">' + escapeHtml(article.category) + '</span>' +
          '<span class="news-article-date">' + escapeHtml(article.date) + '</span>' +
        '</div>' +
        shareBarArticle(article) +
        '<h1 class="news-article-title">' + escapeHtml(article.title) + '</h1>' +
        bodyLayout +
        '<div class="news-article-back"><a href="news.html" class="btn btn-outline-dark btn-sm">&larr; All News</a></div>' +
      '</article>' +
      carouselHtml;

    /* --- Article page enhancements --- */
    var heroH1 = document.querySelector('.page-hero h1');
    if (heroH1) heroH1.textContent = article.title;
    initArticleReveal();
    initArticleTOC(article);
    initArticleLightbox();
  }

  /* --- Back-to-top removed: the fixed navy button overlapped the chat launcher
       in the bottom-right corner, showing a blue box behind the chatbot icon. --- */
  function initNewsPage() {
    var list = document.getElementById('news-list');

    /* Feature board: Trending + Top News + Most Viewed tabs + Technology.
       These always reflect the full dataset (not the user's filters),
       so we render them once at boot and leave them alone. Trending is
       rendered first so its picks are excluded from the sections below. */
    if (window.LAKE_NEWS && window.LAKE_NEWS.length) {
      renderSliderSection(window.LAKE_NEWS);
      renderTrendingSection(window.LAKE_NEWS);
      renderFeatureBoard(window.LAKE_NEWS);
    }
    initFeatureTabs();

    if (list) {
      initCategoryPills();
      initYearFilter();
      /* Month tab click handler */
      var monthHost = document.getElementById('news-month-tabs');
      if (monthHost) {
        monthHost.addEventListener('click', function (e) {
          var tab = e.target.closest('.news-month-tab');
          if (!tab || tab.classList.contains('is-empty')) return;
          var month = tab.getAttribute('data-month');
          currentMonth = (currentMonth === month) ? '' : month;
          renderMonthTabs(document.getElementById('news-year').value);
          filterNews();
        });
      }
      var hadUrlFilters = applyFiltersFromURL();
      /* After applying URL filters, sync month tabs with the year dropdown */
      var yearEl = document.getElementById('news-year');
      renderMonthTabs(yearEl ? yearEl.value : '');
      if (hadUrlFilters) {
        filterNews();
      } else {
        renderNewsList(list);
      }
      initNewsFilters();
      /* Restore Load More state from sessionStorage */
      restoreLoadMoreState();
      window.addEventListener('popstate', function () {
        _suppressSync = true;
        try {
          applyFiltersFromURL();
          var yEl = document.getElementById('news-year');
          renderMonthTabs(yEl ? yEl.value : '');
          filterNews();
        } finally {
          _suppressSync = false;
        }
      });

      /* Expandable +N badges . hover popup viewport flip detection */
      document.addEventListener('mouseover', function (e) {
        var badge = e.target.closest('[data-expandable]');
        if (!badge) return;
        var popup = badge.querySelector('.news-more-popup');
        if (!popup) return;
        /* Check if popup would overflow above viewport . flip below if so */
        var rect = popup.getBoundingClientRect();
        if (rect.top < 8) {
          popup.classList.add('is-flipped');
        } else {
          popup.classList.remove('is-flipped');
        }
      });

      /* Expandable +N badges . click to reveal all hidden flags/cities inline */
      document.addEventListener('click', function (e) {
        var badge = e.target.closest('[data-expandable]');
        if (!badge || badge.classList.contains('is-expanded')) return;
        var type = badge.getAttribute('data-expandable');
        if (type === 'country') {
          var flagsHost = badge.closest('.news-flags');
          if (!flagsHost) return;
          var allRaw = flagsHost.getAttribute('data-all-countries');
          if (!allRaw) return;
          var all = allRaw.split(',');
          var MAX_VISIBLE = 3;
          if (all.length <= MAX_VISIBLE) return;
          var hidden = all.slice(MAX_VISIBLE);
          var showLabels = flagsHost.classList.contains('news-flags--labeled');
          var frag = document.createDocumentFragment();
          for (var ci = 0; ci < hidden.length; ci++) {
            var name = hidden[ci];
            var flag = COUNTRY_FLAGS[name] || '';
            if (!flag) continue;
            var span = document.createElement('span');
            span.className = 'news-flag news-flag--expand-item';
            span.setAttribute('data-country', name);
            span.setAttribute('title', name);
            var emoji = document.createElement('span');
            emoji.className = 'news-flag__emoji';
            emoji.setAttribute('aria-hidden', 'true');
            emoji.textContent = flag;
            span.appendChild(emoji);
            if (showLabels) {
              var label = document.createElement('span');
              label.className = 'news-flag__label';
              label.textContent = name;
              span.appendChild(label);
            }
            frag.appendChild(span);
          }
          badge.classList.add('is-expanded');
          badge.parentNode.insertBefore(frag, badge.nextSibling);
          badge.remove();
        } else if (type === 'city') {
          var cityHost = badge.closest('.news-city');
          if (!cityHost) return;
          var allRaw = cityHost.getAttribute('data-all-cities');
          if (!allRaw) return;
          var all = allRaw.split(',');
          var MAX_CITIES = 2;
          if (all.length <= MAX_CITIES) return;
          var hidden = all.slice(MAX_CITIES);
          var frag = document.createDocumentFragment();
          for (var ci = 0; ci < hidden.length; ci++) {
            var name = hidden[ci];
            var span = document.createElement('span');
            span.className = 'news-city__name news-city__name--expand-item';
            span.setAttribute('title', name);
            var pin = document.createElement('span');
            pin.className = 'news-city__pin';
            pin.setAttribute('aria-hidden', 'true');
            pin.textContent = '\uD83D\uDCCD';
            span.appendChild(pin);
            span.appendChild(document.createTextNode(' ' + name));
            frag.appendChild(span);
          }
          badge.classList.add('is-expanded');
          badge.parentNode.insertBefore(frag, badge.nextSibling);
          badge.remove();
        }
      });

      /* Active filter tag dismiss . click × to remove individual filter */
      var tagHost = document.getElementById('news-active-tags');
      if (tagHost) {
        tagHost.addEventListener('click', function (e) {
          var btn = e.target.closest('.news-tag__dismiss');
          if (!btn) return;
          var type = btn.getAttribute('data-filter-type');
          if (!type) return;

          /* Animate tag out before removing */
          var tagSpan = btn.closest('.news-tag');
          if (tagSpan) tagSpan.classList.add('is-removing');

          function doDismiss() {
            switch (type) {
              case 'cat':
                var bar = document.getElementById('news-filter-pills');
                if (bar) {
                  var allBtn = bar.querySelector('.news-filter-pill[data-category=""]');
                  if (allBtn) { allBtn.click(); return; }
                }
                break;
              case 'country':
                var countryEl = document.getElementById('news-country');
                if (countryEl) { countryEl.value = ''; filterNews(); }
                break;
              case 'year':
                var yearEl = document.getElementById('news-year');
                if (yearEl) { yearEl.value = ''; renderMonthTabs(''); currentMonth = ''; filterNews(); }
                break;
              case 'month':
                currentMonth = '';
                renderMonthTabs(document.getElementById('news-year').value);
                filterNews();
                break;
              case 'q':
                var searchEl = document.getElementById('news-search');
                if (searchEl) { searchEl.value = ''; filterNews(); }
                break;
            }
          }

          setTimeout(doDismiss, 200);
        });
      }

      /* Results count badge click . reset all filters */
      var resultCountEl = document.getElementById('news-result-count');
      if (resultCountEl) {
        resultCountEl.addEventListener('click', function () {
          if (currentFilters().active) {
            resetFilterUI();
            filterNews();
          }
        });
      }
      /* Clear filters button */
      var clearBtn = document.getElementById('news-clear-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          resetFilterUI();
          filterNews();
        });
      }
    }
    renderNewsArticle();

    /* Carousel arrow navigation + boundary detection + keyboard */
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.news-carousel-btn');
      if (!btn) return;
      var track = document.getElementById('news-carousel-track');
      if (!track) return;
      var dir = parseInt(btn.getAttribute('data-carousel-dir'), 10) || 0;
      var cardW = track.querySelector('.news-carousel-card');
      var step = cardW ? cardW.offsetWidth + 20 : 320;
      track.scrollBy({ left: dir * step, behavior: 'smooth' });
    });
    /* Update carousel arrow disabled state on scroll + keyboard nav */
    if (_carouselScrollHandler) { var oldTrack = document.getElementById('news-carousel-track'); if (oldTrack) oldTrack.removeEventListener('scroll', _carouselScrollHandler); }
    (function() {
      var track = document.getElementById('news-carousel-track');
      if (!track) return;
      var prevBtn = track.closest('.news-carousel-wrap').querySelector('[data-carousel-dir="-1"]');
      var nextBtn = track.closest('.news-carousel-wrap').querySelector('[data-carousel-dir="1"]');
      function updateCarouselArrows() {
        if (prevBtn) prevBtn.disabled = track.scrollLeft <= 4;
        if (nextBtn) nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      }
      _carouselScrollHandler = updateCarouselArrows;
      track.addEventListener('scroll', _carouselScrollHandler, { passive: true });
      updateCarouselArrows();
      /* Keyboard: left/right arrows when track is focused */
      var _prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      track.addEventListener('keydown', function(e) {
        var _scrollBehavior = _prefersReducedMotion ? 'auto' : 'smooth';
        if (e.key === 'ArrowLeft') { track.scrollBy({ left: -320, behavior: _scrollBehavior }); e.preventDefault(); }
        if (e.key === 'ArrowRight') { track.scrollBy({ left: 320, behavior: _scrollBehavior }); e.preventDefault(); }
      });
    })();

    /* Copy link button handler */
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.article-share-btn--copy');
      if (!btn) return;
      var url = btn.getAttribute('data-copy-url');
      if (!url) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          btn.classList.add('copied');
          setTimeout(function() { btn.classList.remove('copied'); }, 2000);
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); btn.classList.add('copied'); setTimeout(function() { btn.classList.remove('copied'); }, 2000); } catch(ex) {}
        document.body.removeChild(ta);
      }
    });
  }

  /* Skeleton cards while the CMS API (assets/news-api.js) resolves. */
  function showNewsLoading() {
    var container = document.getElementById('news-list');
    if (!container) return;
    var placeholders = [];
    for (var i = 0; i < 9; i++) placeholders.push({});
    container.innerHTML = renderSkeletonCards(placeholders);
    var featuredHost = document.getElementById('news-featured');
    if (featuredHost) {
      featuredHost.innerHTML = '';
      featuredHost.hidden = true;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* Boot gate: when assets/news-api.js is configured, wait for it to
       settle (API data or bundled fallback) before rendering. */
    if (window.LakeNews && window.LakeNews.isPending && window.LakeNews.isPending()) {
      showNewsLoading();
      window.LakeNews.onReady(initNewsPage);
    } else {
      initNewsPage();
    }
  });
})();
