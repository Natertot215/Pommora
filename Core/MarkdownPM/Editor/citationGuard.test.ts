import { describe, expect, it } from 'vitest'
import { EditorState, type Extension } from '@codemirror/state'
import { citationGuard, citationTailVerdict } from './citationGuard'
import { citationScan, splitWithOffsets } from '../Detect'
import { citationGesture, deleteMarkerChanges } from './citationEdits'
import { docScan } from './docCache'

const DOC = '# Notes\nbody[^a] here\n\n[^a]: the citation\n[^b]: another'

const scanOf = (doc: string): Parameters<typeof citationTailVerdict>[4] => {
  const d = splitWithOffsets(doc)
  return { ...d, citations: citationScan(d, []) }
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

// The guard sits between every dispatch and the document, the renormalization included. A rewrite
// that reorders the whole section reaches the tail by definition, so this is the one pairing where a
// repair meant for stray prose could land on the feature's own writes.
describe('the guard passes a renormalization through untouched', () => {
  const through = (doc: string, changes: ReturnType<typeof citationGesture>): string =>
    EditorState.create({ doc, extensions: [citationGuard] as Extension })
      .update({ changes })
      .state.doc.toString()

  it('a reorder of every row lands exactly as composed', () => {
    const doc = 'a[^2] b[^1]\n\n[^1]: one\n[^2]: two'
    expect(through(doc, citationGesture(scanOf(doc), []))).toBe(
      'a[^1] b[^2]\n\n[^1]: two\n[^2]: one',
    )
  })

  it('a deletion and the renumber that follows it land as one change', () => {
    const doc = 'x[^1] y[^2]\n\n[^1]: one\n[^2]: two'
    const s = scanOf(doc)
    expect(through(doc, citationGesture(s, deleteMarkerChanges(s, s.citations.markers[0])))).toBe(
      'x y[^1]\n\n[^1]: two',
    )
  })

  it('a fresh pair appended to the section survives the head-seat repair', () => {
    const doc = 'x[^1] y\n\n[^1]: one'
    const s = scanOf(doc)
    expect(
      through(
        doc,
        citationGesture(s, [
          { from: 7, to: 7, insert: '[^2]' },
          { from: doc.length, to: doc.length, insert: '\n[^2]: two' },
        ]),
      ),
    ).toBe('x[^1] y[^2]\n\n[^1]: one\n[^2]: two')
  })
})

// The relocate arm MOVES text: the swept range has to go where it stood, or the replacement half of
// the edit is silently dropped and the reader's selection survives an edit that replaced it.
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

  it('and a pure insertion still relocates without deleting anything', () => {
    const out = type(DOC, DOC.length, '\n\npasted prose')
    expect(out).toContain('pasted prose')
    expect(sectionOf(out)).toBe(2)
    expect(out).toContain('the citation')
  })
})

// A file authored anywhere else puts its citations straight under the last line of prose. That line
// IS the body's end, and text relocated to the start of it lands above the paragraph it was written
// below — at the top of the document, where the section starts on line 1.
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

// Starting a list at the foot of the section is a keystroke the run cannot hold. What it must not do
// is manufacture a line in the body out of the whitespace that broke it.
describe('whitespace alone is refused rather than rescued', () => {
  const listStart = `${DOC}\n-`

  it('the space that turns a dash into a list marker leaves the body untouched', () => {
    const out = type(listStart, listStart.length, ' ')
    expect(out).toBe(listStart)
    expect(out.split('\n').some((l) => l !== '' && l.trim() === '')).toBe(false)
  })

  // Blank lines never end the run, so a whitespace-only paste below the section reaches no repair at
  // all — it is trailing blanks, which the section already owns.
  it('and a whitespace-only paste below the section needs no repair', () => {
    const out = type(DOC, DOC.length, '\n   \n  ')
    expect(out.startsWith(DOC)).toBe(true)
    expect(sectionOf(out)).toBe(2)
  })

  // The control: text that breaks the run still reaches the body, which is the whole rule.
  it('while text that breaks the run still lands in the body', () => {
    const out = type(listStart, listStart.length, ' item')
    expect(out).toContain('item')
    expect(sectionOf(out)).toBe(2)
  })
})
