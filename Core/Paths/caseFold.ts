// Case folding and title collation must land the same on every device, so both pin their locale
// rather than read the host's — a Turkish machine folds `I` the way an English one does.

const titleCollator = new Intl.Collator('en', { sensitivity: 'accent' })

/** The locale-independent comparison key a path segment or title matches by. Lowercase precedes NFC so a title's stored membership key is byte-identical to what the index already holds. */
export function foldKey(text: string): string {
  return text.toLowerCase().normalize('NFC')
}

/** A host-independent ordering for user-visible titles; accent-sensitive and case-insensitive, matching the value sort. */
export function compareTitles(a: string, b: string): number {
  return titleCollator.compare(a, b)
}
