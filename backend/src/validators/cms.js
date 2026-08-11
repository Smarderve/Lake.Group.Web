import { z } from 'zod';

// Every create/edit of a governed entity requires a `reason` so the
// version history always explains why the record changed.
const reasonField = z.string().min(1, 'Reason is required — why is this changing?');
const refField = z.string().min(1);
const slugField = z.string().regex(
  /^[a-z0-9][a-z0-9-]*$/,
  'Slug must be lowercase alphanumeric with dashes (e.g. annual-report-2025)',
);
const seoFields = {
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(320).optional(),
};

// ---------------------------------------------------------------------------
// Media (Task 5.1) — simple stub, NOT governed (no reason, no workflow).
// ---------------------------------------------------------------------------
export const mediaCreateSchema = z.object({
  url: z.string().min(1, 'URL is required').max(500),
  altText: z.string().max(300).optional(),
});

// ---------------------------------------------------------------------------
// ContentBlock (Task 5.2)
// ---------------------------------------------------------------------------
export const CONTENT_BLOCK_TYPES = ['RICHTEXT', 'STAT_HIGHLIGHT', 'QUOTE', 'CALLOUT'];
export const contentBlockCreateSchema = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Key must be lowercase alphanumeric with dashes (e.g. about-mission)'),
  type: z.enum(CONTENT_BLOCK_TYPES),
  content: z.record(z.string(), z.unknown(), 'Content must be a JSON object'),
  reason: reasonField,
});
// `key` is the reusable identity — immutable after creation.
export const contentBlockUpdateSchema = contentBlockCreateSchema.omit({ key: true });

// ---------------------------------------------------------------------------
// Page (Task 5.2) — contentBlocks: array of block keys assembled via the join.
// ---------------------------------------------------------------------------
export const pageCreateSchema = z.object({
  slug: slugField,
  title: z.string().min(1, 'Title is required'),
  layoutType: z.string().max(60).optional(),
  contentBlocks: z.array(z.string().min(1)).optional(),
  ...seoFields,
  reason: reasonField,
});
export const pageUpdateSchema = pageCreateSchema.omit({ slug: true });

// ---------------------------------------------------------------------------
// News (Task 5.3) — publicationDate in the future = scheduled.
// ---------------------------------------------------------------------------
export const newsCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: slugField,
  body: z.string().min(1, 'Body is required'),
  authorId: refField.optional(),
  categoryId: refField.optional(),
  relatedCompanyId: refField.optional(),
  relatedProjectId: refField.optional(),
  publicationDate: z.coerce.date().optional(),
  heroMediaId: refField.nullable().optional(), // Phase 6 — hero image (null detaches)
  ...seoFields,
  reason: reasonField,
});
export const newsUpdateSchema = newsCreateSchema.omit({ slug: true });

// ---------------------------------------------------------------------------
// Project (Task 5.4)
// ---------------------------------------------------------------------------
export const projectCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  companyId: refField.optional(),
  locationId: refField.optional(),
  sector: z.string().max(120).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  description: z.string().max(4000).optional(),
  impact: z.string().max(4000).optional(),
  coverMediaId: refField.nullable().optional(), // Phase 6 — cover image (null detaches)
  reason: reasonField,
});
export const projectUpdateSchema = projectCreateSchema;

// ---------------------------------------------------------------------------
// Leadership (Task 5.5)
// ---------------------------------------------------------------------------
export const leadershipCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  bio: z.string().max(4000).optional(),
  photo: z.string().max(500).optional(),
  photoMediaId: refField.nullable().optional(), // Phase 6 — photo (null detaches)
  order: z.number().int().optional(),
  companyId: refField.optional(),
  reason: reasonField,
});
export const leadershipUpdateSchema = leadershipCreateSchema;

// ---------------------------------------------------------------------------
// Contact (Task 5.6)
// ---------------------------------------------------------------------------
export const CONTACT_TYPES = ['HR', 'MARKETING', 'SUPPORT', 'CORPORATE', 'COMPANY_SPECIFIC'];
export const contactCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(CONTACT_TYPES),
  companyId: refField.optional(),
  locationId: refField.optional(),
  phone: z.string().max(60).optional(),
  email: z.string().email().optional(),
  publicDisplay: z.boolean().optional(),
  order: z.number().int().optional(),
  verificationStatus: z.enum(['UNVERIFIED', 'VERIFIED']).optional(),
  verificationDate: z.coerce.date().optional(),
  reason: reasonField,
});
export const contactUpdateSchema = contactCreateSchema;

// ---------------------------------------------------------------------------
// HistoryEvent (Task 5.7) — companyIds: companies involved (join table).
// ---------------------------------------------------------------------------
export const historyEventCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  description: z.string().max(4000).optional(),
  imageMediaId: refField.nullable().optional(), // Phase 6 — image (null detaches)
  order: z.number().int().optional(),
  companyIds: z.array(refField).optional(),
  reason: reasonField,
});
export const historyEventUpdateSchema = historyEventCreateSchema;

// ---------------------------------------------------------------------------
// CareerListing (Task 5.8) — listingStatus is orthogonal to the lifecycle.
// ---------------------------------------------------------------------------
export const careerListingCreateSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  department: z.string().max(120).optional(),
  companyId: refField.optional(),
  locationId: refField.optional(),
  description: z.string().max(4000).optional(),
  requirements: z.string().max(4000).optional(),
  employmentType: z.string().max(60).optional(),
  postedDate: z.coerce.date().optional(),
  closingDate: z.coerce.date().optional(),
  listingStatus: z.enum(['OPEN', 'CLOSED']).optional(),
  reason: reasonField,
});
export const careerListingUpdateSchema = careerListingCreateSchema;

// ---------------------------------------------------------------------------
// CSREntry (Task 5.9)
// ---------------------------------------------------------------------------
export const csrEntryCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(4000).optional(),
  category: z.string().max(80).optional(),
  imageMediaId: refField.nullable().optional(), // Phase 6 — image (null detaches)
  companyId: refField.optional(),
  date: z.coerce.date().optional(),
  period: z.string().max(80).optional(),
  reason: reasonField,
});
export const csrEntryUpdateSchema = csrEntryCreateSchema;

// ---------------------------------------------------------------------------
// Child resources — simple CRUD, no governance, no reason required.
// ---------------------------------------------------------------------------
export const milestoneCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.coerce.date(),
  description: z.string().max(2000).optional(),
});

export const LEADERSHIP_EVENT_TYPES = ['APPOINTED', 'PROMOTED', 'REPLACED', 'DEPARTED'];
export const leadershipEventCreateSchema = z.object({
  eventType: z.enum(LEADERSHIP_EVENT_TYPES),
  date: z.coerce.date(),
  notes: z.string().max(1000).optional(),
});
