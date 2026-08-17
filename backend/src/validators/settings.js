import { z } from 'zod';

/**
 * Settings Center validators (backend/src/routes/settings.js).
 *
 * Preferences are whitelisted — unknown keys are rejected with .strict() so
 * the stored row can never grow fields the server does not understand.
 */

export const THEMES = ['light', 'dark', 'system'];
export const LANGUAGES = ['en', 'sw', 'ar', 'fr', 'pt', 'es'];
export const DATE_FORMATS = ['en-GB', 'en-US'];
export const NUMBER_FORMATS = ['en-US', 'en-GB'];
export const DENSITIES = ['comfortable', 'compact'];

// Group schemas are .partial() so a client can flip one toggle without
// resending every key in the group (the route deep-merges onto the stored
// row), while .strict() keeps unknown keys rejected.
const notificationSettingsSchema = z
  .object({
    email: z.boolean(),
    alerts: z.boolean(),
    publishing: z.boolean(),
    review: z.boolean(),
    security: z.boolean(),
  })
  .partial()
  .strict();

const dashboardSettingsSchema = z
  .object({
    // Empty string means "Dashboard" (the frontend's default landing route).
    landingPage: z.string().max(200),
    quickActions: z.boolean(),
    recentActivity: z.boolean(),
    widgetVisibility: z.record(z.string(), z.boolean()),
  })
  .partial()
  .strict();

const accessibilitySettingsSchema = z
  .object({
    fontScale: z.number().int().min(90).max(140), // percent
    reducedMotion: z.boolean(),
    highContrast: z.boolean(),
  })
  .partial()
  .strict();

/** PATCH /admin/settings — partial update; every key optional. */
export const preferencesPatchSchema = z
  .object({
    theme: z.enum(THEMES),
    language: z.enum(LANGUAGES),
    timezone: z.string().min(1).max(64),
    dateFormat: z.enum(DATE_FORMATS),
    numberFormat: z.enum(NUMBER_FORMATS),
    compactMode: z.boolean(),
    sidebarCollapsed: z.boolean(),
    density: z.enum(DENSITIES),
    notificationSettings: notificationSettingsSchema,
    dashboardSettings: dashboardSettingsSchema,
    accessibilitySettings: accessibilitySettingsSchema,
  })
  .partial()
  .strict();

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

/** Available option values, returned by GET /admin/settings for the UI. */
export const SETTINGS_OPTIONS = Object.freeze({
  themes: THEMES,
  languages: LANGUAGES,
  dateFormats: DATE_FORMATS,
  numberFormats: NUMBER_FORMATS,
  densities: DENSITIES,
});
