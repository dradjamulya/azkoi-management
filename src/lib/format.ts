const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

export const formatRp = (n: number) => rp.format(Math.round(n)).replace(/\s/g, '');
export const formatNum = (n: number) => num.format(n);

/** Rp1,4jt / Rp525rb — compact Rupiah for chart axes and tiles. */
export function formatRpShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1_000_000_000) return `${sign}Rp${num.format(a / 1_000_000_000)}M`;
  if (a >= 1_000_000) return `${sign}Rp${num.format(a / 1_000_000)}jt`;
  if (a >= 1_000) return `${sign}Rp${num.format(a / 1_000)}rb`;
  return `${sign}Rp${num.format(a)}`;
}

export const pct = (n: number) => `${num.format(n * 100)}%`;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86_400_000);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('en-GB', opts);
}

/** "Today", "Tomorrow", "Yesterday" or "Sat 11 Oct". */
export function relativeDay(iso: string): string {
  if (!iso) return 'No date';
  const d = diffDays(iso, todayISO());
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  return formatDate(iso);
}

export const monthKey = (iso: string) => iso.slice(0, 7);
export function formatMonth(key: string, long = false) {
  return parseISO(`${key}-01`).toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' });
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Normalise an Indonesian phone number / wa.me link into a wa.me URL, or '' if unusable. */
export function waLink(contact: string, text?: string): string {
  if (!contact) return '';
  let digits = contact.replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com)\/?/i, '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  if (digits.startsWith('8')) digits = `62${digits}`;
  if (digits.length < 9) return '';
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
