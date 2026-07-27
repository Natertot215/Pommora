import { describe, expect, it } from 'vitest'
import { invalidName } from './util'

describe('invalidName', () => {
  it('accepts ordinary titles', () => {
    for (const n of ['Note', 'My Note', 'CS 161', 'Atomic Habits', 'a_b', 'Draft_', 'My.Note'])
      expect(invalidName(n), n).toBe(false)
  })

  it('rejects empty or whitespace-only', () => {
    for (const n of ['', '   ', '\t']) expect(invalidName(n), JSON.stringify(n)).toBe(true)
  })

  it('rejects path separators, NUL, and dot dirs', () => {
    for (const n of ['a/b', 'a\\b', 'a\0b', '.', '..'])
      expect(invalidName(n), JSON.stringify(n)).toBe(true)
  })

  // The filesystem would take a pipe; a connection can't. `[[A|B]]` reads B as the alias, so a page
  // titled "A|B" could never be linked back to.
  it('rejects a pipe — it is the connection alias delimiter', () => {
    for (const n of ['A|B', 'Notes | Drafts', '|lead']) expect(invalidName(n), n).toBe(true)
  })

  it('rejects a trailing managed extension so filename = title holds', () => {
    for (const n of ['Note.md', 'Note.MD', 'Thing.task.json', 'Thing.event.json'])
      expect(invalidName(n), n).toBe(true)
  })

  // The walk hides both prefixes (files by the `_` skip, folders via shouldSkipDir), so a name the
  // writer accepts here but the reader hides is a rename that looks to the user like a delete.
  it('rejects names the tree would hide', () => {
    for (const n of ['_Draft', '_', '_Archive', '.hidden', '.nexus', ' _Draft', ' .hidden'])
      expect(invalidName(n), JSON.stringify(n)).toBe(true)
  })
})
