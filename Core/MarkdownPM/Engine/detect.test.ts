import { describe, it, expect } from 'vitest'
import { composeWebpageEmbedLine, markdownLinkRegex } from '../../Connections/links'
import { tokenize } from './tokens'
import { scanDoc } from './docScan'
import { isBlockquoteLine, quoteDepthOf } from './markdownCode'
import {
  loneWebpageEmbed,
  isThematicBreakLine,
  isHeadingLine,
  isInlineMathContent,
  parseListMarker,
  indentLevel,
  calloutHeadPrefixLen,
  parseListMarkerPrefixed,
  scanFencedCode,
  splitWithOffsets,
} from './detect'
import { pageEmbedPattern, pageLinkPattern } from '../../Connections/connections'

describe('thematic break (HR)', () => {
  it('treats ---, ***, ___ as HR; rejects too-short / list lines', () => {
    expect(isThematicBreakLine('---')).toBe(true)
    expect(isThematicBreakLine('***')).toBe(true)
    expect(isThematicBreakLine('___')).toBe(true)
    expect(isThematicBreakLine('--')).toBe(false)
    expect(isThematicBreakLine('- a')).toBe(false)
  })
  it('--- is always HR (no setext interpretation)', () => {
    expect(isThematicBreakLine('---')).toBe(true)
  })
})

describe('heading', () => {
  it('needs 1-6 # then a space or EOL, ≤3 leading spaces', () => {
    expect(isHeadingLine('# H')).toBe(true)
    expect(isHeadingLine('###### H')).toBe(true)
    expect(isHeadingLine('   # H')).toBe(true)
    expect(isHeadingLine('#H')).toBe(false)
    expect(isHeadingLine('####### H')).toBe(false)
    expect(isHeadingLine('    # H')).toBe(false)
  })
})

describe('parseListMarker (single marker source)', () => {
  it('bullet: ranges + level (2 spaces = 1 level)', () => {
    const m = parseListMarker('  - x')!
    expect(m.kind).toBe('bullet')
    expect(m.bullet).toBe('-')
    expect([m.markerStart, m.markerEnd, m.contentStart]).toEqual([2, 3, 4])
    expect(m.level).toBe(1)
    expect(m.box).toBeUndefined()
  })
  it('ordered: digits + marker spans through the dot', () => {
    const m = parseListMarker('12. y')!
    expect(m.kind).toBe('ordered')
    expect(m.ordinal).toBe('12')
    expect([m.markerStart, m.markerEnd, m.contentStart]).toEqual([0, 3, 4])
  })
  it('alphabetical: one uppercase letter + dot; lowercase stays prose', () => {
    const m = parseListMarker('B. y')!
    expect(m.kind).toBe('alphabetical')
    expect(m.ordinal).toBe('B')
    expect([m.markerStart, m.markerEnd, m.contentStart]).toEqual([0, 2, 3])
    expect(parseListMarker('b. y')).toBeNull()
    expect(parseListMarker('AB. y')).toBeNull()
  })
  it('checkbox: bracket span + checked, markerEnd at the bracket end', () => {
    const m = parseListMarker('- [x] done')!
    expect(m.kind).toBe('checkbox')
    expect(m.checked).toBe(true)
    expect([m.box!.start, m.box!.end]).toEqual([2, 5])
    expect(m.markerEnd).toBe(5)
    expect(m.contentStart).toBe(6)
  })
  it('empty [] is a bullet (box present, not a checkbox); ordered "1. [ ]" stays ordered', () => {
    expect(parseListMarker('-[] a')!.kind).toBe('bullet')
    expect(parseListMarker('1. [ ] a')!.kind).toBe('ordered')
  })
  it('only `-` and `+` bullet: `*` and `•` are prose, checkbox included', () => {
    expect(parseListMarker('- a')!.kind).toBe('bullet')
    expect(parseListMarker('+ a')!.kind).toBe('bullet')
    expect(parseListMarker('* a')).toBeNull()
    expect(parseListMarker('• a')).toBeNull()
    expect(parseListMarker('* [ ] a')).toBeNull()
  })
  it('arrow: `→ ` is a list marker (the glyph IS the marker), nesting via indent', () => {
    const m = parseListMarker('→ go')!
    expect(m.kind).toBe('arrow')
    expect(m.bullet).toBe('→')
    expect([m.markerStart, m.markerEnd, m.contentStart]).toEqual([0, 1, 2])
    expect(parseListMarker('\t→ nested')!.level).toBe(1)
  })
  it('returns null for non-list lines and markers with no trailing space', () => {
    expect(parseListMarker('plain')).toBeNull()
    expect(parseListMarker('-[x]done')).toBeNull()
    expect(parseListMarker('→go')).toBeNull()
  })
  it('a line of spaced dashes is a divider, not a bullet', () => {
    expect(parseListMarker('- - -')).toBeNull()
    expect(parseListMarker('  -  -  -')).toBeNull()
    expect(parseListMarker('- - x')!.kind).toBe('bullet')
  })
  it('indentLevel: tabs + ⌊spaces/2⌋, capped at the max', () => {
    expect(indentLevel('')).toBe(0)
    expect(indentLevel('    ')).toBe(2)
    expect(indentLevel('\t\t\t\t')).toBe(3)
  })
})

describe('blockquote', () => {
  it('needs > then a space/tab, or the line end (>a does not activate)', () => {
    expect(isBlockquoteLine('> a')).toBe(true)
    expect(isBlockquoteLine('>a')).toBe(false)
  })

  it('a bare > is the blank line inside a quote', () => {
    expect(isBlockquoteLine('>')).toBe(true)
    expect(isBlockquoteLine('>>')).toBe(true)
  })

  it('nested >> activates', () => {
    expect(isBlockquoteLine('>> a')).toBe(true)
    expect(isBlockquoteLine('>>a')).toBe(false)
  })

  it('four columns of indent read as indented code', () => {
    expect(isBlockquoteLine('   > a')).toBe(true)
    expect(isBlockquoteLine('    > a')).toBe(false)
    expect(isBlockquoteLine('\t> a')).toBe(false)
  })

  it('every level needs its space: `> >a` is one level holding the prose `>a`', () => {
    expect(quoteDepthOf('> > a')).toBe(2)
    expect(quoteDepthOf('> >a')).toBe(1)
    expect(quoteDepthOf('>\r')).toBe(1)
  })
})

describe('inline matchers (verbatim regexes)', () => {
  it('image embed ![[name]]', () => {
    const m = pageEmbedPattern().exec('see ![[pic]] here')
    expect(m?.[1]).toBe('pic')
  })
  it('markdown link [t](u)', () => {
    const m = markdownLinkRegex().exec('[t](http://u)')
    expect(m?.[1]).toBe('t')
    expect(m?.[2]).toBe('http://u')
  })
  it('wikilink detection reuses Core/Connections (title-only, excludes ![[ ]])', () => {
    expect([...'[[Page]]'.matchAll(pageLinkPattern())].map((m) => m[1])).toEqual(['Page'])
    expect([...'![[img]]'.matchAll(pageLinkPattern())]).toHaveLength(0)
  })
})

describe('inline math heuristic', () => {
  it('accepts mathy / short letter content; rejects currency + prose', () => {
    expect(isInlineMathContent('x+1')).toBe(true)
    expect(isInlineMathContent('x')).toBe(true)
    expect(isInlineMathContent('5')).toBe(false)
    expect(isInlineMathContent('word')).toBe(false)
  })
})

const calloutLines = (lines: string[]): ReturnType<typeof scanDoc>['callouts'] =>
  scanDoc(lines.join('\n')).callouts

describe('callout detection', () => {
  it('marks every line of a `[!type]`-headed quote run as a callout (first/last + prefix to hide)', () => {
    const info = calloutLines(['> [!callout] hi', '> more', 'plain'])
    expect(info[0]).toEqual({ first: true, last: false, prefixEnd: '> [!callout] '.length })
    expect(info[1]).toEqual({ first: false, last: true, prefixEnd: '> '.length })
    expect(info[2]).toBeUndefined()
  })
  it('leaves a plain quote (no tag) untouched — callouts coexist with quotes', () => {
    expect(calloutLines(['> just a quote', '> still'])).toEqual([undefined, undefined])
  })
  it('per-head: two adjacent heads are TWO separate callouts, never one box with a raw tag', () => {
    const info = calloutLines(['> [!callout] a', '> [!callout] b'])
    expect(info[0]).toEqual({ first: true, last: true, prefixEnd: '> [!callout] '.length })
    expect(info[1]).toEqual({ first: true, last: true, prefixEnd: '> [!callout] '.length })
  })
  it('per-head: a tag on a non-first quote line starts a callout there (quote above stays a quote)', () => {
    const info = calloutLines(['> a normal quote', '> [!callout] now a callout', '> its body'])
    expect(info[0]).toBeUndefined()
    expect(info[1]?.first).toBe(true)
    expect(info[2]).toEqual({ first: false, last: true, prefixEnd: '> '.length })
  })
  it('calloutHeadPrefixLen measures the full `> [!type] ` head, null on a body/quote line', () => {
    expect(calloutHeadPrefixLen('> [!callout] hi')).toBe('> [!callout] '.length)
    expect(calloutHeadPrefixLen('> body')).toBeNull()
    expect(calloutHeadPrefixLen('plain')).toBeNull()
  })
})

describe('parseListMarkerPrefixed (lists behind a quote/callout prefix)', () => {
  it('finds a bullet behind `> ` with full-line offsets', () => {
    const lm = parseListMarkerPrefixed('> - item')!
    expect(lm.kind).toBe('bullet')
    expect(lm.markerStart).toBe(2)
    expect(lm.contentStart).toBe(4)
  })
  it('finds a checkbox behind `> ` with shifted box offsets', () => {
    const lm = parseListMarkerPrefixed('> - [x] done')!
    expect(lm.kind).toBe('checkbox')
    expect(lm.box?.start).toBe('> - '.length)
  })
  it('matches plain parseListMarker when there is no prefix', () => {
    const lm = parseListMarkerPrefixed('1. top')!
    expect(lm.kind).toBe('ordered')
    expect(lm.markerStart).toBe(0)
  })
  it('does NOT strip a `>` with no space after it (not a real quote — agrees with the renderer)', () => {
    expect(parseListMarkerPrefixed('>- x')).toBeNull()
  })
})

describe('fence language capture', () => {
  const scan = (text: string) => {
    const { lines, lineStarts } = splitWithOffsets(text)
    return scanFencedCode(lines, lineStarts)
  }
  it('the info word rides the whole block; a bare fence carries none', () => {
    const typed = scan('```yaml\nkey: 1\n```')
    expect(typed[0]?.name).toBe('YAML')
    expect(typed[1]?.name).toBe('YAML')
    const bare = scan('```\nx\n```')
    expect(bare[0]?.name).toBeUndefined()
  })
  it('only the first word counts, whitespace tolerated', () => {
    expect(scan('``` json extra\n{}\n```')[0]?.name).toBe('JSON')
  })
  it('the info word rides a run of any length', () => {
    expect(scan('````yaml\nk: 1\n````')[0]?.name).toBe('YAML')
    expect(scan('`````yaml\nk: 1\n`````')[0]?.name).toBe('YAML')
  })
  it('markerEnd tracks the run, so the info word hides in its own place', () => {
    expect(scan('```yaml\nx\n```')[0]?.markerEnd).toBe(3)
    expect(scan('````yaml\nx\n````')[0]?.markerEnd).toBe(4)
    expect(scan('> `````yaml\n> x\n> `````')[0]?.markerEnd).toBe(7)
  })
})

describe('a diff fence', () => {
  const scan = (text: string) => {
    const { lines, lineStarts } = splitWithOffsets(text)
    return scanFencedCode(lines, lineStarts)
  }
  it('reads each line’s sign and the fence’s totals, which every line shares', () => {
    const f = scan(
      '```diff-ts\n--- a/x\n+++ b/x\n@@ run @@\n const a\n-let b\n+let c\n+let d\nplain\n```',
    )
    expect(f.slice(1, 9).map((l) => l?.diff)).toEqual([
      'head',
      'head',
      'head',
      'same',
      'del',
      'add',
      'add',
      undefined,
    ])
    expect(f[0]?.tally).toEqual({ add: 2, del: 1 })
    expect(f[9]?.tally).toBe(f[0]?.tally)
  })
  it('reads a lone `--- ` as a removed line', () => {
    expect(scan('```sql|diff\n--- old comment\n+select 1\n```')[1]?.diff).toBe('del')
  })
  it('reads the sign past a quote prefix', () => {
    expect(scan('> ```diff\n> +x\n> ```')[1]?.diff).toBe('add')
  })
  it('leaves a fence that names no diff without signs or totals', () => {
    const f = scan('```ts\n+x\n```')
    expect(f[1]?.diff).toBeUndefined()
    expect(f[0]?.tally).toBeUndefined()
  })
})

describe('fence run length — a longer fence holds shorter ones', () => {
  const roles = (text: string): (string | undefined)[] => {
    const { lines, lineStarts } = splitWithOffsets(text)
    return scanFencedCode(lines, lineStarts).map((f) => f?.role)
  }
  it('a ``` line inside a ````` block is content, not a close', () => {
    expect(roles('`````\na\n```\nb\n```\nc\n`````\nafter')).toEqual([
      'open',
      'content',
      'content',
      'content',
      'content',
      'content',
      'close',
      undefined,
    ])
  })
  it('an equal or longer run closes; a shorter one never does', () => {
    expect(roles('`````\na\n`````\nafter')).toEqual(['open', 'content', 'close', undefined])
    expect(roles('`````\na\n```````\nafter')).toEqual(['open', 'content', 'close', undefined])
    expect(roles('`````\na\n```\nafter')).toEqual([undefined, undefined, undefined, undefined])
  })
  it('a closer carrying an info word is content — only a bare run ends the block', () => {
    expect(roles('```\n```js\nx\n```\nafter')).toEqual([
      'open',
      'content',
      'content',
      'close',
      undefined,
    ])
  })
  it('length pairs alongside marker and quote depth, never instead of them', () => {
    expect(roles('`````\n~~~\nx\n~~~\n`````')).toEqual([
      'open',
      'content',
      'content',
      'content',
      'close',
    ])
    expect(roles('`````\n> ```\nx\n> ```\n`````')).toEqual([
      'open',
      'content',
      'content',
      'content',
      'close',
    ])
  })
  it('a backtick fence whose info string holds a backtick is prose, not a fence', () => {
    expect(roles('```a`b\nx\nafter')).toEqual([undefined, undefined, undefined])
  })
  it('a CRLF document still fences (the trailing \\r is not an info string)', () => {
    expect(roles('`````\r\na\r\n```\r\nb\r\n`````\r\nafter\r')).toEqual([
      'open',
      'content',
      'content',
      'content',
      'close',
      undefined,
    ])
  })
})

describe('the markdown-link label', () => {
  it('an escaped label tokenizes rather than producing nothing', () => {
    const doc = 'see [Notes \\[WIP\\] final](Target) end'
    const link = tokenize(doc).find((t) => t.kind === 'link')
    expect(link).toBeDefined()
    expect(doc.slice(link!.contentRange[0], link!.contentRange[1])).toBe('Notes \\[WIP\\] final')
  })

  // Obsidian shows this as a connection followed by literal parens, and a shared vault is the reason both syntaxes exist at all.
  it('a wikilink followed by parens stays a connection', () => {
    const tokens = tokenize('see [[Notes]](Target) end')
    expect(tokens.some((t) => t.kind === 'wikiLink')).toBe(true)
    expect(tokens.some((t) => t.kind === 'link')).toBe(false)
  })

  // The cap on the label group is what keeps the alternation from backtracking quadratically.
  it('a pathological bracket run completes rather than hanging', () => {
    expect(() => tokenize('['.repeat(50000))).not.toThrow()
    expect(tokenize(`[${'x'.repeat(256)}](t)`).some((t) => t.kind === 'link')).toBe(false)
  })
})

const URL = 'https://www.example.com/a/b'

describe('loneWebpageEmbed — what a webpage-embed line is', () => {
  it('reads the lone line, empty label included', () => {
    expect(loneWebpageEmbed(`![](${URL})`)).toEqual({ label: '', url: URL })
    expect(loneWebpageEmbed(`![Docs](${URL})`)).toEqual({ label: 'Docs', url: URL })
    expect(loneWebpageEmbed(`![Docs](${URL})   `)).toEqual({ label: 'Docs', url: URL })
  })

  it('unescapes the label it returns', () => {
    expect(loneWebpageEmbed(`![Notes \\[WIP\\]](${URL})`)).toEqual({
      label: 'Notes [WIP]',
      url: URL,
    })
  })

  it('requires an explicit http(s) scheme on a valid address', () => {
    for (const bad of [
      'file:///etc/hosts',
      'javascript:alert(1)',
      'mailto:a@b.com',
      'www.example.com',
      'example.com/path',
      'https://',
      'https://nodot',
    ])
      expect(loneWebpageEmbed(`![](${bad})`), bad).toBeNull()
  })

  it('refuses the degenerate and the non-lone shapes', () => {
    expect(loneWebpageEmbed('![]()')).toBeNull()
    expect(loneWebpageEmbed(`  ![](${URL})`)).toBeNull()
    expect(loneWebpageEmbed(`![](${URL}) tail`)).toBeNull()
    expect(loneWebpageEmbed(`lead ![](${URL})`)).toBeNull()
    expect(loneWebpageEmbed(`[](${URL})`)).toBeNull()
  })

  it('refuses a label whose ] is unescaped, and an unbalanced destination', () => {
    expect(loneWebpageEmbed(`![a]b](${URL})`)).toBeNull()
    expect(loneWebpageEmbed('![](https://example.com/a(b)')).toBeNull()
  })

  it('follows a destination through balanced parens', () => {
    const wiki = 'https://en.wikipedia.org/wiki/A_(b)'
    expect(loneWebpageEmbed(`![](${wiki})`)).toEqual({ label: '', url: wiki })
  })
})

describe('composeWebpageEmbedLine — the ONE assembly path', () => {
  it('writes the line the detector reads back — brackets and backslashes included', () => {
    for (const label of ['', 'Docs', 'Notes [WIP]', 'a\\b', ']]', 'Chapter [2]']) {
      const line = composeWebpageEmbedLine(label, URL)
      expect(loneWebpageEmbed(line), JSON.stringify(label)).toEqual({ label, url: URL })
    }
  })

  it('writes the bare form for an empty label', () => {
    expect(composeWebpageEmbedLine('', URL)).toBe(`![](${URL})`)
  })
})
