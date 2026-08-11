/**
 * Corporate metrics governance (Phase 3 — Corporate Truth).
 *
 * One domain, full workflow: DRAFT → IN_REVIEW → APPROVED → PUBLISHED,
 * plus rollback to a previous published value. Every mutation:
 *   - records an immutable MetricVersion row (history is never overwritten)
 *   - writes an AuditLog entry (actor, previous → new value, status change)
 *
 * Only PUBLISHED metrics are ever readable through the public endpoint.
 */

import { writeAudit } from './audit.js';

/** Error with HTTP metadata — understood by the centralized error handler. */
export function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function findMetricByIdOrKey(db, idOrKey) {
  return db.metric.findFirst({
    where: { OR: [{ id: idOrKey }, { key: idOrKey }] },
    include: { owner: { select: { email: true } } },
  });
}

async function appendVersion(db, { metricId, value, status, changedBy, reason }) {
  return db.metricVersion.create({ data: { metricId, value, status, changedBy, reason } });
}

async function recordAudit(db, ctx, { action, resource, metric, previousValue, fromStatus, toStatus, reason, extra = {} }) {
  await writeAudit(
    db,
    {
      actorId: ctx.user?.id ?? null,
      action,
      resource,
      ip: ctx.ip ?? null,
      metadata: {
        metricKey: metric.key,
        metricId: metric.id,
        previousValue: previousValue ?? null,
        newValue: metric.value,
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        reason: reason ?? null,
        ...extra,
      },
    },
    ctx.logger,
  );
}

/** Serialize a metric for API responses (owner relation flattened). */
export function serializeMetric(metric) {
  const { owner, ...rest } = metric;
  return { ...rest, ownerEmail: owner?.email ?? null };
}

// ---------------------------------------------------------------------------
// Workflow transitions
// ---------------------------------------------------------------------------

/** POST /admin/metrics — create a new metric, always landing in DRAFT. */
export async function createMetric(db, ctx, data) {
  const metric = await db.metric.create({
    data: {
      key: data.key,
      label: data.label,
      value: data.value,
      unit: data.unit ?? null,
      ownerId: ctx.user?.id ?? null,
      source: data.source,
      verificationStatus: data.verificationStatus ?? 'UNVERIFIED',
      verificationDate: data.verificationDate ?? null,
      verificationNote: data.verificationNote ?? null,
      effectiveDate: data.effectiveDate ?? null,
      consumers: data.consumers ?? [],
      status: 'DRAFT',
    },
  });
  await appendVersion(db, {
    metricId: metric.id,
    value: metric.value,
    status: 'DRAFT',
    changedBy: ctx.user?.id ?? null,
    reason: data.reason,
  });
  await recordAudit(db, ctx, {
    action: 'METRIC_CREATED',
    resource: 'admin/metrics',
    metric,
    toStatus: 'DRAFT',
    reason: data.reason,
  });
  return metric;
}

/**
 * PATCH /admin/metrics/:id — edit a metric. Any edit reopens the metric
 * into a fresh change cycle (status → DRAFT); the published value stays
 * live until a new one is approved and published.
 */
export async function editMetric(db, ctx, idOrKey, data) {
  const metric = await findMetricByIdOrKey(db, idOrKey);
  if (!metric) throw httpError(404, 'NOT_FOUND', 'Metric not found');
  if (metric.status === 'ARCHIVED') {
    throw httpError(409, 'INVALID_STATE', 'Archived metrics cannot be edited');
  }
  const previousValue = metric.value;
  const previousStatus = metric.status;
  // A changed value invalidates the old verification; a metadata-only edit
  // (label typo, source link) keeps the existing verification intact.
  const valueChanged = data.value !== metric.value;

  const updated = await db.metric.update({
    where: { id: metric.id },
    data: {
      label: data.label,
      value: data.value,
      unit: data.unit ?? null,
      source: data.source,
      verificationStatus: data.verificationStatus ?? (valueChanged ? 'UNVERIFIED' : metric.verificationStatus),
      verificationDate: data.verificationDate ?? (valueChanged ? null : metric.verificationDate),
      verificationNote: data.verificationNote ?? (valueChanged ? null : metric.verificationNote),
      effectiveDate: data.effectiveDate ?? null,
      // Preserve consumers when omitted (Phase 7 impact analysis depends on
      // the consumers list surviving edits that don't touch it).
      consumers: data.consumers ?? metric.consumers ?? [],
      status: 'DRAFT',
    },
  });
  await appendVersion(db, {
    metricId: updated.id,
    value: updated.value,
    status: 'DRAFT',
    changedBy: ctx.user?.id ?? null,
    reason: data.reason,
  });
  await recordAudit(db, ctx, {
    action: 'METRIC_EDITED',
    resource: `admin/metrics/${metric.id}`,
    metric: updated,
    previousValue,
    fromStatus: previousStatus,
    toStatus: 'DRAFT',
    reason: data.reason,
  });
  return updated;
}

/**
 * Shared state-transition runner. Only `from` → `to` is allowed; every
 * transition appends a version and an audit entry.
 */
async function transition(db, ctx, idOrKey, { from, to, action, resource, reason, extraCheck }) {
  const metric = await findMetricByIdOrKey(db, idOrKey);
  if (!metric) throw httpError(404, 'NOT_FOUND', 'Metric not found');
  if (metric.status !== from) {
    throw httpError(409, 'INVALID_STATE', `Metric must be ${from} to ${action.replace('METRIC_', '').toLowerCase()}; it is ${metric.status}`);
  }
  if (extraCheck) await extraCheck(metric);

  const updated = await db.metric.update({ where: { id: metric.id }, data: { status: to } });
  await appendVersion(db, {
    metricId: updated.id,
    value: updated.value,
    status: to,
    changedBy: ctx.user?.id ?? null,
    reason,
  });
  await recordAudit(db, ctx, {
    action,
    resource: `admin/metrics/${metric.id}/${resource}`,
    metric: updated,
    previousValue: metric.value,
    fromStatus: from,
    toStatus: to,
    reason,
  });
  return updated;
}

/** POST /admin/metrics/:id/submit — DRAFT → IN_REVIEW. */
export function submitMetric(db, ctx, idOrKey, reason) {
  return transition(db, ctx, idOrKey, {
    from: 'DRAFT',
    to: 'IN_REVIEW',
    action: 'METRIC_SUBMITTED',
    resource: 'submit',
    reason,
  });
}

/**
 * POST /admin/metrics/:id/approve — IN_REVIEW → APPROVED.
 * Separation of duties: the user who submitted a change can never be the
 * one who approves it (submitter = changedBy of the latest IN_REVIEW version).
 */
export async function approveMetric(db, ctx, idOrKey, reason) {
  const metric = await findMetricByIdOrKey(db, idOrKey);
  if (!metric) throw httpError(404, 'NOT_FOUND', 'Metric not found');
  const lastInReview = await db.metricVersion.findFirst({
    where: { metricId: metric.id, status: 'IN_REVIEW' },
    orderBy: { createdAt: 'desc' },
  });
  if (lastInReview?.changedBy && lastInReview.changedBy === ctx.user?.id) {
    throw httpError(403, 'SEPARATION_OF_DUTIES', 'The submitter cannot approve their own change');
  }
  return transition(db, ctx, idOrKey, {
    from: 'IN_REVIEW',
    to: 'APPROVED',
    action: 'METRIC_APPROVED',
    resource: 'approve',
    reason,
  });
}

/** POST /admin/metrics/:id/publish — APPROVED → PUBLISHED. */
export function publishMetric(db, ctx, idOrKey, reason) {
  return transition(db, ctx, idOrKey, {
    from: 'APPROVED',
    to: 'PUBLISHED',
    action: 'METRIC_PUBLISHED',
    resource: 'publish',
    reason,
  });
}

/**
 * POST /admin/metrics/:id/verify — mark the fact as re-verified.
 * Unlike an edit, this NEVER changes the value or the workflow status:
 * it only records that the figure was re-checked, which clears the metric
 * from the stale-data list. Appends a version row + audit entry for the
 * full history.
 */
export async function verifyMetric(db, ctx, idOrKey, { note = null, verificationDate = new Date() } = {}) {
  const metric = await findMetricByIdOrKey(db, idOrKey);
  if (!metric) throw httpError(404, 'NOT_FOUND', 'Metric not found');
  if (metric.status === 'ARCHIVED') {
    throw httpError(409, 'INVALID_STATE', 'Archived metrics cannot be verified');
  }

  const previousVerificationDate = metric.verificationDate;
  const updated = await db.metric.update({
    where: { id: metric.id },
    data: {
      verificationStatus: 'VERIFIED',
      verificationDate,
      verificationNote: note ?? metric.verificationNote,
    },
  });
  await appendVersion(db, {
    metricId: updated.id,
    value: updated.value,
    status: updated.status,
    changedBy: ctx.user?.id ?? null,
    reason: `Verified: ${note ?? 'fact re-checked'}`,
  });
  await recordAudit(db, ctx, {
    action: 'METRIC_VERIFIED',
    resource: `admin/metrics/${metric.id}/verify`,
    metric: updated,
    previousValue: metric.value,
    fromStatus: metric.status,
    toStatus: updated.status,
    reason: note ?? 'fact re-checked',
    extra: {
      previousVerificationDate: previousVerificationDate ? previousVerificationDate.toISOString() : null,
      newVerificationDate: updated.verificationDate ? updated.verificationDate.toISOString() : null,
    },
  });
  return updated;
}

/**
 * POST /admin/metrics/:id/rollback — restore the most recent previously
 * published value. Creates a NEW published version (history is preserved,
 * never rewritten).
 */
export async function rollbackMetric(db, ctx, idOrKey, reason) {
  const metric = await findMetricByIdOrKey(db, idOrKey);
  if (!metric) throw httpError(404, 'NOT_FOUND', 'Metric not found');
  if (metric.status !== 'PUBLISHED') {
    throw httpError(409, 'INVALID_STATE', 'Only published metrics can be rolled back');
  }

  const previous = await db.metricVersion.findFirst({
    where: { metricId: metric.id, status: 'PUBLISHED', value: { not: metric.value } },
    orderBy: { createdAt: 'desc' },
  });
  if (!previous) throw httpError(400, 'NOTHING_TO_ROLLBACK', 'No previous published value to roll back to');

  const updated = await db.metric.update({
    where: { id: metric.id },
    data: { value: previous.value, status: 'PUBLISHED' },
  });
  await appendVersion(db, {
    metricId: updated.id,
    value: updated.value,
    status: 'PUBLISHED',
    changedBy: ctx.user?.id ?? null,
    reason: reason ?? `Rollback to version ${previous.id} (${previous.value})`,
  });
  await recordAudit(db, ctx, {
    action: 'METRIC_ROLLED_BACK',
    resource: `admin/metrics/${metric.id}/rollback`,
    metric: updated,
    previousValue: metric.value,
    fromStatus: 'PUBLISHED',
    toStatus: 'PUBLISHED',
    reason,
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Stale-data detection (Task 3.8)
// ---------------------------------------------------------------------------

/** Whether a single metric's fact is stale (never verified or older than the window). */
export function isStaleMetric(metric, staleDays) {
  if (metric.verificationStatus === 'VERIFIED' && metric.verificationDate) {
    const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
    return new Date(metric.verificationDate).getTime() < cutoff;
  }
  return true;
}

/**
 * Metrics whose fact has not been re-verified within `staleDays` (or was
 * never verified). Archived metrics are excluded.
 */
export async function listStaleMetrics(db, staleDays) {
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
  return db.metric.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      OR: [{ verificationDate: null }, { verificationDate: { lt: cutoff } }],
    },
    include: { owner: { select: { email: true } } },
    orderBy: { key: 'asc' },
  });
}

// ---------------------------------------------------------------------------
// Impact analysis (Phase 7)
// ---------------------------------------------------------------------------

/**
 * Publishing-time impact for a metric: what the figure is about to change
 * to, what consumes it (from the Phase 0 audit consumers list), and whether
 * the fact is stale. `pending` is the latest in-flight version.
 */
export async function metricImpact(db, metric, staleDays) {
  const versions = await db.metricVersion.findMany({
    where: { metricId: metric.id },
    orderBy: { createdAt: 'desc' },
  });
  const published = versions.find((v) => v.status === 'PUBLISHED');
  // A pending change exists only while the metric itself is in flight — a
  // PUBLISHED metric's old APPROVED version rows are history, not a pending
  // edit (otherwise impact would report phantom diffs after publishing).
  const inFlight = ['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(metric.status);
  const pending = inFlight
    ? (versions.find((v) => ['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(v.status)) ?? null)
    : null;
  return {
    entityType: 'metric',
    route: 'metrics',
    status: metric.status,
    metric: serializeMetric(metric),
    current: published ? { value: published.value, status: published.status } : null,
    pending: pending
      ? { value: pending.value, status: pending.status, changedBy: pending.changedBy, createdAt: pending.createdAt, reason: pending.reason }
      : null,
    diff: published && pending && published.value !== pending.value
      ? { value: { from: published.value, to: pending.value } }
      : {},
    consumers: metric.consumers ?? [],
    verification: {
      status: metric.verificationStatus,
      date: metric.verificationDate ?? null,
      note: metric.verificationNote ?? null,
    },
    stale: isStaleMetric(metric, staleDays),
    versionCount: versions.length,
  };
}

// ---------------------------------------------------------------------------
// Public read (Task 3.9)
// ---------------------------------------------------------------------------

/** Only ever returns a PUBLISHED metric — never draft/review/archived data. */
export async function publishedMetric(db, key) {
  return db.metric.findFirst({ where: { key, status: 'PUBLISHED' } });
}

/** Public projection — the minimum fields the frontend needs to display. */
export function publicMetric(metric) {
  return {
    key: metric.key,
    label: metric.label,
    value: metric.value,
    unit: metric.unit ?? null,
    effectiveDate: metric.effectiveDate ?? null,
    updatedAt: metric.updatedAt,
  };
}
