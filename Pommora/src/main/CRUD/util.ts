// The one home for the small primitives every CRUD mutation needs, so they aren't
// re-implemented per file.

import { invalidBasename } from '@shared/contexts'
import { hiddenName } from '../exclusion'
import { admitContentFile } from '@shared/identity'
import { frontmatterWritable, readFrontmatterFields } from '../IO/pageFile'

export { pathExists } from '../IO/atomicWrite'

/** Rejects path separators, dot dirs, and a trailing managed extension (writers append that
 *  themselves — "Note.md" would otherwise yield "Note.md.md"). Single source across page + folder CRUD. */
export function invalidName(name: string): boolean {
  const trimmed = name.trim()
  return (
    invalidBasename(name) ||
    // `|` opens the alias segment of `[[Title|alias]]`; a title holding one could never be
    // written as a connection that resolves back to it.
    name.includes('|') ||
    // The walk hides these; accepting one would write a file the tree can never show again.
    hiddenName(trimmed) ||
    /\.md$/i.test(trimmed)
  )
}

/** A managed extension is legal here where it is not on a page — nothing appends one to a
 *  Context folder. */
export function invalidContextTitle(title: string): boolean {
  return invalidBasename(title) || hiddenName(title.trim())
}

/** Whether a nexus-wide sweep may rewrite this `.md` at all. An identity-less page is admitted
 *  deliberately: the sweeps exist to change or clear values, and gating on membership alone would
 *  leave a page holding the very value a Remove ran to clear. */
export function sweepAdmitsBody(content: string): boolean {
  return admitContentFile(readFrontmatterFields(content), 'page').state !== 'unknown'
}

/** Whether a nexus-wide sweep may rewrite this page's fields — identity admits it, and its
 *  frontmatter must round-trip, so one file nobody can parse is skipped rather than failing the
 *  fan-out around it. */
export function sweepAdmits(content: string): boolean {
  return sweepAdmitsBody(content) && frontmatterWritable(content)
}
