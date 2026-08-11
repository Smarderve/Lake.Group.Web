import { z } from 'zod';

// Every create/edit requires a `reason` so the version history always
// explains why the record changed (same discipline as Metric in Phase 3).
const reasonField = z.string().min(1, 'Reason is required — why is this changing?');

// FK columns are TEXT; referential integrity is enforced by the DB.
const refField = z.string().min(1);

// ---------------------------------------------------------------------------
// Country
// ---------------------------------------------------------------------------
export const countryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isoCode: z.string().regex(/^[A-Z]{2,3}$/, 'ISO code must be 2-3 uppercase letters (e.g. TZ)'),
  regionGrouping: z.string().min(1).max(120).optional(),
  reason: reasonField,
});
// isoCode is the unique identity — immutable after creation.
export const countryUpdateSchema = countryCreateSchema.omit({ isoCode: true });

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------
export const regionCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  countryId: refField,
  reason: reasonField,
});
export const regionUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  countryId: refField.optional(),
  reason: reasonField,
});

// ---------------------------------------------------------------------------
// Location — must belong to a region OR a country (at least one).
// ---------------------------------------------------------------------------
const locationFields = {
  name: z.string().min(1, 'Name is required'),
  regionId: refField.optional(),
  countryId: refField.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  type: z.string().min(1).max(60).optional(),
  reason: reasonField,
};
const atLeastOneScope = (data, ctx) => {
  if (!data.regionId && !data.countryId) {
    ctx.addIssue({ code: 'custom', path: ['regionId'], message: 'A location must belong to a region or a country' });
  }
};
export const locationCreateSchema = z.object(locationFields).superRefine(atLeastOneScope);
export const locationUpdateSchema = z.object(locationFields).superRefine(atLeastOneScope);

// ---------------------------------------------------------------------------
// Facility
// ---------------------------------------------------------------------------
export const facilityCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  locationId: refField,
  companyId: refField,
  category: z.string().min(1).max(80).optional(),
  coordinates: z.string().min(1).max(120).optional(),
  operationalStatus: z.string().min(1).max(60).optional(),
  // Phase 6 — operations map: layer + display metadata.
  mapCategoryId: refField.nullable().optional(), // null clears the layer
  mapVisible: z.boolean().optional(),
  markerLabel: z.string().max(80).optional(),
  reason: reasonField,
});
export const facilityUpdateSchema = facilityCreateSchema;

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------
export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().max(500).optional(),
  reason: reasonField,
});
export const categoryUpdateSchema = categoryCreateSchema;

// ---------------------------------------------------------------------------
// Company (with subsidiary self-relation; slug immutable)
// ---------------------------------------------------------------------------
export const companyCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with dashes (e.g. lake-oil)'),
  description: z.string().max(2000).optional(),
  logo: z.string().max(500).optional(),
  logoMediaId: refField.nullable().optional(), // Phase 6 — media library linkage (null detaches)
  parentCompanyId: refField.optional(),
  categoryId: refField.optional(),
  headquartersCountryId: refField.optional(),
  foundedDate: z.coerce.date().optional(),
  website: z.string().max(300).optional(),
  reason: reasonField,
});
export const companyUpdateSchema = companyCreateSchema.omit({ slug: true });

// ---------------------------------------------------------------------------
// ProductService
// ---------------------------------------------------------------------------
export const productServiceCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().max(1000).optional(),
  companyId: refField,
  categoryId: refField.optional(),
  reason: reasonField,
});
export const productServiceUpdateSchema = productServiceCreateSchema;

// ---------------------------------------------------------------------------
// CompanyRelationship
// ---------------------------------------------------------------------------
export const RELATIONSHIP_TYPES = ['SUBSIDIARY_OF', 'PARTNER_OF', 'JOINT_VENTURE_WITH', 'OTHER'];
export const companyRelationshipCreateSchema = z.object({
  companyId: refField,
  relatedCompanyId: refField,
  relationshipType: z.enum(RELATIONSHIP_TYPES),
  reason: reasonField,
});
export const companyRelationshipUpdateSchema = companyRelationshipCreateSchema;

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------
export const transitionSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

// Phase 7 — rejection requires an explanation (sent back to the editor).
export const rejectSchema = z.object({
  reason: z.string().min(1, 'A reason is required to reject a submission').max(1000),
});

// Phase 7 — scheduled publishing: a future publishAt (+ optional reason).
export const scheduleSchema = z.object({
  publishAt: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), 'publishAt must be in the future'),
  reason: z.string().max(500).optional(),
});

export function validationErrorBody(issues) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request body failed validation',
      details: issues.map((issue) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    },
  };
}
