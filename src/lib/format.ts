/** Shared display/formatting helpers. */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Accept "YYYY-MM-DD" or full ISO timestamps.
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "10 Aug 2026 – 16 Aug 2026" */
export function formatWeekRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\s/g, "");
  const m = cleaned.match(/^(\+\d{2})(\d{3})(\d{3})(\d{3})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  const local = cleaned.match(/^(\d{4})(\d{3})(\d{3})$/);
  if (local) return `${local[1]} ${local[2]} ${local[3]}`;
  return raw;
}

/** ISO date (YYYY-MM-DD) for "today" in local time. */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Monday of the week containing the given ISO date. */
export function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(" ").trim();
}
