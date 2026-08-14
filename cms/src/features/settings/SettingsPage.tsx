import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { authApi } from '../auth/api';
import { settingsApi } from './api';
import { useSettings } from './SettingsProvider';
import {
  COMMON_TIMEZONES,
  LANGUAGE_LABELS,
  type DashboardPreferences,
  type NotificationPreferences,
  type UserPreferences,
} from './preferences';
import { apiErrorMessage } from '../../services/api';
import { formatDateTime, formatDuration } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toast';

/** Changed top-level preference keys between server state and the draft. */
function diffPrefs(current: UserPreferences, draft: UserPreferences): Partial<UserPreferences> {
  const diff: Partial<UserPreferences> = {};
  for (const key of Object.keys(current) as (keyof UserPreferences)[]) {
    if (JSON.stringify(current[key]) !== JSON.stringify(draft[key])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (diff as any)[key] = draft[key];
    }
  }
  return diff;
}

/** Full IANA timezone list (with the common zones first) for the select. */
const ALL_TIMEZONES = buildTimezoneOptions();

function buildTimezoneOptions(): string[] {
  const supported: string[] =
    typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
      ? (Intl.supportedValuesOf('timeZone') as string[])
      : [];
  const rest = supported
    .filter((zone) => !COMMON_TIMEZONES.includes(zone))
    .sort((a, b) => a.localeCompare(b));
  return [...COMMON_TIMEZONES, ...rest];
}

const LANDING_ROUTES: { value: string; label: string }[] = [
  { value: '', label: 'Dashboard' },
  { value: '/app/news', label: 'News' },
  { value: '/app/companies', label: 'Companies' },
  { value: '/app/projects', label: 'Projects' },
  { value: '/app/media', label: 'Media Library' },
  { value: '/app/review', label: 'Review Queue' },
  { value: '/app/scheduled', label: 'Scheduled Publishing' },
  { value: '/app/notifications', label: 'Notifications' },
];

/**
 * Settings Center (Settings Redesign plan). One shared draft for the whole
 * page, saved via a single sticky Save bar: switching tabs never loses
 * changes, "Saved successfully" only appears after the backend confirms, and
 * a failed save rolls back and leaves the applied settings untouched.
 */
export function SettingsPage() {
  const { preferences, options, status, isSaving, updatePreferences, refresh } = useSettings();
  const { toast } = useToast();
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const [activeTab, setActiveTab] = useState('appearance');

  // Keep the draft aligned with server state whenever it is not dirty
  // (first load, after a successful save, after a discard).
  const dirty = useMemo(() => Object.keys(diffPrefs(preferences, draft)).length > 0, [preferences, draft]);

  useEffect(() => {
    if (!dirty) setDraft(preferences);
  }, [preferences, dirty]);

  function setField<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const diff = diffPrefs(preferences, draft);
    if (Object.keys(diff).length === 0) return;
    try {
      await updatePreferences(diff);
      toast({ variant: 'success', title: 'Saved successfully', description: 'Your settings are up to date.' });
    } catch (err) {
      toast({ variant: 'error', title: 'Could not save settings', description: apiErrorMessage(err) });
    }
  }

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Settings" description="Manage your CMS preferences and system diagnostics." />
        <div className="space-y-4" role="status" aria-label="Loading settings">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <PageHeader title="Settings" description="Manage your CMS preferences and system diagnostics." />
        <Alert
          tone="error"
          title="Settings unavailable"
          description="Unable to connect to the CMS server. Your existing settings have not been changed."
          action={
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your CMS preferences and system diagnostics."
      />

      <Tabs
        ariaLabel="Settings categories"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { value: 'appearance', label: 'Appearance', content: <AppearanceTab draft={draft} setField={setField} options={options} /> },
          { value: 'language', label: 'Language & Region', content: <LanguageTab draft={draft} setField={setField} options={options} /> },
          { value: 'notifications', label: 'Notifications', content: <NotificationsTab draft={draft} setField={setField} /> },
          { value: 'dashboard', label: 'Dashboard', content: <DashboardTab draft={draft} setField={setField} /> },
          { value: 'account', label: 'Account', content: <AccountTab /> },
          { value: 'accessibility', label: 'Accessibility', content: <AccessibilityTab draft={draft} setField={setField} /> },
          { value: 'system', label: 'System', content: <SystemTab /> },
        ]}
      />

      {dirty && (
        <div className="sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-4 rounded-xl border border-border-strong bg-surface px-4 py-3 shadow-dialog">
          <p className="text-sm text-ink">
            <span className="font-medium">Unsaved changes</span>
            <span className="text-ink-muted"> — save or discard before leaving.</span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(preferences)} disabled={isSaving}>
              Discard
            </Button>
            <Button size="sm" onClick={() => void handleSave()} loading={isSaving}>
              Save changes
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

/** A settings row: label + hint on the left, control on the right. */
function PrefsRow({
  label,
  hint,
  controlId,
  children,
}: {
  label: string;
  hint?: string;
  controlId: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-3.5 last:border-0">
      <div className="min-w-0">
        <label htmlFor={controlId} className="block cursor-pointer text-sm font-medium text-ink">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 max-w-[65ch] text-xs text-ink-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function AppearanceTab({
  draft,
  setField,
  options,
}: {
  draft: UserPreferences;
  setField: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  options: { themes: string[]; densities: string[] };
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title="Theme"
        description="Pick how the CMS looks. System follows your operating system's light or dark setting."
      >
        <Field id="theme" label="Interface theme">
          <Select
            id="theme"
            value={draft.theme}
            onChange={(event) => setField('theme', event.target.value as UserPreferences['theme'])}
          >
            {options.themes.map((theme) => (
              <option key={theme} value={theme}>
                {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
              </option>
            ))}
          </Select>
        </Field>
      </SectionCard>

      <SectionCard title="Layout" description="Control how much of the interface you see while you work.">
        <PrefsRow
          label="Collapsed sidebar"
          hint="Show only icons in the navigation rail."
          controlId="sidebar-collapsed"
        >
          <Switch
            id="sidebar-collapsed"
            checked={draft.sidebarCollapsed}
            onChange={(checked) => setField('sidebarCollapsed', checked)}
            aria-label="Collapsed sidebar"
          />
        </PrefsRow>
        <Field id="density" label="Density" className="mt-4">
          <Select
            id="density"
            value={draft.density}
            onChange={(event) => {
              const density = event.target.value as UserPreferences['density'];
              setField('density', density);
              setField('compactMode', density === 'compact');
            }}
          >
            {options.densities.map((density) => (
              <option key={density} value={density}>
                {density === 'compact' ? 'Compact' : 'Comfortable'}
              </option>
            ))}
          </Select>
        </Field>
      </SectionCard>
    </div>
  );
}

function LanguageTab({
  draft,
  setField,
  options,
}: {
  draft: UserPreferences;
  setField: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  options: { languages: string[]; dateFormats: string[]; numberFormats: string[] };
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Language & Region"
        description="Choose how dates, numbers and times appear. These formats apply across the CMS."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="language" label="CMS interface language">
            <Select
              id="language"
              value={draft.language}
              onChange={(event) => setField('language', event.target.value)}
            >
              {options.languages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="timezone" label="Timezone">
            <Select
              id="timezone"
              value={draft.timezone}
              onChange={(event) => setField('timezone', event.target.value)}
            >
              {ALL_TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="date-format" label="Date format">
            <Select
              id="date-format"
              value={draft.dateFormat}
              onChange={(event) => setField('dateFormat', event.target.value)}
            >
              {options.dateFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt === 'en-GB' ? '12 Aug 2026 (day-month-year)' : 'Aug 12, 2026 (month-day-year)'}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="number-format" label="Number format">
            <Select
              id="number-format"
              value={draft.numberFormat}
              onChange={(event) => setField('numberFormat', event.target.value)}
            >
              {options.numberFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </SectionCard>
      <Alert
        tone="info"
        title="Website content languages are separate"
        description="This controls your CMS interface formats. Translating published website content is handled per content item in the editor. Full interface translation for Swahili, Arabic, French, Portuguese and Spanish is reserved for a future phase."
      />
    </div>
  );
}

function NotificationsTab({
  draft,
  setField,
}: {
  draft: UserPreferences;
  setField: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  const prefs = draft.notificationSettings;
  function toggle(key: keyof NotificationPreferences, checked: boolean) {
    setField('notificationSettings', { ...prefs, [key]: checked });
  }
  return (
    <div className="space-y-4">
      <SectionCard
        title="Notifications"
        description="Choose which CMS events notify you. Alerts appear in your notification feed; email delivery is reserved for when an email service is configured."
      >
        <PrefsRow label="Email notifications" hint="Reserved: sent when email delivery is configured." controlId="notif-email">
          <Switch id="notif-email" checked={prefs.email} onChange={(checked) => toggle('email', checked)} aria-label="Email notifications" />
        </PrefsRow>
        <PrefsRow label="CMS alerts" hint="System and account alerts in your notification feed." controlId="notif-alerts">
          <Switch id="notif-alerts" checked={prefs.alerts} onChange={(checked) => toggle('alerts', checked)} aria-label="CMS alerts" />
        </PrefsRow>
        <PrefsRow label="Publishing alerts" hint="When content you submitted is published or scheduled." controlId="notif-publishing">
          <Switch id="notif-publishing" checked={prefs.publishing} onChange={(checked) => toggle('publishing', checked)} aria-label="Publishing alerts" />
        </PrefsRow>
        <PrefsRow label="Review workflow alerts" hint="Submit, approval and rejection updates." controlId="notif-review">
          <Switch id="notif-review" checked={prefs.review} onChange={(checked) => toggle('review', checked)} aria-label="Review workflow alerts" />
        </PrefsRow>
        <PrefsRow label="Security alerts" hint="Sessions, MFA and password changes." controlId="notif-security">
          <Switch id="notif-security" checked={prefs.security} onChange={(checked) => toggle('security', checked)} aria-label="Security alerts" />
        </PrefsRow>
      </SectionCard>
    </div>
  );
}

function DashboardTab({
  draft,
  setField,
}: {
  draft: UserPreferences;
  setField: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  const prefs = draft.dashboardSettings;
  function setDash<K extends keyof DashboardPreferences>(key: K, value: DashboardPreferences[K]) {
    setField('dashboardSettings', { ...prefs, [key]: value });
  }
  return (
    <SectionCard
      title="Dashboard"
      description="Choose what you land on after signing in and which dashboard sections you see."
    >
      <Field id="landing-page" label="Default landing page">
        <Select
          id="landing-page"
          value={prefs.landingPage}
          onChange={(event) => setDash('landingPage', event.target.value)}
        >
          {LANDING_ROUTES.map((route) => (
            <option key={route.value} value={route.value}>
              {route.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="mt-2">
        <PrefsRow label="Quick actions" hint="Show the quick action shortcuts on the dashboard." controlId="dash-quick">
          <Switch id="dash-quick" checked={prefs.quickActions} onChange={(checked) => setDash('quickActions', checked)} aria-label="Quick actions" />
        </PrefsRow>
        <PrefsRow label="Recent activity" hint="Show the recent activity feed on the dashboard." controlId="dash-activity">
          <Switch id="dash-activity" checked={prefs.recentActivity} onChange={(checked) => setDash('recentActivity', checked)} aria-label="Recent activity" />
        </PrefsRow>
      </div>
    </SectionCard>
  );
}

function AccessibilityTab({
  draft,
  setField,
}: {
  draft: UserPreferences;
  setField: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  const prefs = draft.accessibilitySettings;
  return (
    <SectionCard
      title="Accessibility"
      description="Adjust the interface to work comfortably for you. Changes apply immediately and persist to your profile."
    >
      <Field id="font-scale" label="Font scale">
        <Select
          id="font-scale"
          value={String(prefs.fontScale)}
          onChange={(event) => setField('accessibilitySettings', { ...prefs, fontScale: Number(event.target.value) })}
        >
          <option value="90">90% — smaller</option>
          <option value="100">100% — default</option>
          <option value="110">110% — larger</option>
          <option value="125">125% — large</option>
          <option value="140">140% — extra large</option>
        </Select>
      </Field>
      <div className="mt-2">
        <PrefsRow label="Reduced motion" hint="Minimise animations and transitions across the CMS." controlId="a11y-motion">
          <Switch id="a11y-motion" checked={prefs.reducedMotion} onChange={(checked) => setField('accessibilitySettings', { ...prefs, reducedMotion: checked })} aria-label="Reduced motion" />
        </PrefsRow>
        <PrefsRow label="High contrast" hint="Strengthen borders and secondary text for readability." controlId="a11y-contrast">
          <Switch id="a11y-contrast" checked={prefs.highContrast} onChange={(checked) => setField('accessibilitySettings', { ...prefs, highContrast: checked })} aria-label="High contrast" />
        </PrefsRow>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

function AccountTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const sessions = useQuery({ queryKey: ['auth', 'sessions'], queryFn: authApi.sessions });

  const changePassword = useMutation({
    mutationFn: (vars: { currentPassword: string; newPassword: string }) =>
      settingsApi.changePassword(vars.currentPassword, vars.newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      toast({ variant: 'success', title: 'Password changed' });
    },
    onError: (err) => {
      setPasswordError(apiErrorMessage(err, 'Password could not be changed'));
    },
  });

  const revokeSession = useMutation({
    mutationFn: (sid: string) => authApi.revokeSession(sid),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });

  function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 10) {
      setPasswordError('New password must be at least 10 characters.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordError(null);
    changePassword.mutate({ currentPassword, newPassword });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Profile" description="Your sign-in identity. Contact an administrator to change the name or email on your account.">
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-right font-medium text-ink">{user?.name ?? '–'}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-ink-muted">Email</dt>
            <dd className="break-all text-right font-medium text-ink">{user?.email}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-ink-muted">Role</dt>
            <dd className="text-right">
              <Badge tone="neutral">{user?.role ?? '–'}</Badge>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-ink-muted">Two-step verification</dt>
            <dd className="text-right">
              <Badge tone={user?.mfaEnabled ? 'green' : 'amber'}>
                {user?.mfaEnabled ? 'Enabled' : 'Not enrolled'}
              </Badge>
            </dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Change password" description="Choose a new password. You will stay signed in on this device.">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Field id="current-password" label="Current password">
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </Field>
          <Field id="new-password" label="New password" hint="At least 10 characters.">
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </Field>
          <Field id="confirm-password" label="Confirm new password" error={passwordError ?? undefined}>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" loading={changePassword.isPending}>
            Change password
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        title="Active sessions"
        description="Devices currently signed in to your account. Revoke any session you do not recognise."
      >
        {sessions.isLoading ? (
          <div className="space-y-2" role="status" aria-label="Loading sessions">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : sessions.isError ? (
          <p className="text-sm text-ink-muted">
            Couldn't load sessions. <span className="text-ink-faint">{apiErrorMessage(sessions.error)}</span>
          </p>
        ) : (sessions.data?.sessions.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-muted">No active sessions.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.data?.sessions.map((session) => (
              <li key={session.sid} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {session.device?.userAgent
                      ? session.device.userAgent.split('(')[0].trim() || 'Browser session'
                      : 'Browser session'}
                    {session.current && (
                      <span className="ml-2 text-xs font-normal text-ink-muted">(this device)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {session.device?.ip ?? 'Unknown IP'} · {session.createdAt ? formatDateTime(session.createdAt) : 'Unknown'}
                  </p>
                </div>
                {!session.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={revokeSession.isPending}
                    onClick={() => revokeSession.mutate(session.sid)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* System (read-only infrastructure)                                   */
/* ------------------------------------------------------------------ */

function SystemTab() {
  const system = useQuery({ queryKey: ['settings', 'system'], queryFn: settingsApi.system, refetchInterval: 60_000 });

  if (system.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading system status">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (system.isError) {
    return (
      <ErrorState
        message={apiErrorMessage(system.error, 'System status could not be loaded')}
        onRetry={() => void system.refetch()}
      />
    );
  }

  const data = system.data;
  const ok = data.status === 'ok' && data.db === 'up';

  return (
    <div className="space-y-4">
      <Alert
        tone={ok ? 'success' : 'warning'}
        title={ok ? 'All systems operational' : 'Service degraded'}
        description="Backend connectivity and security posture checked against the live service."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">API & database</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <SettingRow label="Service" value={data.service} />
            <SettingRow
              label="Database"
              value={
                <Badge tone={data.db === 'up' ? 'green' : 'red'}>
                  {data.db === 'up' ? 'Available' : 'Unavailable'}
                </Badge>
              }
            />
            <SettingRow label="Uptime" value={formatDuration(data.uptimeSeconds)} />
            <SettingRow label="Last check" value={formatDateTime(data.timestamp)} />
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Security posture</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-muted">
            <li>
              <p className="font-medium text-ink">Secure session cookies</p>
              <p>Credentialed requests use server-managed HTTP-only sessions.</p>
            </li>
            <li>
              <p className="font-medium text-ink">Origin protection</p>
              <p>State-changing requests require an allowed CMS origin.</p>
            </li>
            <li>
              <p className="font-medium text-ink">Server-side authorization</p>
              <p>Every route re-checks the role stored in the database.</p>
            </li>
            <li>
              <p className="font-medium text-ink">Two-step verification</p>
              <p>{data.posture.mfaEnabled ? 'Enrolled on this account.' : 'Not enrolled on this account.'}</p>
            </li>
          </ul>
        </Card>
      </div>
      <p className="text-xs text-ink-faint">
        Infrastructure diagnostics live here so the rest of Settings stays focused on your work. Secrets and
        connection details are never exposed in the browser.
      </p>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
