import { invalidBasename } from '../Properties/contexts'
import { hiddenName } from '../Locations/exclusion'
import { admitContentFile } from './identityMark'
import { frontmatterWritable, splitFrontmatter } from '../IO/pageFile'

/** Rejects path separators, dot dirs, and a trailing managed extension (writers append that themselves — "Note.md" would otherwise yield "Note.md.md"). */
export function invalidName(name: string): boolean {
  const trimmed = name.trim()
  return (
    invalidBasename(name) ||
    // `|` opens the alias segment of `[[Title|alias]]`; a title holding one could never be written as a connection that resolves back to it.
    name.includes('|') ||
    // The walk hides these; accepting one would write a file the tree can never show again.
    hiddenName(trimmed) ||
    /\.md$/i.test(trimmed)
  )
}

/** A managed extension is legal here where it is not on a page — nothing appends one to a Context folder. */
export function invalidContextTitle(title: string): boolean {
  return invalidBasename(title) || hiddenName(title.trim())
}

/** An identity-less page is admitted deliberately: the sweeps exist to change or clear values, and gating on membership alone would leave a page holding the very value a Remove ran to clear. */
export function sweepAdmitsBody(content: string): boolean {
  return admitContentFile(splitFrontmatter(content), 'page').state !== 'unknown'
}

/** Identity admits it, and its frontmatter must round-trip, so one file nobody can parse is skipped rather than failing the fan-out around it. */
export function sweepAdmits(content: string): boolean {
  return sweepAdmitsBody(content) && frontmatterWritable(content)
}
