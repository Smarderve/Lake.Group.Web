/**
 * Shared governed-entity workflow (Phase 4, Task 4.1).
 *
 * The DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED lifecycle is
 * implemented ONCE here and applied to every registry entity (Country,
 * Region, Location, Facility, Category, Company, ProductService,
 * CompanyRelationship). The only thing that differs per entity is its
 * field set — captured in the config passed in (see registry-config.js).
 *
 * Every mutation:
 *   - appends an immutable version row (JSON snapshot of the entity's
 *     fields at that point) — history is never overwritten
 *   - writes an AuditLog entry (actor, previous → new snapshot, status)
 *   - requires an authenticated session with the right role (enforced in
 *     the router factory)
 *
 * A new Phase 5 entity plugs in by adding a model + version table (same
 * GovernedStatus + data JSONB + changedBy/reason/createdAt shape) and one
 * entry in registry-config.js. See backend/docs/governed-entity-pattern.md.
 */

import { writeAudit } from './audit.js';
import { notifyRole, notifyUser } from './notify.js';
import { labelOf } from './governed-registry.js';

export function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

/** Copy exactly the config.fields present on a row (the version snapshot). */
export function pickFields(row, fields) {
  const out = {};
  for (const f of fields) {
    if (f in row) out[f] = row[f];
  }
  return out;
}

/**
 * Full version snapshot: the config.fields present on the row PLUS any
 * entity-specific side data (Phase 5: Page block ids, HistoryEvent company
 * ids) so rollback can restore composition, not just scalar fields.
 */
async function snapshotData(db, config, row) {
  const extra = config.snapshotExtra ? await config.snapshotExtra(db, row) : {};
  return { ...pickFields(row, config.fields), ...extra };
}

/**
 * Canonical JSON: keys sorted, so comparisons are order-independent.
 * Postgres JSONB does NOT preserve key order (it stores keys by length,
 * then bytewise), so two logically-equal snapshots can stringify
 * differently once they round-trip through the database — rollback's
 * version comparison must be immune to that.
 */
export function canonicalJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

export async function findGoverned(db, config, idOrSlug) {
  const where = config.slugField
    ? { OR: [{ id: idOrSlug }, { [config.slugField]: idOrSlug }] }
    : { id: idOrSlug };
  return db[config.entity].findFirst({ where });
}

async function appendVersion(db, config, entityId, { data, status, changedBy, reason }) {
  return db[config.versionEntity].create({
    data: { [config.fkField]: entityId, data, status, changedBy, reason },
  });
}

async function recordAudit(db, ctx, config, action, { entity, resource, previousData = null, fromStatus = null, toStatus = null, reason = null, extra = {} }) {
  await writeAudit(
    db,
    {
      actorId: ctx.user?.id ?? null,
      action: `${config.prefix}_${action}`,
      resource,
      ip: ctx.ip ?? null,
      metadata: {
        entityId: entity.id,
        entityKey: entity[config.slugField] ?? entity.name ?? entity.id,
        previousData: previousData ?? null,
        newData: pickFields(entity, config.fields),
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        reason: reason ?? null,
        ...extra,
      },
    },
    ctx.logger,
  );
}

// ---------------------------------------------------------------------------
// Phase 7 — publication events + notifications (shared side effects)
// ---------------------------------------------------------------------------

/** Record a publication-leger row (publish/schedule/unpublish/rollback). */
async function recordPublicationEvent(db, config, entity, action, { publishAt = null, reason = null, actorId = null } = {}) {
  if (!db?.publicationEvent) return;
  try {
    await db.publicationEvent.create({
      data: {
        entityType: config.entity,
        entityId: entity.id,
        action,
        publishAt: publishAt ?? null,
        actorId: actorId ?? null,
        metadata: { reason: reason ?? null, entityKey: labelOf(config, entity) },
      },
    });
  } catch {
    // ledger write must never break the workflow action
  }
}

/**
 * The author/submitter of the current change cycle. Reviewers write the
 * latest version row (APPROVED/REJECTED/PUBLISHED), so the lookup filters
 * to content-author states (DRAFT/IN_REVIEW) — the person who made the
 * change, who should be notified when it is approved/rejected/published.
 */
async function latestChangedBy(db, config, entityId) {
  const version = await db[config.versionEntity].findFirst({
    where: { [config.fkField]: entityId, status: { in: ['DRAFT', 'IN_REVIEW'] } },
    orderBy: { createdAt: 'desc' },
  });
  return version?.changedBy ?? null;
}

async function notifySubmitter(db, config, entity, type, logger) {
  const submitterId = await latestChangedBy(db, config, entity.id);
  if (!submitterId) return;
  await notifyUser(
    db,
    submitterId,
    {
      type,
      message: `${config.label} "${labelOf(config, entity)}" — ${type.toLowerCase().replace(/_/g, ' ')}`,
      entityType: config.entity,
      entityId: entity.id,
    },
    logger,
  );
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create — always lands in DRAFT. */
export async function createGoverned(db, ctx, config, data, reason) {
  if (config.guardCreate) await config.guardCreate(db, data);
  // Phase 5: entities with side tables (Page blocks, HistoryEvent companies)
  // hook before/after the row write via beforeCreate/afterCreate.
  const prepped = config.beforeCreate
    ? await config.beforeCreate(db, data, ctx)
    : { data, extra: null };
  const row = await db[config.entity].create({ data: prepped.data });
  if (config.afterCreate) await config.afterCreate(db, row, prepped.extra, ctx);
  await appendVersion(db, config, row.id, {
    data: await snapshotData(db, config, row),
    status: 'DRAFT',
    changedBy: ctx.user?.id ?? null,
    reason,
  });
  await recordAudit(db, ctx, config, 'CREATED', {
    entity: row,
    resource: `admin/${config.route}`,
    toStatus: 'DRAFT',
    reason,
  });
  return row;
}

/** Edit — reopens the record into a fresh change cycle (status → DRAFT). */
export async function editGoverned(db, ctx, config, idOrSlug, data, reason) {
  const entity = await findGoverned(db, config, idOrSlug);
  if (!entity) throw httpError(404, 'NOT_FOUND', `${config.label} not found`);
  if (entity.status === 'ARCHIVED') {
    throw httpError(409, 'INVALID_STATE', 'Archived records cannot be edited');
  }
  if (config.guardUpdate) await config.guardUpdate(db, entity, data);

  const previousData = pickFields(entity, config.fields);
  const previousStatus = entity.status;
  const prepped = config.beforeUpdate
    ? await config.beforeUpdate(db, entity, data, ctx)
    : { data, extra: null };
  const updated = await db[config.entity].update({
    where: { id: entity.id },
    data: { ...prepped.data, status: 'DRAFT' },
  });
  if (config.afterUpdate) await config.afterUpdate(db, updated, prepped.extra, ctx);
  await appendVersion(db, config, updated.id, {
    data: await snapshotData(db, config, updated),
    status: 'DRAFT',
    changedBy: ctx.user?.id ?? null,
    reason,
  });
  await recordAudit(db, ctx, config, 'EDITED', {
    entity: updated,
    resource: `admin/${config.route}/${entity.id}`,
    previousData,
    fromStatus: previousStatus,
    toStatus: 'DRAFT',
    reason,
  });
  return updated;
}

/** Shared state-transition runner (only from → to allowed). */
async function transition(db, ctx, config, idOrSlug, { from, to, action, reason, extraCheck, changedBy }) {
  const entity = await findGoverned(db, config, idOrSlug);
  if (!entity) throw httpError(404, 'NOT_FOUND', `${config.label} not found`);
  if (entity.status !== from) {
    throw httpError(409, 'INVALID_STATE', `Record must be ${from} to ${action.toLowerCase()}; it is ${entity.status}`);
  }
  if (extraCheck) await extraCheck(entity);

  const updated = await db[config.entity].update({ where: { id: entity.id }, data: { status: to } });
  await appendVersion(db, config, updated.id, {
    data: await snapshotData(db, config, updated),
    status: to,
    // Default: the acting user. A rejection hands the working copy back to
    // the submitter, so its DRAFT version is attributed to them (the audit
    // row still records the reviewer as the actor).
    changedBy: changedBy !== undefined ? changedBy : ctx.user?.id ?? null,
    reason,
  });
  await recordAudit(db, ctx, config, action, {
    entity: updated,
    resource: `admin/${config.route}/${entity.id}/${action.toLowerCase()}`,
    previousData: pickFields(entity, config.fields),
    fromStatus: from,
    toStatus: to,
    reason,
  });
  return updated;
}

export async function submitGoverned(db, ctx, config, idOrSlug, reason) {
  const updated = await transition(db, ctx, config, idOrSlug, {
    from: 'DRAFT', to: 'IN_REVIEW', action: 'SUBMITTED', reason,
  });
  // Phase 7: notify every reviewer (except the submitter) that there is
  // something to review — the review queue is the pull side, this is push.
  await notifyRole(
    db,
    {
      roles: ['REVIEWER', 'SUPER_ADMIN'],
      type: 'SUBMITTED',
      message: `${config.label} "${labelOf(config, updated)}" submitted for review`,
      entityType: config.entity,
      entityId: updated.id,
      excludeUserId: ctx.user?.id ?? null,
    },
    ctx.logger,
  );
  return updated;
}

/**
 * Approve — IN_REVIEW → APPROVED, with separation of duties: the user who
 * submitted a change can never be the one who approves it (submitter =
 * changedBy of the latest IN_REVIEW version).
 */
export async function approveGoverned(db, ctx, config, idOrSlug, reason) {
  const entity = await findGoverned(db, config, idOrSlug);
  if (!entity) throw httpError(404, 'NOT_FOUND', `${config.label} not found`);
  const lastInReview = await db[config.versionEntity].findFirst({
    where: { [config.fkField]: entity.id, status: 'IN_REVIEW' },
    orderBy: { createdAt: 'desc' },
  });
  if (lastInReview?.changedBy && lastInReview.changedBy === ctx.user?.id) {
    throw httpError(403, 'SEPARATION_OF_DUTIES', 'The submitter cannot approve their own change');
  }
  const updated = await transition(db, ctx, config, idOrSlug, {
    from: 'IN_REVIEW', to: 'APPROVED', action: 'APPROVED', reason,
  });
  await notifySubmitter(db, config, updated, 'APPROVED', ctx.logger);
  return updated;
}

/**
 * Reject (Phase 7) — IN_REVIEW → DRAFT, reason REQUIRED. The reviewer sends
 * the change back to the editor with an explanation; the submitter is
 * notified. History is preserved like any other transition.
 */
export async function rejectGoverned(db, ctx, config, idOrSlug, reason) {
  if (!reason || !reason.trim()) {
    throw httpError(400, 'REASON_REQUIRED', 'A reason is required to reject a submission');
  }
  const entity = await findGoverned(db, config, idOrSlug);
  if (!entity) throw httpError(404, 'NOT_FOUND', `${config.label} not found`);
  // The working copy returns to the person who submitted it (their id is
  // stamped on the resulting DRAFT version; the audit row names the actor).
  const submitterId = await latestChangedBy(db, config, entity.id);
  const updated = await transition(db, ctx, config, idOrSlug, {
    from: 'IN_REVIEW', to: 'DRAFT', action: 'REJECTED', reason, changedBy: submitterId,
  });
  await notifySubmitter(db, config, updated, 'REJECTED', ctx.logger);
  return updated;
}

/**
 * Publish an entity that is already in APPROVED state — shared by the
 * manual publish endpoint and the scheduled-promotion publisher. Writes the
 * version row, audit entry, publication-event ledger row, and notifies the
 * submitter.
 */
export async function publishEntityNow(db, config, entity, { actorId = null, logger = null, reason = null, publishAt = null, ip = null } = {}) {
  const updated = await db[config.entity].update({ where: { id: entity.id }, data: { status: 'PUBLISHED' } });
  await appendVersion(db, config, updated.id, {
    data: await snapshotData(db, config, updated),
    status: 'PUBLISHED',
    changedBy: actorId,
    reason: reason ?? (publishAt ? `Scheduled publication (${publishAt.toISOString()})` : null),
  });
  // SECURITY_ROADMAP Phase 19 — the audit row must carry the request
  // context (ip) for MANUAL publishes; the lazy scheduled publisher passes
  // no ip (system action, no request context exists).
  const ctx = { user: actorId ? { id: actorId } : null, ip, logger };
  await recordAudit(db, ctx, config, publishAt ? 'PUBLISHED_SCHEDULED' : 'PUBLISHED', {
    entity: updated,
    resource: `admin/${config.route}/${entity.id}/${publishAt ? 'scheduled-publish' : 'publish'}`,
    previousData: pickFields(entity, config.fields),
    fromStatus: 'APPROVED',
    toStatus: 'PUBLISHED',
    reason,
    extra: publishAt ? { publishAt: publishAt.toISOString() } : {},
  });
  await recordPublicationEvent(db, config, updated, 'PUBLISHED', { publishAt, reason, actorId });
  await notifySubmitter(db, config, updated, publishAt ? 'PUBLISHED_SCHEDULED' : 'PUBLISHED', logger);
  return updated;
}

/**
 * Publish (Phase 7) — APPROVED → PUBLISHED, plus the publication-event
 * ledger and a notification to the submitter. Schedule a publishAt instead
 * via scheduleGoverned for time-based go-live.
 */
export async function publishGoverned(db, ctx, config, idOrSlug, reason) {
  const entity = await findGoverned(db, config, idOrSlug);
  if (!entity) throw httpError(404, 'NOT_FOUND', `${config.label} not found`);
  if (entity.status !== 'APPROVED') {
    throw httpError(409, 'INVALID_STATE', `Record must be APPROVED to publish; it is ${entity.status}`);
  }
  return publishEntityNow(db, config, entity, {
    actorId: ctx.user?.id ?? null,
    logger: ctx.logger,
    reason,
    ip: ctx.ip ?? null,
  });
}

/**
 * Schedule (Phase 7) — plan a future publication for an APPROVED entity.
 * One PENDING schedule per entity (rescheduling replaces it); the lazy
 * publisher promotes it when publishAt arrives. The entity stays APPROVED
 * (and hidden from public endpoints) until then.
 */
export async function scheduleGoverned(db, ctx, config, idOrSlug, publishAt, reason) {
  const entity = await findGoverned(db, config, idOrSlug);
  if (!entity) throw httpError(404, 'NOT_FOUND', `${config.label} not found`);
  if (entity.status !== 'APPROVED') {
    throw httpError(409, 'INVALID_STATE', `Only APPROVED records can be scheduled; it is ${entity.status}`);
  }
  const existing = await db.publishSchedule.findFirst({
    where: { entityType: config.entity, entityId: entity.id },
  });
  const schedule = existing
    ? await db.publishSchedule.update({
        where: { id: existing.id },
        data: { publishAt, status: 'PENDING', publishedAt: null, createdBy: ctx.user?.id ?? null },
      })
    : await db.publishSchedule.create({
        data: { entityType: config.entity, entityId: entity.id, publishAt, createdBy: ctx.user?.id ?? null },
      });
  await recordAudit(db, ctx, config, 'SCHEDULED', {
    entity,
    resource: `admin/${config.route}/${entity.id}/schedule`,
    previousData: null,
    fromStatus: 'APPROVED',
    toStatus: 'APPROVED',
    reason: reason ?? null,
    extra: { publishAt: publishAt.toISOString(), scheduleId: schedule.id },
  });
  await recordPublicationEvent(db, config, entity, 'SCHEDULED', { publishAt, reason, actorId: ctx.user?.id ?? null });
  return entity;
}

/**
 * Unpublish — PUBLISHED → DRAFT (Phase 5, mainly News take-down). Pulls the
 * record off the public surface and reopens a fresh change cycle, exactly
 * like an edit; history is preserved.
 */
export async function unpublishGoverned(db, ctx, config, idOrSlug, reason) {
  const updated = await transition(db, ctx, config, idOrSlug, {
    from: 'PUBLISHED', to: 'DRAFT', action: 'UNPUBLISHED', reason,
  });
  await recordPublicationEvent(db, config, updated, 'UNPUBLISHED', { reason, actorId: ctx.user?.id ?? null });
  return updated;
}

/**
 * Rollback — restore the most recent previously PUBLISHED snapshot as a NEW
 * published version (history preserved, never rewritten).
 */
export async function rollbackGoverned(db, ctx, config, idOrSlug, reason) {
  const entity = await findGoverned(db, config, idOrSlug);
  if (!entity) throw httpError(404, 'NOT_FOUND', `${config.label} not found`);
  if (entity.status !== 'PUBLISHED') {
    throw httpError(409, 'INVALID_STATE', 'Only published records can be rolled back');
  }

  // Compare against the FULL snapshot shape (fields + side data) so
  // versions carrying the same composition as the current row are skipped.
  const current = canonicalJson(await snapshotData(db, config, entity));
  const versions = await db[config.versionEntity].findMany({
    where: { [config.fkField]: entity.id, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
  });
  const previous = versions.find((v) => canonicalJson(v.data) !== current);
  if (!previous) throw httpError(400, 'NOTHING_TO_ROLLBACK', 'No previous published version to roll back to');

  const updated = await db[config.entity].update({
    where: { id: entity.id },
    data: { ...previous.data, status: 'PUBLISHED' },
  });
  // Phase 5: restore side tables (Page blocks, HistoryEvent companies) so
  // rollback restores composition, not just scalar fields.
  if (config.afterRollback) await config.afterRollback(db, updated, previous.data, ctx);
  await appendVersion(db, config, updated.id, {
    data: await snapshotData(db, config, updated),
    status: 'PUBLISHED',
    changedBy: ctx.user?.id ?? null,
    reason: reason ?? `Rollback to version ${previous.id}`,
  });
  await recordAudit(db, ctx, config, 'ROLLED_BACK', {
    entity: updated,
    resource: `admin/${config.route}/${entity.id}/rollback`,
    previousData: pickFields(entity, config.fields),
    fromStatus: 'PUBLISHED',
    toStatus: 'PUBLISHED',
    reason,
  });
  await recordPublicationEvent(db, config, updated, 'ROLLED_BACK', { reason, actorId: ctx.user?.id ?? null });
  return updated;
}

/** Archive — from any non-archived status; optional per-entity guard. */
export async function archiveGoverned(db, ctx, config, idOrSlug, reason) {
  const entity = await findGoverned(db, config, idOrSlug);
  if (!entity) throw httpError(404, 'NOT_FOUND', `${config.label} not found`);
  if (entity.status === 'ARCHIVED') {
    throw httpError(409, 'INVALID_STATE', 'Record is already archived');
  }
  if (config.archiveGuard) await config.archiveGuard(db, entity);

  const updated = await db[config.entity].update({ where: { id: entity.id }, data: { status: 'ARCHIVED' } });
  await appendVersion(db, config, updated.id, {
    data: await snapshotData(db, config, updated),
    status: 'ARCHIVED',
    changedBy: ctx.user?.id ?? null,
    reason: reason ?? 'Archived',
  });
  await recordAudit(db, ctx, config, 'ARCHIVED', {
    entity: updated,
    resource: `admin/${config.route}/${entity.id}/archive`,
    previousData: pickFields(entity, config.fields),
    fromStatus: entity.status,
    toStatus: 'ARCHIVED',
    reason,
  });
  return updated;
}
