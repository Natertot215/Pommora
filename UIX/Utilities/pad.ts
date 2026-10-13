/** The one definition the date surfaces read, so every key and displayed date sorts and reads the same. */
export const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

// Never toISOString: a UTC key shifts the day west of Greenwich; formatters read date-only as LOCAL midnight.
export const localDayKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Local-clock form, the same shape the date picker writes.
export function localIso(ms: number | null): string | null {
  if (ms === null) return null
  const d = new Date(ms)
  return `${localDayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
