/**
 * Settings Center types (Settings Redesign plan).
 *
 * Mirror of backend/src/validators/settings.js and lib/user-prefs-store.js —
 * the backend is the source of truth; nothing here is invented.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type DensityPreference = 'comfortable' | 'compact';

export interface NotificationPreferences {
  email: boolean;
  alerts: boolean;
  publishing: boolean;
  review: boolean;
  security: boolean;
}

export interface DashboardPreferences {
  /** Landing route after sign-in, e.g. "/app/news". Empty = Dashboard. */
  landingPage: string;
  quickActions: boolean;
  recentActivity: boolean;
  widgetVisibility: Record<string, boolean>;
}

export interface AccessibilityPreferences {
  /** 90–140 percent. */
  fontScale: number;
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface UserPreferences {
  theme: ThemePreference;
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  compactMode: boolean;
  sidebarCollapsed: boolean;
  density: DensityPreference;
  notificationSettings: NotificationPreferences;
  dashboardSettings: DashboardPreferences;
  accessibilitySettings: AccessibilityPreferences;
}

export interface SettingsOptions {
  themes: ThemePreference[];
  languages: string[];
  dateFormats: string[];
  numberFormats: string[];
  densities: DensityPreference[];
}

export interface SettingsResponse {
  preferences: UserPreferences;
  options: SettingsOptions;
  defaults: UserPreferences;
}

export interface SystemPosture {
  status: 'ok' | 'degraded';
  service: string;
  db: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
  posture: {
    secureSessionCookies: boolean;
    originProtection: boolean;
    serverSideAuthorization: boolean;
    mfaEnabled: boolean;
    role: string;
  };
}

export const NOTIFICATION_DEFAULTS: NotificationPreferences = {
  email: false,
  alerts: true,
  publishing: true,
  review: true,
  security: true,
};

export const DASHBOARD_DEFAULTS: DashboardPreferences = {
  landingPage: '',
  quickActions: true,
  recentActivity: true,
  widgetVisibility: {},
};

export const ACCESSIBILITY_DEFAULTS: AccessibilityPreferences = {
  fontScale: 100,
  reducedMotion: false,
  highContrast: false,
};

/** Mirrors backend PREF_DEFAULTS — used until the server answers. */
export const PREFERENCES_DEFAULTS: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'en-GB',
  numberFormat: 'en-US',
  compactMode: false,
  sidebarCollapsed: false,
  density: 'comfortable',
  notificationSettings: { ...NOTIFICATION_DEFAULTS },
  dashboardSettings: { ...DASHBOARD_DEFAULTS },
  accessibilitySettings: { ...ACCESSIBILITY_DEFAULTS },
};

export const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  sw: 'Swahili',
  ar: 'Arabic',
  fr: 'French',
  pt: 'Portuguese',
  es: 'Spanish',
};

/** Curated timezones shown first; the full IANA list follows in the select. */
export const COMMON_TIMEZONES = [
  'UTC',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Accra',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
];
