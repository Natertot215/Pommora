/** Zero-pad a number to a fixed width — the one definition the date surfaces read. Every key and
 *  every displayed date built this way sorts and reads the same, which a per-caller `padStart` is
 *  free to disagree about. Width 2 is the common case: a month, a day, an hour. */
export const pad = (n: number, width = 2): string => String(n).padStart(width, '0')
