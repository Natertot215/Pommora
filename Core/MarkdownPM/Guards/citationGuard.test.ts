import { describe, expect, it } from 'vitest'
import { type ChangeSpec, EditorState, type Extension } from '@codemirror/state'
import { citationGuard } from './citationGuard'
import { scanDoc } from '../Engine/docScan'
import { deleteMarkerChanges } from '../Citations/citationEdits'
import { citationOrder } from '../Citations/citationActions'
import { typeKeys } from '../../Testing/markdownEngine'

const DOC = '# Notes\nbody[^a] here\n\n[^a]: the citation\n[^b]: another'

function type(doc: string, at: number, text: string, guarded = true, to = at): string {
  const state = EditorState.create({
    doc,
    extensions: guarded ? ([citationGuard] as Extension) : [],
  })
  return state.update({ changes: { from: at, to, insert: text } }).state.doc.toString()
}

const sectionOf = (doc: string): number => scanDoc(doc).citations.entries.length

describe('the tail guard keeps the section the document’s tail', () => {
  it('a paste below the section lands in the body instead of stranding after it', () => {
    expect(sectionOf(type(DOC, DOC.length, '\n\npasted prose', false))).toBe(0)
    expect(type(DOC, DOC.length, '\n\npasted prose')).toBe(
      '# Notes\nbody[^a] here\npasted prose\n\n[^a]: the citation\n[^b]: another',
    )
  })

  it('a list marker typed at the end of the section is relocated rather than breaking it', () => {
    expect(sectionOf(type(DOC, DOC.length, '\n- item', false))).toBe(0)
    const out = type(DOC, DOC.length, '\n- item')
    expect(sectionOf(out)).toBe(2)
    expect(out).toContain('- item')
  })

  it('a heading typed at the end of the section is relocated too', () => {
    expect(sectionOf(type(DOC, DOC.length, '\n## Sources'))).toBe(2)
  })

  it('an ordinary continuation is left exactly alone', () => {
    const out = type(DOC, DOC.length, '\nand more of it')
    expect(out).toBe(`${DOC}\nand more of it`)
    expect(sectionOf(out)).toBe(2)
  })

  it('a trailing blank line is left alone — it never breaks the run', () => {
    expect(type(DOC, DOC.length, '\n\n')).toBe(`${DOC}\n\n`)
  })

  it('typing inside a citation’s text is untouched', () => {
    const at = DOC.indexOf('the citation')
    expect(type(DOC, at, 'X')).toBe(`${DOC.slice(0, at)}X${DOC.slice(at)}`)
  })

  it('an edit entirely in the body is untouched', () => {
    const at = DOC.indexOf('body')
    expect(type(DOC, at, 'X')).toBe(`${DOC.slice(0, at)}X${DOC.slice(at)}`)
  })

  it('deleting the whole section is allowed — the guard stops stranding, not removing', () => {
    const at = DOC.indexOf('[^a]:')
    expect(type(DOC, at, '', true, DOC.length)).toBe(DOC.slice(0, at))
  })
})

describe('an insertion at a citation head’s first offset is clamped past it', () => {
  it('the keystroke lands in the citation’s text, not ahead of its label', () => {
    const at = DOC.indexOf('[^a]:')
    expect(sectionOf(type(DOC, at, 'X', false))).toBe(1)
    const out = type(DOC, at, 'X')
    expect(out).toContain('[^a]: Xthe citation')
    expect(sectionOf(out)).toBe(2)
  })

  it('every citation in the section carries the same clamp, not just the first', () => {
    const at = DOC.indexOf('[^b]:')
    expect(type(DOC, at, 'X')).toContain('[^b]: Xanother')
  })
})

// A paste is the same shape as the head-start repair's keystroke, so the repair has to answer for what it relocates: text carrying a blank line ends the run and literalizes every citation in the section.
describe('the head-start repair answers for what it moves, not only where', () => {
  const PASTE = 'New paragraph one.\n\nNew paragraph two.'

  it('a multi-paragraph paste at a citation head goes to the body, not into the citation', () => {
    expect(sectionOf(type(DOC, DOC.indexOf('[^b]:'), PASTE, false))).toBe(0)
    const out = type(DOC, DOC.indexOf('[^b]:'), PASTE)
    expect(sectionOf(out)).toBe(2)
    expect(out).toContain('New paragraph one.')
    expect(out).toContain('New paragraph two.')
    expect(out.trimEnd().endsWith('[^b]: another')).toBe(true)
  })

  it('a paste with no blank line still lands in the citation it was aimed at', () => {
    const out = type(DOC, DOC.indexOf('[^b]:'), 'one line only ')
    expect(out).toContain('[^b]: one line only another')
    expect(sectionOf(out)).toBe(2)
  })
})

// The guard sits between every dispatch and the document, the renormalization included — the one pairing where a repair meant for stray prose could land on the feature's own writes.
describe('the guard passes a renormalization through untouched', () => {
  const through = (doc: string, changes: ChangeSpec[]): string =>
    EditorState.create({ doc, extensions: [citationGuard, citationOrder] })
      .update({ changes })
      .state.doc.toString()

  it('a reorder of every row lands exactly as composed', () => {
    const doc = 'a[^1] b[^2]\n\n[^1]: one\n[^2]: two'
    expect(through(doc, [{ from: 0, to: 0, insert: 'z[^2] ' }])).toBe(
      'z[^1] a[^2] b[^1]\n\n[^1]: two\n[^2]: one',
    )
  })

  it('a deletion and the renumber that follows it land as one change', () => {
    const doc = 'x[^1] y[^2]\n\n[^1]: one\n[^2]: two'
    const s = scanDoc(doc)
    expect(through(doc, deleteMarkerChanges(s, s.citations.markers[0]))).toBe(
      'x y[^1]\n\n[^1]: two',
    )
  })

  it('a fresh pair appended to the section survives the head-seat repair', () => {
    const doc = 'x[^1] y\n\n[^1]: one'
    expect(
      through(doc, [
        { from: 7, to: 7, insert: '[^2]' },
        { from: doc.length, to: doc.length, insert: '\n[^2]: two' },
      ]),
    ).toBe('x[^1] y[^2]\n\n[^1]: one\n[^2]: two')
  })
})

// The relocate arm MOVES text: the swept range has to go where it stood, or the replacement half is silently dropped.
describe('a replacement that cannot survive is moved whole, not half', () => {
  const replace = (doc: string, from: number, to: number, text: string): string =>
    EditorState.create({ doc, extensions: [citationGuard] as Extension })
      .update({ changes: { from, to, insert: text } })
      .state.doc.toString()

  it('a multi-paragraph paste over a citation\u2019s text removes what it replaced', () => {
    const at = DOC.indexOf('another')
    const out = replace(DOC, at, at + 'another'.length, 'para one\n\npara two')
    expect(out).not.toContain('another')
    expect(out).toContain('para one')
    expect(sectionOf(out)).toBe(2)
  })

  it('typing over a citation\u2019s text removes it and relocates the character', () => {
    const at = DOC.indexOf('the citation')
    const out = replace(DOC, at, at + 'the citation'.length, '- x')
    expect(out).not.toContain('the citation')
    expect(out).toContain('- x')
    expect(sectionOf(out)).toBe(2)
  })

  it('a sweep that began in the body goes through as the plain replacement it is', () => {
    const from = DOC.indexOf('body')
    const to = DOC.indexOf('the citation')
    const out = replace(DOC, from, to, 'Z')
    expect(out).toBe(`${DOC.slice(0, from)}Z${DOC.slice(to)}`)
  })
})

// A file authored elsewhere puts its citations under the last line of prose, and text relocated to the start of that line lands above the paragraph it was written below.
describe('the relocated text lands at the end of the body with no blank line above the section', () => {
  const TIGHT = '# Notes\nbody[^a] here\n[^a]: the citation'

  it('a heading typed below the section lands under the body, not above it', () => {
    const out = type(TIGHT, TIGHT.length, '\n## Sources')
    expect(sectionOf(out)).toBe(1)
    expect(out).toBe('# Notes\nbody[^a] here\n## Sources\n[^a]: the citation')
  })

  it('a paste below the section lands under the body too', () => {
    const out = type(TIGHT, TIGHT.length, '\n\n- item')
    expect(sectionOf(out)).toBe(1)
    expect(out.startsWith('# Notes\nbody[^a] here\n- item')).toBe(true)
  })

  it('and the blank-anchored document still keeps its blank', () => {
    expect(type(DOC, DOC.length, '\n## Sources')).toBe(
      DOC.replace('\n\n[^a]:', '\n## Sources\n\n[^a]:'),
    )
  })
})

describe('whitespace alone is refused rather than rescued', () => {
  const listStart = `${DOC}\n-`

  it('the space that turns a dash into a list marker leaves the body untouched', () => {
    const out = type(listStart, listStart.length, ' ')
    expect(out).toBe(listStart)
    expect(out.split('\n').some((l) => l !== '' && l.trim() === '')).toBe(false)
  })

  it('and a whitespace-only paste below the section needs no repair', () => {
    expect(type(DOC, DOC.length, '\n   \n  ')).toBe(`${DOC}\n   \n  `)
  })

  it('while text that breaks the run still lands in the body', () => {
    const out = type(listStart, listStart.length, ' item')
    expect(out).toContain('item')
    expect(sectionOf(out)).toBe(2)
  })
})

describe('a change from the body never joins the section onto its line', () => {
  const GAP = 'body\n\n[^a]: first'
  const TWO = 'body[^a] and[^b]\n\n[^a]: first\n[^b]: second'

  it('typing over the blank line keeps the text and gives the section its line back', () => {
    expect(sectionOf(type(GAP, 5, 'x', false, 6))).toBe(0)
    const out = type(GAP, 5, 'x', true, 6)
    expect(out).toBe('body\nx\n[^a]: first')
    expect(sectionOf(out)).toBe(1)
  })

  it('typing over the body line\u2019s end and the blank line keeps both lines apart', () => {
    const out = type(GAP, 4, 'x', true, 6)
    expect(out).toBe('bodyx\n[^a]: first')
    expect(sectionOf(out)).toBe(1)
  })

  it('deleting the body line\u2019s end and the blank line leaves one newline standing', () => {
    const out = type(GAP, 4, '', true, 6)
    expect(out).toBe('body\n[^a]: first')
    expect(sectionOf(out)).toBe(1)
  })

  it('a sweep that removes the first head ending at the next one keeps that one on its own line', () => {
    const to = TWO.indexOf('[^b]: second')
    const out = type(TWO, 4, 'Z', true, to)
    expect(out).toBe('bodyZ\n[^b]: second')
    expect(sectionOf(out)).toBe(1)
  })
})

describe('the caret follows the text a repair moves', () => {
  const keys = (doc: string, anchor: number, head: number, text: string): string =>
    typeKeys(
      EditorState.create({ doc, selection: { anchor, head }, extensions: citationGuard }),
      text,
    )

  it('typing on a blank line below the section keeps one body line', () => {
    const below = `${DOC}\n\n`
    expect(keys(below, below.length, below.length, 'ab cd')).toBe(
      '# Notes\nbody[^a] here\nab cd\n\n[^a]: the citation\n[^b]: another\n\n',
    )
  })

  it('typing over the blank line above the section keeps every character', () => {
    expect(keys('body\n\n[^a]: first', 5, 6, 'xy')).toBe('body\nxy\n[^a]: first')
  })
})
