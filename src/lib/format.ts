/**
 * Manual numeric formatting keeps server-rendered HTML and the client
 * hydration output identical (Intl output can differ between runtimes).
 */
function parts(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    year: date.getFullYear(),
    month: pad(date.getMonth() + 1),
    day: pad(date.getDate()),
    hour: pad(date.getHours()),
    minute: pad(date.getMinutes()),
  };
}

export function formatDateTime(iso: string): string {
  const p = parts(iso);
  return p ? `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}` : "-";
}

export function formatShortDateTime(iso: string): string {
  const p = parts(iso);
  return p ? `${p.month}/${p.day} ${p.hour}:${p.minute}` : "-";
}
