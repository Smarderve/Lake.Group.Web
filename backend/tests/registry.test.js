import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';
import { canonicalJson } from '../src/lib/governed.js';

// Response key for each admin/public route.
const KEY = {
  countries: 'country',
  regions: 'region',
  locations: 'location',
  facilities: 'facility',
  categories: 'category',
  companies: 'company',
  'product-services': 'productService',
  'company-relationships': 'companyRelationship',
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

/** create → submit → approve → publish via the API; returns the record. */
async function publish(ctx, route, body) {
  const created = await ctx.editor.post(`/admin/${route}`).send({ ...body, reason: 'Initial record' });
  expect(created.status).toBe(201);
  const row = created.body[KEY[route]];
  await ctx.editor.post(`/admin/${route}/${row.id}/submit`).send({});
  await ctx.reviewer.post(`/admin/${route}/${row.id}/approve`).send({});
  await ctx.reviewer.post(`/admin/${route}/${row.id}/publish`).send({});
  return row;
}

/** Published dependency set reused across tests. */
async function publishDeps(ctx) {
  const tz = await publish(ctx, 'countries', { name: 'Tanzania', isoCode: 'TZ', regionGrouping: 'East Africa' });
  const cat = await publish(ctx, 'categories', { name: 'Energy', description: 'Energy sector' });
  const coA = await publish(ctx, 'companies', {
    name: 'Lake Oil Ltd', slug: 'lake-oil', description: 'Petroleum distribution',
    categoryId: cat.id, headquartersCountryId: tz.id,
  });
  const coB = await publish(ctx, 'companies', {
    name: 'Lake Gas Ltd', slug: 'lake-gas', description: 'LPG bottling and distribution',
    categoryId: cat.id, headquartersCountryId: tz.id,
  });
  const loc = await publish(ctx, 'locations', {
    name: 'Dar es Salaam', countryId: tz.id, latitude: -6.8, longitude: 39.28, type: 'city',
  });
  return { tz, cat, coA, coB, loc };
}

// One case per entity. `create` is the create-body (plus reason by the
// helper); `edit` is the full update-body (plus reason). FK values use
// `@depName` references resolved against the published dependency set —
// each FK maps to exactly the dependency it should. All other values are
// unique per case so nothing collides when run in one app.
const CASES = [
  {
    route: 'countries', prefix: 'COUNTRY', field: 'name',
    create: { name: 'Tanzania', isoCode: 'TZ', regionGrouping: 'East Africa' },
    edit: { name: 'United Republic of Tanzania', regionGrouping: 'East Africa' },
  },
  {
    route: 'regions', prefix: 'REGION', field: 'name',
    create: { name: 'Dar es Salaam Region', countryId: '@tz' },
    edit: { name: 'Dar es Salaam', countryId: '@tz' },
  },
  {
    route: 'locations', prefix: 'LOCATION', field: 'name',
    create: { name: 'Kigamboni', countryId: '@tz', latitude: -6.8, longitude: 39.28, type: 'area' },
    edit: { name: 'Kigamboni Area', countryId: '@tz', latitude: -6.82, longitude: 39.29, type: 'area' },
  },
  {
    route: 'facilities', prefix: 'FACILITY', field: 'name',
    create: { name: 'Kigamboni Depot', locationId: '@loc', companyId: '@coA', category: 'depot', coordinates: '-6.8,39.2', operationalStatus: 'OPERATIONAL' },
    edit: { name: 'Kigamboni Terminal', locationId: '@loc', companyId: '@coA', category: 'terminal', coordinates: '-6.8,39.2', operationalStatus: 'OPERATIONAL' },
  },
  {
    route: 'categories', prefix: 'CATEGORY', field: 'name',
    create: { name: 'Steel', description: 'Steel manufacturing' },
    edit: { name: 'Steel Manufacturing', description: 'HS-CR rebar production' },
  },
  {
    route: 'companies', prefix: 'COMPANY', field: 'name',
    create: { name: 'Lake Steel Ltd', slug: 'lake-steel', description: 'Steel rolling mill', categoryId: '@cat', headquartersCountryId: '@tz', website: 'https://lakeoilgroup.com' },
    edit: { name: 'Lake Steel Limited', description: 'Tanzania first HS-CR rebar producer', categoryId: '@cat', headquartersCountryId: '@tz', website: 'https://lakeoilgroup.com' },
  },
  {
    route: 'product-services', prefix: 'PRODUCT_SERVICE', field: 'name',
    create: { name: 'Premium Diesel', description: 'Bulk diesel supply', companyId: '@coA', categoryId: '@cat' },
    edit: { name: 'Premium Diesel (low sulphur)', description: 'Bulk diesel supply', companyId: '@coA', categoryId: '@cat' },
  },
  {
    route: 'company-relationships', prefix: 'COMPANY_RELATIONSHIP', field: 'relationshipType',
    create: { companyId: '@coA', relatedCompanyId: '@coB', relationshipType: 'SUBSIDIARY_OF' },
    edit: { companyId: '@coA', relatedCompanyId: '@coB', relationshipType: 'JOINT_VENTURE_WITH' },
  },
];

describe('Phase 4 — corporate registry', () => {
  it('full lifecycle (create → submit → approve → publish → edit → publish → rollback) works for ALL 8 entities, with versions + audit per entity', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    for (const c of CASES) {
      // Resolve `@depName` references against the published dependency set.
      const fill = (body) =>
        Object.fromEntries(
          Object.entries(body).map(([k, v]) => [
            k,
            typeof v === 'string' && v.startsWith('@') ? deps[v.slice(1)].id : v,
          ]),
        );

      const createBody = fill(c.create);
      const editBody = { ...fill(c.edit), reason: 'Factual update' };

      // --- first cycle: create → publish ---
      const created = await ctx.editor.post(`/admin/${c.route}`).send({ ...createBody, reason: 'Initial record' });
      expect(created.status, `${c.route} create`).toBe(201);
      expect(created.body[KEY[c.route]].status).toBe('DRAFT');
      const id = created.body[KEY[c.route]].id;

      const sub = await ctx.editor.post(`/admin/${c.route}/${id}/submit`).send({});
      expect(sub.status, `${c.route} submit`).toBe(200);
      expect(sub.body[KEY[c.route]].status).toBe('IN_REVIEW');

      const appr = await ctx.reviewer.post(`/admin/${c.route}/${id}/approve`).send({});
      expect(appr.status, `${c.route} approve`).toBe(200);
      expect(appr.body[KEY[c.route]].status).toBe('APPROVED');

      const pub = await ctx.reviewer.post(`/admin/${c.route}/${id}/publish`).send({});
      expect(pub.status, `${c.route} publish`).toBe(200);
      expect(pub.body[KEY[c.route]].status).toBe('PUBLISHED');

      // public endpoint serves it
      const publicRes = await request(ctx.app).get(`/api/public/${c.route}/${id}`);
      expect(publicRes.status, `${c.route} public after first publish`).toBe(200);
      expect(publicRes.body[KEY[c.route]][c.field]).toBeTruthy();
      expect(publicRes.body[KEY[c.route]].status).toBeUndefined();

      // --- second cycle: edit → publish ---
      const edited = await ctx.editor.patch(`/admin/${c.route}/${id}`).send(editBody);
      expect(edited.status, `${c.route} edit`).toBe(200);
      expect(edited.body[KEY[c.route]].status).toBe('DRAFT');
      const editedVal = edited.body[KEY[c.route]][c.field];
      expect(editedVal).not.toBe(created.body[KEY[c.route]][c.field]);

      await ctx.editor.post(`/admin/${c.route}/${id}/submit`).send({});
      await ctx.reviewer.post(`/admin/${c.route}/${id}/approve`).send({});
      await ctx.reviewer.post(`/admin/${c.route}/${id}/publish`).send({});

      const publicAfterEdit = await request(ctx.app).get(`/api/public/${c.route}/${id}`);
      expect(publicAfterEdit.body[KEY[c.route]][c.field]).toBe(editedVal);

      // --- rollback restores the first published snapshot ---
      const rolled = await ctx.admin.post(`/admin/${c.route}/${id}/rollback`).send({});
      expect(rolled.status, `${c.route} rollback`).toBe(200);
      expect(rolled.body[KEY[c.route]].status).toBe('PUBLISHED');
      expect(rolled.body[KEY[c.route]][c.field]).toBe(created.body[KEY[c.route]][c.field]);

      const publicAfterRollback = await request(ctx.app).get(`/api/public/${c.route}/${id}`);
      expect(publicAfterRollback.body[KEY[c.route]][c.field]).toBe(created.body[KEY[c.route]][c.field]);

      // --- version history + audit trail for THIS entity ---
      const detail = await ctx.editor.get(`/admin/${c.route}/${id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.versions.length, `${c.route} version count`).toBeGreaterThanOrEqual(9);

      const actions = ctx.db.auditRows.map((r) => r.action);
      for (const act of ['CREATED', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'EDITED', 'ROLLED_BACK']) {
        expect(actions, `${c.route} audit ${act}`).toContain(`${c.prefix}_${act}`);
      }
    }
  });

  it('separation of duties is enforced for every entity (submitter cannot approve)', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const FKS = {
      regions: { countryId: deps.tz.id },
      locations: { countryId: deps.tz.id },
      facilities: { locationId: deps.loc.id, companyId: deps.coA.id },
      companies: { categoryId: deps.cat.id, headquartersCountryId: deps.tz.id },
      'product-services': { companyId: deps.coA.id, categoryId: deps.cat.id },
      'company-relationships': { companyId: deps.coA.id, relatedCompanyId: deps.coB.id },
    };

    for (const c of CASES) {
      const extra = FKS[c.route] ?? {};
      const body = { ...c.create, ...extra, reason: 'Created by admin for separation test' };
      const created = await ctx.admin.post(`/admin/${c.route}`).send(body);
      expect(created.status, `${c.route} admin create`).toBe(201);
      const id = created.body[KEY[c.route]].id;
      const submitted = await ctx.admin.post(`/admin/${c.route}/${id}/submit`).send({});
      expect(submitted.status, `${c.route} admin submit`).toBe(200);

      // SUPER_ADMIN is an approver role — but must not approve own submission
      const selfApprove = await ctx.admin.post(`/admin/${c.route}/${id}/approve`).send({});
      expect(selfApprove.status, `${c.route} separation of duties`).toBe(403);
      expect(selfApprove.body.error.code).toBe('SEPARATION_OF_DUTIES');
    }
  });

  it('circular parent-company chains and self-parent are rejected', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const a = await ctx.editor.post('/admin/companies').send({
      name: 'Parent Co', slug: 'parent-co', categoryId: deps.cat.id, headquartersCountryId: deps.tz.id, reason: 'Create',
    });
    expect(a.status).toBe(201);
    const b = await ctx.editor.post('/admin/companies').send({
      name: 'Child Co', slug: 'child-co', categoryId: deps.cat.id, headquartersCountryId: deps.tz.id, reason: 'Create',
    });
    expect(b.status).toBe(201);
    const aId = a.body.company.id;
    const bId = b.body.company.id;

    // B becomes a subsidiary of A — allowed
    const ok = await ctx.editor.patch(`/admin/companies/${bId}`).send({
      name: 'Child Co', categoryId: deps.cat.id, headquartersCountryId: deps.tz.id, parentCompanyId: aId, reason: 'Make subsidiary',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.company.parentCompanyId).toBe(aId);

    // A ← B would create a cycle A → B → A — rejected
    const cycle = await ctx.editor.patch(`/admin/companies/${aId}`).send({
      name: 'Parent Co', categoryId: deps.cat.id, headquartersCountryId: deps.tz.id, parentCompanyId: bId, reason: 'Cycle attempt',
    });
    expect(cycle.status).toBe(400);
    expect(cycle.body.error.code).toBe('INVALID_PARENT');

    // A ← A (self-parent) — rejected
    const self = await ctx.editor.patch(`/admin/companies/${aId}`).send({
      name: 'Parent Co', categoryId: deps.cat.id, headquartersCountryId: deps.tz.id, parentCompanyId: aId, reason: 'Self-parent attempt',
    });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('INVALID_PARENT');
  });

  it('rollback version comparison is immune to JSONB key reordering', () => {
    // Postgres JSONB stores keys by length then bytewise, so two logically
    // equal snapshots stringify with different key order after a DB round-trip.
    const a = { name: 'Lake Oil', slug: 'lake-oil', website: 'https://lakeoilgroup.com', categoryId: 'c1' };
    const b = { categoryId: 'c1', website: 'https://lakeoilgroup.com', slug: 'lake-oil', name: 'Lake Oil' };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson({ name: 'Lake Oil' })).not.toBe(canonicalJson({ name: 'Lake Gas' }));
  });

  it('a company cannot have a relationship with itself', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const res = await ctx.editor.post('/admin/company-relationships').send({
      companyId: deps.coA.id, relatedCompanyId: deps.coA.id, relationshipType: 'PARTNER_OF', reason: 'Self relationship attempt',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_RELATIONSHIP');
  });

  it('archiving a Country with Regions attached is blocked; allowed once regions are archived', async () => {
    const ctx = await makeCtx();

    // create a fresh country + region (both DRAFT is enough to trigger the guard)
    const country = await ctx.editor.post('/admin/countries').send({ name: 'Kenya', isoCode: 'KE', regionGrouping: 'East Africa', reason: 'Create' });
    const countryId = country.body.country.id;
    const region = await ctx.editor.post('/admin/regions').send({ name: 'Nairobi', countryId, reason: 'Create' });
    const regionId = region.body.region.id;

    // archiving the country while a region exists → blocked
    const blocked = await ctx.admin.post(`/admin/countries/${countryId}/archive`).send({});
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('DEPENDENTS_EXIST');

    // archive the region first → now the country can be archived
    const regionArchived = await ctx.admin.post(`/admin/regions/${regionId}/archive`).send({});
    expect(regionArchived.status).toBe(200);
    expect(regionArchived.body.region.status).toBe('ARCHIVED');

    const countryArchived = await ctx.admin.post(`/admin/countries/${countryId}/archive`).send({});
    expect(countryArchived.status).toBe(200);
    expect(countryArchived.body.country.status).toBe('ARCHIVED');
  });
});
