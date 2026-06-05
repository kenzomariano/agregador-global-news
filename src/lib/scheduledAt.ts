// Helpers for the scheduled_at field used in admin forms.
// datetime-local inputs use local timezone "YYYY-MM-DDTHH:mm" strings.

export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(local: string | null | undefined): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Returns the user's IANA timezone, e.g. "America/Sao_Paulo". */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Formats a datetime-local string ("YYYY-MM-DDTHH:mm") into a human-readable
 * preview in the user's locale + timezone, e.g.
 * "qui., 5 de jun. de 2026 14:30 (America/Sao_Paulo, GMT-3)".
 */
export function formatLocalSchedulePreview(local: string | null | undefined): string {
  if (!local) return "";
  const d = new Date(local);
  if (isNaN(d.getTime())) return "";
  const tz = getUserTimezone();
  let label = "";
  try {
    label = new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(d);
  } catch {
    label = d.toLocaleString("pt-BR");
  }
  return `${label} — fuso ${tz}`;
}
