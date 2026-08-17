const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * User format preferences (Settings → Language & Region). Set once by
 * SettingsProvider when preferences load; every date/number in the CMS then
 * renders in the employee's chosen timezone and locale. Invalid zones fall
 * back to the browser default via the probe below.
 */
let userDateLocale = 'en-GB';
let userNumberLocale = 'en-US';
let userTimeZone: string | undefined;

function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function setUserFormats(opts: {
  dateLocale?: string;
  numberLocale?: string;
  timeZone?: string;
}): void {
  if (opts.dateLocale) userDateLocale = opts.dateLocale;
  if (opts.numberLocale) userNumberLocale = opts.numberLocale;
  if (opts.timeZone !== undefined) {
    userTimeZone = opts.timeZone && isValidTimeZone(opts.timeZone) ? opts.timeZone : undefined;
  }
}

/** "2h ago", "3d ago", "just now" – for tables and activity feeds. */
export function relativeTime(value: string | Date, now: Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

/** "12 Aug 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '–';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat(userDateLocale, { ...DATE_FORMAT, timeZone: userTimeZone }).format(date);
}

/** "12 Aug 2026, 14:05" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '–';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat(userDateLocale, { ...DATETIME_FORMAT, timeZone: userTimeZone }).format(date);
}

/** 12_345_678 -> "12.3M" */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return new Intl.NumberFormat(userNumberLocale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** 3723 -> "1h 2m" – compact uptime display. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) return '–';
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** 1_234_567 -> "1.2 MB" */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) return '–';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(value >= 10 || exp === 0 ? 0 : 1)} ${units[exp]}`;
}
