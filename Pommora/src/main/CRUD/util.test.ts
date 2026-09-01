import { describe, expect, it } from 'vitest'
import { invalidContextTitle, invalidName, sweepAdmits, sweepAdmitsBody } from './util'
import { readFrontmatterFields } from '../IO/pageFile'

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
    for (const n of ['Note.md', 'Note.MD']) expect(invalidName(n), n).toBe(true)
  })

  // `.md` is the only extension the writers append, so every other one is just part of the title.
  it('accepts a name whose extension the writers never manage', () => {
    for (const n of ['Thing.task.json', 'Thing.event.json', 'Report.pdf'])
      expect(invalidName(n), n).toBe(false)
  })

  // The walk hides both prefixes (files by the `_` skip, folders via shouldSkipDir), so a name the
  // writer accepts here but the reader hides is a rename that looks to the user like a delete.
  it('rejects names the tree would hide', () => {
    for (const n of ['_Draft', '_', '_Archive', '.hidden', '.nexus', ' _Draft', ' .hidden'])
      expect(invalidName(n), JSON.stringify(n)).toBe(true)
  })
})

// Two disjoint ways frontmatter refuses a field write, and a sweep must survive both: one page
// nobody can parse is skipped, never allowed to fail the fan-out around it.
const ALIAS = '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVA\nsomething: *word\n---\nbody'
const TAB = '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVA\n<Projects>:\n\t- Pommora\n---\nbody'
const HEALTHY = '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDVA\n<Projects>:\n  - Pommora\n---\nbody'

describe('sweepAdmits — the field-write gate', () => {
  it('an unresolvable alias reads as empty rather than throwing', () => {
    expect(readFrontmatterFields(ALIAS)).toEqual({})
  })

  it('refuses both shapes of unwritable frontmatter', () => {
    expect(sweepAdmits(ALIAS)).toBe(false)
    expect(sweepAdmits(TAB)).toBe(false)
  })

  it('admits a page whose frontmatter round-trips', () => {
    expect(sweepAdmits(HEALTHY)).toBe(true)
  })

  it('a body-only rewrite asks the identity half alone — a link still heals on a broken page', () => {
    expect(sweepAdmitsBody(TAB)).toBe(true)
    expect(sweepAdmitsBody(HEALTHY)).toBe(true)
  })
})

describe('invalidContextTitle', () => {
  it('rejects path separators and empties', () => {
    expect(invalidContextTitle('a/b')).toBe(true)
    expect(invalidContextTitle('a\\b')).toBe(true)
    expect(invalidContextTitle('')).toBe(true)
    expect(invalidContextTitle('  ')).toBe(true)
  })

  it('refuses a hidden prefix — the walk hides it and the record claims it', () => {
    expect(invalidContextTitle('_Work')).toBe(true)
    expect(invalidContextTitle('.Work')).toBe(true)
    expect(invalidContextTitle(' _Work')).toBe(true)
  })

  it('the ban is a prefix, not a character, and a Context is not a page', () => {
    expect(invalidContextTitle('Side_Projects')).toBe(false)
    expect(invalidContextTitle('Work_')).toBe(false)
    // Nothing appends a managed extension to a Context folder.
    expect(invalidContextTitle('Q1.md')).toBe(false)
  })

  it('accepts ordinary titles, and titles carrying a sigil glyph', () => {
    expect(invalidContextTitle('Projects')).toBe(false)
    expect(invalidContextTitle('Side Projects')).toBe(false)
    // The sigil needs no ban of its own — a key is stripped positionally, so a title
    // carrying a glyph round-trips intact.
    expect(invalidContextTitle('Q3 (Draft)')).toBe(false)
    expect(invalidContextTitle('Pro[ject')).toBe(false)
  })
})
