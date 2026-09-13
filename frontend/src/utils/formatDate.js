// Formats a MySQL DATE/DATETIME string ('2026-01-01' or
// '2026-01-01 10:00:00') into a short, readable label.
// Never throws on missing/invalid input · returns null instead, so
// callers can decide how to render "no date" without try/catch.
export function formatDate(value) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
