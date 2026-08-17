import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setUserFormats } from '../../utils/format';
import { useAuth } from '../auth/AuthProvider';
import { settingsApi } from './api';
import {
  PREFERENCES_DEFAULTS,
  type SettingsOptions,
  type UserPreferences,
} from './preferences';

export type SettingsStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface SettingsContextValue {
  /** Server-stored preferences; defaults until the first load completes. */
  preferences: UserPreferences;
  /** Allowed values, served by the backend for the settings forms. */
  options: SettingsOptions;
  status: SettingsStatus;
  isSaving: boolean;
  /** Persist a partial update. Optimistic on success, rolls back on failure. */
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  /** Re-fetch preferences from the server. */
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function systemPrefersDark(): boolean {
  // matchMedia is standard in browsers; guard for test/SSR environments.
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(theme: UserPreferences['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return theme;
}

/** Apply every preference that has a real rendering effect to <html>. */
function applyToDocument(prefs: UserPreferences): void {
  const root = document.documentElement;

  root.dataset.theme = resolveTheme(prefs.theme);
  root.dataset.density = prefs.density;
  root.dataset.reducedMotion = String(prefs.accessibilitySettings.reducedMotion ?? false);
  root.dataset.highContrast = String(prefs.accessibilitySettings.highContrast ?? false);
  root.style.fontSize = `${prefs.accessibilitySettings.fontScale ?? 100}%`;

  setUserFormats({
    dateLocale: prefs.dateFormat,
    numberLocale: prefs.numberFormat,
    timeZone: prefs.timezone,
  });
}

/**
 * Loads the signed-in employee's preferences once auth restores, applies the
 * ones with real rendering effects (theme, density, font scale, reduced
 * motion, high contrast, date/number/timezone formats), and exposes an
 * optimistic PATCH for the Settings Center forms. Backend remains
 * authoritative — preferences are always scoped to the session user.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(PREFERENCES_DEFAULTS);
  const [options, setOptions] = useState<SettingsOptions>({
    themes: ['light', 'dark', 'system'],
    languages: ['en', 'sw', 'ar', 'fr', 'pt', 'es'],
    dateFormats: ['en-GB', 'en-US'],
    numberFormats: ['en-US', 'en-GB'],
    densities: ['comfortable', 'compact'],
  });
  const [status, setStatus] = useState<SettingsStatus>('idle');
  const [isSaving, setIsSaving] = useState(false);
  // Skip the initial apply until a real load completes (or is skipped).
  const appliedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const { preferences: stored, options: available } = await settingsApi.get();
      setPreferences(stored);
      setOptions(available);
      applyToDocument(stored);
      setStatus('loaded');
    } catch {
      setStatus('error');
      throw new Error('Could not load settings');
    }
  }, []);

  // Load once the session is restored.
  useEffect(() => {
    if (authStatus !== 'authenticated' || status !== 'idle') return;
    setStatus('loading');
    settingsApi
      .get()
      .then(({ preferences: stored, options: available }) => {
        setPreferences(stored);
        setOptions(available);
        applyToDocument(stored);
        appliedRef.current = true;
        setStatus('loaded');
      })
      .catch(() => setStatus('error'));
  }, [authStatus, status]);

  // Follow the OS theme when the preference is "system".
  useEffect(() => {
    if (preferences.theme !== 'system') return;
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (appliedRef.current) document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preferences.theme]);

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    // Snapshot for rollback.
    const previous = { ...preferences };
    const optimistic = {
      ...previous,
      ...patch,
      notificationSettings: {
        ...previous.notificationSettings,
        ...(patch.notificationSettings ?? {}),
      },
      dashboardSettings: {
        ...previous.dashboardSettings,
        ...(patch.dashboardSettings ?? {}),
      },
      accessibilitySettings: {
        ...previous.accessibilitySettings,
        ...(patch.accessibilitySettings ?? {}),
      },
    };
    setPreferences(optimistic);
    applyToDocument(optimistic);
    setIsSaving(true);
    try {
      const { preferences: saved } = await settingsApi.patch(patch);
      setPreferences(saved);
      applyToDocument(saved);
    } catch (err) {
      // Roll back — a failed save must never change the applied settings.
      setPreferences(previous);
      applyToDocument(previous);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [preferences]);

  const value = useMemo<SettingsContextValue>(
    () => ({ preferences, options, status, isSaving, updatePreferences, refresh }),
    [preferences, options, status, isSaving, updatePreferences, refresh],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>');
  return ctx;
}
