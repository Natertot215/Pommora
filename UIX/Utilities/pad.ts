/** The one definition the date surfaces read, so every key and displayed date sorts and reads the same. */
export const pad = (n: number, width = 2): string => String(n).padStart(width, '0')
