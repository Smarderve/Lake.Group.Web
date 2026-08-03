/* =========================================================
 * Lake Group — CMS console for dashboard.html
 *
 * Replaces the old demo "client portal" with a real admin
 * console backed by the self-hosted Payload CMS REST API:
 *   POST   /api/users/login        → JWT token (sessionStorage)
 *   GET    /api/{collection}       → list docs (KPI counts too)
 *   POST   /api/{collection}       → create
 *   PATCH  /api/{collection}/{id}  → update
 *   DELETE /api/{collection}/{id}  → delete
 *   Media collection is handled with multipart/form-data.
 *
 * Configure BEFORE this script loads, e.g. in dashboard.html:
 *   window.LAKE_CMS_API_URL = 'https://cms.example.com';
 * Leave it empty and the console explains that it is offline.
 * ========================================================= */
(function () {
  'use strict';

  var API_BASE = (window.LAKE_CMS_API_URL || '').replace(/\/+$/, '');
  var TOKEN_KEY = 'lake_cms_token';
  var USER_KEY = 'lake_cms_user';
  var FETCH_TIMEOUT = 8000;

  var state = {
    token: null,
    user: null,
    activeSlug: 'news',
    docs: [],
    mediaList: [],
    countryList: [],
    editing: null
  };

  /* -----------------------------------------------------------
   * Collection registry — drives the KPI rail, the nav, the
   * list tables and the generated editor form. JSON/complex
   * fields are exposed as JSON textareas under "Advanced".
   * ----------------------------------------------------------- */
  var COLLECTIONS = [
    {
      slug: 'news', label: 'News', titleField: 'title', defaultSort: '-date',
      columns: [
        { key: 'title', label: 'Title', title: true },
        { key: 'category', label: 'Category', badge: true },
        {
          key: 'status', label: 'Status', badge: true,
          badgeMap: { published: 'green', draft: 'yellow', archived: 'yellow' }
        },
        { key: 'date', label: 'Date', date: true }
      ],
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true },
        { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'published', options: ['draft', 'published', 'archived'] },
        { name: 'category', label: 'Category', type: 'select', required: true, options: ['Expansion', 'LPG', 'Awards', 'Business', 'Logistics', 'Events', 'Sports', 'CSR', 'Announcements'] },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'excerpt', label: 'Excerpt', type: 'textarea' },
        { name: 'videoUrl', label: 'Video URL', type: 'text' },
        { name: 'bannerImage', label: 'Banner image', type: 'media' },
        { name: 'legacyId', label: 'Legacy ID', type: 'number' },
        { name: 'description', label: 'Paragraphs (JSON)', type: 'json', advanced: true, hint: '[{ "paragraph": "text" }]' },
        { name: 'images', label: 'Gallery images (JSON)', type: 'json', advanced: true, hint: '[{ "image": "<media id>" }]' }
      ]
    },
    {
      slug: 'leaders', label: 'Leaders', titleField: 'name', defaultSort: 'sortOrder',
      columns: [
        { key: 'name', label: 'Name', title: true },
        { key: 'role', label: 'Role' },
        { key: 'featured', label: 'Featured', bool: true }
      ],
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'role', label: 'Role', type: 'text', required: true },
        { name: 'unit', label: 'Unit', type: 'text' },
        { name: 'slug', label: 'Slug', type: 'text', required: true },
        { name: 'featured', label: 'Featured', type: 'checkbox' },
        { name: 'sortOrder', label: 'Sort order', type: 'number' },
        { name: 'isLogo', label: 'Show logo instead of photo', type: 'checkbox' },
        { name: 'lede', label: 'Lede', type: 'textarea' },
        { name: 'quote', label: 'Quote', type: 'textarea' },
        { name: 'photo', label: 'Photo', type: 'media' },
        { name: 'bio', label: 'Bio (Lexical JSON)', type: 'json', advanced: true, hint: 'Lexical rich-text state — use the /admin editor for full formatting.' },
        { name: 'mandate', label: 'Responsibilities (JSON)', type: 'json', advanced: true, hint: '[{ "item": "text" }]' },
        { name: 'facts', label: 'Facts (JSON)', type: 'json', advanced: true, hint: '[{ "label": "…", "value": "…" }]' }
      ]
    },
    {
      slug: 'companies', label: 'Companies', titleField: 'name', defaultSort: 'sortOrder',
      columns: [
        { key: 'name', label: 'Name', title: true },
        { key: 'division', label: 'Division', badge: true },
        { key: 'founded', label: 'Founded' },
        { key: 'featured', label: 'Featured', bool: true }
      ],
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true },
        { name: 'division', label: 'Division', type: 'select', required: true, options: ['energies', 'manufacturing', 'logistics', 'realestate', 'agro'] },
        { name: 'tagline', label: 'Tagline', type: 'text' },
        { name: 'founded', label: 'Founded', type: 'text' },
        { name: 'pageUrl', label: 'Page URL', type: 'text' },
        { name: 'sortOrder', label: 'Sort order', type: 'number' },
        { name: 'featured', label: 'Featured', type: 'checkbox' },
        { name: 'logo', label: 'Logo', type: 'media' },
        { name: 'heroImage', label: 'Hero image', type: 'media' },
        { name: 'headquarters', label: 'Headquarters', type: 'country' },
        { name: 'description', label: 'Description (Lexical JSON)', type: 'json', advanced: true, hint: 'Lexical rich-text state — use the /admin editor for full formatting.' },
        { name: 'keyStats', label: 'Key stats (JSON)', type: 'json', advanced: true, hint: '[{ "label": "…", "value": "…" }]' }
      ]
    },
    {
      slug: 'countries', label: 'Countries', titleField: 'name', defaultSort: 'name',
      columns: [
        { key: 'name', label: 'Name', title: true },
        { key: 'code', label: 'Code' },
        { key: 'isOperational', label: 'Operational', bool: true },
        { key: 'isHeadquarters', label: 'HQ', bool: true }
      ],
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'code', label: 'Code', type: 'text', required: true, hint: 'ISO 3166-1 alpha-2 — e.g. TZ' },
        { name: 'isOperational', label: 'Operational', type: 'checkbox' },
        { name: 'isHeadquarters', label: 'Headquarters', type: 'checkbox' },
        { name: 'summary', label: 'Summary', type: 'textarea' },
        { name: 'lat', label: 'Latitude', type: 'number' },
        { name: 'lng', label: 'Longitude', type: 'number' },
        { name: 'defaultZoom', label: 'Default zoom', type: 'number' },
        { name: 'subsidiaryCount', label: 'Subsidiary count', type: 'number' },
        { name: 'flag', label: 'Flag', type: 'media' }
      ]
    },
    {
      slug: 'media', label: 'Media', titleField: 'filename', defaultSort: '-updatedAt', isMedia: true,
      columns: [
        { key: 'thumb', label: '', thumb: true },
        { key: 'filename', label: 'File', title: true },
        { key: 'alt', label: 'Alt text' },
        { key: 'updatedAt', label: 'Updated', date: true }
      ],
      fields: [
        { name: 'alt', label: 'Alt text', type: 'text', required: true },
        { name: 'file', label: 'File (image)', type: 'file' }
      ]
    }
  ];

  /* -----------------------------------------------------------
   * Small helpers
   * ----------------------------------------------------------- */
  function $(sel) { return document.querySelector(sel); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getColl(slug) {
    for (var i = 0; i < COLLECTIONS.length; i++) {
      if (COLLECTIONS[i].slug === slug) return COLLECTIONS[i];
    }
    return COLLECTIONS[0];
  }

  function findDoc(id) {
    for (var i = 0; i < state.docs.length; i++) {
      if (String(state.docs[i].id) === String(id)) return state.docs[i];
    }
    return null;
  }

  function resolveUrl(url) {
    if (!url) return '';
    if (/^https?:/i.test(url)) return url;
    return API_BASE + (url.charAt(0) === '/' ? '' : '/') + url;
  }

  function formatDate(v) {
    if (!v) return '—';
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return m[3] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m[2], 10) - 1] + ', ' + m[1];
    }
    var d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toISOString().slice(0, 10);
  }

  function badgeClass(col, v) {
    if (col.badgeMap && col.badgeMap[v]) return 'badge-' + col.badgeMap[v];
    return 'badge-yellow';
  }

  /* -----------------------------------------------------------
   * Toast + login notices
   * ----------------------------------------------------------- */
  var toastTimer = null;
  function toast(msg, isErr) {
    var el = $('#cms-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'cms-toast' + (isErr ? ' cms-toast-err' : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3600);
  }

  function showLoginError(msg) {
    var el = $('#login-error');
    if (!el) return;
    if (!msg) {
      el.textContent = '';
      el.hidden = true;
      return;
    }
    el.textContent = msg;
    el.hidden = false;
  }

  /* -----------------------------------------------------------
   * API — authenticated fetch with timeout + error mapping
   * ----------------------------------------------------------- */
  function api(path, opts) {
    opts = opts || {};
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT) : null;
    var headers = {};
    for (var k in (opts.headers || {})) headers[k] = opts.headers[k];
    if (state.token) headers['Authorization'] = 'JWT ' + state.token;
    var init = { method: opts.method || 'GET', headers: headers };
    if (controller) init.signal = controller.signal;
    if (opts.body !== undefined) init.body = opts.body;

    return fetch(API_BASE + path, init).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var msg = (data && data.errors && data.errors[0] && data.errors[0].message) ||
            data.message || ('HTTP ' + res.status);
          /* Expired/revoked session — drop back to the login screen.
             (During login itself state.token is null, so a bad-credential
             401 just surfaces the Payload error message instead.) */
          if (res.status === 401 && state.token) {
            var err401 = new Error('Your session has expired. Please sign in again.');
            err401.status = 401;
            setTimeout(function () { logout(); }, 0);
            throw err401;
          }
          var e = new Error(msg);
          e.status = res.status;
          throw e;
        }
        return data;
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === 'AbortError') {
        var e2 = new Error('Request timed out — is the CMS reachable?');
        e2.status = 0;
        throw e2;
      }
      throw err;
    });
  }

  /* -----------------------------------------------------------
   * Auth
   * ----------------------------------------------------------- */
  function login() {
    var emailEl = $('#login-email');
    var pwEl = $('#login-pw');
    var note = $('#login-note');
    if (note) note.hidden = true;
    showLoginError('');

    var email = emailEl ? emailEl.value.trim() : '';
    var pw = pwEl ? pwEl.value : '';
    if (!email || !pw) { showLoginError('Please enter your email and password.'); return; }
    if (!API_BASE) {
      showLoginError('CMS endpoint not configured — set window.LAKE_CMS_API_URL on this page.');
      return;
    }

    var btn = $('#login-btn');
    var btnLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

    api('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pw })
    }).then(function (data) {
      if (!data.token) throw new Error('No token returned by the CMS.');
      state.token = data.token;
      state.user = data.user || { email: email };
      try {
        sessionStorage.setItem(TOKEN_KEY, state.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(state.user));
      } catch (e) { /* private mode — keep session in memory */ }
      enterConsole();
    }).catch(function (err) {
      showLoginError(err.message || 'Unable to sign in.');
    }).then(function () {
      /* Restore the localized label (data-i18n="dashboard.9") rather than
         hardcoding English — the dictionary may have re-applied already. */
      if (btn) { btn.disabled = false; btn.textContent = btnLabel || 'Sign In'; }
    });
  }

  function logout() {
    state.token = null;
    state.user = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch (e) { /* ignore */ }
    showLogin();
  }

  function restoreSession() {
    try {
      var t = sessionStorage.getItem(TOKEN_KEY);
      var u = sessionStorage.getItem(USER_KEY);
      if (t) { state.token = t; state.user = u ? JSON.parse(u) : null; }
    } catch (e) { /* ignore */ }
    /* A stale token without a configured API would fetch relative /api/*
       against the static host — only restore when the API is set. */
    if (state.token && API_BASE) {
      enterConsole();
    } else {
      state.token = null;
      showLogin();
    }
  }

  /* -----------------------------------------------------------
   * Views
   * ----------------------------------------------------------- */
  function showLogin() {
    var loginPanel = $('#login-panel');
    var dashPanel = $('#dashboard-panel');
    if (loginPanel) loginPanel.style.display = 'block';
    if (dashPanel) dashPanel.style.display = 'none';
    if (!API_BASE) {
      var n = $('#login-note');
      if (n) {
        n.textContent = 'CMS not configured — set window.LAKE_CMS_API_URL to this page to enable the console.';
        n.hidden = false;
      }
    }
  }

  function enterConsole() {
    var loginPanel = $('#login-panel');
    var dashPanel = $('#dashboard-panel');
    if (loginPanel) loginPanel.style.display = 'none';
    if (dashPanel) dashPanel.style.display = 'block';
    var nameEl = $('#dash-name');
    if (nameEl) {
      nameEl.textContent = (state.user && (state.user.name || state.user.email)) || 'Editor';
    }
    renderNav();
    loadCounts();
    switchCollection(state.activeSlug);
  }

  /* -----------------------------------------------------------
   * KPI rail + collection nav
   * ----------------------------------------------------------- */
  function renderNav() {
    var nav = $('#cms-nav');
    if (!nav) return;
    nav.innerHTML = COLLECTIONS.map(function (c) {
      var count = c.count != null ? '<span class="cms-nav-count">' + c.count + '</span>' : '';
      return      '<button type="button" class="cms-nav-btn' + (c.slug === state.activeSlug ? ' is-active' : '') +
        '" data-slug="' + c.slug + '" role="tab">' + esc(c.label) + count + '</button>';
    }).join('');
    /* Click handling is delegated once in init() — avoid double-firing. */
  }

  function renderKpis() {
    var rail = $('#cms-kpis');
    if (!rail) return;
    rail.innerHTML = COLLECTIONS.map(function (c) {
      return '<div class="kpi kpi-gold"><div class="kpi-no">' + (c.count || 0) +
        '</div><p>' + esc(c.label) + '</p></div>';
    }).join('');
  }

  function loadCounts() {
    COLLECTIONS.forEach(function (c) {
      api('/api/' + c.slug + '?limit=1&depth=0').then(function (data) {
        c.count = data.totalDocs || 0;
        renderNav();
        renderKpis();
      }).catch(function () {
        c.count = 0;
        renderKpis();
      });
    });
  }

  /* -----------------------------------------------------------
   * List views
   * ----------------------------------------------------------- */
  function switchCollection(slug) {
    state.activeSlug = slug;
    renderNav();
    var c = getColl(slug);
    var title = $('#cms-col-title');
    if (title) title.textContent = c.label;
    var wrap = $('#cms-table-wrap');
    if (wrap) wrap.innerHTML = '<p class="cms-loading">Loading…</p>';
    loadList(slug);
  }

  function loadList(slug) {
    var c = getColl(slug);
    var sort = c.defaultSort || '-updatedAt';
    api('/api/' + slug + '?limit=100&depth=0&sort=' + encodeURIComponent(sort))
      .then(function (data) {
        state.docs = data.docs || [];
        renderTable();
      })
      .catch(function (err) {
        var wrap = $('#cms-table-wrap');
        if (wrap) wrap.innerHTML = '<p class="cms-loading">' + esc(err.message) + '</p>';
      });
  }

  function renderTable() {
    var c = getColl(state.activeSlug);
    var wrap = $('#cms-table-wrap');
    if (!wrap) return;
    if (!state.docs.length) {
      wrap.innerHTML = '<p class="cms-empty">No records yet — create the first one.</p>';
      return;
    }
    var thead = '<tr>' + c.columns.map(function (col) {
      return '<th>' + esc(col.label) + '</th>';
    }).join('') + '<th></th></tr>';

    var rows = state.docs.map(function (doc) {
      var tds = c.columns.map(function (col) {
        var v = doc[col.key];
        if (col.thumb) {
          var url = resolveUrl(doc.url);
          return '<td>' + (url ? '<img class="cms-thumb" src="' + esc(url) + '" alt="" loading="lazy">' : '—') + '</td>';
        }
        if (col.bool) {
          return '<td>' + (v ? '<span class="badge badge-green">Yes</span>' : '<span class="badge">No</span>') + '</td>';
        }
        if (col.badge) {
          return '<td><span class="badge ' + badgeClass(col, v) + '">' + esc(v || '—') + '</span></td>';
        }
        if (col.date) {
          return '<td>' + esc(formatDate(v)) + '</td>';
        }
        if (col.title) {
          return '<td class="cms-row-title">' + esc(v) + '</td>';
        }
        if (v && typeof v === 'object') {
          return '<td>' + esc(v.name || v.title || v.filename || String(v.id)) + '</td>';
        }
        return '<td>' + esc(v == null ? '—' : v) + '</td>';
      }).join('');

      tds += '<td class="cms-actions">' +
        '<button type="button" class="btn btn-outline-dark btn-sm" data-act="edit" data-id="' + esc(doc.id) + '">Edit</button>' +
        '<button type="button" class="btn btn-outline-dark btn-sm cms-del" data-act="del" data-id="' + esc(doc.id) + '">Delete</button>' +
        '</td>';
      return '<tr>' + tds + '</tr>';
    }).join('');

    wrap.innerHTML = '<table class="fs-table cms-table"><thead>' + thead + '</thead><tbody>' + rows + '</tbody></table>';

    wrap.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        if (btn.getAttribute('data-act') === 'edit') {
          openEditor(findDoc(id));
        } else {
          deleteDoc(id);
        }
      });
    });
  }

  /* -----------------------------------------------------------
   * Editor modal
   * ----------------------------------------------------------- */
  function loadEditorOptions(c) {
    var tasks = [];
    var needsMedia = c.fields.some(function (f) { return f.type === 'media'; });
    var needsCountries = c.fields.some(function (f) { return f.type === 'country'; });
    if (needsMedia && !state.mediaList.length) {
      tasks.push(api('/api/media?limit=200&depth=0').then(function (d) {
        state.mediaList = d.docs || [];
      }).catch(function () { state.mediaList = []; }));
    }
    if (needsCountries && !state.countryList.length) {
      tasks.push(api('/api/countries?limit=100&depth=0').then(function (d) {
        state.countryList = d.docs || [];
      }).catch(function () { state.countryList = []; }));
    }
    return Promise.all(tasks);
  }

  function openEditor(doc) {
    state.editing = doc || null;
    var c = getColl(state.activeSlug);
    var titleEl = $('#cms-editor-title');
    if (titleEl) titleEl.textContent = (doc ? 'Edit ' : 'New ') + c.label;
    var modal = $('#cms-editor');
    var form = $('#cms-editor-form');
    if (!modal || !form) return;

    loadEditorOptions(c).then(function () {
      form.innerHTML = buildEditorForm(c, doc);
      bindEditorForm();
      modal.hidden = false;
      var first = form.querySelector('input:not([type="hidden"]), select, textarea');
      if (first) first.focus();
    });
  }

  function closeEditor() {
    var modal = $('#cms-editor');
    var form = $('#cms-editor-form');
    if (modal) modal.hidden = true;
    if (form) form.innerHTML = '';
    state.editing = null;
  }

  function buildField(f, doc) {
    var val = doc ? doc[f.name] : undefined;

    if (f.advanced) {
      var jsonVal = '';
      if (val !== undefined && val !== null) jsonVal = JSON.stringify(val, null, 2);
      return '<details class="cms-adv"><summary>' + esc(f.label) + '</summary>' +
        '<div class="cms-adv-inner"><div class="cms-fgroup">' +
        '<textarea data-json-field="' + esc(f.name) + '" placeholder="' + esc(f.hint || 'JSON') + '" spellcheck="false">' +
        esc(jsonVal) + '</textarea>' +
        (f.hint ? '<span class="cms-hint">' + esc(f.hint) + '</span>' : '') +
        '</div></div></details>';
    }

    if (f.type === 'checkbox') {
      return '<div class="cms-fgroup cms-check-row">' +
        '<input type="checkbox" name="' + esc(f.name) + '" id="f-' + esc(f.name) + '"' + (val ? ' checked' : '') + '>' +
        '<label for="f-' + esc(f.name) + '">' + esc(f.label) + '</label></div>';
    }

    var req = f.required ? ' required' : '';
    var ctrlId = 'f-' + f.name;
    var body = '';
    if (f.type === 'textarea') {
      body = '<textarea id="' + ctrlId + '" name="' + esc(f.name) + '"' + req + '>' + esc(val || '') + '</textarea>';
    } else if (f.type === 'select') {
      var selVal = val !== undefined && val !== null ? val : (f.defaultValue || '');
      body = '<select id="' + ctrlId + '" name="' + esc(f.name) + '"' + req + '><option value=""></option>' +
        f.options.map(function (o) {
          return '<option value="' + esc(o) + '"' + (String(selVal) === String(o) ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';
    } else if (f.type === 'media') {
      var mediaVal = val && typeof val === 'object' ? val.id : val;
      body = '<select id="' + ctrlId + '" name="' + esc(f.name) + '"><option value="">(none)</option>' +
        state.mediaList.map(function (m) {
          var label = m.alt || m.filename || ('#' + m.id);
          return '<option value="' + esc(m.id) + '"' + (String(mediaVal) === String(m.id) ? ' selected' : '') + '>' + esc(label) + '</option>';
        }).join('') + '</select>' +
        '<span class="cms-hint">Upload files in the Media collection first, then pick them here.</span>';
    } else if (f.type === 'country') {
      var cVal = val && typeof val === 'object' ? val.id : val;
      body = '<select id="' + ctrlId + '" name="' + esc(f.name) + '"><option value="">(none)</option>' +
        state.countryList.map(function (ct) {
          return '<option value="' + esc(ct.id) + '"' + (String(cVal) === String(ct.id) ? ' selected' : '') + '>' + esc(ct.name) + '</option>';
        }).join('') + '</select>';
    } else if (f.type === 'file') {
      body = '<input id="' + ctrlId + '" type="file" name="' + esc(f.name) + '" accept="image/*"' +
        (f.required ? req : '') + '>';
    } else if (f.type === 'number') {
      body = '<input id="' + ctrlId + '" type="number" step="any" name="' + esc(f.name) + '" value="' + esc(val == null ? '' : val) + '"' + req + '>';
    } else if (f.type === 'date') {
      var dv = val ? String(val).slice(0, 10) : '';
      body = '<input id="' + ctrlId + '" type="date" name="' + esc(f.name) + '" value="' + esc(dv) + '"' + req + '>';
    } else {
      body = '<input id="' + ctrlId + '" type="text" name="' + esc(f.name) + '" value="' + esc(val == null ? '' : val) + '"' + req + '>';
    }

    return '<div class="cms-fgroup"><label for="' + ctrlId + '">' + esc(f.label) + '</label>' + body +
      (f.hint && f.type !== 'media' ? '<span class="cms-hint">' + esc(f.hint) + '</span>' : '') + '</div>';
  }

  function buildEditorForm(c, doc) {
    var html = c.fields.map(function (f) { return buildField(f, doc); }).join('');
    var foot = '<div class="cms-form-foot">' +
      (doc ? '<button type="button" class="btn btn-outline-dark btn-sm cms-del" data-act="delete">Delete</button>' : '<span></span>') +
      '<span class="cms-form-actions">' +
      '<button type="button" class="btn btn-outline-dark btn-sm" data-act="cancel">Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">' + (doc ? 'Save Changes' : 'Create') + '</button>' +
      '</span></div>';
    return html + foot;
  }

  function bindEditorForm() {
    var form = $('#cms-editor-form');
    if (!form) return;
    /* The form element persists across opens — assign via onsubmit so the
       handler replaces itself instead of stacking duplicates. */
    form.onsubmit = function (e) {
      e.preventDefault();
      saveEditor();
    };
    var cancel = form.querySelector('[data-act="cancel"]');
    if (cancel) cancel.addEventListener('click', closeEditor);
    var del = form.querySelector('[data-act="delete"]');
    if (del) del.addEventListener('click', function () {
      var id = state.editing && state.editing.id;
      closeEditor();
      if (id) deleteDoc(id);
    });
  }

  /* -----------------------------------------------------------
   * Save / delete
   * ----------------------------------------------------------- */
  function saveEditor() {
    var c = getColl(state.activeSlug);
    var form = $('#cms-editor-form');
    if (!form) return;

    var data = {};
    var ok = true;

    c.fields.forEach(function (f) {
      if (f.type === 'json' || f.type === 'file') return;
      var el = form.querySelector('[name="' + f.name + '"]');
      if (!el) return;
      var v;
      if (f.type === 'checkbox') v = el.checked;
      else if (f.type === 'number') v = el.value === '' ? null : Number(el.value);
      else if (f.type === 'date') v = el.value ? el.value + 'T00:00:00.000Z' : null;
      else v = el.value;

      if (f.required && (v === '' || v === null || v === false)) {
        ok = false;
        toast(f.label + ' is required.', true);
      } else if (f.type === 'number' && v !== null && isNaN(v)) {
        ok = false;
        toast(f.label + ' must be a number.', true);
      } else {
        /* media/country selects render as <select> — empty picks must
           become null (Payload rejects '' for upload/relationship fields). */
        var isSelectLike = f.type === 'select' || f.type === 'media' || f.type === 'country';
        data[f.name] = (isSelectLike && v === '') ? null : v;
      }
    });

    if (!ok) return;

    form.querySelectorAll('[data-json-field]').forEach(function (ta) {
      var name = ta.getAttribute('data-json-field');
      var raw = ta.value.trim();
      if (!raw) {
        data[name] = (c.slug === 'news' && (name === 'description' || name === 'images')) ? [] : null;
        return;
      }
      try {
        data[name] = JSON.parse(raw);
      } catch (e) {
        ok = false;
        toast(name + ' has invalid JSON.', true);
      }
    });
    if (!ok) return;

    var saveBtn = form.querySelector('[type="submit"]');
    if (saveBtn) saveBtn.disabled = true;

    var p;
    if (c.isMedia) {
      var fileEl = form.querySelector('[name="file"]');
      var hasFile = fileEl && fileEl.files && fileEl.files[0];
      if (!state.editing && !hasFile) {
        toast('A file is required when creating a media record.', true);
        if (saveBtn) saveBtn.disabled = false;
        return;
      }
      var fd = new FormData();
      fd.append('alt', data.alt || '');
      if (hasFile) fd.append('file', hasFile);
      p = api('/api/media' + (state.editing ? '/' + state.editing.id : ''), {
        method: state.editing ? 'PATCH' : 'POST',
        body: fd
      });
    } else {
      var body = JSON.stringify(data);
      var url = '/api/' + c.slug + (state.editing ? '/' + state.editing.id : '');
      p = api(url, {
        method: state.editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
    }

    p.then(function () {
      var created = !state.editing;
      closeEditor();
      toast((created ? 'Created' : 'Updated') + ' ' + c.label + ' record.');
      loadCounts();
      loadList(state.activeSlug);
    }).catch(function (err) {
      toast(err.message || 'Save failed.', true);
      if (saveBtn) saveBtn.disabled = false;
    });
  }

  function deleteDoc(id) {
    var c = getColl(state.activeSlug);
    if (!window.confirm('Delete this ' + c.label.toLowerCase() + ' record? This cannot be undone.')) return;
    api('/api/' + c.slug + '/' + id, { method: 'DELETE' })
      .then(function () {
        toast('Deleted ' + c.label + ' record.');
        loadCounts();
        loadList(state.activeSlug);
      })
      .catch(function (err) {
        toast(err.message || 'Delete failed.', true);
      });
  }

  function newDoc() { openEditor(null); }
  function refresh() { loadCounts(); loadList(state.activeSlug); }

  /* -----------------------------------------------------------
   * Init
   * ----------------------------------------------------------- */
  function init() {
    var form = $('#login-form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); login(); });

    var closeBtn = $('#cms-editor-close');
    if (closeBtn) closeBtn.addEventListener('click', closeEditor);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var m = $('#cms-editor');
        if (m && !m.hidden) closeEditor();
      }
    });

    var nav = $('#cms-nav');
    if (nav) nav.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.cms-nav-btn');
      if (b) switchCollection(b.getAttribute('data-slug'));
    });

    var newBtn = $('#cms-new');
    if (newBtn) newBtn.addEventListener('click', newDoc);
    var refreshBtn = $('#cms-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', refresh);
  }

  /* Exposed for inline handlers in dashboard.html */
  window.doLogin = login;
  window.doLogout = logout;
  window.LakeCms = {
    refresh: refresh,
    newDoc: newDoc,
    openEditor: openEditor,
    closeEditor: closeEditor,
    switchCollection: switchCollection
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); restoreSession(); });
  } else {
    init();
    restoreSession();
  }
})();
