const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Antiguedad corta, como en el catalogo: 2h, 3d, 5mo, 2y. */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);

  if (Number.isNaN(then)) return '';

  const diff = Math.max(0, now - then);

  if (diff < MINUTE) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < MONTH) return `${Math.floor(diff / DAY)}d`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo`;
  return `${Math.floor(diff / YEAR)}y`;
}
