import { describe, it, expect } from 'vitest'
import { acPanelLeft, autocompleteQuery, commitEdit, connectionInsert } from './autocomplete'
import { tokenize } from './tokens'

const tokenizeHasLink = (text: string): boolean => tokenize(text).some((t) => t.kind === 'link')

describe('autocompleteQuery', () => {
  it('detects a non-empty query with the caret inside the brackets', () => {
    const doc = 'see [[Pro]] end'
    const r = autocompleteQuery(doc, 9)! // caret after "Pro"
    expect(r.query).toBe('Pro')
    expect(doc.slice(r.from, r.to)).toBe('[[Pro]]')
  })
  it('suppresses on an empty placeholder', () => {
    expect(autocompleteQuery('see [[]] end', 6)).toBeNull()
  })
  it('suppresses image embeds ![[…]]', () => {
    expect(autocompleteQuery('see ![[Pic]] end', 9)).toBeNull()
  })
  // Accepting a PAGE replaces the whole token, so the title is the only span that may open the page
  // picker. The alias half opens its own form instead, and that one replaces the alias alone —
  // renaming a link and repointing it are different edits.
  it('opens the alias form from inside an alias, spanning only the alias', () => {
    const doc = 'see [[Q3 Plan|the plan]] end'
    const r = autocompleteQuery(doc, doc.indexOf('the plan') + 3)!
    expect(r.form).toBe('alias')
    expect(r.query).toBe('the plan')
    expect(r.title).toBe('Q3 Plan')
    expect(doc.slice(r.from, r.to)).toBe('the plan')
  })

  it('opens it on a bare pipe, where nothing has been written yet', () => {
    const doc = 'see [[Q3 Plan|]] end'
    const r = autocompleteQuery(doc, doc.indexOf('|') + 1)!
    expect(r.form).toBe('alias')
    expect(r.query).toBe('')
    expect(r.title).toBe('Q3 Plan')
    expect(r.from).toBe(r.to)
  })

  it('a link with no pipe has no alias form at all', () => {
    const doc = 'see [[Q3 Plan]] end'
    expect(autocompleteQuery(doc, doc.indexOf('Plan') + 4)?.form).toBe('link')
  })

  it('still opens from inside an aliased link’s title', () => {
    const doc = 'see [[Q3 Plan|the plan]] end'
    const r = autocompleteQuery(doc, doc.indexOf('Plan') + 2)!
    expect(r.query).toBe('Q3 Plan')
    expect(doc.slice(r.from, r.to)).toBe('[[Q3 Plan|the plan]]')
  })
  it('returns null when the caret is outside any wikilink', () => {
    expect(autocompleteQuery('plain text', 5)).toBeNull()
    expect(autocompleteQuery('[[Pro]] x', 9)).toBeNull() // caret past the closer
  })
})

describe('connectionInsert', () => {
  it('builds [[Title]] and the caret after the closer', () => {
    const { insert, caret } = connectionInsert('Page A', 4)
    expect(insert).toBe('[[Page A]]')
    expect(caret).toBe(4 + '[[Page A]]'.length)
  })
})
// The embed branch is opt-in (allowEmbeds) and local — table cells never pass the flag, so `![[`
// can never complete there; the connections pattern itself is untouched.
describe('embed autocomplete detection', () => {
  it('an unclosed ![[ query resolves with the span to line end', () => {
    expect(autocompleteQuery('x ![[Fo', 7, true)).toEqual({
      query: 'Fo',
      from: 2,
      to: 7,
      form: 'embed',
    })
  })

  it('a closed ![[..]] span covers the closer', () => {
    expect(autocompleteQuery('![[Fo]]', 5, true)).toEqual({
      query: 'Fo',
      from: 0,
      to: 7,
      form: 'embed',
    })
  })

  it('without the flag, ![[ stays silent — the cell behavior', () => {
    expect(autocompleteQuery('x ![[Fo', 7)).toBeNull()
  })

  it('a plain [[ query keeps its link form, flag or not', () => {
    expect(autocompleteQuery('[[Fo]]', 4, true)).toEqual({
      query: 'Fo',
      from: 0,
      to: 6,
      form: 'link',
    })
  })
})

describe('connectionInsert forms', () => {
  // Accepting an alias writes into a link that already exists, so it brings no syntax with it.
  it('the alias form commits its words alone', () => {
    expect(connectionInsert('the plan', 5, 'alias')).toEqual({ insert: 'the plan', caret: 13 })
  })

  it('writes the embed form with the caret past the closer', () => {
    expect(connectionInsert('Alpha', 3, 'embed')).toEqual({ insert: '![[Alpha]]', caret: 13 })
  })

  it('defaults to the link form', () => {
    expect(connectionInsert('Alpha', 0)).toEqual({ insert: '[[Alpha]]', caret: 9 })
  })
})

// ⌘K writes `[label]()`, whose target is empty — the grammar requires at least one character there,
// so this form has to be found by its own scan or the picker never opens where it's needed most.
describe('the ( ) form', () => {
  it('opens inside an empty target and reports the label slot', () => {
    const doc = 'see []() end'
    const r = autocompleteQuery(doc, doc.indexOf('(') + 1)!
    expect(r.form).toBe('target')
    expect(r.query).toBe('')
    expect(r.from).toBe(r.to)
    expect(r.label).toEqual({ from: 5, to: 5 })
  })

  it('reads a target already typed, decoded', () => {
    const doc = 'see [x](Work%20Notes) end'
    const r = autocompleteQuery(doc, doc.indexOf('Work'))!
    expect(r.form).toBe('target')
    expect(r.query).toBe('Work Notes')
    expect(doc.slice(r.from, r.to)).toBe('Work%20Notes')
  })

  it('carries a written label so it can be left alone', () => {
    const doc = 'see [the notes]() end'
    const r = autocompleteQuery(doc, doc.indexOf('(') + 1)!
    expect(doc.slice(r.label!.from, r.label!.to)).toBe('the notes')
  })

  it('the caret in the label is not the caret in the target', () => {
    const doc = 'see [x](Notes) end'
    expect(autocompleteQuery(doc, 5)?.form).not.toBe('target')
  })

  it('commits its target percent-encoded', () => {
    expect(connectionInsert('Atomic Habits (Book)', 0, 'target').insert).toBe(
      'Atomic%20Habits%20%28Book%29',
    )
  })
})

describe('the picker declines a code sample', () => {
  // It binds Return at the editor's highest precedence, so arming over a sample eats the newline
  // and writes a page title into the sample instead of leaving it alone.
  it('a target inside a code span arms nothing', () => {
    const doc = 'Use `[Notes](Notes)` for links.'
    expect(autocompleteQuery(doc, doc.indexOf('](') + 2)).toBeNull()
  })

  it('and neither does a connection inside one', () => {
    const doc = 'Write `[[Title]]` to link.'
    expect(autocompleteQuery(doc, doc.indexOf('Title') + 2)).toBeNull()
  })

  it('but the same shapes outside code still arm', () => {
    const doc = 'see [x](Notes) end'
    expect(autocompleteQuery(doc, doc.indexOf('Notes'))?.form).toBe('target')
  })
})

describe('a label the picker writes is markdown, not plain text', () => {
  // Unescaped, a `]` in the title ends the label early and the whole link tokenizes as nothing.
  it('escapes a bracket-bearing title into the label slot', () => {
    const doc = 'see []() end'
    const ac = autocompleteQuery(doc, doc.indexOf('(') + 1)!
    const edit = commitEdit(ac, { value: 'Notes [WIP]', label: 'Notes [WIP]', isPage: true })
    const written = edit.changes.reduceRight(
      (t, c) => t.slice(0, c.from) + c.insert + t.slice(c.to),
      doc,
    )
    expect(written).toBe('see [Notes [WIP\\]](Notes%20%5BWIP%5D) end')
    expect(tokenizeHasLink(written)).toBe(true)
    // The escape lengthens the label, and the caret still lands past the whole link.
    expect(written.slice(edit.anchor)).toBe(' end')
  })
})

// Two shapes the commit takes beyond writing the link: accepting an alias finishes the link it
// belongs to, and accepting a page can leave one open at its alias slot instead.
describe('what accepting a suggestion finishes', () => {
  const page = { value: 'Alpha', label: 'Alpha', isPage: true, pageId: 'p1' }
  const alias = { value: 'the plan', label: 'the plan', isPage: false }

  it('accepting an alias steps past the whole link, not just the alias', () => {
    const doc = 'a [[Alpha|th]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('th') + 1)!
    expect(ac.form).toBe('alias')
    const edit = commitEdit(ac, alias)
    const text = doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha|the plan]] b')
    expect(edit.anchor).toBe('a [[Alpha|the plan]]'.length)
  })

  it('accepting a page opens its alias slot when asked to', () => {
    const doc = 'a [[Alph]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Alph') + 2)!
    const edit = commitEdit(ac, page, { openAlias: true })
    const text = doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha|]] b')
    expect(edit.opensAlias).toBe(true)
    expect(edit.anchor).toBe('a [[Alpha|'.length)
  })

  it('and finishes the link when not', () => {
    const doc = 'a [[Alph]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Alph') + 2)!
    const edit = commitEdit(ac, page)
    const text = doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha]] b')
    expect(edit.opensAlias).toBeUndefined()
  })
})

// The rule is the shape on the line: a pipe with nothing between it and the closer is an alias
// waiting to be written, and the picker offers what that page has been called. No gesture tracking
// behind it — every way of arriving at an empty alias arrives at the same offer.
describe('an empty alias asks for the picker by its shape alone', () => {
  it('opens on the bare pipe however the pipe got there', () => {
    const doc = 'a [[Alpha|]] b'
    const q = autocompleteQuery(doc, doc.indexOf('|') + 1)!
    expect(q.form).toBe('alias')
    expect(q.query).toBe('')
    expect(q.title).toBe('Alpha')
  })

  it('and a space between them is a written alias, not an empty one', () => {
    const doc = 'a [[Alpha| ]] b'
    expect(autocompleteQuery(doc, doc.indexOf('|') + 1)?.query).toBe(' ')
  })
})

// The surface, not the viewport: a panel that stops at the window edge has already crossed a
// neighbouring pane. 200 wide inside a 200→1000 surface, so the honest centre range is 308→892.
describe('acPanelLeft', () => {
  const W = 200
  const at = (caretX: number): number => acPanelLeft(caretX, W, 200, 1000)

  it('centres on the caret with room either side', () => {
    expect(at(600)).toBe(500)
  })

  it('slides only as far as the surface requires, never to the viewport', () => {
    expect(at(220)).toBe(208) // would centre at 120, well left of the surface
    expect(at(980)).toBe(792) // would centre at 880, past the surface's right
  })

  it('still centres at the point where centring exactly fits', () => {
    expect(at(308)).toBe(208)
    expect(at(892)).toBe(792)
  })

  it('pins to the leading edge when the surface is narrower than the panel', () => {
    expect(acPanelLeft(300, W, 250, 350)).toBe(258)
  })
})
