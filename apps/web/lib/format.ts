/**
 * Formats an ISO timestamp as a short date, for example `14 Aug 2026`.
 *
 * @param iso - ISO 8601 date string.
 * @returns The formatted date, or the original string if it is not a valid date.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
