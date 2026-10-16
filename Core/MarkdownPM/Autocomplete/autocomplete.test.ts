import { describe, it, expect } from 'vitest'
import {
  autocompleteQuery as queryOf,
  commitEdit,
  headingRows,
  openHeadingRows,
  type HeadingRow,
} from './autocomplete'
import { tokenize } from '../Engine/tokens'
import { readLinkText } from '../../Connections/linkValue'
import { scanDoc } from '../Engine/docScan'

const autocompleteQuery = (doc: string, caret: number, armed?: number) =>
  queryOf(scanDoc(doc), caret, armed)

const KEEP = { container: null, keepTitle: true }

const landed = (doc: string, edit: ReturnType<typeof commitEdit>): string =>
  edit.changes.reduceRight((t, c) => t.slice(0, c.from) + c.insert + t.slice(c.to), doc)

const tokenizeHasLink = (text: string): boolean => tokenize(text).some((t) => t.kind === 'link')

describe('autocompleteQuery', () => {
  it('detects a non-empty query with the caret inside the brackets', () => {
    const doc = 'see [[Pro]] end'
    const r = autocompleteQuery(doc, 9)!
    expect(r.query).toBe('Pro')
    expect(doc.slice(r.from, r.to)).toBe('[[Pro]]')
  })
  it('browses from an empty placeholder, closed', () => {
    expect(autocompleteQuery('see [[]] end', 6)).toEqual({
      query: '',
      from: 4,
      to: 8,
      form: 'link',
      closed: true,
    })
  })
  it('reads a closed ![[…]] as the connection after its `!`', () => {
    expect(autocompleteQuery('see ![[Pic]] end', 9)).toMatchObject({
      from: 5,
      to: 12,
      form: 'link',
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

  it('a space after the pipe is a written alias, not an empty one', () => {
    const doc = 'a [[Alpha| ]] b'
    expect(autocompleteQuery(doc, doc.indexOf('|') + 1)?.query).toBe(' ')
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
    expect(autocompleteQuery('[[Pro]] x', 9)).toBeNull()
  })
})

describe('an unclosed link reads as the link it would be once closed', () => {
  it('reads an unclosed [[ up to the caret', () => {
    expect(autocompleteQuery('see [[Pro', 9)).toEqual({
      query: 'Pro',
      from: 4,
      to: 9,
      form: 'link',
      closed: false,
    })
  })

  it('opens on a bare [[', () => {
    expect(autocompleteQuery('see [[', 6)).toEqual({
      query: '',
      from: 4,
      to: 6,
      form: 'link',
      closed: false,
    })
  })

  it('opens an inserted ![[]] past its written closer, spanning the connection after the !', () => {
    expect(autocompleteQuery('![[]]', 3)).toEqual({
      query: '',
      from: 1,
      to: 5,
      form: 'link',
      closed: true,
    })
  })

  it('reads an unclosed ![[ as ! plus a connection', () => {
    expect(autocompleteQuery('x ![[Pro', 8)).toMatchObject({ query: 'Pro', from: 3, to: 8 })
  })

  it('reads an unclosed heading half', () => {
    expect(autocompleteQuery('[[Page#He', 9)).toEqual({
      query: 'He',
      from: 7,
      to: 9,
      form: 'heading',
      closed: false,
      title: 'Page',
    })
  })

  it('reads an unclosed bare # as the heading form', () => {
    expect(autocompleteQuery('[[#Se', 5)).toMatchObject({
      query: 'Se',
      form: 'heading',
      closed: false,
      title: '',
    })
  })

  it('reads an unclosed markdown destination', () => {
    expect(autocompleteQuery('[label](Pa', 10)).toMatchObject({
      query: 'Pa',
      from: 8,
      to: 10,
      form: 'target',
      closed: false,
    })
  })

  it('reads an unclosed destination flush against a following link', () => {
    expect(autocompleteQuery('[x](Pa[[B]]', 6)).toMatchObject({
      query: 'Pa',
      form: 'target',
      closed: false,
    })
  })

  it('a written closer reads as closed', () => {
    expect(autocompleteQuery('[[Pro]]', 5)?.closed).toBe(true)
  })

  it('a pick writes the closer an unclosed link lacks', () => {
    const doc = 'see [[Pro'
    const edit = commitEdit(autocompleteQuery(doc, 9)!, 'Project', KEEP)
    expect(landed(doc, edit)).toBe('see [[Project]]')
    expect(edit.anchor).toBe('see [[Project]]'.length)
  })

  it('an alias picked into a label is escaped, and the caret rests past the link', () => {
    const doc = 'see [o](Notes#Setup) end'
    const edit = commitEdit(autocompleteQuery(doc, 6)!, 'a\\b', KEEP)
    expect(landed(doc, edit)).toBe('see [a\\\\b](Notes#Setup) end')
    expect(edit.anchor).toBe('see [a\\\\b](Notes#Setup)'.length)
  })

  it('a heading pick in an unclosed link writes the closer after it', () => {
    const doc = '[[Page#He'
    const edit = commitEdit(autocompleteQuery(doc, 9)!, 'Heading', KEEP)
    expect(edit.changes).toEqual([{ from: 7, to: 9, insert: 'Heading]]' }])
    expect(edit.anchor).toBe('[[Page#Heading]]'.length)
  })

  it('a heading pick that opens the alias slot writes the closer behind it', () => {
    const doc = '[[Page#He'
    const edit = commitEdit(autocompleteQuery(doc, 9)!, 'Heading', { ...KEEP, openAlias: true })
    expect(landed(doc, edit)).toBe('[[Page#Heading|]]')
    expect(edit.anchor).toBe('[[Page#Heading|'.length)
  })

  it('a target pick that opens the heading slot writes the ) behind it', () => {
    const doc = '[label](Al'
    const edit = commitEdit(autocompleteQuery(doc, 10)!, 'Alpha', { ...KEEP, openHeading: true })
    const text = landed(doc, edit)
    expect(text).toBe('[label](Alpha#)')
    expect(text.slice(edit.anchor)).toBe(')')
    expect(autocompleteQuery(text, edit.anchor)?.form).toBe('fragment')
  })

  it('a target pick in an unclosed destination writes the )', () => {
    const doc = '[label](Pa'
    const edit = commitEdit(autocompleteQuery(doc, 10)!, 'Page', KEEP)
    expect(edit.changes).toEqual([{ from: 8, to: 10, insert: 'Page)' }])
    expect(landed(doc, edit)).toBe('[label](Page)')
    expect(edit.anchor).toBe('[label](Page)'.length)
  })
})

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

  it('reads a target holding balanced parentheses to its real close', () => {
    const doc = 'see [w](Notes_(a)_b) end'
    const r = autocompleteQuery(doc, doc.indexOf('Notes') + 2)!
    expect(r.form).toBe('target')
    expect(doc.slice(r.from, r.to)).toBe('Notes_(a)_b')
  })

  it('the caret in the label queries the aliases of the page the target names', () => {
    const doc = 'see [x](Notes) end'
    expect(autocompleteQuery(doc, 5)).toEqual({
      query: 'x',
      from: 5,
      to: 6,
      form: 'label',
      closed: true,
      title: 'Notes',
      end: doc.indexOf(')') + 1,
    })
  })

  it('the page half queries alone, and a retarget drops the old fragment as a wikilink does', () => {
    const doc = 'see [x](Work%20Notes#Setup) end'
    const r = autocompleteQuery(doc, doc.indexOf('Work') + 2)!
    expect(r.form).toBe('target')
    expect(r.query).toBe('Work Notes')
    expect(landed(doc, commitEdit(r, 'Other', KEEP))).toBe('see [x](Other) end')
  })

  it('after the #, the fragment form asks for the named page’s headings', () => {
    const doc = 'see [x](Work%20Notes#Se) end'
    const r = autocompleteQuery(doc, doc.indexOf('#Se') + 2)!
    expect(r.form).toBe('fragment')
    expect(r.title).toBe('Work Notes')
    expect(r.query).toBe('Se')
    expect(doc.slice(r.from, r.to)).toBe('Se')
  })

  it('an empty page half before a fragment asks for no page', () => {
    const doc = 'see [x](#Setup) end'
    expect(autocompleteQuery(doc, doc.indexOf('#'))).toMatchObject({ form: 'fragment', title: '' })
  })

  it('a bare # asks for the page being written in', () => {
    const doc = 'see [x](#) end'
    const r = autocompleteQuery(doc, doc.indexOf('#') + 1)!
    expect(r.form).toBe('fragment')
    expect(r.title).toBe('')
    expect(r.query).toBe('')
  })

  it('a # inside an address is the address’s own', () => {
    const doc = 'see [x](https://a.com/#top) end'
    expect(autocompleteQuery(doc, doc.indexOf('top'))?.form).toBe('target')
  })

  it('a heading commit encodes it, fills an empty label, and finishes past the )', () => {
    const doc = 'see [](Work%20Notes#Se) end'
    const r = autocompleteQuery(doc, doc.indexOf('#Se') + 2)!
    const edit = commitEdit(r, 'Getting Started', KEEP)
    const text = landed(doc, edit)
    expect(text).toBe('see [Getting Started](Work%20Notes#Getting%20Started) end')
    expect(text.slice(edit.anchor)).toBe(' end')
  })

  it('the chevron writes the page and its # and anchors behind it', () => {
    const doc = 'see [x](Wor) end'
    const r = autocompleteQuery(doc, doc.indexOf('Wor') + 1)!
    const edit = commitEdit(r, 'Work Notes', { ...KEEP, openHeading: true })
    const text = landed(doc, edit)
    expect(text).toBe('see [x](Work%20Notes#) end')
    expect(text.slice(edit.anchor)).toBe(') end')
    expect(autocompleteQuery(text, edit.anchor)?.form).toBe('fragment')
  })
})

describe('a pick retargets under Remove Title On Link Change', () => {
  const pick = (
    link: string,
    at: string,
    value: string,
    keepTitle: boolean,
    container = readLinkText(link),
  ) => {
    const doc = `${link} x`
    const edit = commitEdit(autocompleteQuery(doc, doc.indexOf(at) + 1)!, value, {
      container,
      keepTitle,
    })
    return { text: landed(doc, edit), after: landed(doc, edit).slice(edit.anchor) }
  }

  it('a connection’s alias drops with the setting on and rides with it off', () => {
    expect(pick('[[Old|Mine]]', 'Old', 'New', false).text).toBe('[[New]] x')
    expect(pick('[[Old|Mine]]', 'Old', 'New', true).text).toBe('[[New|Mine]] x')
  })

  it('re-picking the same page keeps the alias either way', () => {
    expect(pick('[[Old|Mine]]', 'Old', 'Old', false).text).toBe('[[Old|Mine]] x')
    expect(pick('[[Old|Mine]]', 'Old', 'Old', true).text).toBe('[[Old|Mine]] x')
  })

  it('re-picking the page of a link that named a heading drops a markdown label as it drops an alias', () => {
    expect(pick('[Mine](Old#H)', 'Old', 'Old', false).text).toBe('[Old](Old) x')
    expect(pick('[[Old#H|Mine]]', 'Old', 'Old', false).text).toBe('[[Old]] x')
  })

  it('a markdown label takes the new title with the setting on, and rests past the link', () => {
    expect(pick('[Notes](Old)', 'Old', 'New', false)).toEqual({
      text: '[New](New) x',
      after: ' x',
    })
    expect(pick('[Notes](Old)', 'Old', 'New', true)).toEqual({
      text: '[Notes](New) x',
      after: ' x',
    })
  })

  it('the old target is the container’s, not the text typed since', () => {
    const was = readLinkText('[Notes](Old)')
    expect(pick('[Notes](Ol)', 'Ol', 'Old', false, was).text).toBe('[Notes](Old) x')
    expect(pick('[Notes](Ol)', 'Ol', 'New', false, was).text).toBe('[New](New) x')
  })

  it('a link with no container keeps its label, closed or not', () => {
    expect(pick('[Notes](Ne)', 'Ne', 'New', false, null).text).toBe('[Notes](New) x')
    expect(pick('[Notes](O', 'O', 'New', false, null).text).toBe('[Notes](New) x')
    expect(pick('[Notes]()', '(', 'New', false, null).text).toBe('[Notes](New) x')
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
    const edit = commitEdit(ac, 'Notes [WIP]', KEEP)
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
    expect(ac.form).toBe('alias')
    const edit = commitEdit(ac, 'the plan', KEEP)
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha|the plan]] b')
    expect(edit.anchor).toBe('a [[Alpha|the plan]]'.length)
  })

  it('accepting a page opens its alias slot when asked to', () => {
    const doc = 'a [[Alph]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Alph') + 2)!
    const edit = commitEdit(ac, 'Alpha', { ...KEEP, openAlias: true })
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha|]] b')
    expect(edit.anchor).toBe('a [[Alpha|'.length)
  })

  it('and finishes the link when not', () => {
    const doc = 'a [[Alph]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Alph') + 2)!
    const edit = commitEdit(ac, 'Alpha', KEEP)
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Alpha]] b')
  })
})

describe('the heading form opens after a typed #', () => {
  it('an empty fragment after the page names it and asks nothing yet', () => {
    const doc = 'see [[Page#]] end'
    const r = autocompleteQuery(doc, doc.indexOf('#') + 1)!
    expect(r.form).toBe('heading')
    expect(r.title).toBe('Page')
    expect(r.query).toBe('')
  })

  it('a bare fragment names no page at all', () => {
    const doc = 'see [[#Se]] end'
    const r = autocompleteQuery(doc, doc.indexOf('Se') + 1)!
    expect(r.form).toBe('heading')
    expect(r.title).toBe('')
    expect(r.query).toBe('Se')
  })

  it('headingRows filters by prefix and dedupes repeated text', () => {
    const outline = [
      { from: 0, level: 1, text: 'Setup', key: 'Setup' },
      { from: 10, level: 2, text: 'Setup 2', key: 'Setup 2' },
      { from: 20, level: 1, text: 'Other', key: 'Other' },
    ]
    expect(headingRows(outline, 'Set').map((r) => r.value)).toEqual(['Setup', 'Setup 2'])
    expect(headingRows(outline, '').map((r) => r.value)).toEqual(['Setup', 'Setup 2', 'Other'])
  })

  it('the chevron commit writes an empty fragment and anchors before the closer', () => {
    const doc = 'a [[Pag]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Pag') + 1)!
    const edit = commitEdit(ac, 'Page', { ...KEEP, openHeading: true })
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Page#]] b')
    expect(text.slice(edit.anchor)).toBe(']] b')
  })

  it('a heading commit finishes the link past the closer', () => {
    const doc = 'a [[Page#Se]] b'
    const ac = autocompleteQuery(doc, doc.indexOf('Se') + 1)!
    const edit = commitEdit(ac, 'Setup', KEEP)
    const text =
      doc.slice(0, edit.changes[0].from) + edit.changes[0].insert + doc.slice(edit.changes[0].to)
    expect(text).toBe('a [[Page#Setup]] b')
    expect(text.slice(edit.anchor)).toBe(' b')
  })
})

describe('a typed § arms the section form', () => {
  it('returns form: section for an armed §, keyed from just past it', () => {
    const doc = 'see §Set end'
    const armed = doc.indexOf('§')
    const r = autocompleteQuery(doc, armed + 4, armed)!
    expect(r.form).toBe('section')
    expect(r.query).toBe('Set')
    expect(r.from).toBe(armed + 1)
  })

  it('is null when nothing is armed', () => {
    expect(autocompleteQuery('see §Set end', 8)).toBeNull()
  })

  it('a space inside the query rides through, so a multi-word heading is reachable', () => {
    const doc = 'see §Getting S'
    const r = autocompleteQuery(doc, doc.length, 4)!
    expect(r.form).toBe('section')
    expect(r.query).toBe('Getting S')
  })

  it('a space right after the § is not a query', () => {
    expect(autocompleteQuery('see § Set', 8, 4)).toBeNull()
  })

  // A label is prose the way an alias is, and the scanner never reads a run inside a markdown link.
  it('a § inside a bracket, a markdown link’s label included, is not armed', () => {
    for (const doc of ['see [§Set](x) end', 'see [§Set'] as const) {
      const armed = doc.indexOf('§')
      expect(autocompleteQuery(doc, armed + 4, armed)?.form).not.toBe('section')
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
