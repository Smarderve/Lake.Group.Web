/**
 * Phase 7 — merged registry of every governed entity.
 *
 * The review queue, the lazy publisher, and impact analysis need to work
 * across ALL governed entities at once, so the three config files (registry,
 * CMS, map) are merged here:
 *
 *   GOVERNED_ENTITIES  — route → config (what app.js mounts)
 *   GOVERNED_BY_MODEL  — Prisma model name → config (what the queue/publisher
 *                        use when walking entities by entityType)
 */
import { REGISTRY_ENTITIES } from './registry-config.js';
import { CMS_ENTITIES } from './cms-config.js';
import { MAP_ENTITIES } from './map-config.js';

export const GOVERNED_ENTITIES = {
  ...REGISTRY_ENTITIES,
  ...CMS_ENTITIES,
  ...MAP_ENTITIES,
};

export const GOVERNED_BY_MODEL = new Map(
  Object.values(GOVERNED_ENTITIES).map((config) => [config.entity, config]),
);

/** Human label for a governed row (slug/name/title/jobTitle/key fallbacks). */
export function labelOf(config, row) {
  return (
    row?.[config.slugField] ??
    row?.name ??
    row?.title ??
    row?.jobTitle ??
    row?.key ??
    row?.id
  );
}
