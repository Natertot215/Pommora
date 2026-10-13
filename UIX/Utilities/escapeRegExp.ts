/** `text` with every RegExp syntax character escaped, so a pattern built from it matches only itself. */
export const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
