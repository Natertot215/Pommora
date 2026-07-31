// The single owner of the content-file identity key. Every reader of a `.md` file's identity goes
// through here, so the key's spelling is one edit rather than a census. A sidecar's `id` is NOT
// this key — a sidecar's kind is declared by its filename, and its id is read through its schema.
// Pure: no runtime imports, safe for main, preload and renderer alike.

export const PAGE_ID_KEY = 'id'

/** The content id off a parsed frontmatter root, or undefined when the file carries none.
 *  Undefined covers every non-identity shape at once — absent, non-string, or empty — because
 *  each means the same thing to every caller: this file has no identity to read. */
export function contentId(fm: Record<string, unknown>): string | undefined {
  const v = fm[PAGE_ID_KEY]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
