import { GOVERNED_BY_MODEL, labelOf } from './governed-registry.js';
import { publishEntityNow } from './governed.js';

/**
 * Phase 7 — lazy scheduled publishing.
 *
 * PublishSchedule rows hold future `publishAt` times for APPROVED governed
 * entities. Instead of a cron, promotion happens on the next read: the
 * public router and the review queue call this, so a scheduled item goes
 * live on the first public read after its time arrives (or shows up in the
 * review queue beforehand). No external infrastructure, consistent with the
 * on-demand News scheduling from Phase 5.
 *
 * Promotion is best-effort: an entity that is no longer APPROVED (edited,
 * rejected, archived) is skipped and its schedule stays PENDING for a human
 * to resolve. Failures are logged and never break the request that triggered
 * the sweep.
 */
export async function promoteDueScheduled(db, logger) {
  if (!db?.publishSchedule) return 0;
  let due;
  try {
    due = await db.publishSchedule.findMany({
      where: { status: 'PENDING', publishAt: { lte: new Date() } },
      orderBy: { publishAt: 'asc' },
    });
  } catch (err) {
    logger?.warn?.({ err }, 'scheduled promotion scan failed');
    return 0;
  }

  let promoted = 0;
  for (const schedule of due) {
    const config = GOVERNED_BY_MODEL.get(schedule.entityType);
    if (!config) {
      logger?.warn?.({ entityType: schedule.entityType }, 'no governed config for scheduled entity');
      continue;
    }
    try {
      const entity = await db[config.entity].findFirst({ where: { id: schedule.entityId } });
      if (!entity) continue;
      if (entity.status !== 'APPROVED') continue; // left for a human to resolve

      await publishEntityNow(db, config, entity, {
        actorId: null,
        logger,
        publishAt: schedule.publishAt,
        reason: `Scheduled publication of ${labelOf(config, entity)}`,
      });
      await db.publishSchedule.update({
        where: { id: schedule.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      promoted += 1;
    } catch (err) {
      logger?.warn?.({ err, scheduleId: schedule.id }, 'scheduled promotion failed for entity');
    }
  }
  if (promoted > 0) logger?.info?.({ promoted }, 'scheduled publications promoted');
  return promoted;
}
