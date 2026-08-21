import { describe, expect, it } from 'vitest'
import { EditorState, type Extension } from '@codemirror/state'
import { citationGuard, citationTailVerdict } from './citationGuard'
import { citationScan, splitWithOffsets } from '../detect'
import { docScan } from './docCache'

const DOC = '# Notes\nbody[^a] here\n\n[^a]: the citation\n[^b]: another'

const scanOf = (doc: string): Parameters<typeof citationTailVerdict>[4] => {
  const d = splitWithOffsets(doc)
  return { lines: d.lines, lineStarts: d.lineStarts, citations: citationScan(d, []) }
}

/** Drive a document through a real state — with the guard, or pointedly without it. */
function type(doc: string, at: number, text: string, guarded = true, to = at): string {
  const state = EditorState.create({
    doc,
    extensions: guarded ? ([citationGuard] as Extension) : [],
  })
  return state.update({ changes: { from: at, to, insert: text } }).state.doc.toString()
}

const sectionOf = (doc: string): number => citationScan(splitWithOffsets(doc), []).entries.length

describe('the tail guard keeps the section the document’s tail', () => {
  it('a paste below the section lands in the body instead of stranding after it', () => {
    const out = type(DOC, DOC.length, '\n\npasted prose')
    expect(sectionOf(out)).toBe(2)
    expect(out).toContain('pasted prose')
    expect(out.trimEnd().endsWith('[^b]: another')).toBe(true)
  })

  // The negative control's other half: unguarded, the same change ends the trailing run, and every
  // citation in the section goes back to being literal text.
  it('and without the guard the same paste literalizes the whole section', () => {
    const out = type(DOC, DOC.length, '\n\npasted prose', false)
    expect(sectionOf(out)).toBe(0)
  })

  it('a list marker typed at the end of the section is relocated rather than breaking it', () => {
    const out = type(DOC, DOC.length, '\n- item')
    expect(sectionOf(out)).toBe(2)
    expect(out).toContain('- item')
  })

  it('and without the guard it ends the run', () => {
    expect(sectionOf(type(DOC, DOC.length, '\n- item', false))).toBe(0)
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
    expect(type(DOC, at, 'X')).toBe(DOC.slice(0, at) + 'X' + DOC.slice(at))
  })

  it('an edit entirely in the body is untouched', () => {
    const at = DOC.indexOf('body')
    expect(type(DOC, at, 'X')).toBe(DOC.slice(0, at) + 'X' + DOC.slice(at))
  })

  it('deleting the whole section is allowed — the guard stops stranding, not removing', () => {
    const at = DOC.indexOf('[^a]:')
    expect(type(DOC, at, '', true, DOC.length)).toBe(DOC.slice(0, at))
  })
})

describe('an insertion at a citation head’s first offset is clamped past it', () => {
  it('the keystroke lands in the citation’s text, not ahead of its label', () => {
    const at = DOC.indexOf('[^a]:')
    const out = type(DOC, at, 'X')
    expect(out).toContain('[^a]: Xthe citation')
    expect(sectionOf(out)).toBe(2)
  })

  // Unguarded, the keystroke lands ahead of `[^a]:`, which stops that line being a citation — the
  // run starts a line later and the citation it dropped goes literal.
  it('and without the clamp it writes ahead of the head and drops that citation from the run', () => {
    expect(sectionOf(type(DOC, DOC.indexOf('[^a]:'), 'X', false))).toBe(1)
  })

  it('every citation in the section carries the same clamp, not just the first', () => {
    const at = DOC.indexOf('[^b]:')
    expect(type(DOC, at, 'X')).toContain('[^b]: Xanother')
  })
})

describe('the verdict and the decoration pass agree on the boundary', () => {
  // Two derivations of "where does the section start" would eventually disagree; the guard reads
  // the same cached scan the decorations do. Driven through a sequence of edits, they stay equal.
  it('after every edit in a sequence, both read the same first line', () => {
    let doc = DOC
    for (const [at, text] of [
      [DOC.length, '\nmore'],
      [0, 'lead\n'],
      [5, 'X'],
    ] as const) {
      doc = type(doc, at, text)
      const state = EditorState.create({ doc })
      expect(docScan(state.doc).citations.firstLine).toBe(
        citationScan(splitWithOffsets(doc), []).firstLine,
      )
      expect(citationTailVerdict(doc, doc.length, doc.length, '', scanOf(doc)).kind).toBe('ok')
    }
  })
})

// The head-start repair moves a keystroke past the hidden `[^label]:`. A paste is the same shape —
// a zero-width insertion at a seated caret — so the repair has to answer for what it relocates, not
// just where. Text carrying a blank line ends the citation's continuation, which ends the trailing
// run, which literalizes every citation in the section.
describe('the head-start repair answers for what it moves, not only where', () => {
  const PASTE = 'New paragraph one.\n\nNew paragraph two.'

  it('a multi-paragraph paste at a citation head goes to the body, not into the citation', () => {
    const out = type(DOC, DOC.indexOf('[^b]:'), PASTE)
    expect(sectionOf(out)).toBe(2)
    expect(out).toContain('New paragraph one.')
    expect(out).toContain('New paragraph two.')
    expect(out.trimEnd().endsWith('[^b]: another')).toBe(true)
  })

  it('and without the guard the same paste literalizes the whole section', () => {
    expect(sectionOf(type(DOC, DOC.indexOf('[^b]:'), PASTE, false))).toBe(0)
  })

  it('a paste with no blank line still lands in the citation it was aimed at', () => {
    const out = type(DOC, DOC.indexOf('[^b]:'), 'one line only ')
    expect(out).toContain('[^b]: one line only another')
    expect(sectionOf(out)).toBe(2)
  })
})
