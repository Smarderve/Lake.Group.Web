import { z } from 'zod';

export const ROLES = ['SUPER_ADMIN', 'EDITOR', 'REVIEWER', 'CONTACT_MANAGER', 'VIEWER'];

export const loginSchema = z.object({
  email: z.email('A valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const mfaCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const roleSchema = z.object({
  role: z.enum(ROLES),
});

export const passwordResetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// SECURITY_ROADMAP Phase 5 — public content-gap feedback (Phase 9 assistant).
export const unansweredQuestionSchema = z.object({
  question: z.string().trim().min(1, 'question is required').max(500, 'question must be at most 500 characters'),
  language: z
    .string()
    .regex(/^[a-z]{2,3}$/i, 'language must be a 2-3 letter code')
    .max(3)
    .optional(),
  page: z.string().max(200, 'page must be at most 200 characters').optional(),
});

// SECURITY_ROADMAP Phase 5 — admin resolution of a tracked question.
export const unansweredResolveSchema = z.object({
  answered: z.boolean().optional(),
  answerNote: z.string().max(500, 'Answer note must be at most 500 characters').nullable().optional(),
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
