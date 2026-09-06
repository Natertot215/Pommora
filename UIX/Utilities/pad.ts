/** Zero-pad a number to a fixed width — the one definition the date surfaces read, so every key and every displayed date sorts and reads the same, which a per-caller `padStart` is free to disagree about. */
export const pad = (n: number, width = 2): string => String(n).padStart(width, '0')
