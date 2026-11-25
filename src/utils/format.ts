export function formatRwf(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} RWF`;
}

export function normalizePhoneKey(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('07') && digits.length === 10) {
    return `250${digits.slice(1)}`;
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return `250${digits}`;
  }
  return digits;
}

export function formatDisplayPhone(input: string): string {
  const key = normalizePhoneKey(input);
  if (key.startsWith('250') && key.length === 12) {
    return `+250 ${key.slice(3, 6)} ${key.slice(6, 9)} ${key.slice(9)}`;
  }
  return input.trim();
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nextDates(count = 7): { iso: string; label: string; dayShort: string }[] {
  const days: { iso: string; label: string; dayShort: string }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    const dayShort = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dt.toLocaleDateString('en-US', { weekday: 'short' });
    const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({ iso, label, dayShort });
  }
  return days;
}

export function daysSinceDate(dateIso: string): number {
  const target = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const clean = normalizePhoneKey(phoneDigits);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
