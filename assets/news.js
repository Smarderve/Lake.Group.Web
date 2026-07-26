(function () {
  /* Full-bleed ops photo — never the logo-on-white assets used as fake banners. */
  var NEWS_FALLBACK_IMAGE = 'assets/images/news/6/photo_1.jpg';
  var WEAK_BANNER_RE = /LAKE_GROUP_LOGO|lake-group-placeholder|\/logos\/|\/news\/(?:7|13)\/photo_1\.jpg/i;

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
    return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
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

  function mediaImgTag(src, alt, loading) {
    var safeSrc = escapeHtml(src || NEWS_FALLBACK_IMAGE);
    var safeAlt = escapeHtml(alt || '');
    var load = loading || 'lazy';
    return (
      '<img src="' + safeSrc + '" alt="' + safeAlt + '"' +
      ' loading="' + load + '" decoding="async"' +
      ' data-news-fallback="' + escapeHtml(NEWS_FALLBACK_IMAGE) + '"' +
      ' onerror="if(!this.dataset.fallbackApplied){this.dataset.fallbackApplied=1;this.src=this.dataset.newsFallback||\'' + NEWS_FALLBACK_IMAGE + '\';}">'
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

  function articleCountries(article) {
    var hay = (article.title + ' ' + excerpt(article) + ' ' + article.category).toLowerCase();
    return Object.keys(COUNTRY_KEYWORDS).filter(function (c) {
      return COUNTRY_KEYWORDS[c].some(function (k) { return hay.indexOf(k) !== -1; });
    });
  }

  function shareUrl(article) {
    try {
      return encodeURIComponent(new URL(articleUrl(article.id), window.location.href).href);
    } catch (e) {
      return encodeURIComponent(articleUrl(article.id));
    }
  }

  function shareLinks(article) {
    var url = shareUrl(article);
    var title = encodeURIComponent(article.title);
    return (
      '<div class="news-card__share" aria-label="Share">' +
        '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + url + '" target="_blank" rel="noopener" title="LinkedIn" aria-label="Share on LinkedIn">in</a>' +
        '<a href="https://www.facebook.com/sharer/sharer.php?u=' + url + '" target="_blank" rel="noopener" title="Facebook" aria-label="Share on Facebook">f</a>' +
        '<a href="https://twitter.com/intent/tweet?url=' + url + '&text=' + title + '" target="_blank" rel="noopener" title="X" aria-label="Share on X">𝕏</a>' +
      '</div>'
    );
  }

  function renderFeatured(article) {
    if (!article) return '';
    var title = escapeHtml(article.title);
    var cat = escapeHtml(article.category);
    var date = escapeHtml(article.date);
    var url = articleUrl(article.id);
    var image = resolveArticleImage(article);
    return (
      '<article class="news-featured" data-category="' + cat + '" data-countries="' + articleCountries(article).join(',') + '">' +
        '<div class="news-featured__body">' +
          '<div class="news-featured__meta">' +
            '<span class="news-pill">' + cat + '</span>' +
            '<span class="news-featured__date">' + date + '</span>' +
          '</div>' +
          '<h2 class="news-featured__title"><a href="' + url + '">' + title + '</a></h2>' +
          '<p class="news-featured__excerpt">' + escapeHtml(shortExcerpt(article, 220)) + '</p>' +
          '<a href="' + url + '" class="news-featured__cta">Read more <span aria-hidden="true">→</span></a>' +
        '</div>' +
        '<a href="' + url + '" class="news-featured__media" aria-hidden="true" tabindex="-1">' +
          mediaImgTag(image, '', 'eager') +
        '</a>' +
      '</article>'
    );
  }

  function renderCard(article) {
    var title = escapeHtml(article.title);
    var cat = escapeHtml(article.category);
    var date = escapeHtml(article.date);
    var url = articleUrl(article.id);
    var image = resolveArticleImage(article);
    return (
      '<article class="news-card" data-category="' + cat + '" data-countries="' + articleCountries(article).join(',') + '">' +
        '<a href="' + url + '" class="news-card__media">' +
          mediaImgTag(image, title, 'lazy') +
        '</a>' +
        '<div class="news-card__body">' +
          '<div class="news-card__meta">' +
            '<span class="news-pill news-pill--muted">' + cat + '</span>' +
            '<span class="news-card__date">' + date + '</span>' +
          '</div>' +
          '<h3 class="news-card__title"><a href="' + url + '">' + title + '</a></h3>' +
          '<p class="news-card__excerpt">' + escapeHtml(shortExcerpt(article, 110)) + '</p>' +
          '<div class="news-card__foot">' +
            '<a href="' + url + '" class="news-card__more">Read more</a>' +
            shareLinks(article) +
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

  function renderNewsList(container, articles, options) {
    if (!window.LAKE_NEWS || !container) return;
    var list = articles || window.LAKE_NEWS;
    var opts = options || {};
    var featuredHost = document.getElementById('news-featured');

    if (!list.length) {
      if (featuredHost) featuredHost.innerHTML = '';
      container.innerHTML = '<p class="news-empty">No articles match your filters.</p>';
      if (!opts.keepRelated) renderRelated([]);
      return;
    }

    var featured = null;
    var rest = list;
    if (!opts.skipFeatured && !opts.isFiltered) {
      featured = list[0];
      rest = list.slice(1);
    }

    if (featuredHost) {
      featuredHost.innerHTML = featured ? renderFeatured(featured) : '';
      featuredHost.hidden = !featured;
    }

    if (!rest.length) {
      container.innerHTML = featured
        ? '<p class="news-empty news-empty--soft">More stories will appear here as they are published.</p>'
        : '<p class="news-empty">No articles match your filters.</p>';
    } else {
      container.innerHTML = rest.map(renderCard).join('');
    }

    if (opts.isFiltered) {
      renderRelated([]);
    } else {
      /* Prefer stories not already in the first grid row — avoids duplicate tiles. */
      var relatedPool = rest.length > 3 ? rest.slice(3) : [];
      if (relatedPool.length < 2) relatedPool = list.slice(Math.min(4, list.length));
      renderRelated(relatedPool);
    }

    if (window.LakeSite && window.LakeSite.refreshMotion) {
      window.LakeSite.refreshMotion();
    } else if (window.LakeSite && window.LakeSite.initReveal) {
      window.LakeSite.initReveal();
    }
  }

  function currentFilters() {
    var searchEl = document.getElementById('news-search');
    var catEl = document.querySelector('.news-filter-pill.is-active');
    var countryEl = document.getElementById('news-country');
    var q = (searchEl && searchEl.value || '').toLowerCase().trim();
    var cat = (catEl && catEl.getAttribute('data-category')) || '';
    var country = countryEl && countryEl.value || '';
    return { q: q, cat: cat, country: country, active: !!(q || cat || country) };
  }

  function filterNews() {
    var container = document.getElementById('news-list');
    if (!container || !window.LAKE_NEWS) return;

    var f = currentFilters();
    var filtered = window.LAKE_NEWS.filter(function (article) {
      if (f.cat && article.category !== f.cat) return false;
      if (f.country && articleCountries(article).indexOf(f.country) === -1) return false;
      if (f.q) {
        var hay = (article.title + ' ' + excerpt(article) + ' ' + article.category).toLowerCase();
        if (hay.indexOf(f.q) === -1) return false;
      }
      return true;
    });

    renderNewsList(container, filtered, { isFiltered: f.active, skipFeatured: f.active });
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
    if (searchEl) searchEl.addEventListener('input', filterNews);
    if (countryEl) countryEl.addEventListener('change', filterNews);
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

    var bodyHtml = '';
    if (article.description.length) {
      bodyHtml += '<div class="news-article-text">';
      article.description.forEach(function (p) {
        bodyHtml += '<p>' + p + '</p>';
      });
      bodyHtml += '</div>';
    }

    if (article.video) {
      var embed = youtubeEmbed(article.video);
      if (embed) {
        bodyHtml += '<div class="news-article-video"><iframe src="' + embed + '" title="' + escapeHtml(article.title) + '" allowfullscreen loading="lazy"></iframe></div>';
      }
    }

    if (article.images.length) {
      bodyHtml += '<div class="news-article-gallery">';
      article.images.forEach(function (src) {
        if (isWeakBanner(src)) return;
        bodyHtml += '<figure>' + mediaImgTag(src, article.title + ' photo', 'lazy') + '</figure>';
      });
      bodyHtml += '</div>';
    }

    if (!bodyHtml) {
      bodyHtml = '<p class="news-article-text">Photos and coverage from this Lake Group announcement.</p>';
    }

    var others = window.LAKE_NEWS.filter(function (a) { return a.id !== article.id; }).slice(0, 3);
    var relatedHtml = others.map(function (a) {
      return (
        '<a href="' + articleUrl(a.id) + '" class="news-related-card">' +
          mediaImgTag(resolveArticleImage(a), '', 'lazy') +
          '<div><span class="news-related-date">' + escapeHtml(a.date) + '</span><h4>' + escapeHtml(a.title) + '</h4></div>' +
        '</a>'
      );
    }).join('');

    root.innerHTML =
      '<article class="news-article">' +
        '<div class="news-article-meta">' +
          '<span class="badge badge-amber">' + escapeHtml(article.category) + '</span>' +
          '<span class="news-article-date">' + escapeHtml(article.date) + '</span>' +
        '</div>' +
        '<h1 class="news-article-title">' + escapeHtml(article.title) + '</h1>' +
        '<div class="news-article-banner">' + mediaImgTag(banner, article.title, 'eager') + '</div>' +
        bodyHtml +
        '<div class="news-article-back"><a href="news.html" class="btn btn-outline-dark btn-sm">&larr; All News</a></div>' +
      '</article>' +
      '<aside class="news-related">' +
        '<h3>More Stories</h3>' +
        '<div class="news-related-list">' + relatedHtml + '</div>' +
      '</aside>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var list = document.getElementById('news-list');
    if (list) {
      initCategoryPills();
      renderNewsList(list);
      initNewsFilters();
    }
    renderNewsArticle();
  });
})();
