import { httpError } from './governed.js';

/**
 * Phase 6 — media usage tracking.
 *
 * Media-bearing governed entities (Company.logoMediaId, Leadership.photoMediaId,
 * News.heroMediaId, Project.coverMediaId, HistoryEvent.imageMediaId,
 * CSREntry.imageMediaId) plug into MediaUsage via these hooks — the same
 * beforeCreate/afterCreate/beforeUpdate/afterUpdate/afterRollback hooks the
 * governed workflow already supports. Usage rows are ALWAYS written
 * server-side from the entity's own mediaId column — never client-supplied.
 *
 * Consequence: a media item that is in use cannot be archived (MEDIA_IN_USE)
 * until every referencing entity drops the link — deliberate, so published
 * surfaces never dangle under archived media.
 */

async function assertMediaExists(db, mediaId) {
  if (!mediaId) return;
  const media = await db.media.findFirst({ where: { id: mediaId } });
  if (!media) throw httpError(400, 'INVALID_MEDIA', `No media item with id ${mediaId}`);
}

async function writeUsage(db, entityType, entityId, field, mediaId) {
  await db.mediaUsage.deleteMany({ where: { entityType, entityId, field } });
  if (mediaId) {
    await db.mediaUsage.create({ data: { mediaId, entityType, entityId, field } });
  }
}

/**
 * Hook set for one media field. `entityType` is the public route/model name
 * recorded in MediaUsage.entityType (e.g. "news", "leadership").
 */
export function mediaUsageHooks(mediaField, entityType) {
  return {
    beforeCreate: async (db, data) => {
      await assertMediaExists(db, data[mediaField]);
      return { data, extra: null };
    },
    beforeUpdate: async (db, _entity, data) => {
      await assertMediaExists(db, data[mediaField]);
      return { data, extra: null };
    },
    afterCreate: async (db, row) => writeUsage(db, entityType, row.id, mediaField, row[mediaField]),
    afterUpdate: async (db, row) => writeUsage(db, entityType, row.id, mediaField, row[mediaField]),
    afterRollback: async (db, row, previous) =>
      writeUsage(db, entityType, row.id, mediaField, previous[mediaField] ?? null),
  };
}

/** Compose several beforeCreate/beforeUpdate hooks into one (e.g. News
 *  author defaulting + media validation). Each receives the data of the
 *  previous; `extra` from the first hook that produces one wins. */
export function composeHooks(...hooks) {
  return async (db, data, ctx) => {
    let current = data;
    let extra = null;
    for (const hook of hooks) {
      const result = await hook(db, current, ctx);
      current = result.data;
      if (result.extra != null) extra = result.extra;
    }
    return { data: current, extra };
  };
}

/**
 * Media beforeCreate: `uploadedBy` is always the session user — server-side,
 * never client input.
 */
export async function mediaBeforeCreate(_db, data, ctx) {
  return { data: { ...data, uploadedBy: ctx?.user?.id ?? null }, extra: null };
}

/** Archive guard: media in use cannot be archived (MEDIA_IN_USE). */
export async function mediaArchiveGuard(db, media) {
  const usages = await db.mediaUsage.findMany({ where: { mediaId: media.id } });
  if (usages.length > 0) {
    const refs = usages.map((u) => `${u.entityType}#${u.field}`).join(', ');
    throw httpError(409, 'MEDIA_IN_USE', `Media is used by ${refs} — remove those references before archiving`);
  }
}
