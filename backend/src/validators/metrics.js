import { z } from 'zod';

// `source` and `reason` are mandatory on every create/edit (Task 3.3) so the
// version history always explains where a figure came from and why it changed.
export const metricBaseSchema = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, 'Key must be lowercase alphanumeric (a-z, 0-9, -, _)'),
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
  unit: z.string().min(1).max(80).optional(),
  source: z.string().min(1, 'Source is required — where does this figure come from?'),
  reason: z.string().min(1, 'Reason is required — why is this changing?'),
  verificationStatus: z.enum(['UNVERIFIED', 'VERIFIED']).optional(),
  verificationDate: z.coerce.date().optional(),
  verificationNote: z.string().max(500).optional(),
  effectiveDate: z.coerce.date().optional(),
  consumers: z.array(z.string().min(1)).max(50).optional(),
});

export const metricCreateSchema = metricBaseSchema;
export const metricUpdateSchema = metricBaseSchema.omit({ key: true }); // key is the identity — immutable

export const transitionSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

// Re-verification (POST /admin/metrics/:id/verify) — never touches value/status.
export const verificationSchema = z.object({
  note: z.string().min(1).max(500).optional(),
  verificationDate: z.coerce.date().optional(),
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
