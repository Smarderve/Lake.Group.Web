import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

const KEY = {
  countries: 'country',
  regions: 'region',
  locations: 'location',
  facilities: 'facility',
  companies: 'company',
  categories: 'category',
  media: 'media',
  'map-categories': 'mapCategory',
  news: 'news',
};

async function makeCtx() {
  const users = [
    await makeUser({ email: 'editor@lakegroup.test', password: 'pw-editor-1', role: 'EDITOR' }),
    await makeUser({ email: 'reviewer@lakegroup.test', password: 'pw-review-1', role: 'REVIEWER' }),
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
  ];
  const ctx = makeApp({ users });
  const login = async (email, password) => {
    const agent = request.agent(ctx.app);
    const res = await agent.post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return agent;
  };
  return {
    ...ctx,
    editor: await login('editor@lakegroup.test', 'pw-editor-1'),
    reviewer: await login('reviewer@lakegroup.test', 'pw-review-1'),
    admin: await login('admin@lakegroup.test', 'pw-admin-1'),
  };
}

async function publish(ctx, route, body) {
  const created = await ctx.editor.post(`/admin/${route}`).send({ ...body, reason: 'Initial record' });
  expect(created.status, `${route} create`).toBe(201);
  const row = created.body[KEY[route]];
  await ctx.editor.post(`/admin/${route}/${row.id}/submit`).send({});
  await ctx.reviewer.post(`/admin/${route}/${row.id}/approve`).send({});
  await ctx.reviewer.post(`/admin/${route}/${row.id}/publish`).send({});
  return row;
}

/** Published geography + company deps for facility/map tests. */
async function publishGeo(ctx) {
  const tz = await publish(ctx, 'countries', { name: 'Tanzania', isoCode: 'TZ', regionGrouping: 'East Africa' });
  const cat = await publish(ctx, 'categories', { name: 'Energy', description: 'Energy sector' });
  const coA = await publish(ctx, 'companies', {
    name: 'Lake Oil Ltd', slug: 'lake-oil', description: 'Petroleum distribution',
    categoryId: cat.id, headquartersCountryId: tz.id,
  });
  const reg = await publish(ctx, 'regions', { name: 'Dar es Salaam Region', countryId: tz.id });
  const loc1 = await publish(ctx, 'locations', {
    name: 'Kigamboni', regionId: reg.id, countryId: tz.id, latitude: -6.8, longitude: 39.28, type: 'area',
  });
  const loc2 = await publish(ctx, 'locations', {
    name: 'No-Coords Area', regionId: reg.id, countryId: tz.id, type: 'area',
  });
  return { tz, cat, coA, reg, loc1, loc2 };
}

describe('Phase 6 — map & media', () => {
  it('MapCategory full lifecycle + public read; archiving a layer in use is blocked', async () => {
    const ctx = await makeCtx();
    const geo = await publishGeo(ctx);
    const layer = await publish(ctx, 'map-categories', {
      name: 'Fuel stations', slug: 'fuel-stations', description: 'Retail stations',
      color: '#E63946', icon: 'station', sortOrder: 1,
    });

    // public via the generic entity endpoint (slug or id)
    const pubBySlug = await request(ctx.app).get('/api/public/map-categories/fuel-stations');
    expect(pubBySlug.status).toBe(200);
    expect(pubBySlug.body.mapCategory.color).toBe('#E63946');

    // a facility opts into the layer → archiving the layer is blocked
    const fac = await ctx.editor.post('/admin/facilities').send({
      name: 'Kigamboni Station', locationId: geo.loc1.id, companyId: geo.coA.id,
      coordinates: '-6.8,39.2', mapCategoryId: layer.id, mapVisible: true, reason: 'Create',
    });
    const facId = fac.body.facility.id;
    await ctx.editor.post(`/admin/facilities/${facId}/submit`).send({});
    await ctx.reviewer.post(`/admin/facilities/${facId}/approve`).send({});
    await ctx.reviewer.post(`/admin/facilities/${facId}/publish`).send({});

    const blocked = await ctx.admin.post(`/admin/map-categories/${layer.id}/archive`).send({});
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('DEPENDENTS_EXIST');

    // reassign the facility off the layer → archiving now works
    const reassigned = await ctx.editor.patch(`/admin/facilities/${facId}`).send({
      name: 'Kigamboni Station', locationId: geo.loc1.id, companyId: geo.coA.id,
      coordinates: '-6.8,39.2', mapCategoryId: null, reason: 'Reassign layer',
    });
    expect(reassigned.status).toBe(200);
    await ctx.editor.post(`/admin/facilities/${facId}/submit`).send({});
    await ctx.reviewer.post(`/admin/facilities/${facId}/approve`).send({});
    await ctx.reviewer.post(`/admin/facilities/${facId}/publish`).send({});
    const archived = await ctx.admin.post(`/admin/map-categories/${layer.id}/archive`).send({});
    expect(archived.status).toBe(200);
    expect(archived.body.mapCategory.status).toBe('ARCHIVED');
    expect(ctx.db.auditRows.map((r) => r.action)).toContain('MAP_CATEGORY_ARCHIVED');
  });

  it('GET /api/public/map returns the published country → region → location → facility tree with parsed coordinates', async () => {
    const ctx = await makeCtx();
    const geo = await publishGeo(ctx);
    await publish(ctx, 'map-categories', { name: 'Depots', slug: 'depots', color: '#2A9D8F', sortOrder: 0 });

    // visible facility WITH own coordinates → appears with parsed lat/lng
    const facVisible = await publish(ctx, 'facilities', {
      name: 'Kigamboni Depot', locationId: geo.loc1.id, companyId: geo.coA.id,
      coordinates: '-6.80, 39.28', mapVisible: true, markerLabel: 'KD',
    });
    // hidden from map → excluded even with coordinates
    await publish(ctx, 'facilities', {
      name: 'Hidden Depot', locationId: geo.loc1.id, companyId: geo.coA.id,
      coordinates: '-6.9,39.3', mapVisible: false,
    });
    // no coordinates anywhere (facility + location) → excluded
    await publish(ctx, 'facilities', {
      name: 'No-Coords Depot', locationId: geo.loc2.id, companyId: geo.coA.id,
    });

    const map = await request(ctx.app).get('/api/public/map');
    expect(map.status).toBe(200);

    const tz = map.body.countries.find((c) => c.isoCode === 'TZ');
    expect(tz).toBeTruthy();
    expect(tz.regions.map((r) => r.id)).toContain(geo.reg.id);
    const allLocations = tz.regions.flatMap((r) => r.locations);
    const loc1 = allLocations.find((l) => l.id === geo.loc1.id);
    expect(loc1).toBeTruthy();
    expect(loc1.latitude).toBe(-6.8);

    // only the visible, coordinate-bearing facility is a marker
    expect(loc1.facilities.map((f) => f.id)).toEqual([facVisible.id]);
    expect(loc1.facilities[0].latitude).toBe(-6.8);
    expect(loc1.facilities[0].longitude).toBe(39.28);
    expect(loc1.facilities[0].markerLabel).toBe('KD');

    const loc2 = allLocations.find((l) => l.id === geo.loc2.id);
    expect(loc2.facilities).toEqual([]);

    // published layer is present for map styling
    expect(map.body.categories.map((c) => c.slug)).toContain('depots');
    expect(map.body.categories[0].color).toBe('#2A9D8F');
  });

  it('Media full lifecycle → gallery: published media is publicly served with metadata; drafts are not', async () => {
    const ctx = await makeCtx();

    const created = await ctx.editor.post('/admin/media').send({
      url: 'https://cdn.example.com/depot.jpg', altText: 'Depot photo', caption: 'Kigamboni depot',
      mimeType: 'image/jpeg', width: 1920, height: 1080, copyright: '© Lake Group', license: 'Internal use',
      tags: ['depot', 'kigamboni'], variants: { thumb: 'https://cdn.example.com/depot-thumb.jpg', original: 'https://cdn.example.com/depot.jpg' },
      reason: 'Upload depot photo',
    });
    expect(created.status).toBe(201);
    expect(created.body.media.status).toBe('DRAFT');
    const id = created.body.media.id;

    // drafts never reach the gallery
    const hidden = await request(ctx.app).get(`/api/public/media/${id}`);
    expect(hidden.status).toBe(404);

    await ctx.editor.post(`/admin/media/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/media/${id}/approve`).send({});
    await ctx.reviewer.post(`/admin/media/${id}/publish`).send({});

    const shown = await request(ctx.app).get(`/api/public/media/${id}`);
    expect(shown.status).toBe(200);
    expect(shown.body.media.url).toBe('https://cdn.example.com/depot.jpg');
    expect(shown.body.media.variants.thumb).toBe('https://cdn.example.com/depot-thumb.jpg');
    expect(shown.body.media.tags).toContain('depot');
    expect(shown.body.media.status).toBeUndefined(); // no governance internals

    const list = await request(ctx.app).get('/api/public/media');
    expect(list.body.media.length).toBe(1);
  });

  it('replacement: PATCH url → new cycle, same id, previous url in version history', async () => {
    const ctx = await makeCtx();
    const media = await publish(ctx, 'media', { url: 'https://cdn.example.com/v1.png', altText: 'Logo v1' });

    const replaced = await ctx.editor.patch(`/admin/media/${media.id}`).send({
      url: 'https://cdn.example.com/v2.png', altText: 'Logo v2', reason: 'New logo file',
    });
    expect(replaced.status).toBe(200);
    expect(replaced.body.media.status).toBe('DRAFT');
    expect(replaced.body.media.id).toBe(media.id); // same id, usage preserved

    await ctx.editor.post(`/admin/media/${media.id}/submit`).send({});
    await ctx.reviewer.post(`/admin/media/${media.id}/approve`).send({});
    await ctx.reviewer.post(`/admin/media/${media.id}/publish`).send({});

    const pub = await request(ctx.app).get(`/api/public/media/${media.id}`);
    expect(pub.body.media.url).toBe('https://cdn.example.com/v2.png');

    const detail = await ctx.editor.get(`/admin/media/${media.id}`);
    expect(detail.body.versions.some((v) => v.data.url === 'https://cdn.example.com/v1.png')).toBe(true);
    expect(ctx.db.auditRows.map((r) => r.action)).toContain('MEDIA_EDITED');
  });

  it('usage tracking: entities referencing media block its archive until detached', async () => {
    const ctx = await makeCtx();
    const geo = await publishGeo(ctx);
    const media = await publish(ctx, 'media', { url: 'https://cdn.example.com/hero.jpg', altText: 'Hero' });

    // news references the media → usage row recorded
    const news = await publish(ctx, 'news', {
      title: 'Depot opening', slug: 'depot-opening-news', body: 'We opened a depot.',
      categoryId: geo.cat.id, heroMediaId: media.id,
    });
    let usages = await ctx.db.mediaUsage.findMany({ where: { mediaId: media.id } });
    expect(usages.length).toBe(1);
    expect(usages[0].entityType).toBe('news');
    expect(usages[0].field).toBe('heroMediaId');
    expect(usages[0].entityId).toBe(news.id);

    // the usages endpoint lists it for admin introspection
    const usageList = await ctx.editor.get(`/admin/media/${media.id}/usages`);
    expect(usageList.status).toBe(200);
    expect(usageList.body.usages.length).toBe(1);

    // archiving in-use media is blocked
    const blocked = await ctx.admin.post(`/admin/media/${media.id}/archive`).send({});
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('MEDIA_IN_USE');

    // detach from news (null) → usage row removed → archive works
    const detached = await ctx.editor.patch(`/admin/news/${news.id}`).send({
      title: 'Depot opening', body: 'We opened a depot.', categoryId: geo.cat.id, heroMediaId: null, reason: 'Remove hero',
    });
    expect(detached.status).toBe(200);
    await ctx.editor.post(`/admin/news/${news.id}/submit`).send({});
    await ctx.reviewer.post(`/admin/news/${news.id}/approve`).send({});
    await ctx.reviewer.post(`/admin/news/${news.id}/publish`).send({});
    usages = await ctx.db.mediaUsage.findMany({ where: { mediaId: media.id } });
    expect(usages.length).toBe(0);

    const archived = await ctx.admin.post(`/admin/media/${media.id}/archive`).send({});
    expect(archived.status).toBe(200);
    expect(archived.body.media.status).toBe('ARCHIVED');
    // archived media is no longer in the gallery
    expect((await request(ctx.app).get(`/api/public/media/${media.id}`)).status).toBe(404);
  });

  it('rollback restores media linkage: usage rows follow the previous published snapshot', async () => {
    const ctx = await makeCtx();
    const geo = await publishGeo(ctx);
    const media = await publish(ctx, 'media', { url: 'https://cdn.example.com/hero.jpg', altText: 'Hero' });

    const news = await publish(ctx, 'news', {
      title: 'Launch', slug: 'launch-news', body: 'We launched.', categoryId: geo.cat.id, heroMediaId: media.id,
    });

    // second cycle: remove the hero → publish
    const edited = await ctx.editor.patch(`/admin/news/${news.id}`).send({
      title: 'Launch', body: 'We launched.', categoryId: geo.cat.id, heroMediaId: null, reason: 'Drop hero',
    });
    expect(edited.status).toBe(200);
    await ctx.editor.post(`/admin/news/${news.id}/submit`).send({});
    await ctx.reviewer.post(`/admin/news/${news.id}/approve`).send({});
    await ctx.reviewer.post(`/admin/news/${news.id}/publish`).send({});
    expect((await ctx.db.mediaUsage.findMany({ where: { mediaId: media.id } })).length).toBe(0);

    // rollback → hero linkage (and its usage row) restored
    const rolled = await ctx.admin.post(`/admin/news/${news.id}/rollback`).send({});
    expect(rolled.status).toBe(200);
    expect(rolled.body.news.heroMediaId).toBe(media.id);
    const usages = await ctx.db.mediaUsage.findMany({ where: { mediaId: media.id } });
    expect(usages.length).toBe(1);
    expect(usages[0].entityId).toBe(news.id);
  });

  it('MediaFolder CRUD (organizational, not governed) + audit; invalid media refs rejected', async () => {
    const ctx = await makeCtx();

    const created = await ctx.editor.post('/admin/media-folders').send({
      name: 'Corporate Logos', slug: 'corporate-logos', description: 'Official logos', sortOrder: 1,
    });
    expect(created.status).toBe(201);
    expect(created.body.mediaFolder.status).toBeUndefined(); // not governed
    const folderId = created.body.mediaFolder.id;

    // media can be filed into a folder
    const media = await ctx.editor.post('/admin/media').send({
      url: 'https://cdn.example.com/logo.png', folderId, reason: 'Upload',
    });
    expect(media.status).toBe(201);
    expect(media.body.media.folderId).toBe(folderId);

    const patched = await ctx.editor.patch(`/admin/media-folders/${folderId}`).send({
      name: 'Corporate Logos (official)', description: 'Official logos', sortOrder: 1,
    });
    expect(patched.status).toBe(200);
    expect(patched.body.mediaFolder.name).toBe('Corporate Logos (official)');
    expect(ctx.db.auditRows.map((r) => r.action)).toContain('MEDIA_FOLDER_UPDATED');

    // referencing a non-existent media item is rejected
    const bad = await ctx.editor.post('/admin/news').send({
      title: 'Bad ref', slug: 'bad-ref', body: 'x', categoryId: 'c_energy', heroMediaId: 'nope', reason: 'Test',
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_MEDIA');
  });
});
