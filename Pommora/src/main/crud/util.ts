import { invalidBasename } from '@shared/contexts'
// Shared helpers for the CRUD layer — the one home for the small primitives every
// mutation needs, so they aren't re-implemented per file. `pathExists` is re-exported
// from the io layer (its real owner); name + timestamp rules live here.

export { pathExists } from '../io/atomicWrite'

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
    // The walk hides both prefixes, so accepting one would write a real file the tree can never
    // show again — a rename that reads to the user as a delete.
    trimmed.startsWith('_') ||
    trimmed.startsWith('.') ||
    /\.md$/i.test(trimmed)
  )
}

/** The ISO-8601 timestamp written to governance fields (`created_at` / `modified_at`). */
export function nowIso(): string {
  return new Date().toISOString()
}
