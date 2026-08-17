/**
 * Full-width interactive Africa operations map
 * Leaflet + Esri satellite / terrain / hybrid layers (Google Earth style)
 */
(function () {
  'use strict';

  /* Markers and route geometry are database-driven and materialized into
     the versioned, same-origin public release. */
  function publicContentClient() {
    if (window.LakePublicContent) return Promise.resolve(window.LakePublicContent);
    if (window.LakePublicContentReady) return window.LakePublicContentReady;
    window.LakePublicContentReady = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = '/assets/public-content.js?v=1';
      script.async = true;
      script.onload = () => resolve(window.LakePublicContent || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
    return window.LakePublicContentReady;
  }

  const OPS_ISO = new Set(['TZ', 'KE', 'ZM', 'RW', 'BI', 'CD', 'ET', 'MZ', 'UG']);
  const COUNTRY_META = {
    tz: { iso: 'TZ', name: 'Tanzania', center: [-6.37, 34.9], zoom: 6 },
    ke: { iso: 'KE', name: 'Kenya', center: [-0.02, 37.9], zoom: 6 },
    zm: { iso: 'ZM', name: 'Zambia', center: [-14.4, 28.3], zoom: 6 },
    rw: { iso: 'RW', name: 'Rwanda', center: [-1.94, 29.87], zoom: 8 },
    bi: { iso: 'BI', name: 'Burundi', center: [-3.37, 29.36], zoom: 8 },
    cd: { iso: 'CD', name: 'DR Congo', center: [-4.0, 23.5], zoom: 5 },
    et: { iso: 'ET', name: 'Ethiopia', center: [9.03, 38.75], zoom: 5 },
    mz: { iso: 'MZ', name: 'Mozambique', center: [-18.25, 35.0], zoom: 5 },
    ug: { iso: 'UG', name: 'Uganda', center: [1.37, 32.29], zoom: 7 },
    ae: { iso: 'AE', name: 'Dubai, UAE', center: [25.2, 55.27], zoom: 9 },
  };

  let PIPELINES = [];

  // No red in the brand palette: "fuel" marker uses Light Blue to stay
  // visually distinct from the Deep Blue "logistics" marker.
  const TYPE_META = {
    hq:         { label: 'Headquarters', color: '#FFF200', radius: 11 },
    fuel:       { label: 'Fuel Station / Depot', color: '#0599D3', radius: 8 },
    port:       { label: 'Port', color: '#0ea5e9', radius: 8 },
    container:  { label: 'Container Depot', color: '#E8820C', radius: 8 },
    industrial: { label: 'Industrial Zone', color: '#64748b', radius: 8 },
    logistics:  { label: 'Logistics Hub', color: '#0181BB', radius: 8 },
    depots:     { label: 'Depot / Terminal', color: '#F4A261', radius: 8 },
  };

  let map, countryLayer, borderOutlineLayer, assetLayer, pipelineLayer, activeCountry = 'tz';
  let layerSatellite, layerTerrain, layerHybrid, layerStreets;

  function getIso(feature) {
    // The geo-countries dataset (datasets/geo-countries on GitHub) uses
    // 'ISO3166-1-Alpha-2' as the property key, not 'ISO_A2' - the original
    // code never matched any feature against this key, so country borders
    // never actually rendered from the fetched GeoJSON; the map silently
    // fell back to drawing plain circles every time, even when the fetch
    // itself succeeded.
    return (
      feature?.properties?.['ISO3166-1-Alpha-2'] ||
      feature?.properties?.ISO_A2 ||
      feature?.properties?.iso_a2 ||
      ''
    ).toUpperCase();
  }

  function getBorderStyle(iso) {
    const isOp = OPS_ISO.has(iso);
    const isActive = COUNTRY_META[activeCountry]?.iso === iso;
    if (isActive) {
      return {
        color: '#FFF200',
        weight: 4,
        fillColor: '#FFF200',
        fillOpacity: 0.28,
        opacity: 1,
      };
    }
    if (isOp) {
      return {
        color: '#FFF200',
        weight: 2.8,
        fillColor: '#0181BB',
        fillOpacity: 0.42,
        opacity: 1,
      };
    }
    return {
      color: 'rgba(255,255,255,0.9)',
      weight: 1.4,
      fillColor: 'rgba(0,0,0,0.15)',
      fillOpacity: 0.15,
      opacity: 0.95,
    };
  }

  function getOutlineStyle(iso) {
    const isOp = OPS_ISO.has(iso);
    const isActive = COUNTRY_META[activeCountry]?.iso === iso;
    return {
      color: isActive ? '#FFF200' : isOp ? 'rgba(255,242,0,0.85)' : 'rgba(255,255,255,0.55)',
      weight: isActive ? 2 : isOp ? 1.6 : 0.8,
      fillOpacity: 0,
      opacity: 1,
    };
  }

  function dotStyle(type, active) {
    const m = TYPE_META[type] || TYPE_META.logistics;
    const r = active ? m.radius + 3 : m.radius;
    return {
      radius: r,
      fillColor: m.color,
      color: active ? '#FFF200' : '#ffffff',
      weight: active ? 3 : 2,
      fillOpacity: 1,
      opacity: 1,
    };
  }

  function textElement(tagName, className, value) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = String(value ?? '');
    return element;
  }

  function assetPopupContent(asset) {
    const meta = TYPE_META[asset.type] || TYPE_META.logistics;
    const popup = document.createElement('div');
    popup.className = 'lake-popup';
    const type = textElement('div', 'lake-popup-type', meta.label);
    type.style.color = meta.color;
    popup.append(
      type,
      textElement('strong', '', asset.name),
      textElement('div', 'lake-popup-city', asset.city),
      textElement('p', '', asset.desc),
    );
    return popup;
  }

  function pipelinePopupContent(pipeline) {
    const popup = document.createElement('div');
    popup.className = 'lake-popup';
    popup.append(
      textElement('strong', '', pipeline.name),
      textElement('p', '', pipeline.desc),
    );
    return popup;
  }

  function showMapError(msg) {
    const el = document.getElementById('lake-africa-map');
    if (el) {
      el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.7);font-size:0.9rem;padding:24px;text-align:center">${msg}</div>`;
    }
  }

  function buildMap() {
    const el = document.getElementById('lake-africa-map');
    if (!el) return;
    if (typeof L === 'undefined') {
      showMapError('Map library failed to load. Check your internet connection and refresh.');
      return;
    }

    try {
    map = L.map('lake-africa-map', {
      center: [-6.37, 34.9],
      zoom: 6,
      minZoom: 3,
      maxZoom: 18,
      maxBounds: [[-40, -25], [40, 60]],
      maxBoundsViscosity: 0.85,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    layerSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri, Maxar, Earthstar Geographics', maxZoom: 19 }
    );

    layerTerrain = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      { attribution: 'OpenTopoMap (CC-BY-SA)', maxZoom: 17, subdomains: ['a', 'b', 'c'] }
    );

    layerStreets = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '&copy; OpenStreetMap', maxZoom: 19, subdomains: ['a', 'b', 'c'] }
    );

    const labelsOverlay = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri', maxZoom: 19, opacity: 0.9 }
    );

    const transportOverlay = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri', maxZoom: 19, opacity: 0.65 }
    );

    layerHybrid = L.layerGroup([layerSatellite, transportOverlay, labelsOverlay]);
    layerHybrid.addTo(map);

    map.createPane('bordersPane');
    map.getPane('bordersPane').style.zIndex = 420;

    L.control.layers(
      {
        'Hybrid, Satellite + Roads': layerHybrid,
        'Satellite Imagery': layerSatellite,
        'Terrain & Elevation': layerTerrain,
        'Streets & Roads': layerStreets,
      },
      null,
      { position: 'topright', collapsed: false }
    ).addTo(map);

    countryLayer = L.geoJSON(null, {
      pane: 'bordersPane',
      style: (feature) => getBorderStyle(getIso(feature)),
      onEachFeature: (feature, layer) => {
        const iso = getIso(feature);
        const name = feature.properties?.ADMIN || feature.properties?.name || iso;
        layer.bindTooltip(name, {
          permanent: OPS_ISO.has(iso),
          direction: 'center',
          className: OPS_ISO.has(iso) ? 'country-label-tip country-label-tip--op' : 'country-label-tip',
          opacity: OPS_ISO.has(iso) ? 1 : 0.85,
        });
        const entry = Object.entries(COUNTRY_META).find(([, v]) => v.iso === iso);
        if (entry) {
          layer.on('click', () => {
            window.selectCountry(entry[0], document.getElementById('card-' + entry[0]));
          });
        }
      },
    }).addTo(map);

    borderOutlineLayer = L.geoJSON(null, {
      pane: 'bordersPane',
      style: (feature) => getOutlineStyle(getIso(feature)),
      interactive: false,
    }).addTo(map);

    loadCountryBorders();

    pipelineLayer = L.layerGroup();
    PIPELINES.forEach((p) => {
      const line = L.polyline(p.coords, {
        color: p.color,
        weight: p.weight,
        opacity: 0.85,
        dashArray: p.dash || null,
      }).bindPopup(pipelinePopupContent(p));
      pipelineLayer.addLayer(line);
    });
    pipelineLayer.addTo(map);

    assetLayer = L.layerGroup();
    (window.__LAKE_MAP_ASSETS__ || []).forEach((a) => {
      const marker = L.circleMarker([a.lat, a.lng], dotStyle(a.type, false))
        .bindPopup(assetPopupContent(a))
        .on('click', () => {
          window.selectCountry(a.country, document.getElementById('card-' + a.country));
        });
      marker._lakeAsset = a;
      assetLayer.addLayer(marker);
    });
    assetLayer.addTo(map);

    map.on('baselayerchange', () => setTimeout(() => map.invalidateSize(), 200));
    setTimeout(() => map.invalidateSize(), 100);
    } catch (err) {
      console.error('Lake Africa map error:', err);
      showMapError('Map could not start. Please refresh the page.');
    }
  }

  function loadCountryBorders() {
    // Reads from a pre-loaded global variable (set by a plain <script> tag
    // loading assets/data_countries_africa.js) instead of fetch()-ing
    // assets/data_countries_africa.geojson directly. Browsers block fetch()
    // of local files under file:// (no visible error - it just silently
    // never resolves), which is how this map would behave if someone opens
    // the page directly from disk rather than through a web server. A
    // normal <script src="..."> tag has no such restriction.
    const drawFallbackCircles = () => {
      Object.entries(COUNTRY_META).forEach(([id, c]) => {
        if (id === 'ae') return;
        L.circle(c.center, {
          radius: id === 'cd' ? 450000 : id === 'et' || id === 'mz' ? 350000 : 220000,
          color: '#FFF200', weight: 3, fillColor: '#0181BB', fillOpacity: 0.35,
        }).on('click', () => window.selectCountry(id, document.getElementById('card-' + id)))
          .addTo(countryLayer);
      });
    };

    const geo = window.__LAKE_AFRICA_GEOJSON__;
    if (!geo || !Array.isArray(geo.features)) {
      console.error('Lake Africa map: __LAKE_AFRICA_GEOJSON__ not found, falling back to circles. Make sure assets/data_countries_africa.js is loaded before this script.');
      drawFallbackCircles();
      return;
    }

    try {
      const africa = {
        type: 'FeatureCollection',
        features: geo.features.filter((f) => {
          const iso = f.properties?.['ISO3166-1-Alpha-2'] || f.properties?.ISO_A2;
          return !!iso && iso !== '-99';
        }),
      };
      countryLayer.clearLayers();
      borderOutlineLayer.clearLayers();
      countryLayer.addData(africa);
      borderOutlineLayer.addData(africa);
    } catch (err) {
      console.error('Lake Africa map: error rendering country borders, falling back to circles.', err);
      drawFallbackCircles();
    }
  }

  function roughBbox(feature) {
    try {
      const coords = [];
      const g = feature.geometry;
      const walk = (c) => {
        if (typeof c[0] === 'number') coords.push(c);
        else c.forEach(walk);
      };
      walk(g.coordinates);
      const lats = coords.map((c) => c[1]);
      const lngs = coords.map((c) => c[0]);
      return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    } catch { return null; }
  }

  function flyToCountry(id) {
    if (!map) return;
    activeCountry = id;
    const c = COUNTRY_META[id];
    if (!c) return;
    map.flyTo(c.center, c.zoom, { duration: 1.4 });

    if (!countryLayer) return;
    countryLayer.eachLayer((layer) => {
      if (!layer.feature || !layer.setStyle) return;
      layer.setStyle(getBorderStyle(getIso(layer.feature)));
      const iso = getIso(layer.feature);
      const tip = layer.getTooltip();
      if (tip) tip.setOpacity(OPS_ISO.has(iso) ? 1 : 0.85);
    });

    if (borderOutlineLayer) {
      borderOutlineLayer.eachLayer((layer) => {
        if (!layer.feature || !layer.setStyle) return;
        layer.setStyle(getOutlineStyle(getIso(layer.feature)));
      });
    }

    if (!assetLayer) return;
    assetLayer.eachLayer((m) => {
      const a = m._lakeAsset;
      if (!a) return;
      m.setStyle(dotStyle(a.type, a.country === id));
    });
  }

  function filterAssets(type) {
    if (!assetLayer || !pipelineLayer) return;
    document.querySelectorAll('.map-legend-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.filter === type);
    });
    assetLayer.eachLayer((m) => {
      const a = m._lakeAsset;
      if (!a) return;
      const show = type === 'all' || a.type === type;
      m.setStyle({ fillOpacity: show ? 1 : 0.12, opacity: show ? 1 : 0.12 });
      if (m.getElement()) m.getElement().style.pointerEvents = show ? 'auto' : 'none';
    });
    pipelineLayer.eachLayer((l) => {
      l.setStyle({ opacity: type === 'all' || type === 'logistics' ? 0.85 : 0.12 });
    });
  }

  window.LakeAfricaMap = {
    flyToCountry,
    filterAssets,
    resetView: () => map?.flyTo([-6.37, 34.9], 6, { duration: 1.2 }),
    routeCount: () => PIPELINES.length,
  };

  /* Read the release map and flatten countries → regions → locations →
     facilities into the marker shape. */
  function fetchMapAssets() {
    return new Promise((resolve) => {
      publicContentClient()
        .then((client) => client
          ? Promise.all([client.map(), client.list('content-blocks')])
          : [null, []])
        .then(([data, blocks]) => {
          if (!data || !Array.isArray(data.countries)) return resolve(null);
          const routesBlock = blocks.find((block) => block.key === 'operations-map-routes');
          PIPELINES = routesBlock && routesBlock.content && Array.isArray(routesBlock.content.routes)
            ? routesBlock.content.routes
            : [];
          const slugById = {};
          (data.categories || []).forEach((c) => { if (c && c.id) slugById[c.id] = c.slug || c.name; });
          const assets = [];
          data.countries.forEach((country) => {
            (country.regions || []).forEach((region) => {
              (region.locations || []).forEach((location) => {
                (location.facilities || []).forEach((f) => {
                  assets.push({
                    id: f.id,
                    country: (country.isoCode || '').toLowerCase(),
                    type: f.mapCategoryId && slugById[f.mapCategoryId] ? slugById[f.mapCategoryId] : 'logistics',
                    name: f.name,
                    city: location.name || country.name || '',
                    lat: f.latitude,
                    lng: f.longitude,
                    desc: f.markerLabel || f.name,
                  });
                });
              });
            });
          });
          resolve(assets.length ? assets : null);
        })
        .catch(() => {
          resolve(null);
        });
    });
  }  document.addEventListener('DOMContentLoaded', () => {
    const boot = () => {
      buildMap();
      document.querySelectorAll('.map-legend-btn').forEach((btn) => {
        btn.addEventListener('click', () => filterAssets(btn.dataset.filter));
      });
      document.querySelectorAll('.ctry-card[data-country]').forEach((card) => {
        card.addEventListener('click', () => window.selectCountry(card.dataset.country, card));
      });
      document.getElementById('map-reset-btn')?.addEventListener('click', () => window.LakeAfricaMap.resetView());
      setTimeout(() => map?.invalidateSize(), 300);
    };
    fetchMapAssets().then((assets) => {
      if (assets) window.__LAKE_MAP_ASSETS__ = assets;
      boot();
    });
  });
})();
