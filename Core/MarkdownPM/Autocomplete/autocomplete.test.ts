import { describe, it, expect } from 'vitest'
import {
  autocompleteQuery as queryOf,
  commitEdit,
  headingRows,
  openHeadingRows,
  type HeadingRow,
} from './autocomplete'
import { tokenize } from '../Engine/tokens'
import { scanDoc } from '../Engine/docScan'

const autocompleteQuery = (doc: string, caret: number, armed?: number) =>
  queryOf(scanDoc(doc), caret, armed)

const landed = (doc: string, edit: ReturnType<typeof commitEdit>): string =>
  edit.changes.reduceRight((t, c) => t.slice(0, c.from) + c.insert + t.slice(c.to), doc)

const tokenizeHasLink = (text: string): boolean => tokenize(text).some((t) => t.kind === 'link')

describe('autocompleteQuery', () => {
  it('detects a non-empty query with the caret inside the brackets', () => {
    const doc = 'see [[Pro]] end'
    const r = autocompleteQuery(doc, 9)!
    expect(r.query).toBe('Pro')
    expect(doc.slice(r.start, r.end)).toBe('[[Pro]]')
  })
  it('browses from an empty placeholder, closed', () => {
    expect(autocompleteQuery('see [[]] end', 6)).toEqual({
      syntax: 'wiki',
      part: 'title',
      start: 4,
      end: 8,
      from: 6,
      to: 6,
      query: '',
      closed: true,
      embed: false,
    })
  })
  it('reads a closed ![[…]] as the connection after its `!`', () => {
    expect(autocompleteQuery('see ![[Pic]] end', 9)).toMatchObject({
      start: 5,
      end: 12,
      syntax: 'wiki',
      part: 'title',
    })
  })
  it('never opens inside a fenced block, however plain the line reads', () => {
    const doc = 'intro\n```\nsee [[Pro]] end\n```\nafter'
    expect(autocompleteQuery(doc, doc.indexOf('Pro') + 2)).toBeNull()
  })
  it('never opens inside inline code', () => {
    const doc = 'see `[[Pro]]` end'
    expect(autocompleteQuery(doc, doc.indexOf('Pro') + 2)).toBeNull()
  })
  it('opens the alias slot from inside an alias, spanning only the alias', () => {
    const doc = 'see [[Q3 Plan|the plan]] end'
    const r = autocompleteQuery(doc, doc.indexOf('the plan') + 3)!
    expect(r).toMatchObject({ syntax: 'wiki', part: 'shown' })
    expect(r.query).toBe('the plan')
    expect(r.title).toBe('Q3 Plan')
    expect(doc.slice(r.from, r.to)).toBe('the plan')
  })

  it('opens it on a bare pipe, where nothing has been written yet', () => {
    const doc = 'see [[Q3 Plan|]] end'
    const r = autocompleteQuery(doc, doc.indexOf('|') + 1)!
    expect(r).toMatchObject({ syntax: 'wiki', part: 'shown' })
    expect(r.query).toBe('')
    expect(r.title).toBe('Q3 Plan')
    expect(r.from).toBe(r.to)
  })

  it('a space after the pipe is a written alias, not an empty one', () => {
    const doc = 'a [[Alpha| ]] b'
    expect(autocompleteQuery(doc, doc.indexOf('|') + 1)?.query).toBe(' ')
  })

  it('a link with no pipe has no alias slot at all', () => {
    const doc = 'see [[Q3 Plan]] end'
    expect(autocompleteQuery(doc, doc.indexOf('Plan') + 4)?.part).toBe('title')
  })

  it('still opens from inside an aliased link’s title', () => {
    const doc = 'see [[Q3 Plan|the plan]] end'
    const r = autocompleteQuery(doc, doc.indexOf('Plan') + 2)!
    expect(r.query).toBe('Q3 Plan')
    expect(doc.slice(r.start, r.end)).toBe('[[Q3 Plan|the plan]]')
  })
  it('returns null when the caret is outside any wikilink', () => {
    expect(autocompleteQuery('plain text', 5)).toBeNull()
    expect(autocompleteQuery('[[Pro]] x', 9)).toBeNull()
  })
})

describe('an unclosed link reads as the link it would be once closed', () => {
  it('reads an unclosed [[ up to the caret', () => {
    expect(autocompleteQuery('see [[Pro', 9)).toEqual({
      syntax: 'wiki',
      part: 'title',
      start: 4,
      end: 9,
      from: 6,
      to: 9,
      query: 'Pro',
      closed: false,
      embed: false,
    })
  })

  it('opens on a bare [[', () => {
    expect(autocompleteQuery('see [[', 6)).toEqual({
      syntax: 'wiki',
      part: 'title',
      start: 4,
      end: 6,
      from: 6,
      to: 6,
      query: '',
      closed: false,
      embed: false,
    })
  })

  it('opens an inserted ![[]] past its written closer, spanning the connection after the !', () => {
    expect(autocompleteQuery('![[]]', 3)).toEqual({
      syntax: 'wiki',
      part: 'title',
      start: 1,
      end: 5,
      from: 3,
      to: 3,
      query: '',
      closed: true,
      embed: true,
    })
  })

  it('reads an unclosed ![[ as ! plus a connection', () => {
    expect(autocompleteQuery('x ![[Pro', 8)).toMatchObject({ query: 'Pro', start: 3, end: 8 })
  })

  it('reads an unclosed heading half', () => {
    expect(autocompleteQuery('[[Page#He', 9)).toEqual({
      syntax: 'wiki',
      part: 'heading',
      start: 0,
      end: 9,
      from: 7,
      to: 9,
      query: 'He',
      closed: false,
      embed: false,
      title: 'Page',
    })
  })

  it('reads an unclosed bare # as the heading slot', () => {
    expect(autocompleteQuery('[[#Se', 5)).toMatchObject({
      query: 'Se',
      syntax: 'wiki',
      part: 'heading',
      closed: false,
      title: '',
    })
  })

  it('reads an unclosed markdown destination', () => {
    expect(autocompleteQuery('[label](Pa', 10)).toMatchObject({
      syntax: 'markdown',
      part: 'title',
      start: 0,
      end: 10,
      from: 8,
      to: 10,
      query: 'Pa',
      closed: false,
    })
  })

  it('reads an unclosed destination flush against a following link', () => {
    expect(autocompleteQuery('[x](Pa[[B]]', 6)).toMatchObject({
      query: 'Pa',
      syntax: 'markdown',
      part: 'title',
      closed: false,
    })
  })

  it('reads [[Pa[x](y) as the grammar does, a markdown link labeled [Pa[x', () => {
    expect(autocompleteQuery('[[Pa[x](y)', 4)).toMatchObject({
      syntax: 'markdown',
      part: 'shown',
      start: 0,
      end: 10,
      query: '[Pa[x',
      title: 'y',
    })
  })

  it('a written closer reads as closed', () => {
    expect(autocompleteQuery('[[Pro]]', 5)?.closed).toBe(true)
  })

  it('a pick writes the closer an unclosed link lacks', () => {
    const doc = 'see [[Pro'
    const edit = commitEdit(autocompleteQuery(doc, 9)!, 'Project', {})
    expect(landed(doc, edit)).toBe('see [[Project]]')
    expect(edit.anchor).toBe('see [[Project]]'.length)
  })

  it('an alias picked into a label is escaped, and the caret rests past the link', () => {
    const doc = 'see [o](Notes#Setup) end'
    const edit = commitEdit(autocompleteQuery(doc, 6)!, 'a\\b', {})
    expect(landed(doc, edit)).toBe('see [a\\\\b](Notes#Setup) end')
    expect(edit.anchor).toBe('see [a\\\\b](Notes#Setup)'.length)
  })

  it('a heading pick in an unclosed link writes the closer after it', () => {
    const doc = '[[Page#He'
    const edit = commitEdit(autocompleteQuery(doc, 9)!, 'Heading', {})
    expect(edit.changes).toEqual([{ from: 7, to: 9, insert: 'Heading]]' }])
    expect(edit.anchor).toBe('[[Page#Heading]]'.length)
  })

  it('a heading pick that opens the alias slot writes the closer behind it', () => {
    const doc = '[[Page#He'
    const edit = commitEdit(autocompleteQuery(doc, 9)!, 'Heading', { openAlias: true })
    expect(landed(doc, edit)).toBe('[[Page#Heading|]]')
    expect(edit.anchor).toBe('[[Page#Heading|'.length)
  })

  it('a target pick that opens the heading slot writes the ) behind it', () => {
    const doc = '[label](Al'
    const edit = commitEdit(autocompleteQuery(doc, 10)!, 'Alpha', {
      kept: 'label',
      openHeading: true,
    })
    const text = landed(doc, edit)
    expect(text).toBe('[label](Alpha#)')
    expect(text.slice(edit.anchor)).toBe(')')
    expect(autocompleteQuery(text, edit.anchor)?.part).toBe('heading')
  })

  it('a target pick in an unclosed destination writes the )', () => {
    const doc = '[label](Pa'
    const edit = commitEdit(autocompleteQuery(doc, 10)!, 'Page', { kept: 'label' })
    expect(landed(doc, edit)).toBe('[label](Page)')
    expect(edit.anchor).toBe('[label](Page)'.length)
  })
})

describe('the ( ) slots', () => {
  it('opens inside an empty target and spans the whole link', () => {
    const doc = 'see []() end'
    const r = autocompleteQuery(doc, doc.indexOf('(') + 1)!
    expect(r).toMatchObject({ syntax: 'markdown', part: 'title', query: '' })
    expect(r.from).toBe(r.to)
    expect(doc.slice(r.start, r.end)).toBe('[]()')
  })

  it('reads a target already typed, decoded', () => {
    const doc = 'see [x](Work%20Notes) end'
    const r = autocompleteQuery(doc, doc.indexOf('Work'))!
    expect(r.part).toBe('title')
    expect(r.query).toBe('Work Notes')
    expect(doc.slice(r.from, r.to)).toBe('Work%20Notes')
  })

  it('spans a written label so it can be left alone', () => {
    const doc = 'see [the notes]() end'
    const r = autocompleteQuery(doc, doc.indexOf('(') + 1)!
    expect(doc.slice(r.start, r.end)).toBe('[the notes]()')
  })

  it('reads a target holding balanced parentheses to its real close', () => {
    const doc = 'see [w](Notes_(a)_b) end'
    const r = autocompleteQuery(doc, doc.indexOf('Notes') + 2)!
    expect(r.part).toBe('title')
    expect(doc.slice(r.from, r.to)).toBe('Notes_(a)_b')
  })

  it('the caret in the label queries the aliases of the page the target names', () => {
    const doc = 'see [x](Notes) end'
    expect(autocompleteQuery(doc, 5)).toEqual({
      syntax: 'markdown',
      part: 'shown',
      start: 4,
      end: doc.indexOf(')') + 1,
      from: 5,
      to: 6,
      query: 'x',
      closed: true,
      embed: false,
      title: 'Notes',
      shown: 'x',
    })
  })

  it('a title pick given no heading writes none', () => {
    const doc = 'see [x](Work%20Notes#Setup) end'
    const r = autocompleteQuery(doc, doc.indexOf('Work') + 2)!
    expect(r.part).toBe('title')
    expect(r.query).toBe('Work Notes')
    expect(landed(doc, commitEdit(r, 'Other', { kept: 'x' }))).toBe('see [x](Other) end')
  })

  it('a title query carries the written heading, and a pick given it keeps it', () => {
    const doc = 'see [x](Work%20Notes#Setup) end'
    const r = autocompleteQuery(doc, doc.indexOf('Work') + 2)!
    expect(r.heading).toBe('Setup')
    expect(landed(doc, commitEdit(r, 'Other', { kept: 'x', heading: 'Setup' }))).toBe(
      'see [x](Other#Setup) end',
    )
  })

  it('after the #, the heading slot asks for the named page’s headings', () => {
    const doc = 'see [x](Work%20Notes#Se) end'
    const r = autocompleteQuery(doc, doc.indexOf('#Se') + 2)!
    expect(r).toMatchObject({ syntax: 'markdown', part: 'heading' })
    expect(r.title).toBe('Work Notes')
    expect(r.query).toBe('Se')
    expect(doc.slice(r.from, r.to)).toBe('Se')
  })

  it('the caret before the # of an empty page half sits in the title, as a wikilink’s does', () => {
    for (const doc of ['see [x](#Setup) end', 'see [[#Setup]] end'])
      expect(autocompleteQuery(doc, doc.indexOf('#'))).toMatchObject({ part: 'title', query: '' })
  })

  it('a bare # asks for the page being written in', () => {
    const doc = 'see [x](#) end'
    const r = autocompleteQuery(doc, doc.indexOf('#') + 1)!
    expect(r).toMatchObject({ syntax: 'markdown', part: 'heading' })
    expect(r.title).toBe('')
    expect(r.query).toBe('')
  })

  it('a # inside an address is the address’s own', () => {
    const doc = 'see [x](https://a.com/#top) end'
    expect(autocompleteQuery(doc, doc.indexOf('top'))?.part).toBe('title')
  })

  it('a heading commit encodes it, leaves an empty label to its drawn default, and finishes past the )', () => {
    const doc = 'see [](Work%20Notes#Se) end'
    const r = autocompleteQuery(doc, doc.indexOf('#Se') + 2)!
    const edit = commitEdit(r, 'Getting Started', {})
    const text = landed(doc, edit)
    expect(text).toBe('see [](Work%20Notes#Getting%20Started) end')
    expect(text.slice(edit.anchor)).toBe(' end')
  })

  it('the chevron writes the page and its # and anchors behind it', () => {
    const doc = 'see [x](Wor) end'
    const r = autocompleteQuery(doc, doc.indexOf('Wor') + 1)!
    const edit = commitEdit(r, 'Work Notes', { kept: 'x', openHeading: true })
    const text = landed(doc, edit)
    expect(text).toBe('see [x](Work%20Notes#) end')
    expect(text.slice(edit.anchor)).toBe(') end')
    expect(autocompleteQuery(text, edit.anchor)?.part).toBe('heading')
  })
})

describe('a pick writes the shown text its caller kept', () => {
  const pick = (link: string, at: string, value: string, kept?: string) => {
    const doc = `${link} x`
    const edit = commitEdit(autocompleteQuery(doc, doc.indexOf(at) + 1)!, value, { kept })
    return { text: landed(doc, edit), after: landed(doc, edit).slice(edit.anchor) }
  }

  it('a connection’s alias rides only when kept', () => {
    expect(pick('[[Old|Mine]]', 'Old', 'New').text).toBe('[[New]] x')
    expect(pick('[[Old|Mine]]', 'Old', 'New', 'Mine').text).toBe('[[New|Mine]] x')
  })

  it('a markdown label takes the new title unless kept, and rests past the link', () => {
    expect(pick('[Notes](Old)', 'Old', 'New')).toEqual({ text: '[New](New) x', after: ' x' })
    expect(pick('[Notes](Old)', 'Old', 'New', 'Notes')).toEqual({
      text: '[Notes](New) x',
      after: ' x',
    })
  })
})

describe('a pick reads an embed as the scanner does', () => {
  const pick = (doc: string) =>
    landed(doc, commitEdit(autocompleteQuery(doc, doc.indexOf('Notes') + 1)!, 'A/Notes', {}))

  it('only a link alone on its line behind a ! drops the title alias', () => {
    expect(pick('see ![[Notes]] here')).toBe('see ![[A/Notes|Notes]] here')
    expect(pick('![[Notes]]')).toBe('![[A/Notes]]')
  })

  it('a table cell draws no embed, so one alone in it keeps the title alias', () => {
    const doc = '![[Notes'
    const ac = queryOf(scanDoc(doc), doc.length, undefined, 'cell')!
    expect(landed(doc, commitEdit(ac, 'A/Notes', {}))).toBe('![[A/Notes|Notes]]')
  })
})

describe('wiki and markdown picks mirror each other', () => {
  const pick = (doc: string, at: string, value: string, opts: Parameters<typeof commitEdit>[2]) => {
    const edit = commitEdit(autocompleteQuery(doc, doc.indexOf(at) + at.length)!, value, opts)
    const text = landed(doc, edit)
    return { text, before: text.slice(0, edit.anchor) }
  }

  it('a pick opening the heading slot rests after its #', () => {
    expect(pick('[[Gam]]', 'Ga', 'Gamma', { openHeading: true })).toEqual({
      text: '[[Gamma#]]',
      before: '[[Gamma#',
    })
    expect(pick('[](Gam)', 'Ga', 'Gamma', { openHeading: true })).toEqual({
      text: '[](Gamma#)',
      before: '[](Gamma#',
    })
  })

  it('a pick opening the alias slot rests in it', () => {
    expect(pick('[[Gam]]', 'Ga', 'Gamma', { openAlias: true })).toEqual({
      text: '[[Gamma|]]',
      before: '[[Gamma|',
    })
    expect(pick('[](Gam)', 'Ga', 'Gamma', { openAlias: true })).toEqual({
      text: '[](Gamma)',
      before: '[',
    })
  })

  it('a heading pick opening the alias slot writes in place, leaving the title as written and that slot empty', () => {
    expect(pick('[[Gamma#Se]]', '#S', 'Setup', { openAlias: true })).toEqual({
      text: '[[Gamma#Setup|]]',
      before: '[[Gamma#Setup|',
    })
    expect(pick('[[Gamma#|]]', '#', 'Setup', { openAlias: true })).toEqual({
      text: '[[Gamma#Setup|]]',
      before: '[[Gamma#Setup|',
    })
    expect(pick('[](Gamma#Se)', '#S', 'Setup', { openAlias: true })).toEqual({
      text: '[](Gamma#Setup)',
      before: '[',
    })
    expect(pick('[](Notes.md#Se)', '#S', 'Setup', { openAlias: true })).toEqual({
      text: '[](Notes.md#Setup)',
      before: '[',
    })
  })

  it('a heading pick a wikilink can’t spell writes the whole link in the markdown form, the title as written', () => {
    expect(pick('[[Notes.md#]]', '#', 'A|B', {})).toEqual({
      text: '[A|B](Notes.md#A%7CB)',
      before: '[A|B](Notes.md#A%7CB)',
    })
    expect(pick('[[ Notes #Se]]', '#S', 'A|B', {})).toEqual({
      text: '[A|B](Notes#A%7CB)',
      before: '[A|B](Notes#A%7CB)',
    })
    expect(pick('[[Notes#Se|Mine]]', '#S', 'A|B', { kept: 'Mine' })).toEqual({
      text: '[Mine](Notes#A%7CB)',
      before: '[Mine](Notes#A%7CB)',
    })
    expect(pick('[[Notes#]]', '#', 'A|B', { openAlias: true })).toEqual({
      text: '[](Notes#A%7CB)',
      before: '[',
    })
  })

  it('a wikilink pick its syntax can’t spell opens its heading behind an empty label', () => {
    expect(pick('[[Pa]]', 'Pa', 'A|B', { openHeading: true })).toEqual({
      text: '[](A%7CB#)',
      before: '[](A%7CB#',
    })
  })

  it('a closed heading pick rests past the closer', () => {
    expect(pick('[[Notes#Se]]', '#S', 'Setup', {}).before).toHaveLength(15)
    expect(pick('[x](Notes#Se)', '#S', 'Setup', { kept: 'x' }).before).toHaveLength(16)
  })

  it('a heading pick behind a kept alias keeps it and rests past the closer; one not kept writes the link whole without it', () => {
    expect(pick('[[Notes#|Mine]]', '#', 'Setup', { kept: 'Mine' })).toEqual({
      text: '[[Notes#Setup|Mine]]',
      before: '[[Notes#Setup|Mine]]',
    })
    expect(pick('[[Notes#Se|Mine]]', '#S', 'Setup', {})).toEqual({
      text: '[[Notes#Setup]]',
      before: '[[Notes#Setup]]',
    })
    expect(pick('[Mine](Notes#Se)', '#S', 'Setup', {})).toEqual({
      text: '[Setup](Notes#Setup)',
      before: '[Setup](Notes#Setup)',
    })
  })
})

describe('the picker declines a code sample', () => {
  it('a target inside a code span arms nothing', () => {
    const doc = 'Use `[Notes](Notes)` for links.'
    expect(autocompleteQuery(doc, doc.indexOf('](') + 2)).toBeNull()
  })
})

describe('a label the picker writes is markdown, not plain text', () => {
  it('escapes a bracket-bearing title into the label slot', () => {
    const doc = 'see []() end'
    const ac = autocompleteQuery(doc, doc.indexOf('(') + 1)!
    const edit = commitEdit(ac, 'Notes [WIP]', {})
    const written = edit.changes.reduceRight(
      (t, c) => t.slice(0, c.from) + c.insert + t.slice(c.to),
      doc,
    )
    expect(written).toBe('see [Notes [WIP\\]](Notes%20%5BWIP%5D) end')
    expect(tokenizeHasLink(written)).toBe(true)
    expect(written.slice(edit.anchor)).toBe(' end')
  })
})

describe('what accepting a suggestion finishes', () => {
  it('accepting an alias steps past the whole link, not just the alias', () => {
    const doc = 'a [[Alpha|th]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('th') + 1)!
    expect(ac.part).toBe('shown')
    const edit = commitEdit(ac, 'the plan', {})
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha|the plan]] b')
    expect(edit.anchor).toBe('a [[Alpha|the plan]]'.length)
  })

  it('accepting a page opens its alias slot when asked to', () => {
    const doc = 'a [[Alph]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Alph') + 2)!
    const edit = commitEdit(ac, 'Alpha', { openAlias: true })
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha|]] b')
    expect(edit.anchor).toBe('a [[Alpha|'.length)
  })

  it('and finishes the link when not', () => {
    const doc = 'a [[Alph]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Alph') + 2)!
    const edit = commitEdit(ac, 'Alpha', {})
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha]] b')
  })
})

describe('the heading slot opens after a typed #', () => {
  it('an empty fragment after the page names it and asks nothing yet', () => {
    const doc = 'see [[Page#]] end'
    const r = autocompleteQuery(doc, doc.indexOf('#') + 1)!
    expect(r.part).toBe('heading')
    expect(r.title).toBe('Page')
    expect(r.query).toBe('')
  })

  it('a bare fragment names no page at all', () => {
    const doc = 'see [[#Se]] end'
    const r = autocompleteQuery(doc, doc.indexOf('Se') + 1)!
    expect(r.part).toBe('heading')
    expect(r.title).toBe('')
    expect(r.query).toBe('Se')
  })

  it('headingRows ranks a typed query, lists the outline as it stands for an empty one, and dedupes repeated text', () => {
    const outline = [
      { from: 0, level: 1, text: 'Setup', key: 'Setup' },
      { from: 10, level: 2, text: 'Setup 2', key: 'Setup 2' },
      { from: 20, level: 1, text: 'Other', key: 'Other' },
      { from: 30, level: 1, text: 'Setup', key: 'Setup' },
    ]
    expect(headingRows(outline, 'Set').map((r) => r.value)).toEqual(['Setup', 'Setup 2'])
    expect(headingRows(outline, '').map((r) => r.value)).toEqual(['Setup', 'Setup 2', 'Other'])
    const scattered = [
      { from: 0, level: 1, text: 'Implementation Notes', key: 'Implementation Notes' },
      { from: 10, level: 1, text: 'Intro', key: 'Intro' },
    ]
    expect(headingRows(scattered, 'int').map((r) => r.value)).toEqual([
      'Intro',
      'Implementation Notes',
    ])
    const notes = [{ from: 0, level: 1, text: 'Notes', key: 'Notes' }]
    expect(headingRows(notes, 'nts').map((r) => r.value)).toEqual(['Notes'])
    const unspellable = [{ from: 0, level: 1, text: 'A|B', key: 'A|B' }]
    expect(headingRows(unspellable, '').map((r) => r.value)).toEqual(['A|B'])
  })

  it('the chevron commit writes an empty fragment and anchors before the closer', () => {
    const doc = 'a [[Pag]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Pag') + 1)!
    const edit = commitEdit(ac, 'Page', { openHeading: true })
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Page#]] b')
    expect(text.slice(edit.anchor)).toBe(']] b')
  })

  it('a heading commit finishes the link past the closer', () => {
    const doc = 'a [[Page#Se]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Se') + 1)!
    const edit = commitEdit(ac, 'Setup', {})
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Page#Setup]] b')
    expect(text.slice(edit.anchor)).toBe(' b')
  })
})

describe('a typed § arms a prose heading query', () => {
  it('returns a prose heading query for an armed §, keyed from just past it', () => {
    const doc = 'see §Set end'
    const armed = doc.indexOf('§')
    const r = autocompleteQuery(doc, armed + 4, armed)!
    expect(r).toMatchObject({ syntax: 'prose', part: 'heading', start: armed, end: armed + 4 })
    expect(r.query).toBe('Set')
    expect(r.from).toBe(armed + 1)
  })

  it('is null when nothing is armed', () => {
    expect(autocompleteQuery('see §Set end', 8)).toBeNull()
  })

  it('a space inside the query rides through, so a multi-word heading is reachable', () => {
    const doc = 'see §Getting S'
    const r = autocompleteQuery(doc, doc.length, 4)!
    expect(r.syntax).toBe('prose')
    expect(r.query).toBe('Getting S')
  })

  it('a space right after the § is not a query', () => {
    expect(autocompleteQuery('see § Set', 8, 4)).toBeNull()
  })

  // A label is prose the way an alias is, and the scanner never reads a run inside a markdown link.
  it('a § inside a bracket, a markdown link’s label included, is not armed', () => {
    expect(autocompleteQuery('see [§Set](x) end', 9, 5)).toMatchObject({
      syntax: 'markdown',
      part: 'shown',
    })
    expect(autocompleteQuery('see [§Set', 9, 5)).toBeNull()
  })

  it('a link holding the caret reads before the arm, and an armed § inside a link is not armed', () => {
    expect(autocompleteQuery('[x](Notes#Set§', 14, 13)).toMatchObject({
      syntax: 'markdown',
      part: 'heading',
    })
    expect(autocompleteQuery('[a](https://x.io/§', 18, 17)).toMatchObject({
      syntax: 'markdown',
      part: 'title',
    })
    expect(autocompleteQuery('[x](Notes#Set§) Intro', 21, 13)).toBeNull()
    expect(autocompleteQuery('§Set [[A', 8, 0)).toMatchObject({
      syntax: 'wiki',
      part: 'title',
      query: 'A',
    })
  })

  it('a § in a bare address, in a closed code span, or on a heading line is not armed', () => {
    expect(autocompleteQuery('see https://x.io/§Set', 21, 17)).toBeNull()
    expect(autocompleteQuery('`§Set` x', 8, 1)).toBeNull()
    expect(autocompleteQuery('# Title §Set', 12, 8)).toBeNull()
  })

  it('a § typed just past a code span or a link arms', () => {
    for (const doc of ['`x`§Set', '[[A]]§Set'] as const) {
      const armed = doc.indexOf('§')
      expect(autocompleteQuery(doc, doc.length, armed)).toMatchObject({
        syntax: 'prose',
        query: 'Set',
      })
    }
  })
})

describe('openHeadingRows', () => {
  const row = (value: string, level: number): HeadingRow => ({
    kind: 'heading',
    value,
    level,
  })
  it('hides everything deeper than a collapsed heading, up to its next sibling', () => {
    const rows = [row('A', 2), row('A1', 3), row('A1a', 4), row('B', 2), row('B1', 3)]
    expect(openHeadingRows(rows, new Set(['A'])).map((r) => r.value)).toEqual(['A', 'B', 'B1'])
    expect(openHeadingRows(rows, new Set(['A1'])).map((r) => r.value)).toEqual([
      'A',
      'A1',
      'B',
      'B1',
    ])
    expect(openHeadingRows(rows, new Set()).map((r) => r.value)).toEqual([
      'A',
      'A1',
      'A1a',
      'B',
      'B1',
    ])
  })
})
