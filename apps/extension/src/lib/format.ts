/** Utilidades de formato con Intl. */

export function formatRuntime(minutes: number | undefined, locale: string): string | undefined {
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const fmt = (value: number, unit: 'hour' | 'minute') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow' }).format(value);
  return h > 0 ? `${fmt(h, 'hour')} ${fmt(m, 'minute')}` : fmt(m, 'minute');
}

export function formatRating(value: number | undefined, locale: string): string | undefined {
  if (value === undefined || value === 0) return undefined;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

export function formatDate(iso: string | undefined, locale: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
