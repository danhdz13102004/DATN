/**
 * Formats an ISO 8601 / epoch string into a readable date string.
 * Returns '—' when the value is null / undefined / empty.
 *
 * @example
 * formatDate('2025-03-28T00:08:07.000Z')  // "Mar 28, 2025"
 * formatDate('2025-03-28T00:08:07.000Z', { time: true })  // "Mar 28, 2025, 07:08 AM"
 */
export function formatDate(
  value: string | null | undefined,
  options: { time?: boolean } = {}
): string {
  if (!value) return '—';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';

  const baseOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (options.time) {
    baseOptions.hour = '2-digit';
    baseOptions.minute = '2-digit';
  }

  return date.toLocaleDateString('en-US', baseOptions);
}

/**
 * Returns a relative time string (e.g. "3 days ago", "just now").
 * Falls back to formatDate when the date is older than 30 days.
 */
export function formatRelativeDate(value: string | null | undefined): string {
  if (!value) return '—';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;

  return formatDate(value);
}
