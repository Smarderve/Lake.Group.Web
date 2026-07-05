(function () {
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

  function articleUrl(id) {
    return 'news-article.html?id=' + id;
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

  function renderNewsList(container, articles) {
    if (!window.LAKE_NEWS || !container) return;
    var list = articles || window.LAKE_NEWS;
    if (!list.length) {
      container.innerHTML = '<p style="color:var(--muted);padding:24px 0">No articles match your filters.</p>';
      return;
    }
    container.innerHTML = list.map(function (article) {
      return (
        '<article class="news-item reveal" data-category="' + article.category + '" data-countries="' + articleCountries(article).join(',') + '">' +
          '<a href="' + articleUrl(article.id) + '" class="news-thumb">' +
            '<img src="' + article.bannerImage + '" alt="' + article.title.replace(/"/g, '&quot;') + '">' +
          '</a>' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">' +
              '<span class="badge badge-amber">' + article.category + '</span>' +
              '<span style="font-size:0.78rem;color:var(--muted)">' + article.date + '</span>' +
            '</div>' +
            '<h3 style="font-size:1.05rem;margin-bottom:8px">' +
              '<a href="' + articleUrl(article.id) + '">' + article.title + '</a>' +
            '</h3>' +
            '<p style="font-size:0.88rem">' + excerpt(article) + '</p>' +
            '<a href="' + articleUrl(article.id) + '" class="news-read-more">Read more &rarr;</a>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    if (window.LakeSite && window.LakeSite.initReveal) {
      window.LakeSite.initReveal();
    } else {
      container.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    }
  }

  function filterNews() {
    var searchEl = document.getElementById('news-search');
    var catEl = document.getElementById('news-category');
    var countryEl = document.getElementById('news-country');
    var container = document.getElementById('news-list');
    if (!container) return;

    var q = (searchEl && searchEl.value || '').toLowerCase().trim();
    var cat = catEl && catEl.value || '';
    var country = countryEl && countryEl.value || '';

    var filtered = window.LAKE_NEWS.filter(function (article) {
      if (cat && article.category !== cat) return false;
      if (country && articleCountries(article).indexOf(country) === -1) return false;
      if (q) {
        var hay = (article.title + ' ' + excerpt(article) + ' ' + article.category).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    renderNewsList(container, filtered);
  }

  function initNewsFilters() {
    ['news-search', 'news-category', 'news-country'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener(id === 'news-search' ? 'input' : 'change', filterNews);
    });
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

    var hero = document.getElementById('article-hero-photo');
    if (hero) hero.style.backgroundImage = "url('" + article.bannerImage + "')";

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
        bodyHtml += '<div class="news-article-video"><iframe src="' + embed + '" title="' + article.title.replace(/"/g, '&quot;') + '" allowfullscreen loading="lazy"></iframe></div>';
      }
    }

    if (article.images.length) {
      bodyHtml += '<div class="news-article-gallery">';
      article.images.forEach(function (src) {
        bodyHtml += '<figure><img src="' + src + '" alt="' + article.title.replace(/"/g, '&quot;') + ' photo" loading="lazy"></figure>';
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
          '<img src="' + a.bannerImage + '" alt="">' +
          '<div><span class="news-related-date">' + a.date + '</span><h4>' + a.title + '</h4></div>' +
        '</a>'
      );
    }).join('');

    root.innerHTML =
      '<article class="news-article">' +
        '<div class="news-article-meta">' +
          '<span class="badge badge-amber">' + article.category + '</span>' +
          '<span class="news-article-date">' + article.date + '</span>' +
        '</div>' +
        '<h1 class="news-article-title">' + article.title + '</h1>' +
        '<div class="news-article-banner"><img src="' + article.bannerImage + '" alt="' + article.title.replace(/"/g, '&quot;') + '"></div>' +
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
      renderNewsList(list);
      initNewsFilters();
    }
    renderNewsArticle();
  });
})();
