import { describe, expect, it } from 'vitest'
import { scanDoc } from './decorations/intent'
import { autoPair } from './input'
import { refusedInAlias } from './editor/input'

// An alias is delimited by the link's own `]]`, so a `]` typed inside one truncates the link the
// caret is sitting in. The refusal belongs to the alias rather than to any one editor: the page
// body and a markdown table cell run different input handlers and both author aliases.
describe('a bracket typed inside an alias never lands', () => {
  const doc = 'a [[Notes|Q3 draft]] b'

  it('refuses the keystroke inside the alias', () => {
    expect(refusedInAlias(doc, doc.indexOf('draft'), ']')).toBe(true)
  })

  it('allows it everywhere else, including the title', () => {
    expect(refusedInAlias(doc, doc.indexOf('Notes') + 2, ']')).toBe(false)
    expect(refusedInAlias(doc, 0, ']')).toBe(false)
    expect(refusedInAlias('plain text', 4, ']')).toBe(false)
  })

  it('and refuses nothing else', () => {
    expect(refusedInAlias(doc, doc.indexOf('draft'), 'x')).toBe(false)
  })

  // The guard blocks the character a human types; auto-pairing types one on their behalf, so it has
  // to decline in the same place or the guard is one keystroke from being routed around.
  it('auto-pairing declines to insert one there too', () => {
    const opening = 'a [[Notes|My ]] b'
    expect(autoPair(scanDoc(opening), 13, 13, '[')).toBeNull()
  })

  it('but still pairs a bracket in ordinary prose', () => {
    expect(autoPair(scanDoc('a wrote '), 8, 8, '[')).not.toBeNull()
  })
})
