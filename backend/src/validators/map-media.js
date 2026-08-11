import { z } from 'zod';

const reasonField = z.string().min(1, 'Reason is required — why is this changing?');
const slugField = z.string().regex(
  /^[a-z0-9][a-z0-9-]*$/,
  'Slug must be lowercase alphanumeric with dashes (e.g. corporate-logos)',
);

// ---------------------------------------------------------------------------
// Media (Phase 6 — full library, governed)
// ---------------------------------------------------------------------------
export const mediaCreateSchema = z.object({
  url: z.string().min(1, 'URL is required').max(500),
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  mimeType: z.string().max(100).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  copyright: z.string().max(200).optional(),
  license: z.string().max(200).optional(),
  tags: z.array(z.string().min(1).max(60)).max(20).optional(),
  variants: z.record(z.string().min(1), z.string().min(1)).optional(),
  folderId: z.string().min(1).optional(),
  reason: reasonField,
});
// Replacement = PATCH url/variants → new cycle, same id, usage preserved.
export const mediaUpdateSchema = mediaCreateSchema;

// ---------------------------------------------------------------------------
// MediaFolder — organizational only, NOT governed (no reason, no workflow).
// ---------------------------------------------------------------------------
export const mediaFolderCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: slugField,
  parentId: z.string().min(1).optional(),
  description: z.string().max(300).optional(),
  sortOrder: z.number().int().optional(),
});
export const mediaFolderUpdateSchema = mediaFolderCreateSchema.omit({ slug: true });

// ---------------------------------------------------------------------------
// MapCategory — map layers, governed.
// ---------------------------------------------------------------------------
export const mapCategoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: slugField,
  description: z.string().max(300).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex value like #E63946').optional(),
  icon: z.string().max(80).optional(),
  sortOrder: z.number().int().optional(),
  reason: reasonField,
});
// slug is the layer identity — immutable after creation.
export const mapCategoryUpdateSchema = mapCategoryCreateSchema.omit({ slug: true });
