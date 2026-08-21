import { describe, it, expect } from 'vitest'
import { scanDoc } from '../decorations/intent'
import { blockAt as blockAtIn, blockStarts as blockStartsIn, type Block } from './blockModel'

const blockAt = (doc: string, pos: number): Block | null => blockAtIn(scanDoc(doc), pos)
const blockStarts = (doc: string): ReturnType<typeof blockStartsIn> => blockStartsIn(scanDoc(doc))

const slice = (doc: string, b: Block | null): string | null => (b ? doc.slice(b.from, b.to) : null)

describe('blockAt', () => {
  it('heading grabs its whole section', () => {
    const doc = '# A\nbody\nmore\n# B\nx'
    const b = blockAt(doc, 0)
    expect(b?.kind).toBe('heading')
    expect(slice(doc, b)).toBe('# A\nbody\nmore')
  })

  it('a heading section stops at its last content character, not the blank line before the next heading', () => {
    const doc = '# A\nbody\n\n# B\nx'
    const b = blockAt(doc, 0)
    expect(slice(doc, b)).toBe('# A\nbody')
  })

  it('a body-less heading is one line', () => {
    const doc = '# A\n# B\nx'
    const b = blockAt(doc, 0)
    expect(b?.kind).toBe('heading')
    expect(slice(doc, b)).toBe('# A')
  })

  it('list grabs the whole contiguous run including nested items', () => {
    const doc = 'para\n\n- one\n- two\n  - nested\n- three\n\nafter'
    const b = blockAt(doc, doc.indexOf('- two'))
    expect(b?.kind).toBe('list')
    expect(slice(doc, b)).toBe('- one\n- two\n  - nested\n- three')
  })

  it('callout box wins over its inner list (box-first precedence)', () => {
    const doc = '> [!note] Head\n> body\n> - inner item\nafter'
    const b = blockAt(doc, doc.indexOf('- inner item'))
    expect(b?.kind).toBe('callout')
    expect(slice(doc, b)).toBe('> [!note] Head\n> body\n> - inner item')
  })

  it('a plain (untagged) blockquote is a blockquote block', () => {
    const doc = 'p\n\n> quote one\n> quote two\nafter'
    const b = blockAt(doc, doc.indexOf('quote two'))
    expect(b?.kind).toBe('blockquote')
    expect(slice(doc, b)).toBe('> quote one\n> quote two')
  })

  it('a bare `>` separator keeps its quote whole instead of splitting it', () => {
    const doc = 'p\n\n> quote one\n>\n> quote two\nafter'
    const b = blockAt(doc, doc.indexOf('quote two'))
    expect(b?.kind).toBe('blockquote')
    expect(slice(doc, b)).toBe('> quote one\n>\n> quote two')
    // One block start, so no grip or drop slot appears mid-quote.
    expect(blockStarts(doc).filter((s) => s.kind === 'blockquote')).toHaveLength(1)
    expect(blockStarts(doc).some((s) => s.from === doc.indexOf('> quote two'))).toBe(false)
  })

  it('a `>` inside a closed top-level fence is code, never a quote with its own grip', () => {
    const doc = 'p\n\n```\n> a\n>\nb\n```\nafter'
    const b = blockAt(doc, doc.indexOf('> a'))
    expect(b?.kind).toBe('code')
    expect(slice(doc, b)).toBe('```\n> a\n>\nb\n```')
    expect(blockStarts(doc).some((s) => s.kind === 'blockquote')).toBe(false)
  })

  it('a QUOTED fence keeps its box — the `>` is real there', () => {
    const doc = 'p\n\n> ```\n> code\n> ```\nafter'
    expect(blockAt(doc, doc.indexOf('code'))?.kind).toBe('blockquote')
  })

  it('a fenced code block is one block, and a `#` inside it is not mis-read as a heading', () => {
    const doc = 'p\n\n```\n# not a heading\ncode\n```\nafter'
    const b = blockAt(doc, doc.indexOf('# not a heading'))
    expect(b?.kind).toBe('code')
    expect(slice(doc, b)).toBe('```\n# not a heading\ncode\n```')
  })

  it('a thematic break is its own block and is never absorbed by an adjacent paragraph', () => {
    const doc = 'para one\n---\npara two'
    expect(blockAt(doc, 0)?.kind).toBe('paragraph')
    expect(slice(doc, blockAt(doc, 0))).toBe('para one') // stops at the hr
    const hr = blockAt(doc, doc.indexOf('---'))
    expect(hr?.kind).toBe('hr')
    expect(slice(doc, hr)).toBe('---')
    expect(slice(doc, blockAt(doc, doc.indexOf('para two')))).toBe('para two')
  })

  it('paragraph is the run of non-blank lines, bounded by a blank line', () => {
    const doc = 'line one\nline two\n\nother'
    const b = blockAt(doc, 0)
    expect(b?.kind).toBe('paragraph')
    expect(slice(doc, b)).toBe('line one\nline two')
  })

  it('a paragraph stops at an adjacent heading with no blank between', () => {
    const doc = 'intro text\n# Heading\nbody'
    expect(slice(doc, blockAt(doc, 0))).toBe('intro text')
  })

  it('a blank line owns no block', () => {
    const doc = 'a\n\nb'
    expect(blockAt(doc, 2)).toBeNull()
  })

  it('to is exclusive of the trailing newline', () => {
    const doc = 'para\n\nnext'
    const b = blockAt(doc, 0)
    expect(doc[b!.to]).toBe('\n')
  })

  it('a table region is one block', () => {
    // A pipe-less line glued directly to a table is a GFM 1-cell row, so a real table sits before a blank.
    const doc = 'p\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\nafter'
    const b = blockAt(doc, doc.indexOf('| 1 | 2 |'))
    expect(b?.kind).toBe('table')
    expect(slice(doc, b)).toBe('| a | b |\n| - | - |\n| 1 | 2 |')
  })

  it('a multi-line list item keeps its wrapped body in the list block', () => {
    const doc = '- item one\n  wrapped text\n- item two'
    expect(slice(doc, blockAt(doc, 0))).toBe(doc) // from the marker
    const wrap = blockAt(doc, doc.indexOf('wrapped'))
    expect(wrap?.kind).toBe('list') // the wrapped line is the list, not an orphan paragraph
    expect(slice(doc, wrap)).toBe(doc)
  })

  it('an ordered list item keeps its continuation', () => {
    const doc = '1. first\n   continues\n2. second'
    const b = blockAt(doc, doc.indexOf('continues'))
    expect(b?.kind).toBe('list')
    expect(slice(doc, b)).toBe(doc)
  })

  it('a bare indented line with no marker above is a paragraph, not a list', () => {
    const doc = 'intro\n  indented continuation'
    const b = blockAt(doc, 0)
    expect(b?.kind).toBe('paragraph')
    expect(slice(doc, b)).toBe(doc)
  })

  it('blank-separated list items split into separate blocks (V1 decision, pinned)', () => {
    const doc = '- a\n\n- b'
    expect(slice(doc, blockAt(doc, 0))).toBe('- a')
    expect(slice(doc, blockAt(doc, doc.indexOf('- b')))).toBe('- b')
  })

  it('an unclosed code fence at EOF is one code block', () => {
    const doc = 'p\n\n```\ncode\nmore'
    const b = blockAt(doc, doc.indexOf('code'))
    expect(b?.kind).toBe('code')
    expect(slice(doc, b)).toBe('```\ncode\nmore')
  })

  it('duplicate heading text resolves each section by offset, not name', () => {
    const doc = '# Dup\nbody1\n# Dup\nbody2'
    expect(slice(doc, blockAt(doc, 0))).toBe('# Dup\nbody1')
    expect(slice(doc, blockAt(doc, doc.lastIndexOf('# Dup')))).toBe('# Dup\nbody2')
  })

  it('adjacent callouts box separately (per-head detection)', () => {
    const doc = '> [!note] First\n> a\n> [!tip] Second\n> b'
    expect(slice(doc, blockAt(doc, doc.indexOf('> a')))).toBe('> [!note] First\n> a')
    expect(slice(doc, blockAt(doc, doc.indexOf('Second')))).toBe('> [!tip] Second\n> b')
  })

  it('multi-line block math is ONE block, even across an internal blank line', () => {
    const doc = '$$\nx=1\n\ny=2\n$$'
    const b = blockAt(doc, 0)
    expect(b?.kind).toBe('math')
    expect(slice(doc, b)).toBe(doc)
    expect(slice(doc, blockAt(doc, doc.indexOf('y=2')))).toBe(doc)
  })

  it('a math block bounded by paragraphs claims only its own lines', () => {
    const doc = 'before\n$$\nx=1\n$$\nafter'
    expect(slice(doc, blockAt(doc, 0))).toBe('before')
    expect(slice(doc, blockAt(doc, doc.indexOf('x=1')))).toBe('$$\nx=1\n$$')
    expect(slice(doc, blockAt(doc, doc.indexOf('after')))).toBe('after')
  })

  it('single-line $$x$$ stays inline — its line is an ordinary paragraph', () => {
    const doc = 'see $$x=1$$ here\nmore'
    const b = blockAt(doc, 0)
    expect(b?.kind).toBe('paragraph')
    expect(slice(doc, b)).toBe(doc)
  })

  it('a $$ pair inside a code fence is code, never math', () => {
    const doc = '```\n$$\nx=1\n$$\n```'
    const b = blockAt(doc, doc.indexOf('x=1'))
    expect(b?.kind).toBe('code')
    expect(slice(doc, b)).toBe(doc)
  })

  it('a heading-looking line inside block math is math content', () => {
    const doc = '$$\n# not a heading\n$$'
    expect(blockAt(doc, doc.indexOf('# not'))?.kind).toBe('math')
  })

  it('blockStarts marks a math block once, at its opening line', () => {
    const doc = 'p\n\n$$\nx=1\n\ny=2\n$$\n\nq'
    const starts = blockStarts(doc)
    expect(starts.filter((s) => s.kind === 'math')).toEqual([{ from: 3, kind: 'math' }])
  })

  it('a stray $$ in prose or inline code never pairs with a real math delimiter', () => {
    const doc = 'Wrap in `$$` to display.\n\n$$\na\n\nb\n$$\n\ntail'
    expect(slice(doc, blockAt(doc, 0))).toBe('Wrap in `$$` to display.')
    const math = blockAt(doc, doc.indexOf('a\n'))
    expect(math?.kind).toBe('math')
    expect(slice(doc, math)).toBe('$$\na\n\nb\n$$')
    expect(slice(doc, blockAt(doc, doc.indexOf('tail')))).toBe('tail')
  })

  it('mid-line $$ occurrences (prices, shell) are never math delimiters', () => {
    const doc = 'price $$50 today\n\ntotal $$70 tomorrow'
    expect(blockStarts(doc).every((s) => s.kind === 'paragraph')).toBe(true)
  })

  it('hanging delimiters ($$ sharing a line with content) stay ordinary paragraph lines', () => {
    const doc = '$$ x = 1 +\n2 $$'
    const b = blockAt(doc, 0)
    expect(b?.kind).toBe('paragraph')
    expect(slice(doc, b)).toBe(doc)
  })

  it('an unpaired lone $$ line claims nothing', () => {
    const doc = 'p\n\n$$\n\nq'
    expect(blockAt(doc, 3)?.kind).toBe('paragraph')
    expect(slice(doc, blockAt(doc, 3))).toBe('$$')
  })

  it('a fenced block holding a blank line starts ONCE — no drop candidate inside the code', () => {
    const doc = '```js\nconst a = 1\n\nconst b = 2\n```'
    const starts = blockStarts(doc)
    expect(starts).toEqual([{ from: 0, kind: 'code' }])
  })

  it('two glued fences each keep their own block start', () => {
    const doc = '```\na\n```\n```\nb\n```'
    expect(blockStarts(doc).filter((s) => s.kind === 'code')).toHaveLength(2)
  })

  it('indented math with an internal blank rides its list item whole — dragging the bullet cannot tear it', () => {
    const doc = '- item one\n  $$\n  x\n\n  y\n  $$\n- item two'
    const b = blockAt(doc, 0)
    expect(b?.kind).toBe('list')
    expect(slice(doc, b)).toBe(doc) // the run holds both items and the whole formula
    expect(blockAt(doc, doc.indexOf('  x'))?.kind).toBe('math')
  })

  it('indented math without a blank stays inside its list block (unchanged shape)', () => {
    const doc = '- item\n  $$\n  x\n  $$'
    expect(slice(doc, blockAt(doc, 0))).toBe(doc)
  })

  it('top-level math glued below a list is never pulled into the run', () => {
    const doc = '- item\n$$\nx\n\ny\n$$'
    expect(slice(doc, blockAt(doc, 0))).toBe('- item')
    const math = blockAt(doc, doc.indexOf('x'))
    expect(math?.kind).toBe('math')
    expect(slice(doc, math)).toBe('$$\nx\n\ny\n$$')
  })

  it('blockStarts marks the heading line and each block inside its section, with kinds', () => {
    const doc = '# H\npara one\npara two\n\n- a\n- b\n\nplain'
    expect(blockStarts(doc)).toEqual([
      { from: 0, kind: 'heading' },
      { from: 4, kind: 'paragraph' },
      { from: 23, kind: 'list' },
      { from: 32, kind: 'paragraph' },
    ])
  })

  // A code/table block on the FIRST line looks its previous line up off the top edge — that neighbor
  // lookup must not crash the editor's initial parse.
  it('a doc starting with a code fence does not crash and starts a code block at 0', () => {
    const doc = '```js\nconst x = 1\n```\npara'
    expect(() => blockStarts(doc)).not.toThrow()
    expect(blockStarts(doc)[0]).toEqual({ from: 0, kind: 'code' })
  })
  it('a doc starting with a table does not crash and starts a table block at 0', () => {
    const doc = '| a | b |\n| - | - |\n| 1 | 2 |\npara'
    expect(() => blockStarts(doc)).not.toThrow()
    expect(blockStarts(doc)[0]).toEqual({ from: 0, kind: 'table' })
  })
})

describe('embed blocks', () => {
  it('a lone-line embed glued under prose is its own block, not paragraph-absorbed', () => {
    const doc = 'Some text\n![[Foo]]\nMore text'
    const b = blockAt(doc, 12)
    expect(b?.kind).toBe('embed')
    expect(slice(doc, b)).toBe('![[Foo]]')
    expect(blockStarts(doc).map((s) => s.kind)).toEqual(['paragraph', 'embed', 'paragraph'])
  })

  it('an indented embed rides its list item — no mid-item block, grip, or drop slot', () => {
    const doc = '- item one\n  ![[Foo]]\n  more body\n- item two'
    const b = blockAt(doc, 14)
    expect(b?.kind).toBe('list')
    expect(slice(doc, b)).toBe(doc)
    expect(blockStarts(doc).map((s) => s.kind)).toEqual(['list'])
  })

  it('a top-level indented ![[…]] line is an ordinary paragraph', () => {
    const doc = 'para\n\n  ![[Foo]]'
    expect(blockAt(doc, 10)?.kind).toBe('paragraph')
  })

  it('blank-fenced embed keeps single-line drag boundaries', () => {
    const doc = 'para\n\n![[Foo]]\n\npara two'
    const b = blockAt(doc, 8)
    expect(b).toEqual({ from: 6, to: 14, kind: 'embed' })
  })

  it('a fenced ![[…]] stays code', () => {
    const doc = '```\n![[Foo]]\n```'
    expect(blockAt(doc, 6)?.kind).toBe('code')
  })

  it('a non-lone ![[…]] line stays paragraph', () => {
    const doc = 'see ![[Foo]] here'
    expect(blockAt(doc, 6)?.kind).toBe('paragraph')
  })
})

// The citations section owns no block, the way a blank line owns none — no grip on its rows, no drop
// target inside it, and no absorption into the paragraph above.
describe('the citations section is inert to the block layer', () => {
  const doc = 'intro line\n\nbody [^1] text\n\n[^1]: one\ncontinued\n[^2]: two'

  it('resolves no block anywhere inside the section', () => {
    for (const at of [doc.indexOf('[^1]: one'), doc.indexOf('continued'), doc.indexOf('[^2]: two')])
      expect(blockAt(doc, at)).toBeNull()
  })

  it('starts no block on any of its lines', () => {
    const starts = blockStarts(doc)
    const firstCitation = doc.indexOf('[^1]: one')
    expect(starts.every((s) => s.from < firstCitation)).toBe(true)
  })

  it('leaves the paragraph above it whole, and stops it at the section', () => {
    const b = blockAt(doc, doc.indexOf('body'))
    expect(b?.kind).toBe('paragraph')
    expect(slice(doc, b)).toBe('body [^1] text')
  })

  it('claims the section even with no blank line between it and the paragraph', () => {
    const glued = 'body [^1] text\n[^1]: one'
    const b = blockAt(glued, 0)
    expect(slice(glued, b)).toBe('body [^1] text')
  })

  it('resolves nothing at all in a document that is only citations', () => {
    expect(blockAt('[^1]: one\n[^2]: two', 0)).toBeNull()
    expect(blockStarts('[^1]: one\n[^2]: two')).toEqual([])
  })
})
