/**
 * Full-width interactive Africa operations map
 * Leaflet + Esri satellite / terrain / hybrid layers (Google Earth style)
 */
(function () {
  'use strict';

  const OPS_ISO = new Set(['TZ', 'KE', 'ZM', 'RW', 'BI', 'CD', 'ET', 'MZ']);
  const COUNTRY_META = {
    tz: { iso: 'TZ', name: 'Tanzania', center: [-6.37, 34.9], zoom: 6 },
    ke: { iso: 'KE', name: 'Kenya', center: [-0.02, 37.9], zoom: 6 },
    zm: { iso: 'ZM', name: 'Zambia', center: [-14.4, 28.3], zoom: 6 },
    rw: { iso: 'RW', name: 'Rwanda', center: [-1.94, 29.87], zoom: 8 },
    bi: { iso: 'BI', name: 'Burundi', center: [-3.37, 29.36], zoom: 8 },
    cd: { iso: 'CD', name: 'DRC', center: [-4.0, 23.5], zoom: 5 },
    et: { iso: 'ET', name: 'Ethiopia', center: [9.03, 38.75], zoom: 5 },
    mz: { iso: 'MZ', name: 'Mozambique', center: [-18.25, 35.0], zoom: 5 },
    ae: { iso: 'AE', name: 'Dubai, UAE', center: [25.2, 55.27], zoom: 9 },
  };

  const ASSETS = [
    { id: 'hq-dar', country: 'tz', type: 'hq', name: 'Lake Group HQ', city: 'Dar es Salaam', lat: -6.7924, lng: 39.2083,
      desc: 'Corporate headquarters and flagship Lake Oil operations.' },
    { id: 'port-dar', country: 'tz', type: 'port', name: 'Dar es Salaam Port', city: 'Dar es Salaam', lat: -6.853, lng: 39.293,
      desc: 'Major Indian Ocean gateway for fuel, containers and regional trade.' },
    { id: 'aficd-dar', country: 'tz', type: 'container', name: 'AFICD Depot', city: 'Dar es Salaam', lat: -6.868, lng: 39.245,
      desc: 'African Inland Container Depot, port extension & container yard.' },
    { id: 'steel-moro', country: 'tz', type: 'industrial', name: 'Lake Steel Mill', city: 'Morogoro', lat: -6.817, lng: 37.667,
      desc: 'HS-CR rebar rolling mill, 100,000 MT annual capacity.' },
    { id: 'gccp-dar', country: 'tz', type: 'industrial', name: 'GCCP Ready-Mix', city: 'Dar es Salaam', lat: -6.75, lng: 39.18,
      desc: 'Gulf Concrete & Cement Products, ready-mix concrete plants.' },
    { id: 'fuel-dar', country: 'tz', type: 'fuel', name: 'Lake Oil Depots', city: 'Dar es Salaam', lat: -6.82, lng: 39.25,
      desc: 'Bulk petroleum storage and distribution hub.' },
    { id: 'hub-dar', country: 'tz', type: 'logistics', name: 'Lake Trans Hub', city: 'Dar es Salaam', lat: -6.78, lng: 39.22,
      desc: '700+ truck fleet coordination and bulk liquid haulage.' },

    { id: 'fuel-nrb', country: 'ke', type: 'fuel', name: 'Lake Oil Kenya', city: 'Nairobi', lat: -1.2921, lng: 36.8219,
      desc: 'Petroleum distribution and retail network.' },
    { id: 'port-mba', country: 'ke', type: 'port', name: 'Mombasa Port', city: 'Mombasa', lat: -4.0435, lng: 39.6682,
      desc: 'East Africa\'s largest seaport, fuel & cargo gateway.' },
    { id: 'hub-nrb', country: 'ke', type: 'logistics', name: 'Lake Trans Kenya', city: 'Nairobi', lat: -1.31, lng: 36.85,
      desc: 'Cross-border haulage and regional logistics.' },

    { id: 'fuel-lus', country: 'zm', type: 'fuel', name: 'Lake Petroleum Zambia', city: 'Lusaka', lat: -15.3875, lng: 28.3228,
      desc: 'Fuel storage and nationwide distribution.' },
    { id: 'aficd-zm', country: 'zm', type: 'container', name: 'AFICD Zambia', city: 'Lusaka', lat: -15.42, lng: 28.28,
      desc: 'Inland container depot serving the Copperbelt corridor.' },
    { id: 'hub-lus', country: 'zm', type: 'logistics', name: 'Lake Trans Zambia', city: 'Lusaka', lat: -15.36, lng: 28.35,
      desc: 'Bulk liquid and cargo transport across Zambia.' },

    { id: 'fuel-kgl', country: 'rw', type: 'fuel', name: 'Lake Petroleum Rwanda', city: 'Kigali', lat: -1.9441, lng: 30.0619,
      desc: 'Fuel and LPG distribution in Rwanda.' },
    { id: 'hub-kgl', country: 'rw', type: 'logistics', name: 'Lake Gas Rwanda', city: 'Kigali', lat: -1.97, lng: 30.08,
      desc: 'LPG bottling and distribution.' },

    { id: 'fuel-buj', country: 'bi', type: 'fuel', name: 'Burundi Petroleum', city: 'Bujumbura', lat: -3.3614, lng: 29.3599,
      desc: 'Petroleum import and distribution.' },

    { id: 'fuel-lub', country: 'cd', type: 'fuel', name: 'DRC Petroleum', city: 'Lubumbashi', lat: -11.6647, lng: 27.4794,
      desc: 'Fuel supply in eastern DRC mining corridor.' },
    { id: 'hub-kis', country: 'cd', type: 'logistics', name: 'Lake Trans DRC', city: 'Kisangani', lat: 0.515, lng: 25.191,
      desc: 'River & road logistics in central Africa.' },

    { id: 'fuel-add', country: 'et', type: 'fuel', name: 'Wadi Elsundus Petroleum', city: 'Addis Ababa', lat: 9.032, lng: 38.746,
      desc: 'Petroleum operations in Ethiopia.' },

    { id: 'port-map', country: 'mz', type: 'port', name: 'Maputo Port', city: 'Maputo', lat: -25.9692, lng: 32.5732,
      desc: 'Southern corridor port for fuel and containers.' },
    { id: 'aficd-mz', country: 'mz', type: 'container', name: 'AFICD Mozambique', city: 'Maputo', lat: -25.95, lng: 32.55,
      desc: 'Container depot and freight services.' },

    { id: 'merm-dxb', country: 'ae', type: 'industrial', name: 'MERM Ready Mix', city: 'Dubai', lat: 25.2048, lng: 55.2708,
      desc: 'Middle East Ready Mix LLC, major UAE concrete plant.' },
  ];

  const PIPELINES = [
    { name: 'TAZAMA Fuel Pipeline', color: '#FFD700', weight: 4, dash: '8 6',
      coords: [[-6.85, 39.28], [-7.5, 38.5], [-9.0, 36.5], [-11.0, 34.0], [-13.0, 32.5], [-15.4, 28.3]],
      desc: 'Dar es Salaam → Lusaka petroleum pipeline corridor.' },
    { name: 'Northern Logistics Corridor', color: '#1D3EA8', weight: 3, dash: null,
      coords: [[-6.79, 39.21], [-4.04, 39.67], [-1.29, 36.82], [-1.94, 30.06], [-3.36, 29.36]],
      desc: 'Dar → Mombasa → Nairobi → Kigali → Bujumbura supply chain.' },
    { name: 'Southern Africa Route', color: '#1D3EA8', weight: 3, dash: null,
      coords: [[-6.79, 39.21], [-15.39, 28.32], [-25.97, 32.57]],
      desc: 'East coast to Lusaka and Maputo logistics corridor.' },
  ];

  const TYPE_META = {
    hq:         { label: 'Headquarters', color: '#FFD700', radius: 11 },
    fuel:       { label: 'Fuel Station / Depot', color: '#CC1E1E', radius: 8 },
    port:       { label: 'Port', color: '#0ea5e9', radius: 8 },
    container:  { label: 'Container Depot', color: '#E8820C', radius: 8 },
    industrial: { label: 'Industrial Zone', color: '#64748b', radius: 8 },
    logistics:  { label: 'Logistics Hub', color: '#1D3EA8', radius: 8 },
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
        color: '#FFD700',
        weight: 4,
        fillColor: '#FFD700',
        fillOpacity: 0.28,
        opacity: 1,
      };
    }
    if (isOp) {
      return {
        color: '#FFD700',
        weight: 2.8,
        fillColor: '#1D3EA8',
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
      color: isActive ? '#FFD700' : isOp ? 'rgba(255,215,0,0.85)' : 'rgba(255,255,255,0.55)',
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
      color: active ? '#FFD700' : '#ffffff',
      weight: active ? 3 : 2,
      fillOpacity: 1,
      opacity: 1,
    };
  }

  function popupHtml(asset) {
    const m = TYPE_META[asset.type];
    return `<div class="lake-popup">
      <div class="lake-popup-type" style="color:${m.color}">${m.label}</div>
      <strong>${asset.name}</strong>
      <div class="lake-popup-city">${asset.city}</div>
      <p>${asset.desc}</p>
    </div>`;
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
      }).bindPopup(`<strong>${p.name}</strong><p>${p.desc}</p>`);
      pipelineLayer.addLayer(line);
    });
    pipelineLayer.addTo(map);

    assetLayer = L.layerGroup();
    ASSETS.forEach((a) => {
      const marker = L.circleMarker([a.lat, a.lng], dotStyle(a.type, false))
        .bindPopup(popupHtml(a))
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
          color: '#FFD700', weight: 3, fillColor: '#1D3EA8', fillOpacity: 0.35,
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

  window.LakeAfricaMap = { flyToCountry, filterAssets, resetView: () => map?.flyTo([-6.37, 34.9], 6, { duration: 1.2 }) };

  document.addEventListener('DOMContentLoaded', () => {
    buildMap();
    document.querySelectorAll('.map-legend-btn').forEach((btn) => {
      btn.addEventListener('click', () => filterAssets(btn.dataset.filter));
    });
    document.getElementById('map-reset-btn')?.addEventListener('click', () => window.LakeAfricaMap.resetView());
    setTimeout(() => map?.invalidateSize(), 300);
  });
})();
