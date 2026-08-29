// Shared helpers for the CRUD layer — the one home for the small primitives every
// mutation needs, so they aren't re-implemented per file. `pathExists` is re-exported
// from the io layer (its real owner); name, timestamp and sweep-admission rules live here.

import { invalidBasename } from '@shared/contexts'
import { hiddenName } from '../exclusion'
import { admitContentFile } from '@shared/identity'
import { frontmatterWritable, readFrontmatterFields } from '../IO/pageFile'

export { pathExists } from '../IO/atomicWrite'

/** A name usable as a file/folder basename (filename = title). Rejects path separators,
 *  dot dirs, and a trailing managed extension (which the writers append themselves — a name
 *  like "Note.md" would otherwise yield "Note.md.md", breaking the filename = title invariant).
 *  Single source for the rule across page + folder CRUD. */
export function invalidName(name: string): boolean {
  const trimmed = name.trim()
  return (
    invalidBasename(name) ||
    // `|` opens the alias segment of `[[Title|alias]]`, so a title holding one can never be
    // written as a connection that resolves back to it. The filesystem would take it; we don't.
    name.includes('|') ||
    // The walk hides these, so accepting one would write a real file the tree can never show
    // again — a rename that reads to the user as a delete.
    hiddenName(trimmed) ||
    /\.md$/i.test(trimmed)
  )
}

/** A Context title names a folder under `.nexus/contexts/`, so it carries the basename rules plus
 *  the hidden-prefix ban every naming gate holds — the walk hides those names, and the record
 *  claims the prefix for itself. The sigil needs no ban of its own: a key is stripped
 *  positionally, so a title carrying either glyph round-trips intact. A managed extension is
 *  legal here where it is not on a page: nothing appends one to a Context folder. */
export function invalidContextTitle(title: string): boolean {
  return invalidBasename(title) || hiddenName(title.trim())
}

/** Whether a nexus-wide sweep may rewrite this `.md` AT ALL. Unknown files — a key contradicting
 *  their folder, a malformed value, two kind keys — are invisible and stay byte-untouched, the
 *  same treatment a stray `.png` in a Collection gets.
 *
 *  An identity-LESS page is admitted, deliberately: the sweeps exist to change or clear values, and
 *  identity only decides whether a value can be handed back afterwards. Gating on membership alone
 *  would leave a page holding the very value a Remove ran to clear.
 *
 *  This is the identity half alone — a body-only rewrite asks it directly, because a body write
 *  governs no key that unparseable frontmatter could lose. */
export function sweepAdmitsBody(content: string): boolean {
  return admitContentFile(readFrontmatterFields(content), 'page').state !== 'unknown'
}

/** Whether a nexus-wide sweep may rewrite this page's FIELDS. Identity admits it, and its
 *  frontmatter can round-trip — one file nobody can parse is skipped, never allowed to fail the
 *  fan-out around it and leave the destruction half-applied. */
export function sweepAdmits(content: string): boolean {
  return sweepAdmitsBody(content) && frontmatterWritable(content)
}

/** The ISO-8601 timestamp written to governance fields (`created_at` / `modified_at`). */
export function nowIso(): string {
  return new Date().toISOString()
}
