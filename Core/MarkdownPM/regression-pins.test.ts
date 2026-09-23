// Each case is a fixed break, kept here so it can't quietly return. Grouped by the seam it guards.
import { describe, it, expect } from 'vitest'
import { codeMask } from './Engine/markdownCode'
import { splitRow } from './Engine/Tables/codec'
import { tokenize } from './Engine/tokens'
import {
  autoPair,
  dashArrow,
  closeConstructOnEnter,
  continueListOnEnter,
  continueBlockquoteOnEnter,
  outdentListOnShiftTab,
} from './Input/edits'
import { setHeading, setList } from './Input/format'
import { subBlockAt, renumberSequencedRun } from './Engine/listDragModel'
import { calloutDeleteVerdict, type GuardVerdict } from './Guards/calloutGuard'
import { headingSections } from './Engine/headingScan'
import { headingSrc } from './Engine/headingScan'
import { fenceRangesOf } from './Engine/detect'
import { chunksOver, type DocScan, inCodeAt, scanDoc } from './Engine/docScan'

describe('codeMask — tilde fences + inline spans', () => {
  it('treats ~~~ fences as code', () => {
    const doc = '~~~\n# not a heading\n~~~'
    expect(codeMask(doc)(6)).toBe(true)
  })
  it('pairs fences by marker char (a ~~~ line inside ``` is content)', () => {
    const doc = '```\n~~~\ncode\n```\nprose'
    expect(codeMask(doc)(9)).toBe(true)
    expect(codeMask(doc)(18)).toBe(false)
  })
  it('counts inline spans — including unclosed ones being typed', () => {
    expect(codeMask('run `npm --x` now')(10)).toBe(true)
    expect(codeMask('run `npm install --')(16)).toBe(true)
    expect(codeMask('ab `c`')(2)).toBe(false)
  })
  it('treats the closing backtick as a boundary so type-over still works', () => {
    expect(codeMask('`code`')(5)).toBe(false)
  })
})

describe('splitRow — escaped trailing pipe is a cell, not a row end', () => {
  it('keeps the last cell when the row ends in \\|', () => {
    const { cells } = splitRow('a | b\\|', 0)
    expect(cells.map((c) => c.text)).toEqual(['a', 'b\\|'])
  })
})

describe('tokenize — connections/links inside inline code are literal', () => {
  it('drops wikilinks and links overlapping a code span', () => {
    const kinds = tokenize('`see [[Page]] and [x](https://e.com)`').map((t) => t.kind)
    expect(kinds).toContain('inlineCode')
    expect(kinds).not.toContain('wikiLink')
    expect(kinds).not.toContain('link')
  })
})

describe('autoPair — doubled-marker branch', () => {
  it('does not stack when completing an existing bold', () => {
    expect(autoPair(scanDoc('**word*'), 7, 7, '*')).toBeNull()
  })
  it('does not pair a doubled marker glued to a word', () => {
    expect(autoPair(scanDoc('snake_'), 6, 6, '_')).toBeNull()
  })
  it('still promotes a fresh pair to the doubled form', () => {
    expect(autoPair(scanDoc('**'), 1, 1, '*')).toEqual({
      from: 1,
      to: 1,
      insert: '**',
      selection: 2,
    })
  })
})

describe('autoPair — never closes hard against a word', () => {
  // The gate used to read only the character BEHIND the caret, so every opener closed into the text ahead of it: `|word` + `(` produced `(|)word`.
  const OPENERS = ['(', '[', '`', '"', "'", '*', '_']
  it('stays literal with a word immediately after the caret', () => {
    for (const ch of OPENERS) {
      expect(autoPair(scanDoc('word'), 0, 0, ch)).toBeNull()
      expect(autoPair(scanDoc('a word'), 2, 2, ch)).toBeNull()
      expect(autoPair(scanDoc('word'), 2, 2, ch)).toBeNull()
    }
  })
  it('still pairs where nothing follows the caret', () => {
    for (const ch of OPENERS) expect(autoPair(scanDoc('word '), 5, 5, ch)).not.toBeNull()
  })
  it('a closer ahead of the caret still type-overs', () => {
    expect(autoPair(scanDoc("'hello'"), 6, 6, "'")).toEqual({
      from: 6,
      to: 6,
      insert: '',
      selection: 7,
    })
    expect(autoPair(scanDoc('[]'), 1, 1, '[')).toEqual({
      from: 1,
      to: 1,
      insert: '[]',
      selection: 2,
    })
  })
  it('`_` is itself a word char, so its own closer has to be exempt from the guard', () => {
    // The naive forward guard swallowed both underscore paths: `_word|_` lost its type-over and the doubled form could never promote.
    expect(autoPair(scanDoc('_word_'), 5, 5, '_')).toEqual({
      from: 5,
      to: 5,
      insert: '',
      selection: 6,
    })
    expect(autoPair(scanDoc('__'), 1, 1, '_')).toEqual({
      from: 1,
      to: 1,
      insert: '__',
      selection: 2,
    })
  })
})

describe('dashArrow — content guards', () => {
  it('keeps -- literal inside URLs', () => {
    const doc = 'see https://ex--'
    expect(dashArrow(scanDoc(doc), doc.length, doc.length, 'a')).toBeNull()
  })
  it('keeps -- literal inside [[titles]] (em-dash would retarget the connection)', () => {
    const doc = '[[pages 5--'
    expect(dashArrow(scanDoc(doc), doc.length, doc.length, '7')).toBeNull()
  })
  it('keeps -- literal inside inline code', () => {
    const doc = 'run `npm install --'
    expect(dashArrow(scanDoc(doc), doc.length, doc.length, 's')).toBeNull()
  })
  it('still converts in plain prose', () => {
    expect(dashArrow(scanDoc('word--'), 6, 6, 'x')).not.toBeNull()
  })
})

describe("closeConstructOnEnter — contractions don't poison quote parity", () => {
  it('does not teleport the caret past a prose apostrophe', () => {
    const doc = "it's fine, don't"
    expect(closeConstructOnEnter(scanDoc(doc), 14, 14)).toBeNull()
  })
  it('still closes a real open quote', () => {
    const doc = "'hello'"
    expect(closeConstructOnEnter(scanDoc(doc), 6, 6)).not.toBeNull()
  })
})

describe('continueListOnEnter — nested runs + empty-item continuation', () => {
  it('renumbers past a nested sublist instead of duplicating numbers', () => {
    const doc = '1. a\n\t1. child\n2. b'
    const edit = continueListOnEnter(doc, 4, 4)
    expect(edit).not.toBeNull()
    const next = doc.slice(0, edit!.from) + edit!.insert + doc.slice(edit!.to)
    expect(next).toBe('1. a\n2. \n\t1. child\n3. b')
  })
  it('continues on an empty item instead of exiting (no auto-exit)', () => {
    const edit = continueListOnEnter('- ', 2, 2)
    expect(edit).toEqual({ from: 2, to: 2, insert: '\n- ', selection: 5 })
  })
  it('continues an empty item inside a quote, keeping the `> `', () => {
    const doc = '> - '
    const edit = continueListOnEnter(doc, 4, 4)
    expect(edit).toEqual({ from: 4, to: 4, insert: '\n> - ', selection: 9 })
  })
})

describe('continueBlockquoteOnEnter — empty quote line exits', () => {
  it('strips an empty `> ` line instead of continuing forever', () => {
    const edit = continueBlockquoteOnEnter(scanDoc('> '), 2, 2)
    expect(edit).toEqual({ from: 0, to: 2, insert: '', selection: 0 })
  })
  it('keeps continuing inside a callout (its exit is caret placement)', () => {
    const doc = '> [!callout] head\n> '
    const edit = continueBlockquoteOnEnter(scanDoc(doc), 20, 20)
    expect(edit?.insert).toBe('\n> ')
  })
})

describe('outdentListOnShiftTab', () => {
  it('removes one indent level', () => {
    expect(outdentListOnShiftTab('\t- item', 4, 4)).toEqual({
      from: 0,
      to: 1,
      insert: '',
      selection: 3,
    })
  })
  it('no-ops at top level', () => {
    expect(outdentListOnShiftTab('- item', 3, 3)).toBeNull()
  })
})

describe('format transforms — prefix-aware', () => {
  it('setHeading on a quoted list line stays inside the quote', () => {
    const doc = '> - item'
    const { changes } = setHeading(doc, 5, 5, 2)
    expect(changes).toEqual([{ from: 2, to: 8, insert: '## item' }])
  })
  it('setHeading on a callout head edits after the tag — never exposes it', () => {
    const doc = '> [!callout] Title'
    const { changes } = setHeading(doc, 15, 15, 1)
    expect(changes[0].from).toBe(13)
    expect(changes[0].insert).toBe('# Title')
  })
  it('setList on a quoted line lands the marker inside the quote', () => {
    const doc = '> item'
    const { changes } = setList(doc, 4, 4, 'bullet')
    expect(changes).toEqual([{ from: 2, to: 6, insert: '- item' }])
  })
})

describe('subBlockAt — continuation lines ride with their item', () => {
  it("includes a wrapped item's indented body", () => {
    const doc = '- item one\n  continued text\n- item two'
    expect(subBlockAt(scanDoc(doc), 2)).toEqual({ from: 0, to: 27, level: 0 })
  })
})

describe('renumberSequencedRun — nested lines are skipped, not terminators', () => {
  it('renumbers a run past its sublists', () => {
    const doc = '1. a\n\t1. x\n2. b\n2. c'
    const changes = renumberSequencedRun(doc, 0)
    expect(changes).toEqual([{ from: 16, to: 17, insert: '3' }])
  })
})

describe('calloutDeleteVerdict — repair, not cancel', () => {
  const doc = '> [!callout] head\n> body'
  const verdict = (from: number, to: number): GuardVerdict => {
    const s = scanDoc(doc)
    return calloutDeleteVerdict(doc, from, to, { lines: s.lines, info: s.callouts })
  }
  it('allows a whole-line removal (line + newline)', () => {
    expect(verdict(18, 25).kind).toBe('ok')
  })
  it('clamps an in-line delete-to-line-start to the prefix end', () => {
    expect(verdict(18, 22)).toEqual({ kind: 'clamp', from: 20 })
  })
  it('extends a forward join to consume the body prefix', () => {
    expect(verdict(17, 18)).toEqual({ kind: 'extend', to: 20 })
  })
  it('still cancels pure prefix erosion (a delete confined inside the prefix)', () => {
    expect(verdict(18, 19).kind).toBe('cancel')
  })
  it('neutralizes a whole-prefix in-place delete to a zero-width clamp', () => {
    expect(verdict(19, 20)).toEqual({ kind: 'clamp', from: 20 })
  })
})

describe('renderer fence engine agrees with codeMask on ~~~ (no cross-layer split)', () => {
  it('fencedCodeRanges recognizes a ~~~ block', () => {
    const doc = '~~~\n[[LivePage]]\n~~~'
    const ranges = fenceRangesOf(scanDoc(doc).fences)
    expect(ranges.length).toBe(1)
    expect(ranges[0][0]).toBeLessThanOrEqual(4)
    expect(ranges[0][1]).toBeGreaterThanOrEqual(15)
  })
  it('pairs by marker char — a ~~~ line inside ``` is content, not a close', () => {
    const doc = '```\n~~~\ncode\n```\nprose'
    const ranges = fenceRangesOf(scanDoc(doc).fences)
    expect(ranges.length).toBe(1)
    expect(codeMask(doc)(9)).toBe(true)
  })
})

describe('a longer fence holds shorter ones — both layers, one block', () => {
  const doc = '`````\nintro\n```js\nsee [[LivePage]]\n```\noutro\n`````\nprose [[LivePage]]'
  it('the whole span is one block, not three carved around the inner fences', () => {
    const ranges = fenceRangesOf(scanDoc(doc).fences)
    expect(ranges.length).toBe(1)
    expect(ranges[0][0]).toBe(0)
    expect(ranges[0][1]).toBe(doc.indexOf('\nprose'))
  })
  it('a rename can never reach a connection inside the inner block', () => {
    // The one that corrupts a file rather than a render: an under-masked line gets its [[Title]] rewritten.
    expect(codeMask(doc)(doc.indexOf('[[LivePage]]'))).toBe(true)
    expect(codeMask(doc)(doc.lastIndexOf('[[LivePage]]'))).toBe(false)
  })
})

describe('dashArrow — link-target guard (relative paths, anchors)', () => {
  it('keeps -- literal inside a relative link target', () => {
    const doc = '[text](../foo--'
    expect(dashArrow(scanDoc(doc), doc.length, doc.length, 'x')).toBeNull()
  })
  it('still converts once the link target is closed', () => {
    const doc = '[text](../foo) then a--'
    expect(dashArrow(scanDoc(doc), doc.length, doc.length, 'x')).not.toBeNull()
  })
})

describe('headingSections — fence-blind no more', () => {
  it('ignores # lines inside code fences', () => {
    const doc = '## Real\nprose\n```bash\n# comment\necho hi\n```\ntail'
    const sections = headingSections(headingSrc(doc))
    expect(sections).toHaveLength(1)
    expect(sections[0].key).toBe('Real')
    expect(sections[0].to).toBe(doc.length)
  })
})

describe('a token chunk opens where the parser holds no state', () => {
  const lines = [
    'Intro **bold** `code` [[Link]]',
    '```ts',
    'const a = "**x** `y` [[Z]]"',
    '```',
    '',
    'Middle **bold** `code` [[Link]]',
    '`````md',
    '```',
    'nested **fence** body',
    '```',
    '`````',
    '',
    '- top **bold** item',
    '    - nested **bold** one',
    '        - deeper **bold** two',
    '',
    'Tail **bold** `code` [[Link]]',
  ]
  const doc = lines.join('\n')
  const scan = scanDoc(doc)
  const cuts = (s: DocScan): number[] =>
    chunksOver(s, [[0, s.lines.length - 1]]).map(([a]) => s.lineStarts.indexOf(a))

  it('never cuts inside a fence or an indented run', () => {
    expect(cuts(scan)).toEqual([0, 5, 12, 16])
  })

  it('a fence nothing closes holds nothing', () => {
    const open = scanDoc('intro **bold**\n```js\ncode **not bold**\n\nmore')
    expect(cuts(open)).toEqual([0, 4])
  })

  it('every cut yields the whole-document tokens', () => {
    const key = (t: { kind: string; range: [number, number] }, off = 0) =>
      `${t.kind}@${t.range[0] + off}`
    const truth = tokenize(doc, scan).map((t) => key(t))
    for (const start of cuts(scan)) {
      const a = scan.lineStarts[start]
      const tail = doc.slice(a)
      const seen = tokenize(tail).map((t) => key(t, a))
      expect(seen).toEqual(truth.filter((k) => Number(k.split('@')[1]) >= a))
    }
  })
})

describe('inCodeAt answers exactly what codeMask answers, at every offset', () => {
  // Every construct the two disagree about if the single-offset form stops being line-local: nested runs, tilde blocks, quoted fences, an unclosed opener, and a span left open at EOF.
  const doc = [
    'plain **bold** and `code` here',
    '`````md',
    '```js',
    'const a = `inner`',
    '```',
    '`````',
    '',
    '> ```',
    '> quoted code',
    '> ```',
    '~~~',
    'tilde body with `span`',
    '~~~',
    'tail `closed` and `unclosed',
  ].join('\n')

  const agrees = (text: string): number[] => {
    const s = scanDoc(text)
    const mask = codeMask(text)
    const disagreements: number[] = []
    for (let o = -1; o <= text.length + 1; o++)
      if (inCodeAt(s, o) !== mask(o)) disagreements.push(o)
    return disagreements
  }

  it('agrees offset for offset', () => {
    expect(agrees(doc)).toEqual([])
  })

  it('agrees on a CRLF body too', () => {
    expect(agrees(doc.split('\n').join('\r\n'))).toEqual([])
  })
})
