import { describe, it, expect } from 'vitest'
import { scanDoc } from '../Engine/docScan'
import {
  continueListOnEnter,
  smartBackspace,
  canonicalizeCheckbox,
  autoPair,
  autoDelete,
  closeConstructOnEnter,
  closeBlockOnEnter,
  closeConstructOnShiftEnter,
  dashArrow,
  ellipsis,
  equations,
  bullet,
  sectionSign,
  indentListOnTab,
  continueBlockquoteOnEnter,
  calloutShorthand,
  shiftEnterEdit,
  lineStartAt,
  wrapSelection,
  type Edit,
} from './edits'

const apply = (doc: string, e: Edit): string => doc.slice(0, e.from) + e.insert + doc.slice(e.to)

describe('list continuation (Enter)', () => {
  it('continues a bullet, preserving indent', () => {
    const doc = '  - item'
    const e = continueListOnEnter(doc, doc.length, doc.length)!
    expect(apply(doc, e)).toBe('  - item\n  - ')
  })
  it('increments an ordered marker', () => {
    const doc = '1. a'
    const e = continueListOnEnter(doc, doc.length, doc.length)!
    expect(apply(doc, e)).toBe('1. a\n2. ')
  })
  it('advances an alphabetical marker and restarts at A past Z', () => {
    const doc = 'Y. a\nZ. b'
    const e = continueListOnEnter(doc, 4, 4)!
    expect(apply(doc, e)).toBe('Y. a\nZ. \nA. b')
  })
  it('leaves a numbered sibling out of an alphabetical renumber', () => {
    const doc = 'A. a\n1. b'
    const e = continueListOnEnter(doc, 4, 4)!
    expect(apply(doc, e)).toBe('A. a\nB. \n1. b')
  })
  it('renumbers the following siblings when inserting mid-list (1,2 → 1,2,3)', () => {
    const doc = '1. a\n2. b'
    const e = continueListOnEnter(doc, 4, 4)!
    expect(apply(doc, e)).toBe('1. a\n2. \n3. b')
    expect(e.selection).toBe(8)
  })
  it('renumbers a longer run (1,2,3 → insert at 1 → 1,2,3,4)', () => {
    const doc = '1. a\n2. b\n3. c'
    const e = continueListOnEnter(doc, 4, 4)!
    expect(apply(doc, e)).toBe('1. a\n2. \n3. b\n4. c')
  })
  it('continues a checkbox as a fresh unchecked box', () => {
    const doc = '- [x] done'
    const e = continueListOnEnter(doc, doc.length, doc.length)!
    expect(apply(doc, e)).toBe('- [x] done\n- [ ] ')
  })
  it('continues even on an empty item — no auto-exit (Enter always breeds a bullet)', () => {
    const doc = '- '
    const e = continueListOnEnter(doc, doc.length, doc.length)!
    expect(apply(doc, e)).toBe('- \n- ')
  })
  it('does not fire on a non-list line', () => {
    expect(continueListOnEnter('plain', 5, 5)).toBeNull()
  })
})

describe('smart backspace (whole marker, all markers)', () => {
  const atContentStart = (doc: string, marker: string): Edit | null => {
    const cs = doc.indexOf(marker) + marker.length
    return smartBackspace(scanDoc(doc), cs, cs)
  }
  it('deletes a checkbox marker, caret to line start', () => {
    const doc = '- [ ] task'
    const e = atContentStart(doc, '- [ ] ')!
    expect(apply(doc, e)).toBe('task')
    expect(e.selection).toBe(0)
  })
  it('deletes bullet / ordered / blockquote / heading markers', () => {
    expect(apply('- x', atContentStart('- x', '- ')!)).toBe('x')
    expect(apply('1. x', atContentStart('1. x', '1. ')!)).toBe('x')
    expect(apply('> x', atContentStart('> x', '> ')!)).toBe('x')
    expect(apply('## x', atContentStart('## x', '## ')!)).toBe('x')
  })
  it('only fires at content-start, not mid-content', () => {
    expect(smartBackspace(scanDoc('- abc'), 4, 4)).toBeNull()
  })
})

describe('checkbox canonicalization', () => {
  it('-[] + space → "- [ ] " with caret after', () => {
    const doc = '-[]'
    const e = canonicalizeCheckbox(doc, 3, 3, ' ')!
    expect(apply(doc, e)).toBe('- [ ] ')
    expect(e.selection).toBe(6)
  })
  it('-[x] + space → "- [x] "', () => {
    const doc = '-[x]'
    expect(apply(doc, canonicalizeCheckbox(doc, 4, 4, ' ')!)).toBe('- [x] ')
  })
  it('a fence line keeps its marker on backspace', () => {
    const doc = '```\n- [ ] \n```'
    expect(smartBackspace(scanDoc(doc), 10, 10)).toBeNull()
  })
})

describe('auto-pair + auto-delete', () => {
  it('** completes to **|** (caret between the pairs)', () => {
    const e = autoPair(scanDoc('*'), 1, 1, '*')!
    expect(apply('*', e)).toBe('****')
    expect(e.selection).toBe(2)
  })
  // Only the doubled form is a marker, so the first press must leave the character alone — a lone `~` or `=` is prose or arithmetic, and pairing it would put a closer in the middle of both.
  for (const ch of ['~', '=']) {
    it(`${ch} does nothing alone and completes to ${ch}${ch}|${ch}${ch} on the second`, () => {
      expect(autoPair(scanDoc(''), 0, 0, ch)).toBeNull()
      const e = autoPair(scanDoc(ch), 1, 1, ch)!
      expect(apply(ch, e)).toBe(ch.repeat(4))
      expect(e.selection).toBe(2)
    })
  }
  it('single [ pairs at line start, not after a word char', () => {
    expect(autoPair(scanDoc(''), 0, 0, '[')).not.toBeNull()
    expect(autoPair(scanDoc('-'), 1, 1, '[')).toBeNull()
  })
  it('backspace inside an empty pair deletes both halves', () => {
    const e = autoDelete(scanDoc('[]'), 1, 1)!
    expect(apply('[]', e)).toBe('')
  })
  it('{ pairs as a bracket, nests with the others, and deletes as a pair', () => {
    expect(apply('', autoPair(scanDoc(''), 0, 0, '{')!)).toBe('{}')
    expect(apply('[]', autoPair(scanDoc('[]'), 1, 1, '{')!)).toBe('[{}]')
    expect(apply('{}', autoPair(scanDoc('{}'), 1, 1, '(')!)).toBe('{()}')
    expect(apply('{}', autoDelete(scanDoc('{}'), 1, 1)!)).toBe('')
  })
  it('Brackets off leaves [[ unpaired too', () => {
    expect(autoPair(scanDoc('['), 1, 1, '[', { pairBrackets: false })).toBeNull()
  })
  it('[[ collapses the existing closer instead of stacking a stray ]', () => {
    const e = autoPair(scanDoc('[]'), 1, 1, '[')!
    expect(apply('[]', e)).toBe('[[]]')
    expect(e.selection).toBe(2)
  })
  it('(( collapses the existing closer', () => {
    const e = autoPair(scanDoc('()'), 1, 1, '(')!
    expect(apply('()', e)).toBe('(())')
    expect(e.selection).toBe(2)
  })
  it('quotes pair at line start / after whitespace', () => {
    expect(autoPair(scanDoc(''), 0, 0, '"')).not.toBeNull()
    expect(autoPair(scanDoc('say '), 4, 4, "'")).not.toBeNull()
  })
  it('a quote right after a word char stays literal (apostrophes / units)', () => {
    expect(autoPair(scanDoc('don'), 3, 3, "'")).toBeNull()
    expect(autoPair(scanDoc('5'), 1, 1, '"')).toBeNull()
  })
  it('typing a quote over its own closer steps past it (no stray)', () => {
    const e = autoPair(scanDoc("''"), 1, 1, "'")!
    expect(e.insert).toBe('')
    expect(e.selection).toBe(2)
  })
  it('backspace inside an empty quote pair deletes both halves', () => {
    expect(apply('""', autoDelete(scanDoc('""'), 1, 1)!)).toBe('')
    expect(apply("''", autoDelete(scanDoc("''"), 1, 1)!)).toBe('')
  })
  it('single emphasis * / _ / ` pair when not after a word char', () => {
    expect(apply('', autoPair(scanDoc(''), 0, 0, '*')!)).toBe('**')
    expect(autoPair(scanDoc('say '), 4, 4, '_')).not.toBeNull()
    expect(autoPair(scanDoc(''), 0, 0, '`')).not.toBeNull()
  })
  it('emphasis stays literal after a word char (2 * 3, snake_case)', () => {
    expect(autoPair(scanDoc('2 '), 2, 2, '*')).not.toBeNull()
    expect(autoPair(scanDoc('x'), 1, 1, '*')).toBeNull()
    expect(autoPair(scanDoc('foo'), 3, 3, '_')).toBeNull()
  })
  it('the second * still promotes the pair to bold (**|**)', () => {
    const e = autoPair(scanDoc('**'), 1, 1, '*')!
    expect(apply('**', e)).toBe('****')
    expect(e.selection).toBe(2)
  })
  it('backspace inside an empty emphasis pair deletes both halves', () => {
    expect(apply('**', autoDelete(scanDoc('**'), 1, 1)!)).toBe('')
    expect(apply('``', autoDelete(scanDoc('``'), 1, 1)!)).toBe('')
  })
  it('nothing pairs against a character on either side of the caret', () => {
    expect(autoPair(scanDoc('foo'), 3, 3, '(')).toBeNull()
    expect(autoPair(scanDoc('end.'), 4, 4, '"')).toBeNull()
    expect(autoPair(scanDoc(' .'), 1, 1, '(')).toBeNull()
    expect(autoPair(scanDoc(' word'), 1, 1, '[')).toBeNull()
  })
  it('a link target still pairs its parenthesis after the label', () => {
    expect(apply('[label]', autoPair(scanDoc('[label]'), 7, 7, '(')!)).toBe('[label]()')
  })
  it('pairs inside existing pair syntax', () => {
    expect(apply('()', autoPair(scanDoc('()'), 1, 1, '_')!)).toBe('(__)')
    expect(apply('****', autoPair(scanDoc('****'), 2, 2, '"')!)).toBe('**""**')
  })
  it('closing brackets step over their closer', () => {
    for (const ch of [')', ']', '}']) {
      const doc = `a${ch}`
      const e = autoPair(scanDoc(doc), 1, 1, ch)!
      expect(e.insert).toBe('')
      expect(e.selection).toBe(2)
    }
    expect(autoPair(scanDoc('a)'), 1, 1, ')', { pairBrackets: false })).toBeNull()
  })
  it('backspace inside a closer deletes one marker, not the pair it straddles', () => {
    for (const [doc, c] of [
      ['**bold**', 7],
      ['***word***', 8],
      ['***word***', 9],
      ['~~s~~', 4],
      ['==h==', 4],
      ['__b__', 4],
      ['"q""', 3],
      ["don''", 4],
    ] as const) {
      expect(autoDelete(scanDoc(doc), c, c)).toBeNull()
    }
  })
  it('backspace still deletes an empty symmetric pair one layer at a time', () => {
    expect(apply('******', autoDelete(scanDoc('******'), 3, 3)!)).toBe('****')
    expect(apply('a ** b', autoDelete(scanDoc('a ** b'), 3, 3)!)).toBe('a  b')
    expect(apply('f()', autoDelete(scanDoc('f()'), 2, 2)!)).toBe('f')
  })
  it('the last * of a bold-italic closer steps over instead of stacking', () => {
    const e = autoPair(scanDoc('***b***'), 6, 6, '*')!
    expect(e.insert).toBe('')
    expect(e.selection).toBe(7)
  })
  it('a doubled-only closer steps over from inside its content', () => {
    for (const ch of ['~', '=']) {
      const doc = `${ch}${ch}s${ch}${ch}`
      const e = autoPair(scanDoc(doc), 3, 3, ch)!
      expect(e.insert).toBe('')
      expect(e.selection).toBe(4)
    }
  })
  it('a marker typed before an existing opener never steps into it', () => {
    expect(autoPair(scanDoc('a **b**'), 2, 2, '*')?.insert).not.toBe('')
    expect(autoPair(scanDoc('a "b"'), 2, 2, '"')?.insert).not.toBe('')
    expect(autoPair(scanDoc('*a**b**'), 2, 2, '*')?.insert).not.toBe('')
  })
  it('Wrap Selections wraps a selection and keeps it selected, so a second marker doubles', () => {
    const on = { wrapSelections: true }
    const doc = 'a word b'
    for (const [ch, out] of [
      ['*', 'a *word* b'],
      ['"', 'a "word" b'],
      ['`', 'a `word` b'],
      ['(', 'a (word) b'],
      ['[', 'a [word] b'],
      ['{', 'a [word] b'],
    ] as const) {
      const e = wrapSelection(scanDoc(doc), 2, 6, ch, on)!
      expect(apply(doc, e)).toBe(out)
      expect([e.selection, e.head]).toEqual([3, 7])
    }
    const spaced = wrapSelection(scanDoc(doc), 1, 7, '"', on)!
    expect(apply(doc, spaced)).toBe('a "word" b')
    expect([spaced.selection, spaced.head]).toEqual([3, 7])
  })
  it('repeating a wrap over its own result cycles instead of compounding', () => {
    const on = { wrapSelections: true }
    const cycle = (ch: string, ...states: string[]) => {
      let doc = 'a word b'
      let sel = 2
      for (const want of states) {
        const e = wrapSelection(scanDoc(doc), sel, sel + 4, ch, on)!
        doc = apply(doc, e)
        sel = e.selection
        expect(doc).toBe(`a ${want} b`)
        expect(e.head).toBe(sel + 4)
      }
    }
    cycle('[', '[word]', '[[word]]', '{word}', '{{word}}', '[word]')
    cycle('{', '[word]', '[[word]]', '{word}')
    cycle('*', '*word*', '**word**', 'word', '*word*')
    cycle('~', '~word~', '~~word~~', 'word')
    cycle('=', '=word=', '==word==', 'word')
    cycle('_', '_word_', '__word__', 'word')
    cycle('`', '`word`', '``word``', 'word')
    cycle('"', '"word"', "'word'", 'word')
    cycle("'", '"word"', "'word'", 'word')
    cycle('(', '(word)', '((word))')
    expect(wrapSelection(scanDoc('x `*word*` y'), 4, 8, '*', on)).toBeNull()
    expect(apply("rock'n'roll", wrapSelection(scanDoc("rock'n'roll"), 5, 6, '"', on)!)).toBe(
      'rock\'"n"\'roll',
    )
    expect(apply('my__var__name', wrapSelection(scanDoc('my__var__name'), 4, 7, '_', on)!)).toBe(
      'my___var___name',
    )
  })
  it('Wrap Selections stays off by default, per group, in code, and for markers across lines', () => {
    expect(wrapSelection(scanDoc('a word'), 2, 6, '*')).toBeNull()
    expect(
      wrapSelection(scanDoc('a word'), 2, 6, '"', { wrapSelections: true, pairQuotes: false }),
    ).toBeNull()
    expect(wrapSelection(scanDoc('a word'), 2, 6, 'x', { wrapSelections: true })).toBeNull()
    expect(wrapSelection(scanDoc('`a word`'), 3, 7, '*', { wrapSelections: true })).toBeNull()
    expect(wrapSelection(scanDoc('one\ntwo'), 0, 7, '*', { wrapSelections: true })).toBeNull()
    expect(wrapSelection(scanDoc('one\ntwo'), 0, 7, '(', { wrapSelections: true })).not.toBeNull()
  })
  it('a closer steps over even after an earlier spaced marker on the line', () => {
    const e = autoPair(scanDoc('5 * 3 is *fif*'), 13, 13, '*')!
    expect(e.insert).toBe('')
    expect(e.selection).toBe(14)
  })
  it('typing the closing ** of bold steps over instead of stacking markers', () => {
    const e = autoPair(scanDoc('**bold**'), 7, 7, '*')!
    expect(e.insert).toBe('')
    expect(e.selection).toBe(8)
  })
  it('a closer still steps over itself after a word', () => {
    const e = autoPair(scanDoc('"word"'), 5, 5, '"')!
    expect(e.insert).toBe('')
    expect(e.selection).toBe(6)
  })
  it('each pair group follows its own setting', () => {
    expect(autoPair(scanDoc(''), 0, 0, '(', { pairBrackets: false })).toBeNull()
    expect(autoPair(scanDoc(''), 0, 0, '*', { pairMarkers: false })).toBeNull()
    expect(autoPair(scanDoc(''), 0, 0, '"', { pairQuotes: false })).toBeNull()
    expect(autoPair(scanDoc(''), 0, 0, '"', { pairBrackets: false })).not.toBeNull()
    expect(autoDelete(scanDoc('[]'), 1, 1, { deletePairsTogether: false })).toBeNull()
  })
})

describe('close construct on Enter', () => {
  it('jumps past a single empty closer', () => {
    const e = closeConstructOnEnter(scanDoc('[]'), 1, 1)!
    expect(e.selection).toBe(2)
    expect(e.insert).toBe('')
  })
  it('double-jumps an empty [[ | ]]', () => {
    expect(closeConstructOnEnter(scanDoc('[[]]'), 2, 2)!.selection).toBe(4)
  })
  it('closes a connection with content: [[word|]] → past ]]', () => {
    expect(closeConstructOnEnter(scanDoc('[[word]]'), 6, 6)!.selection).toBe(8)
  })
  it('closes a quote / emphasis with content (caret before the closer)', () => {
    expect(closeConstructOnEnter(scanDoc('"hi"'), 3, 3)!.selection).toBe(4)
    expect(closeConstructOnEnter(scanDoc('*hi*'), 3, 3)!.selection).toBe(4)
    expect(closeConstructOnEnter(scanDoc('**hi**'), 4, 4)!.selection).toBe(6)
    expect(closeConstructOnEnter(scanDoc('***hi***'), 5, 5)!.selection).toBe(8)
    expect(closeConstructOnEnter(scanDoc('"a""b"'), 2, 2)!.selection).toBe(3)
  })
  it('does nothing when the char ahead is not a matching closer', () => {
    expect(closeConstructOnEnter(scanDoc('hello)'), 5, 5)).toBeNull()
    expect(closeConstructOnEnter(scanDoc('plain'), 5, 5)).toBeNull()
  })
  it('does NOT close a new pair following an already-closed one (parity, not presence)', () => {
    expect(closeConstructOnEnter(scanDoc('**a****b**'), 5, 5)).toBeNull()
    expect(closeConstructOnEnter(scanDoc('"a""b"'), 3, 3)).toBeNull()
  })
})

describe('backticks pair once', () => {
  const typed = (keys: string): { doc: string; caret: number } => {
    let doc = ''
    let caret = 0
    for (const ch of keys) {
      const e = autoPair(scanDoc(doc), caret, caret, ch)
      if (e) {
        doc = apply(doc, e)
        caret = e.selection
      } else {
        doc = doc.slice(0, caret) + ch + doc.slice(caret)
        caret += 1
      }
    }
    return { doc, caret }
  }

  it('reads three backticks at a line start as exactly the fence being typed', () => {
    expect(typed('`')).toEqual({ doc: '``', caret: 1 })
    expect(typed('``')).toEqual({ doc: '``', caret: 2 })
    expect(typed('```')).toEqual({ doc: '```', caret: 3 })
    expect(typed('````')).toEqual({ doc: '````', caret: 4 })
  })
})

describe('close a block on Enter', () => {
  const enter = (doc: string, at = doc.length, typed = false, settings = {}): string | null => {
    const e = closeBlockOnEnter(scanDoc(doc), at, at, settings, typed)
    return e && `${apply(doc, e).slice(0, e.selection)}|${apply(doc, e).slice(e.selection)}`
  }

  it('closes a display-math block nothing closes', () => {
    expect(enter('$$')).toBe('$$\n|\n$$')
    expect(enter('  $$ ')).toBe('  $$ \n  |\n  $$')
  })

  it('closes a math block just typed above another, whose opener it took', () => {
    const doc = 'intro\n$$\n\ntext\n$$\nx^2\n$$'
    const at = doc.indexOf('$$') + 2
    expect(enter(doc, at, true)).toBe('intro\n$$\n|\n$$\n\ntext\n$$\nx^2\n$$')
    expect(enter(doc, at)).toBeNull()
  })

  it('leaves a balanced math block to plain Enter', () => {
    const doc = '$$\nx^2\n$$'
    expect(enter(doc, 2)).toBeNull()
    expect(enter(doc)).toBeNull()
    expect(enter('$$\nx\n$$\n\ntext\n$$', 7, true)).toBeNull()
  })

  it('closes a fence nothing closes, in the fence’s own prefix and length', () => {
    expect(enter('```')).toBe('```\n|\n```')
    expect(enter('```ts')).toBe('```ts\n|\n```')
    expect(enter('> ````')).toBe('> ````\n> |\n> ````')
  })

  it('closes a fence just typed above another, whether it took the closer or the opener', () => {
    const bare = '```\nprose\n\n```\ncode\n```'
    expect(enter(bare, 3, true)).toBe('```\n|\n```\nprose\n\n```\ncode\n```')
    const tagged = '```\nprose\n\n```js\ncode\n```'
    expect(enter(tagged, 3, true)).toBe('```\n|\n```\nprose\n\n```js\ncode\n```')
  })

  it('leaves an existing block’s opener to plain Enter, samples and all', () => {
    expect(enter('```js\ncode\n```', 5, true)).toBeNull()
    expect(enter('````md\n```js\nx\n```\n````', 6, true)).toBeNull()
  })

  it('leaves a finished block’s opener to plain Enter once the typing has moved on, whatever sits below', () => {
    expect(enter('```js\ncode\n```\n\n```', 5)).toBeNull()
  })

  it('stands down mid-line, inside a table, and with pairing off', () => {
    expect(enter('```ts', 4)).toBeNull()
    expect(enter('| a |\n| --- |\n$$')).toBeNull()
    expect(enter('```latex\n$$\n```\n\ntext\n$$', 11, true)).toBeNull()
    expect(enter('$$', 2, false, { pairMarkers: false })).toBeNull()
  })
})

describe('Shift+Enter closes the construct first, then breaks the line', () => {
  it('closes then newlines: "hi|" → "hi"\\n|', () => {
    const e = closeConstructOnShiftEnter(scanDoc('"hi"'), 3, 3)!
    expect(apply('"hi"', e)).toBe('"hi"\n')
  })
  it('connection: [[word|]] → [[word]]\\n|', () => {
    expect(apply('[[word]]', closeConstructOnShiftEnter(scanDoc('[[word]]'), 6, 6)!)).toBe(
      '[[word]]\n',
    )
  })
  it('is null outside any construct (falls back to a plain break)', () => {
    expect(closeConstructOnShiftEnter(scanDoc('plain'), 5, 5)).toBeNull()
  })
})

describe('dash + arrow auto-format', () => {
  it('-- then a letter → em-dash', () => {
    const doc = '--'
    const e = dashArrow(scanDoc(doc), 2, 2, 'a')!
    expect(apply('--', e)).toBe('—a')
  })
  it('preserves --- (HR)', () => {
    expect(dashArrow(scanDoc('--'), 2, 2, '-')).toBeNull()
  })
  it('-> → → and <- → ←', () => {
    expect(apply('-', dashArrow(scanDoc('-'), 1, 1, '>')!)).toBe('→')
    expect(apply('<', dashArrow(scanDoc('<'), 1, 1, '-')!)).toBe('←')
  })
  it('<-> → ↔ (two-step chain)', () => {
    const afterBackArrow = apply('<', dashArrow(scanDoc('<'), 1, 1, '-')!)
    expect(afterBackArrow).toBe('←')
    expect(apply(afterBackArrow, dashArrow(scanDoc(afterBackArrow), 1, 1, '>')!)).toBe('↔')
  })
  it('spaced " - " second space → en-dash', () => {
    const doc = 'a -'
    expect(apply(doc, dashArrow(scanDoc(doc), 3, 3, ' ')!)).toBe('a – ')
  })
  it('>> → » and << → «, leaving a nested blockquote opener alone', () => {
    expect(apply('a >', dashArrow(scanDoc('a >'), 3, 3, '>')!)).toBe('a »')
    expect(apply('a <', dashArrow(scanDoc('a <'), 3, 3, '<')!)).toBe('a «')
    expect(dashArrow(scanDoc('>'), 1, 1, '>')).toBeNull()
    expect(apply('> >', dashArrow(scanDoc('> >'), 3, 3, '>')!)).toBe('> »')
    expect(apply('"a >', dashArrow(scanDoc('"a >'), 4, 4, '>')!)).toBe('"a »')
    expect(dashArrow(scanDoc('a >'), 3, 3, '>', { transformArrows: false })).toBeNull()
  })
  it('an HTML comment keeps its dashes', () => {
    expect(dashArrow(scanDoc('<!--'), 4, 4, ' ')).toBeNull()
    expect(dashArrow(scanDoc('<!-- c --'), 9, 9, '>')).toBeNull()
  })
  it('dashes off leaves every dash literal', () => {
    const off = { transformDashes: false }
    expect(dashArrow(scanDoc('--'), 2, 2, 'a', off)).toBeNull()
    expect(dashArrow(scanDoc('a -'), 3, 3, ' ', off)).toBeNull()
  })
  it('arrows off leaves inline arrows literal but still opens an arrow list', () => {
    const off = { transformArrows: false }
    expect(dashArrow(scanDoc('a -'), 3, 3, '>', off)).toBeNull()
    expect(dashArrow(scanDoc('<'), 1, 1, '-', off)).toBeNull()
    expect(apply('\t-', dashArrow(scanDoc('\t-'), 2, 2, '>', off)!)).toBe('\t→')
    expect(apply('> -', dashArrow(scanDoc('> -'), 3, 3, '>', off)!)).toBe('> →')
  })
})

describe('ellipsis', () => {
  it('the third dot becomes an ellipsis', () => {
    const e = ellipsis(scanDoc('so..'), 4, 4, '.')!
    expect(apply('so..', e)).toBe('so…')
    expect(e.selection).toBe(3)
  })
  it('stays literal past three dots, in code, and when off', () => {
    expect(ellipsis(scanDoc('...'), 3, 3, '.')).toBeNull()
    expect(ellipsis(scanDoc('```\n..\n```'), 6, 6, '.')).toBeNull()
    expect(ellipsis(scanDoc('`a..`'), 4, 4, '.')).toBeNull()
    expect(dashArrow(scanDoc('`--`'), 3, 3, 'x')).toBeNull()
    expect(ellipsis(scanDoc('..'), 2, 2, '.', { transformEllipses: false })).toBeNull()
  })
})

describe('equations', () => {
  it('each pair resolves to its glyph', () => {
    const cases: [string, string, string][] = [
      ['a >', '=', 'a ≥'],
      ['a <', '=', 'a ≤'],
      ['a !', '=', 'a ≠'],
      ['a /', '=', 'a ≠'],
      ['a =', '/', 'a ≠'],
      ['a +', '-', 'a ±'],
      ['a -', '+', 'a ±'],
      ['a ~', '=', 'a ≈'],
      ['a =', '~', 'a ≈'],
    ]
    for (const [doc, ch, out] of cases)
      expect(apply(doc, equations(scanDoc(doc), doc.length, doc.length, ch)!)).toBe(out)
  })
  it('stays literal after a doubled character, in code, and when off', () => {
    expect(equations(scanDoc('=='), 2, 2, '/')).toBeNull()
    expect(equations(scanDoc('PATH='), 5, 5, '/')).toBeNull()
    expect(equations(scanDoc('`a >`'), 4, 4, '=')).toBeNull()
    expect(equations(scanDoc('a >'), 3, 3, '=', { transformEquations: false })).toBeNull()
  })
})

describe('sections and bullets', () => {
  it('a second hash away from a line start becomes a section sign', () => {
    const on = { transformSections: true }
    const e = sectionSign(scanDoc('a #'), 3, 3, '#', on)!
    expect(apply('a #', e)).toBe('a §')
    expect(e.selection).toBe(3)
  })
  it('a heading, a bracket, a third hash, code, and the default leave it literal', () => {
    const on = { transformSections: true }
    expect(sectionSign(scanDoc('#'), 1, 1, '#', on)).toBeNull()
    expect(sectionSign(scanDoc('> #'), 3, 3, '#', on)).toBeNull()
    expect(sectionSign(scanDoc('a ##'), 4, 4, '#', on)).toBeNull()
    expect(sectionSign(scanDoc('a [^b#'), 6, 6, '#', on)).toBeNull()
    expect(sectionSign(scanDoc('`a #`'), 4, 4, '#', on)).toBeNull()
    expect(sectionSign(scanDoc('a #'), 3, 3, '#')).toBeNull()
  })
  it('a spaced caret becomes a bullet', () => {
    const on = { transformBullets: true }
    const e = bullet(scanDoc('a ^'), 3, 3, ' ', on)!
    expect(apply('a ^', e)).toBe('a • ')
    expect(e.selection).toBe(4)
  })
  it('a citation label, an attached caret, a bare line, code, and the default leave it literal', () => {
    const on = { transformBullets: true }
    expect(bullet(scanDoc('a [^b'), 5, 5, ' ', on)).toBeNull()
    expect(bullet(scanDoc('x^'), 2, 2, ' ', on)).toBeNull()
    expect(bullet(scanDoc('^'), 1, 1, ' ', on)).toBeNull()
    expect(bullet(scanDoc(' ^'), 2, 2, ' ', on)).toBeNull()
    expect(bullet(scanDoc('> ^'), 3, 3, ' ', on)).toBeNull()
    expect(bullet(scanDoc('`a ^`'), 4, 4, ' ', on)).toBeNull()
    expect(bullet(scanDoc('a ^'), 3, 3, ' ')).toBeNull()
  })
  it('the en dash keeps the spaced hyphen', () => {
    expect(apply('a -', dashArrow(scanDoc('a -'), 3, 3, ' ', { transformBullets: true })!)).toBe(
      'a – ',
    )
  })
})

describe('callout and exit settings', () => {
  it('callout shorthand follows its setting', () => {
    expect(calloutShorthand('|', 1, 1, '|', { transformCallouts: false })).toBeNull()
  })
  it('exit on enter follows its setting', () => {
    expect(closeConstructOnEnter(scanDoc('[]'), 1, 1, { exitPairsOnEnter: false })).toBeNull()
    expect(closeConstructOnShiftEnter(scanDoc('[]'), 1, 1, { exitPairsOnEnter: false })).toBeNull()
  })
})

describe('tab indent (list nesting)', () => {
  it('nests a bullet by inserting a tab at line start, caret follows', () => {
    const doc = '- item'
    const e = indentListOnTab(doc, doc.length, doc.length)!
    expect(apply(doc, e)).toBe('\t- item')
    expect(e.selection).toBe(doc.length + 1)
  })
  it('counts 2 spaces as one level (4 spaces = level 2, still under the cap)', () => {
    const doc = '    - two'
    expect(apply(doc, indentListOnTab(doc, doc.length, doc.length)!)).toBe('\t    - two')
  })
  it('caps at the max nesting level (3 tabs → no further indent)', () => {
    expect(indentListOnTab('\t\t\t- deep', 9, 9)).toBeNull()
  })
  it('ignores non-list lines and selections', () => {
    expect(indentListOnTab('plain text', 5, 5)).toBeNull()
    expect(indentListOnTab('- item', 2, 4)).toBeNull()
  })
})

describe('blockquote continuation (Enter)', () => {
  it('continues a quote with the same prefix', () => {
    const doc = '> quote'
    expect(apply(doc, continueBlockquoteOnEnter(scanDoc(doc), doc.length, doc.length)!)).toBe(
      '> quote\n> ',
    )
  })
  it('preserves nesting depth', () => {
    const doc = '>> deep'
    expect(apply(doc, continueBlockquoteOnEnter(scanDoc(doc), doc.length, doc.length)!)).toBe(
      '>> deep\n>> ',
    )
  })
  it('falls through when the caret is in the marker, or on a non-quote line', () => {
    expect(continueBlockquoteOnEnter(scanDoc('> q'), 1, 1)).toBeNull()
    expect(continueBlockquoteOnEnter(scanDoc('plain'), 5, 5)).toBeNull()
  })
})

describe('callout shorthand (||)', () => {
  it('expands `||` at line start to the callout head + a trailing exit line at doc end', () => {
    const doc = '|'
    expect(apply(doc, calloutShorthand(doc, 1, 1, '|')!)).toBe('> [!callout] \n')
  })
  it('reuses an existing following line as the exit target (no extra newline)', () => {
    const doc = '|\nafter'
    expect(apply(doc, calloutShorthand(doc, 1, 1, '|')!)).toBe('> [!callout] \nafter')
  })
  it('only fires on a bare `|` alone on the line (never mid-line / inside a table)', () => {
    expect(calloutShorthand('a |', 3, 3, '|')).toBeNull()
    expect(calloutShorthand('| x ', 4, 4, '|')).toBeNull()
  })
  it('preserves content already on the line (||ab → callout with "ab" body, no trailing line)', () => {
    const doc = '|ab'
    expect(apply(doc, calloutShorthand(doc, 1, 1, '|')!)).toBe('> [!callout] ab')
  })
  it('separates from a callout directly above with a blank line (no touching boxes / merged run)', () => {
    const doc = '> [!callout] first\n|'
    expect(apply(doc, calloutShorthand(doc, 20, 20, '|')!)).toBe(
      '> [!callout] first\n\n> [!callout] \n',
    )
  })
})

describe('dash auto-format is prefix-aware', () => {
  it('does NOT convert a `- ` bullet into an en-dash inside a quote/callout', () => {
    const doc = '> -'
    expect(dashArrow(scanDoc(doc), 3, 3, ' ')).toBeNull()
  })
  it('still converts a real ` - ` range inside a callout (prose before the dash)', () => {
    const doc = '> [!callout] Mon -'
    expect(apply(doc, dashArrow(scanDoc(doc), doc.length, doc.length, ' ')!)).toBe(
      '> [!callout] Mon – ',
    )
  })
})

describe('shift+enter', () => {
  it('exits with a plain newline outside a callout', () => {
    expect(shiftEnterEdit(scanDoc('hello'), 5, 5).insert).toBe('\n')
  })
  it('stays in the box (continues the `>` prefix) inside a callout', () => {
    const doc = '> [!callout] hi'
    expect(shiftEnterEdit(scanDoc(doc), doc.length, doc.length).insert).toBe('\n> ')
  })
  it('with a selection inside a callout still keeps the box prefix (no run-splitting plain newline)', () => {
    const doc = '> [!callout] head\n> abcXYZdef'
    const a = doc.indexOf('XYZ')
    const e = a + 3
    expect(apply(doc, shiftEnterEdit(scanDoc(doc), a, e))).toBe('> [!callout] head\n> abc\n> def')
  })
  it('a selection STRADDLING the box edge falls back to plain newline (no outside text pulled in)', () => {
    const doc = '> [!callout] body here\nplain below line'
    const a = doc.indexOf('body here')
    const e = doc.indexOf('below')
    expect(apply(doc, shiftEnterEdit(scanDoc(doc), a, e))).toBe('> [!callout] \nbelow line')
  })
})

describe('nested list behavior inside a callout', () => {
  const callout = (body: string): string => `> [!callout] head\n${body}`
  it('Enter continues a bullet inside the box (keeps the `>` prefix)', () => {
    const doc = callout('> - item')
    expect(apply(doc, continueListOnEnter(doc, doc.length, doc.length)!)).toBe(
      callout('> - item\n> - '),
    )
  })
  it('Enter continues + renumbers an ordered list inside the box', () => {
    const doc = callout('> 1. a')
    expect(apply(doc, continueListOnEnter(doc, doc.length, doc.length)!)).toBe(
      callout('> 1. a\n> 2. '),
    )
  })
  it('Tab indents the inner list after the prefix, not before the `>`', () => {
    const doc = callout('> - item')
    expect(apply(doc, indentListOnTab(doc, doc.length, doc.length)!)).toBe(callout('> \t- item'))
  })
  it('backspace deletes the inner marker (de-lists) but keeps the box', () => {
    const doc = callout('> - x')
    const contentStart = doc.length - 1
    expect(apply(doc, smartBackspace(scanDoc(doc), contentStart, contentStart)!)).toBe(
      callout('> x'),
    )
  })
  it('backspace at a plain body line-start joins up rather than stripping the `>`', () => {
    const doc = '> [!callout] head\n> body'
    const contentStart = doc.indexOf('body')
    expect(apply(doc, smartBackspace(scanDoc(doc), contentStart, contentStart)!)).toBe(
      '> [!callout] headbody',
    )
  })
  it('backspace at the head content-start removes the whole callout marker', () => {
    const doc = '> [!callout] head'
    const cs = '> [!callout] '.length
    expect(apply(doc, smartBackspace(scanDoc(doc), cs, cs)!)).toBe('head')
  })
  it('backspace from INSIDE the hidden tag also removes the whole callout (no char-by-char corruption)', () => {
    const doc = '> [!callout] head'
    expect(apply(doc, smartBackspace(scanDoc(doc), 5, 5)!)).toBe('head')
  })
  it('-[]+space canonicalizes to GFM behind the prefix', () => {
    const doc = '> [!callout] head\n> -[]'
    const r = canonicalizeCheckbox(doc, doc.length, doc.length, ' ')!
    expect(apply(doc, r)).toBe('> [!callout] head\n> - [ ] ')
  })
})

describe('line bounds', () => {
  it('starts the first line at 0 even where the document opens on a newline', () => {
    expect(lineStartAt('\ntext', 0)).toBe(0)
    expect(lineStartAt('\ntext', 1)).toBe(1)
    expect(lineStartAt('a\nb', 3)).toBe(2)
  })
})
