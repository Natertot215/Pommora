import { describe, it, expect } from 'vitest'
import { tokenize, activeTokenIndices } from '../tokens'
import { computeStats } from '@renderer/Detail/Subfield/subfieldStats'
import {
  assembleLineIntents,
  decorationsFor,
  docLineIntents,
  NO_CARET,
  scanDoc,
  tokenIntents,
  type DecoIntent,
} from './intent'

describe('cached assembly ≡ pure derivation', () => {
  // The live build path assembles line intents from the per-version cache, re-deriving only the
  // caret-affected lines. This pin holds it byte-equivalent to the pure whole-doc reference at EVERY
  // caret position of every corpus doc — if a construct gains a new caret dependency without joining
  // caretAffectedLines, this goes red.
  const corpus = [
    '- item\n\ttwo words here\n# Head\nbody\n---\npara',
    '> [!note] Head\n> - inner\n> > nested\nafter',
    '```js\nconst a = 1\n\nconst b = 2\n```\ntail',
    '> quote\n> ```\n> code\n> ```\n> after',
    '$$\nx=1\n\n- b\n$$\n- real\n1. num\n- [ ] task',
    '→ arrow\n+ plus\n  - nested\n    - deeper\nplain **bold** text',
    '',
    '- ',
    'body [^2] and [^1]\n\n[^1]: one\n[^2]: two\ncontinued',
  ]
  // Sequence compare, not a sorted multiset — order decides stacked line-class order at a shared offset.
  const seq = (xs: DecoIntent[]): string[] => xs.map((x) => JSON.stringify(x))
  it.each(corpus.map((doc, i) => [i, doc] as const))('doc %#', (_i, doc) => {
    const scan = scanDoc(doc)
    const cached = docLineIntents(scan)
    for (let sel = -1; sel <= doc.length; sel++) {
      const pure = decorationsFor(doc, [], new Set(), sel, scan)
      const assembled = assembleLineIntents(scan, cached, sel)
      expect(seq(assembled), `caret ${sel}`).toEqual(seq(pure))
    }
  })

  // The live build assembles only the viewport's lines. A window must yield exactly what the whole
  // document yields for the lines it covers — the flags a construct's edge depends on were decided by
  // the whole-document derivation, so no window may change one.
  it.each(corpus.map((doc, i) => [i, doc] as const))('windowed, doc %#', (_i, doc) => {
    const scan = scanDoc(doc)
    const cached = docLineIntents(scan)
    const inWindow = (from: number, to: number) => (x: DecoIntent) => {
      const at = 'from' in x ? x.from : -1
      return at >= scan.lineStarts[from] && at <= scan.lineStarts[to] + scan.lines[to].length
    }
    for (let a = 0; a < scan.lines.length; a++) {
      for (let b = a; b < scan.lines.length; b++) {
        const window = { from: scan.lineStarts[a], to: scan.lineStarts[b] }
        const windowed = assembleLineIntents(scan, cached, NO_CARET, window)
        const whole = assembleLineIntents(scan, cached, NO_CARET).filter(inWindow(a, b))
        expect(seq(windowed), `lines ${a}..${b}`).toEqual(seq(whole))
      }
    }
  })
})

describe('decoration intents', () => {
  it('inactive bold → md-bold class on content + hidden markers', () => {
    const t = '**a** xxxxx'
    const tokens = tokenize(t)
    const active = activeTokenIndices(tokens, t.length, t.length) // caret far away
    const intents = decorationsFor(t, tokens, active, t.length)
    expect(intents.some((d) => d.kind === 'class' && d.className === 'md-bold')).toBe(true)
    expect(intents.filter((d) => d.kind === 'hide')).toHaveLength(2) // the two ** markers
  })

  it('active bold → markers shown (no hide intents)', () => {
    const t = '**a**'
    const tokens = tokenize(t)
    const active = activeTokenIndices(tokens, 3, 3) // caret inside
    const intents = decorationsFor(t, tokens, active, 3)
    expect(intents.filter((d) => d.kind === 'hide')).toHaveLength(0)
  })

  it('HR → hr widget when the caret is off the line, nothing when on it', () => {
    const t = 'a\n---\nb'
    const tokens = tokenize(t)
    const off = decorationsFor(t, tokens, new Set(), 0) // caret on line 1
    expect(off.some((d) => d.kind === 'widget' && d.spec.type === 'hr')).toBe(true)
    const on = decorationsFor(t, tokens, new Set(), 3) // caret on the --- line (offsets 2–5)
    expect(on.some((d) => d.kind === 'widget' && d.spec.type === 'hr')).toBe(false)
  })

  it('a literal > inside an unquoted fence keeps its bytes — no quote chrome, no prefix hide', () => {
    const t = '```\n> quoted\n```'
    const intents = decorationsFor(t, tokenize(t), new Set(), 0) // caret on line 1
    expect(intents.some((d) => d.kind === 'line' && d.className.startsWith('md-bq'))).toBe(false)
    // the `> ` prefix (offset 4) is content, never hidden as chrome
    expect(intents.some((d) => d.kind === 'hide' && d.from === 4)).toBe(false)
  })

  it('an UNCLOSED fence keeps box chrome below it — typing ``` must not flatten the document', () => {
    const t = '```\n> a quote'
    const intents = decorationsFor(t, tokenize(t), new Set(), 0)
    expect(intents.some((d) => d.kind === 'line' && d.className.startsWith('md-bq'))).toBe(true)
  })

  it('a fence nested in a blockquote keeps the box chrome and hides the quote prefix', () => {
    const t = '> ```\n> code\n> ```'
    const intents = decorationsFor(t, tokenize(t), new Set(), 0)
    // line 2 ("> code", offset 6) carries both the quote line-class and the prefix hide
    expect(
      intents.some((d) => d.kind === 'line' && d.from === 6 && d.className.startsWith('md-bq')),
    ).toBe(true)
    expect(intents.some((d) => d.kind === 'hide' && d.from === 6 && d.to === 8)).toBe(true)
  })

  it('a quoted fence hides only its own depth — a callout-lookalike tag inside is code, not a new box', () => {
    const t = '> [!note] T\n> ```\n> [!warning] inner\n> ```'
    const intents = decorationsFor(t, tokenize(t), new Set(), 0)
    // line 3 (offset 18): only the 2-char `> ` prefix hides; `[!warning] inner` stays visible
    expect(intents.some((d) => d.kind === 'hide' && d.from === 18 && d.to === 20)).toBe(true)
    expect(intents.some((d) => d.kind === 'hide' && d.from === 18 && d.to > 20)).toBe(false)
    // and it stays inside the OUTER callout's box — no phantom head starts mid-fence
    const lineClass = (cls: string): boolean =>
      intents.some((d) => d.kind === 'line' && d.from === 18 && d.className.includes(cls))
    expect(lineClass('md-callout-first')).toBe(false)
    expect(lineClass('md-callout')).toBe(true)
  })

  it('a > deeper than its quoted fence is code — the prefix hide stops at the fence depth', () => {
    const t = '> ```\n> > literal\n> ```'
    const intents = decorationsFor(t, tokenize(t), new Set(), 0)
    // line 2 (offset 6): hide covers `> ` only, and no inset-quote chrome appears
    expect(intents.some((d) => d.kind === 'hide' && d.from === 6 && d.to === 8)).toBe(true)
    expect(intents.some((d) => d.kind === 'hide' && d.from === 6 && d.to === 10)).toBe(false)
    expect(intents.some((d) => d.kind === 'line' && d.className.includes('md-bq-in'))).toBe(false)
  })

  it('leaves wikilinks untouched — they are rendered in decorations.ts by resolution status', () => {
    const t = '[[Page]]'
    const intents = decorationsFor(t, tokenize(t), new Set(), 99)
    expect(intents).toHaveLength(0) // no content class, no bracket hide — status-dependent
  })

  it('heading sizes the whole line (markers grow too) + mutes the # markers', () => {
    const t = '## Title'
    const intents = decorationsFor(t, tokenize(t), new Set(), 99) // caret off the line
    // whole-line size class so the ## grows with the level
    expect(
      intents.some(
        (d) => d.kind === 'class' && d.className === 'md-h2' && d.from === 0 && d.to === t.length,
      ),
    ).toBe(true)
    expect(intents.some((d) => d.kind === 'class' && d.className === 'md-hmarker')).toBe(true)
  })

  it('strikethrough → md-strike on content', () => {
    const t = '~~gone~~'
    const tokens = tokenize(t)
    expect(
      decorationsFor(t, tokens, new Set(), 99).some(
        (d) => d.kind === 'class' && d.className === 'md-strike',
      ),
    ).toBe(true)
  })

  it('a marker-lookalike inside display math renders as formula source — no bullet, no glyph', () => {
    const t = '$$\nE = mc^2\n- b\n\ny = 2\n$$'
    const intents = decorationsFor(t, tokenize(t), new Set(), 99)
    expect(intents.some((d) => d.kind === 'line' && d.className.startsWith('md-li'))).toBe(false)
    expect(intents.some((d) => d.kind === 'widget')).toBe(false)
    // control — the same line outside math is a bullet
    const out = decorationsFor('- b', tokenize('- b'), new Set(), 99)
    expect(out.some((d) => d.kind === 'widget' && d.spec.type === 'bullet')).toBe(true)
  })

  it('dash bullet, caret off the line → • widget takes the whole marker slot through the gap', () => {
    const t = '- item'
    const intents = decorationsFor(t, tokenize(t), new Set(), 99)
    expect(intents.some((d) => d.kind === 'line' && d.className === 'md-li' && d.level === 0)).toBe(
      true,
    )
    expect(
      intents.some(
        (d) => d.kind === 'widget' && d.spec.type === 'bullet' && d.from === 0 && d.to === 2,
      ),
    ).toBe(true)
  })

  it('every list type marks its content as the line’s one wrapping region', () => {
    for (const t of [
      '- item text',
      '3. item text',
      '→ item text',
      '+ item text',
      '- [ ] item text',
    ]) {
      const intents = decorationsFor(t, tokenize(t), new Set(), 99)
      const mark = intents.find((d) => d.kind === 'class' && d.className === 'md-li-text')
      expect(mark, t).toBeDefined()
      expect(mark?.kind === 'class' && t.slice(mark.from, mark.to)).toBe('item text')
    }
    // an empty item has no content region to mark
    const empty = decorationsFor('- ', tokenize('- '), new Set(), 99)
    expect(empty.some((d) => d.kind === 'class' && d.className === 'md-li-text')).toBe(false)
  })

  it('dash bullet, caret in the CONTENT (just in the line) → still • widget, never raw', () => {
    const t = '- item'
    const intents = decorationsFor(t, tokenize(t), new Set(), 4) // caret inside "item"
    expect(intents.some((d) => d.kind === 'widget' && d.spec.type === 'bullet')).toBe(true)
  })

  it('dash bullet, caret ON the marker (the dash) → raw `-`, no widget', () => {
    const t = '- item'
    const intents = decorationsFor(t, tokenize(t), new Set(), 1) // caret right on the dash
    expect(intents.some((d) => d.kind === 'line' && d.className === 'md-li')).toBe(true)
    expect(intents.some((d) => d.kind === 'widget')).toBe(false)
  })

  it('ordered list → number kept as literal source (recolor mark), no widget', () => {
    const t = '3. third'
    const intents = decorationsFor(t, tokenize(t), new Set(), 99)
    expect(
      intents.some(
        (d) =>
          d.kind === 'class' &&
          d.className === 'md-ol-marker md-control md-li-glyph' &&
          d.from === 0 &&
          d.to === 2,
      ),
    ).toBe(true)
    expect(intents.some((d) => d.kind === 'line' && d.className === 'md-li md-li-ordered')).toBe(
      true,
    )
    expect(intents.some((d) => d.kind === 'widget')).toBe(false)
  })

  it.each([
    ['arrow', '→ step'],
    ['plus', '+ step'],
  ])('%s list → marker kept as literal source (recolor + drag-handle class), gap hidden, no widget', (_n, t) => {
    const intents = decorationsFor(t, tokenize(t), new Set(), 99)
    expect(
      intents.some(
        (d) =>
          d.kind === 'class' &&
          d.className === 'md-li-mark md-control md-li-glyph' &&
          d.from === 0 &&
          d.to === 1,
      ),
    ).toBe(true)
    expect(intents.some((d) => d.kind === 'hide' && d.from === 1 && d.to === 2)).toBe(true)
    expect(intents.some((d) => d.kind === 'line' && d.className === 'md-li')).toBe(true)
    expect(intents.some((d) => d.kind === 'widget')).toBe(false)
  })

  it('nested bullet → line decoration carries the indent level (2 spaces = 1, tab = 1)', () => {
    const spaces = decorationsFor('  - x', tokenize('  - x'), new Set(), 99)
    expect(spaces.some((d) => d.kind === 'line' && d.level === 1)).toBe(true)
    const tab = decorationsFor('\t\t- x', tokenize('\t\t- x'), new Set(), 99)
    expect(tab.some((d) => d.kind === 'line' && d.level === 2)).toBe(true)
  })

  it('task checkbox → a checkbox widget carrying bracket range + checked state', () => {
    const t = '- [x] done'
    const w = decorationsFor(t, tokenize(t), new Set(), 99).find((d) => d.kind === 'widget')
    expect(w?.kind === 'widget' && w.spec.type === 'checkbox' && w.spec.checked).toBe(true)
    // unchecked
    const t2 = '- [ ] todo'
    const w2 = decorationsFor(t2, tokenize(t2), new Set(), 99).find((d) => d.kind === 'widget')
    expect(w2?.kind === 'widget' && w2.spec.type === 'checkbox' && w2.spec.checked).toBe(false)
  })

  it('task checkbox, caret ON the marker → raw `- [ ] `, no widget (parity with bullets)', () => {
    const t = '- [ ] todo'
    const intents = decorationsFor(t, tokenize(t), new Set(), 2) // caret inside the box
    expect(intents.some((d) => d.kind === 'line' && d.className === 'md-li md-li-task')).toBe(true)
    expect(intents.some((d) => d.kind === 'widget')).toBe(false)
  })

  it('blockquote → md-bq line + permanently hidden marker; a lone line is first AND last', () => {
    const t = '> quote'
    const intents = decorationsFor(t, tokenize(t), new Set(), 0) // caret on the line — still hidden
    const line = intents.find((d) => d.kind === 'line')
    expect(line?.kind === 'line' && line.className).toBe('md-bq md-bq-first md-bq-last')
    expect(intents.some((d) => d.kind === 'hide' && d.from === 0 && d.to === 2)).toBe(true) // "> "
  })

  it('multi-line blockquote → only the outer lines round (first vs last)', () => {
    const t = '> a\n> b'
    const lines = decorationsFor(t, tokenize(t), new Set(), 99).filter(
      (d): d is Extract<typeof d, { kind: 'line' }> => d.kind === 'line',
    )
    expect(lines).toHaveLength(2)
    expect(lines[0].className).toBe('md-bq md-bq-first')
    expect(lines[1].className).toBe('md-bq md-bq-last')
  })

  it('fenced code block → md-cb lines; backticks always show, only the info word hides', () => {
    const t = 'p\n```js\ncode\n```'
    const intents = decorationsFor(t, tokenize(t), new Set(), 0) // caret on "p", outside the block
    const classes = intents
      .filter((d): d is Extract<typeof d, { kind: 'line' }> => d.kind === 'line')
      .map((d) => d.className)
    expect(classes).toEqual(['md-cb md-cb-first', 'md-cb', 'md-cb md-cb-last'])
    const hides = intents.filter((d): d is Extract<typeof d, { kind: 'hide' }> => d.kind === 'hide')
    expect(hides).toHaveLength(1) // the info word alone — never the backticks, never the close
    expect(t.slice(hides[0].from, hides[0].to)).toBe('js')
  })

  it('the caret on the open line trades the glyph back for the raw info word', () => {
    const t = '```js\ncode\n```'
    const inContent = decorationsFor(t, tokenize(t), new Set(), 7) // caret in "code"
    expect(inContent.filter((d) => d.kind === 'hide')).toHaveLength(1)
    const onOpen = decorationsFor(t, tokenize(t), new Set(), 2) // caret on the ```js line
    expect(onOpen.filter((d) => d.kind === 'hide')).toHaveLength(0)
    expect(
      onOpen.filter((d) => d.kind === 'lineWidget' && d.className === 'md-cb-lang'),
    ).toHaveLength(0)
  })

  it('an indented typed fence hides only its info word — never its own backticks', () => {
    const t = '- item\n  ```yaml\n  key: 1\n  ```'
    const intents = decorationsFor(t, tokenize(t), new Set(), 0) // caret on the list line
    const hides = intents.filter((d): d is Extract<typeof d, { kind: 'hide' }> => d.kind === 'hide')
    expect(hides.map((h) => t.slice(h.from, h.to))).toEqual(['yaml'])
    const lang = intents.find((d) => d.kind === 'lineWidget' && d.className === 'md-cb-lang')
    expect(lang && 'from' in lang ? lang.from : -1).toBe(t.indexOf('yaml'))
  })

  it('a typed fence wears its inline glyph at the info word; a bare fence wears none', () => {
    const t = 'p\n```yaml\nkey: 1\n```'
    const glyphs = decorationsFor(t, tokenize(t), new Set(), 0).filter(
      (d): d is Extract<typeof d, { kind: 'lineWidget' }> => d.kind === 'lineWidget',
    )
    const lang = glyphs.find((g) => g.className === 'md-cb-lang')
    // The language's own name, not the word that opened it — `yml` and `yaml` are both YAML.
    expect(lang?.text).toBe('YAML')
    expect(lang?.from).toBe(t.indexOf('yaml')) // in-line, right where the info word sits
    const bare = 'p\n```\nx\n```'
    const none = decorationsFor(bare, tokenize(bare), new Set(), 0).filter(
      (d) => d.kind === 'lineWidget' && d.className === 'md-cb-lang',
    )
    expect(none).toHaveLength(0)
  })

  it('content lines carry their 1-based line-count chrome; fence lines carry none', () => {
    const t = '```js\na\nb\n```'
    const nums = decorationsFor(t, tokenize(t), new Set(), 0)
      .filter((d): d is Extract<typeof d, { kind: 'lineWidget' }> => d.kind === 'lineWidget')
      .filter((d) => d.className === 'md-cb-ln')
    expect(nums.map((n) => n.text)).toEqual(['1', '2'])
  })
})

describe('citation rows', () => {
  const rows = (t: string) => decorationsFor(t, tokenize(t), new Set(), NO_CARET)
  const nums = (t: string): (string | undefined)[] =>
    rows(t)
      .filter((d) => d.kind === 'lineWidget' && d.className === 'md-cite-num')
      .map((d) => (d.kind === 'lineWidget' ? d.text : undefined))

  it('draws a positional glyph over hidden source, whatever the label says', () => {
    const t = 'x[^7] y[^1] z[^3]\n\n[^1]: one\n[^7]: seven\n[^3]: three'
    expect(nums(t)).toEqual(['2.', '1.', '3.'])
    const line = rows(t).filter((d) => d.kind === 'line' && d.className.startsWith('md-cite'))
    expect(line).toHaveLength(3)
  })

  it('hides the prefix and makes it atomic, ungated by the caret', () => {
    const t = 'a[^1]\n\n[^1]: one'
    const at = t.indexOf('[^1]: one')
    const contentStart = at + '[^1]: '.length
    for (const sel of [NO_CARET, contentStart, at]) {
      const ds = decorationsFor(t, tokenize(t), new Set(), sel)
      expect(ds.some((d) => d.kind === 'hide' && d.from === at && d.to === contentStart)).toBe(true)
      expect(ds.some((d) => d.kind === 'atomic' && d.from === at && d.to === contentStart)).toBe(
        true,
      )
    }
  })

  it('classes the content so it wraps inside its own column', () => {
    const t = 'a[^1]\n\n[^1]: one'
    const at = t.indexOf('[^1]: one') + '[^1]: '.length
    expect(
      rows(t).some((d) => d.kind === 'class' && d.className === 'md-cite-text' && d.from === at),
    ).toBe(true)
  })

  it('dims an orphan and a duplicate-loser, and draws them a numberless seat', () => {
    const t = 'a[^1]\n\n[^1]: one\n[^1]: dup\n[^9]: orphan'
    expect(nums(t)).toEqual(['1.', '–', '–'])
    const dim = rows(t).filter((d) => d.kind === 'line' && d.className.includes('md-cite-dim'))
    expect(dim).toHaveLength(2)
  })

  it('draws a seat for a citation whose text is empty', () => {
    const t = 'a[^1]\n\n[^1]:'
    expect(nums(t)).toEqual(['1.'])
    expect(rows(t).some((d) => d.kind === 'class' && d.className === 'md-cite-text')).toBe(false)
  })

  it('carries a continuation line into the row it belongs to', () => {
    const t = 'a[^1]\n\n[^1]: one\ncontinued'
    const cont = rows(t).filter((d) => d.kind === 'line' && d.className.includes('md-cite-cont'))
    expect(cont).toHaveLength(1)
    expect(nums(t)).toEqual(['1.'])
  })

  // Containment, not equality: the counter zero-words every marker-shaped run, bound or not, while
  // only a bound one is ever drawn. An escaped run is in neither set — it is the prose the parser
  // reads it as, and both layers read that from the one pattern.
  it('every marker it draws is one the counter scores as zero words', () => {
    const t = 'a [^1] b [^9] c \\[^1] d\n\n[^1]: one'
    const drawn = rows(t).filter((d) => d.kind === 'widget' && d.spec.type === 'citeRef')
    expect(drawn).toHaveLength(1)
    // a · b · c · \[^1] · d — the two live markers score nothing, the escaped run scores as prose.
    expect(computeStats(t).words).toBe(5)
  })

  it('leaves the section out of the list and rail machinery', () => {
    const t = 'a[^1]\n\n[^1]: one'
    expect(rows(t).some((d) => d.kind === 'rail')).toBe(false)
    expect(rows(t).some((d) => d.kind === 'line' && d.className.includes('md-li'))).toBe(false)
  })
})

describe('callout box chrome + nested constructs', () => {
  const doc = '> [!callout] hi\n> - item\n> ## head\n> ---'
  const intents = decorationsFor(doc, tokenize(doc), new Set(), 0)
  const lineClasses = intents
    .filter((d): d is Extract<typeof d, { kind: 'line' }> => d.kind === 'line')
    .map((d) => d.className)

  it('every line gets the box line-class (first/last)', () => {
    expect(lineClasses.some((c) => c.includes('md-callout-first'))).toBe(true)
    expect(lineClasses.some((c) => c.includes('md-callout-last'))).toBe(true)
  })
  it('a bullet inside the box still composes md-li with the box', () => {
    expect(lineClasses).toContain('md-li')
  })
  it('the bullet widget absorbs the prefix (starts at line start, not touching a separate hide)', () => {
    const lineStart = doc.indexOf('> - item')
    const w = intents.find((d) => d.kind === 'widget' && d.spec.type === 'bullet')
    expect(w?.from).toBe(lineStart)
  })
  it('a heading + HR render inside the box', () => {
    expect(intents.some((d) => d.kind === 'class' && d.className === 'md-h2')).toBe(true)
    expect(intents.some((d) => d.kind === 'widget' && d.spec.type === 'hr')).toBe(true)
  })
  it('a top-level code block quoting a ``` line stays ONE block (fences pair by quote-depth, not greedily)', () => {
    const t = '```\n> ```\nstill code\n```'
    const ints = decorationsFor(t, tokenize(t), new Set(), 99) // caret off the block
    // all of lines 1-2 are code CONTENT (no md-cb-last until the final ```), so exactly one open + one close
    const cbLines = ints.filter(
      (d): d is Extract<typeof d, { kind: 'line' }> =>
        d.kind === 'line' && d.className.includes('md-cb'),
    )
    expect(cbLines.filter((d) => d.className.includes('md-cb-first'))).toHaveLength(1)
    expect(cbLines.filter((d) => d.className.includes('md-cb-last'))).toHaveLength(1)
    expect(cbLines).toHaveLength(4) // 4 lines, all one block
  })
  it('an unclosed fence inside a callout does not leak code styling onto the non-quote lines below', () => {
    const t = '> [!callout] head\n> ```\nplain below\nmore plain'
    const ints = decorationsFor(t, tokenize(t), new Set(), 99)
    const cbLines = ints.filter(
      (d): d is Extract<typeof d, { kind: 'line' }> =>
        d.kind === 'line' && d.className.includes('md-cb'),
    )
    // only the `> ``` open line is a code line; the non-quote lines below are NOT code
    expect(cbLines).toHaveLength(1)
  })
  it('a blockquote nested inside a callout renders as an inset quote (md-bq-in), not flat body', () => {
    const t = '> [!callout] head\n> > quoted one\n> > quoted two\n> body'
    const ints = decorationsFor(t, tokenize(t), new Set(), 99)
    const classes = ints
      .filter((d): d is Extract<typeof d, { kind: 'line' }> => d.kind === 'line')
      .map((d) => d.className)
    expect(classes.some((c) => c.includes('md-bq-in-first'))).toBe(true)
    expect(classes.some((c) => c.includes('md-bq-in-last'))).toBe(true)
    expect(classes.filter((c) => c.includes('md-bq-in')).length).toBe(2) // both quote lines
    // the whole `> > ` is hidden (one callout level + one quote level)
    expect(ints.some((d) => d.kind === 'hide' && d.to - d.from === 4)).toBe(true)
  })
  it('a multi-DEPTH nested-quote run is ONE block — exactly one first + one last, no notch mid-block', () => {
    const t = '> [!callout] head\n> > a\n> >> b\n> > c\n> body'
    const ints = decorationsFor(t, tokenize(t), new Set(), 99)
    const classes = ints
      .filter((d): d is Extract<typeof d, { kind: 'line' }> => d.kind === 'line')
      .map((d) => d.className)
    expect(classes.filter((c) => c.includes('md-bq-in-first'))).toHaveLength(1)
    expect(classes.filter((c) => c.includes('md-bq-in-last'))).toHaveLength(1)
    expect(classes.filter((c) => c.includes('md-bq-in')).length).toBe(3) // a, b, c all in the run
  })
  it('a fenced code block inside a callout composes the box chrome with the code class', () => {
    const t = '> [!callout] head\n> ```js\n> code\n> ```'
    const ints = decorationsFor(t, tokenize(t), new Set(), 0)
    const classes = ints
      .filter((d): d is Extract<typeof d, { kind: 'line' }> => d.kind === 'line')
      .map((d) => d.className)
    expect(classes).toContain('md-cb md-cb-first') // the ```js line
    expect(classes.some((c) => c.startsWith('md-callout') && !c.includes('md-cb'))).toBe(true) // box chrome present
    // every fence line is also a callout line (the box wraps the code)
    expect(classes.filter((c) => c.includes('md-callout')).length).toBe(4)
  })
})

describe('outliner rails', () => {
  type Rail = Extract<DecoIntent, { kind: 'rail' }>
  const rails = (t: string): Rail[] =>
    decorationsFor(t, tokenize(t), new Set(), 999).filter((d): d is Rail => d.kind === 'rail')

  it('a top-level item has no ancestor rails', () => {
    expect(rails('- solo')).toHaveLength(0)
  })

  it('nesting emits one rail per ancestor level, with caps only at each run’s ends', () => {
    // levels: A0 B1 C2 D1 E0 — the worked run: level-0 rail spans B→C→D, level-1 rail is C alone.
    const t = '- A\n\t- B\n\t\t- C\n\t- D\n- E'
    const rs = rails(t)
    const has = (level: number, first: boolean, last: boolean): number =>
      rs.filter((r) => r.level === level && r.first === first && r.last === last).length
    expect(rs).toHaveLength(4) // B(1) + C(2) + D(1)
    expect(has(0, true, false)).toBe(1) // B — run start under A
    expect(has(0, false, false)).toBe(1) // C — mid-run
    expect(has(0, false, true)).toBe(1) // D — run end
    expect(has(1, true, true)).toBe(1) // C — single-line level-1 run under B
    expect(rs.some((r) => r.level >= 2)).toBe(false) // level-2 item has ancestors 0 and 1 only
  })

  it('a rail takes its ANCESTOR’s marker type, not the descendant’s (the checkbox-center fix)', () => {
    // bullet parent, checkbox child → the child’s rail centers on the bullet, not its own box.
    const bulletParent = rails('- parent\n\t- [ ] child')
    expect(bulletParent).toHaveLength(1)
    expect(bulletParent[0].typeClass).toBe('md-outliner-bullet')

    // checkbox parent, bullet child → the rail centers on the parent’s box.
    const taskParent = rails('- [ ] parent\n\t- child')
    expect(taskParent).toHaveLength(1)
    expect(taskParent[0].typeClass).toBe('md-outliner-task')
  })

  it('rails are scoped to bullets + checkboxes — ordered / arrow / + ancestors get none (deferred)', () => {
    expect(rails('1. parent\n\t- child')).toHaveLength(0) // ordered parent
    expect(rails('→ parent\n\t- child')).toHaveLength(0) // arrow parent
    expect(rails('+ parent\n\t- child')).toHaveLength(0) // + parent
  })

  it('a non-list line between siblings breaks the run (caps on both sides of the gap)', () => {
    const t = '- A\n\t- B\nprose\n\t- C'
    const rs = rails(t)
    // B: run ends at the prose gap (next line not a list) → last true. C: run starts after the gap → first true.
    expect(rs.filter((r) => r.level === 0 && r.last).length).toBe(2) // B and C both cap at the break
    expect(rs.filter((r) => r.level === 0 && r.first).length).toBe(2)
  })
})

describe('embed token styling', () => {
  it('a lone-line embed matches no line construct — no gate needed, pinned so one arriving would show', () => {
    const scan = scanDoc('- item\n![[Foo]]\n# Head')
    const { perLine } = docLineIntents(scan)
    expect(perLine[1]).toEqual([])
  })

  it('the embed token wears the embed content class', () => {
    const tokens = tokenize('see ![[Foo]] here')
    const embed = tokens.find((t) => t.kind === 'embed')
    expect(embed).toBeDefined()
    const intents = tokenIntents(tokens, new Set())
    expect(intents.some((i) => i.kind === 'class' && i.className === 'md-embed')).toBe(true)
  })
})
