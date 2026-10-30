import { describe, it, expect } from 'vitest'
import {
  splitEnvelope,
  splitFrontmatter,
  assembleEnvelope,
  mergeFrontmatter,
  sweepParse,
} from './pageFile'
import type { KeyCollision } from './rootValues'

const rekey = (content: string, from: string, to: string, collision: KeyCollision): string | null =>
  sweepParse(content)?.rekey(from, to, collision) ?? null

describe('splitEnvelope / assembleEnvelope', () => {
  it('round-trips a canonical envelope', () => {
    const content = '---\nid: X\n---\nBody text'
    expect(splitEnvelope(content)).toEqual({
      frontmatter: 'id: X',
      fenced: true,
      body: 'Body text',
    })
    expect(assembleEnvelope('id: X\n', 'Body text')).toBe(content)
  })

  it('reads an envelope with a separator blank line to the same body', () => {
    expect(splitEnvelope('---\nid: X\n---\n\nBody text')).toEqual({
      frontmatter: 'id: X',
      fenced: true,
      body: 'Body text',
    })
  })

  it('strips exactly one separator blank line before the body', () => {
    expect(splitEnvelope('---\nid: X\n---\n\n\nBody').body).toBe('\nBody')
  })

  it('treats a file with no opening fence as all body', () => {
    expect(splitEnvelope('Just body')).toEqual({
      frontmatter: '',
      fenced: false,
      body: 'Just body',
    })
  })

  it('treats an unterminated fence as all body (lenient)', () => {
    const content = '---\nid: X'
    expect(splitEnvelope(content)).toEqual({ frontmatter: '', fenced: false, body: content })
  })

  it('reads an empty block as an empty block, not as body', () => {
    expect(splitEnvelope('---\n---\nHello')).toEqual({
      frontmatter: '',
      fenced: true,
      body: 'Hello',
    })
  })

  it('closes an empty block at its own fence, leaving a later rule in the body', () => {
    expect(splitEnvelope('---\n---\nfoo\n---\nbar').body).toBe('foo\n---\nbar')
  })
})

describe('splitFrontmatter', () => {
  it('reads a whole unquoted wikilink’s title as written where yaml read it as a number or boolean that prints otherwise', () => {
    expect(
      splitFrontmatter(
        '---\nA: [[007]]\nB:\n  - [[1.10]]\n  - [[2024]]\nC: [[True]]\nD: 007\n---\nBody',
      ),
    ).toEqual({ A: [['007']], B: [[['1.10']], [[2024]]], C: [['True']], D: 7 })
  })
})

describe('mergeFrontmatter — an empty or absent block', () => {
  it('a body-only write keeps an empty block byte for byte', () => {
    expect(mergeFrontmatter('---\n---\nold', {}, [], 'new')).toBe('---\n---\nnew')
  })

  it('a stamp fills an empty block in place', () => {
    expect(mergeFrontmatter('---\n---\nHello', { ID: 'X' }, ['ID'], 'Hello')).toBe(
      '---\nID: X\n---\nHello',
    )
  })

  it('removing the last key leaves an empty block rather than {}', () => {
    expect(mergeFrontmatter('---\nID: X\n---\nBody', {}, ['ID'], 'Body')).toBe('---\n---\nBody')
  })

  it('removing a key from a page with no block writes the body alone', () => {
    expect(mergeFrontmatter('Body', {}, ['ID'], 'Body')).toBe('Body')
  })

  it('a flow collection another key’s write leaves alone keeps its unpadded spelling, and a padded one loses its padding', () => {
    expect(
      mergeFrontmatter('---\nList: [milk, eggs]\n---\nBody', { ID: 'X' }, ['ID'], 'Body'),
    ).toBe('---\nList: [milk, eggs]\nID: X\n---\nBody')
    expect(mergeFrontmatter('---\nList: [ milk ]\n---\nBody', { ID: 'X' }, ['ID'], 'Body')).toBe(
      '---\nList: [milk]\nID: X\n---\nBody',
    )
  })

  it('a changed list keeps its flow or block style and a kept wikilink, whole or a member, its flow spelling, while a whole wikilink that grows is a block list', () => {
    expect(
      mergeFrontmatter(
        `---\nL: [a]\nF:\n  - [[a.png]]\nG: [[a.png]]\n---\nBody`,
        {
          L: ['a', 'b'],
          F: [[['a.png']], '[[b.png]]'],
          G: ['[[a.png]]', '[[c.png]]'],
          R: [['Page']],
        },
        ['L', 'F', 'G', 'R'],
        'Body',
      ),
    ).toBe(
      `---\nL: [a, b]\nF:\n  - [[a.png]]\n  - "[[b.png]]"\nG:\n  - "[[a.png]]"\n  - "[[c.png]]"\nR: [[Page]]\n---\nBody`,
    )
  })

  it('a changed string keeps the quotes the file held for it, else takes the quotes the file chose, never ones yaml needed, and a string yaml quotes unasked takes the chosen style, else the held one', () => {
    expect(
      mergeFrontmatter(
        `---\nN: "42"\nS: 'x'\nL: ["a", b]\nY:\n  - '2024'\nZ: ["2024", 'a']\n---\nBody`,
        {
          N: 'hello',
          S: 'y',
          L: ['a', 'b', 'c'],
          Y: ['2024', 'x', '2025'],
          Z: ['2024', 'a', '2025'],
        },
        ['N', 'S', 'L', 'Y', 'Z'],
        'Body',
      ),
    ).toBe(
      `---\nN: hello\nS: 'y'\nL: ["a", b, "c"]\nY:\n  - '2024'\n  - x\n  - '2025'\nZ: ["2024", 'a', '2025']\n---\nBody`,
    )
  })

  it('a changed block or multi-line value is spelled as yaml spells it', () => {
    expect(
      mergeFrontmatter(
        `---\nB: |-\n  old\n  l2\nM: "x"\n---\nBody`,
        { B: 'x', M: 'a\nb' },
        ['B', 'M'],
        'Body',
      ),
    ).toBe(`---\nB: x\nM: |-\n  a\n  b\n---\nBody`)
  })

  it('a comment-only block keeps its comment when an absent key is removed', () => {
    expect(mergeFrontmatter('---\n# c\n---\nBody', {}, ['ID'], 'Body')).toBe('---\n# c\n---\nBody')
  })

  it('removing the last key keeps a trailing comment', () => {
    expect(mergeFrontmatter('---\nID: X\n# trailing\n---\nBody', {}, ['ID'], 'Body')).toBe(
      '---\n# trailing\n---\nBody',
    )
  })

  it('a comment above the last key goes with it', () => {
    expect(mergeFrontmatter('---\n# note\nID: X\n---\nBody', {}, ['ID'], 'Body')).toBe(
      '---\n---\nBody',
    )
  })
})

describe('mergeFrontmatter — foreign preservation (the contract)', () => {
  it('updates a modeled key while preserving foreign keys + nesting', () => {
    const existing = assembleEnvelope('id: OLD\nplugin_key: keepme\nnested:\n  a: 1\n', 'Body')
    const { frontmatter, body } = splitEnvelope(
      mergeFrontmatter(existing, { id: 'NEW' }, ['id'], 'Body'),
    )
    expect(frontmatter).toContain('id: NEW')
    expect(frontmatter).toContain('plugin_key: keepme')
    expect(frontmatter).toContain('nested:')
    expect(frontmatter).toContain('a: 1')
    expect(body).toBe('Body')
  })

  it('preserves foreign comments', () => {
    const existing = assembleEnvelope('id: OLD\n# a foreign comment\nplugin_key: keepme\n', 'B')
    const out = mergeFrontmatter(existing, { id: 'NEW' }, ['id'], 'B')
    expect(out).toContain('# a foreign comment')
    expect(out).toContain('plugin_key: keepme')
  })

  it('a body-only merge of a frontmatter-less file invents no envelope', () => {
    expect(mergeFrontmatter('plain note, no fences\n', {}, [], 'rewritten body\n')).toBe(
      'rewritten body\n',
    )
  })

  it('deletes a modeled key when omitted, leaving foreign keys intact', () => {
    const existing = assembleEnvelope('id: X\nicon: star\nplugin: keep\n', 'B')
    const { frontmatter } = splitEnvelope(
      mergeFrontmatter(existing, { id: 'X' }, ['id', 'icon'], 'B'),
    )
    expect(frontmatter).toContain('id: X')
    expect(frontmatter).not.toContain('icon')
    expect(frontmatter).toContain('plugin: keep')
  })

  it('writes modeled keys + body for a new (empty) file', () => {
    const out = mergeFrontmatter('', { id: 'X', '<Areas>': ['A', 'B'] }, ['id', '<Areas>'], 'Hello')
    expect(out.startsWith('---\n')).toBe(true)
    const { frontmatter, body } = splitEnvelope(out)
    expect(frontmatter).toContain('id: X')
    expect(frontmatter).toContain('A')
    expect(body).toBe('Hello')
  })

  it('is idempotent — re-saving identical input yields identical bytes', () => {
    const first = mergeFrontmatter('', { id: 'X', '<Areas>': ['T'] }, ['id', '<Areas>'], 'Body')
    const second = mergeFrontmatter(first, { id: 'X', '<Areas>': ['T'] }, ['id', '<Areas>'], 'Body')
    expect(second).toBe(first)
  })
})

describe('`rekey` — the key keeps its place', () => {
  const page = (fm: string): string => assembleEnvelope(`${fm}\n`, 'Body')
  const fmOf = (out: string | null): string | null =>
    out === null ? null : splitEnvelope(out).frontmatter

  it('renames the key where it sits, keeping the comment attached to it', () => {
    const before =
      'title: Alpha\n# which clients this is for\n<Projects>:\n  - Pommora\nstatus: draft'
    const out = rekey(page(before), '<Projects>', '<Ventures>', 'prefer-new')
    expect(fmOf(out)).toBe(
      'title: Alpha\n# which clients this is for\n<Ventures>:\n  - Pommora\nstatus: draft',
    )
  })

  it('leaves the body alone', () => {
    const out = rekey(page('Status: Old'), 'Status', 'Stage', 'prefer-new')
    expect(splitEnvelope(out ?? '').body).toBe('Body')
  })

  it('prefer-new drops the old key, the pre-existing one keeping its own place', () => {
    const out = rekey(page('Status: Stale\nkeep: 1\nStage: Fresh'), 'Status', 'Stage', 'prefer-new')
    expect(fmOf(out)).toBe('keep: 1\nStage: Fresh')
  })

  it('prefer-new drops a blank rival with the old key', () => {
    const out = rekey(page('Status: Stale\nkeep: 1\nStage:'), 'Status', 'Stage', 'prefer-new')
    expect(fmOf(out)).toBe('keep: 1')
  })

  it('merge folds both lists into one at the renamed key’s place, deduped', () => {
    const out = rekey(
      page(
        'id: p2\n# tags\n<Projects>:\n  - Pommora\n<Ventures>:\n  - Other\n  - Pommora\nforeign: 1',
      ),
      '<Projects>',
      '<Ventures>',
      'merge',
    )
    expect(fmOf(out)).toBe('id: p2\n# tags\n<Ventures>:\n  - Other\n  - Pommora\nforeign: 1')
  })

  it('renames a key to its own name in another casing at the same line, under either rule', () => {
    for (const collision of ['prefer-new', 'merge'] as const) {
      const out = rekey(page('a: 1\nTags: [a]\nz: 2'), 'Tags', 'tags', collision)
      expect(fmOf(out)).toBe('a: 1\ntags: [a]\nz: 2')
    }
  })

  it('merge joins a scalar rival with the old list', () => {
    const out = rekey(page('<Projects>: [Y]\n<Ventures>: X'), '<Projects>', '<Ventures>', 'merge')
    expect(Object.entries(splitFrontmatter(out ?? ''))).toEqual([['<Ventures>', ['X', 'Y']]])
  })

  it('a lone key with no rival changes only the key’s text', () => {
    const out = rekey(page('Tags:\n  # first\n  - a # mine\n  - b'), 'Tags', 'Labels', 'prefer-new')
    expect(fmOf(out)).toBe('Labels:\n  # first\n  - a # mine\n  - b')
  })

  it('answers null for a page holding neither key', () => {
    expect(rekey(page('<Other>: x'), 'Status', 'Stage', 'prefer-new')).toBeNull()
  })

  it('answers null for frontmatter that cannot round-trip, in either shape', () => {
    // A tab-indented sequence never parses; an unresolved alias parses clean and refuses to serialize. Both would lose everything the parser did not recover.
    expect(rekey(page('<Projects>:\n\t- Pommora'), '<Projects>', '<Ventures>', 'merge')).toBeNull()
    expect(
      rekey(page('<Projects>:\n  - Pommora\nother: *word'), '<Projects>', '<Ventures>', 'merge'),
    ).toBeNull()
  })
})

describe('`rekey` — a key in another casing is another key', () => {
  const page = (fm: string): string => assembleEnvelope(`${fm}\n`, 'Body')
  const held = (out: string | null): [string, unknown][] =>
    Object.entries(splitFrontmatter(out ?? ''))

  it('renames only the exact key, leaving another casing where it sits', () => {
    const out = rekey(page('a: 1\nTags: ["b"]\ntags: [a, B]\nz: 2'), 'Tags', 'Labels', 'prefer-new')
    expect(held(out)).toEqual([
      ['a', 1],
      ['Labels', ['b']],
      ['tags', ['a', 'B']],
      ['z', 2],
    ])
    expect(out).toContain('\ntags: [a, B]\n')
  })

  it('prefer-new reads a key in another casing as no rival', () => {
    const out = rekey(page('Tags: [b]\nlabels: [x]'), 'Tags', 'Labels', 'prefer-new')
    expect(held(out)).toEqual([
      ['Labels', ['b']],
      ['labels', ['x']],
    ])
  })
})

describe('mergeFrontmatter — a written key and a dropped one', () => {
  it('appends a key written beside an unrelated dropped one', () => {
    expect(
      mergeFrontmatter('---\nold: 1\nb: 2\n---\nbody', { Tags: ['x'] }, ['old', 'Tags'], 'body'),
    ).toBe('---\nb: 2\nTags:\n  - x\n---\nbody')
  })
})

describe('mergeFrontmatter — broken frontmatter is never re-serialized', () => {
  const broken = '---\nbad: [unclosed\n---\nold prose'

  it('refuses a field write, so a partial recovery can never replace the file', () => {
    expect(() => mergeFrontmatter(broken, { icon: 'x' }, ['icon'], 'old prose')).toThrow()
  })

  it('refuses a field write into non-map frontmatter', () => {
    const nonMap = '---\n- just\n- a list\n---\nprose'
    expect(() => mergeFrontmatter(nonMap, { id: 'X' }, ['id'], 'prose')).toThrow()
  })

  it('a body-only write passes the frontmatter bytes through verbatim', () => {
    const out = mergeFrontmatter(broken, {}, [], 'new prose')
    expect(out).toBe('---\nbad: [unclosed\n---\nnew prose')
  })
})

describe('mergeFrontmatter — a body-only write re-serializes nothing', () => {
  it('leaves a flow-style list unspaced', () => {
    const out = mergeFrontmatter('---\ntags: [a,b]\n---\nold', {}, [], 'new')
    expect(out).toBe('---\ntags: [a,b]\n---\nnew')
  })

  it('folds CRLF frontmatter onto the LF fences it is assembled with', () => {
    const out = mergeFrontmatter('---\r\ntags: [a,b]\r\nStatus: x\r\n---\r\nold', {}, [], 'new')
    expect(out).toBe('---\ntags: [a,b]\nStatus: x\n---\nnew')
  })
})

describe('mergeFrontmatter — every assembly path emits one line ending', () => {
  const crlf = '---\r\ntags: [a,b]\r\nStatus: x\r\n---\r\nline1\r\nline2\r\n'

  it('a field write over a CRLF page keeps its body on the same ending as its fences', () => {
    const out = mergeFrontmatter(crlf, { Status: 'y' }, ['Status'], splitEnvelope(crlf).body)
    expect(out).not.toContain('\r')
    expect(out.endsWith('---\nline1\nline2\n')).toBe(true)
  })

  it('a body-only write folds a CRLF body too', () => {
    expect(mergeFrontmatter(crlf, {}, [], splitEnvelope(crlf).body)).not.toContain('\r')
  })
})

const ALIAS = '---\nID: 01KVGMT8BFP350FZZXAMG1QDVA\nsomething: *word\n---\nbody'
const TAB = '---\nID: 01KVGMT8BFP350FZZXAMG1QDVA\n<Projects>:\n\t- Pommora\n---\nbody'
const HEALTHY = '---\nID: 01KVGMT8BFP350FZZXAMG1QDVA\n<Projects>:\n  - Pommora\n---\nbody'

describe('sweepParse — the field-write gate', () => {
  it('an unresolvable alias reads as empty rather than throwing', () => {
    expect(splitFrontmatter(ALIAS)).toEqual({})
  })

  it('refuses both shapes of unwritable frontmatter', () => {
    expect(sweepParse(ALIAS)).toBeNull()
    expect(sweepParse(TAB)).toBeNull()
  })

  it('admits a page whose frontmatter round-trips, and merges into the parse it read', () => {
    const page = sweepParse(HEALTHY)
    expect(page?.raw).toEqual({ ID: '01KVGMT8BFP350FZZXAMG1QDVA', '<Projects>': ['Pommora'] })
    expect(page?.merge({ Status: 'Done' }, ['Status'])).toBe(
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVA\n<Projects>:\n  - Pommora\nStatus: Done\n---\nbody',
    )
  })

  it('a new number-like key lands last', () => {
    const page = sweepParse(HEALTHY)
    expect(page?.merge({ ...page.raw, 2026: 'x' }, ['2026'])).toBe(
      '---\nID: 01KVGMT8BFP350FZZXAMG1QDVA\n<Projects>:\n  - Pommora\n"2026": x\n---\nbody',
    )
  })
})

describe('a swept page’s pairs', () => {
  const ID = 'ID: 01ARZ3NDEKPSV4RRFFQ69G5FAV\n'
  const SPELLED = `---\n${ID}Status:\nTags: [a, "b"] # c\nA: &x foo\nB: *x\n---\nbody\n`
  const swept = (text: string) => {
    const page = sweepParse(text)
    if (!page) throw new Error('unswept')
    return page
  }

  it('a key’s pair reads as the block spells it, an alias as written, and none for a key the block lacks', () => {
    const page = swept(SPELLED)
    expect(page.pair('Status')).toBe('Status:\n')
    expect(page.pair('Tags')).toBe('Tags: [a, "b"] # c\n')
    expect(page.pair('B')).toBe('B: *x\n')
    expect(page.pair('Due')).toBeUndefined()
  })

  it('a pair lands its node under the key it’s given, held in place and new last, and a blank one drops the key', () => {
    const held = `---\n${ID}Status: Done\nOther: 1\n---\nbody\n`
    expect(swept(held).withPair('Status', 'Status:\n')).toBe(`---\n${ID}Other: 1\n---\nbody\n`)
    expect(swept(held).withPair('Total', 'Count: 5\n')).toBe(
      `---\n${ID}Status: Done\nOther: 1\nTotal: 5\n---\nbody\n`,
    )
    expect(swept(held).withPair('Other', undefined)).toBe(`---\n${ID}Status: Done\n---\nbody\n`)
    expect(swept(`---\n${ID}A: &x foo\nB: 5\n---\nbody\n`).withPair('B', 'B: *x\n')).toBe(
      `---\n${ID}A: &x foo\nB: *x\n---\nbody\n`,
    )
  })

  it('a new pair lands above the key it stood above, last when that key is gone, and a held one stays in place', () => {
    const held = `---\n${ID}Status: Done\nOther: 1\n---\nbody\n`
    expect(swept(held).withPair('Total', 'Total: 5\n', 'Other')).toBe(
      `---\n${ID}Status: Done\nTotal: 5\nOther: 1\n---\nbody\n`,
    )
    expect(swept(held).withPair('Total', 'Total: 5\n', 'Gone')).toBe(
      `---\n${ID}Status: Done\nOther: 1\nTotal: 5\n---\nbody\n`,
    )
    expect(swept(held).withPair('Status', 'Status: Doing\n', 'ID')).toBe(
      `---\n${ID}Status: Doing\nOther: 1\n---\nbody\n`,
    )
  })

  it('a pair the key already holds lands nothing', () => {
    expect(swept(SPELLED).withPair('Tags', 'Tags: [a, "b"] # c\n')).toBeNull()
    expect(swept(SPELLED).withPair('Due', undefined)).toBeNull()
    expect(swept(`---\n${ID}Total: 1\n---\nbody\n`).withPair('Total', 'Count: 1\n')).toBeNull()
  })

  it('a string that isn’t one key’s pair lands nothing', () => {
    expect(swept(SPELLED).withPair('Status', '- a\n')).toBeNull()
    expect(swept(SPELLED).withPair('Status', 'A: 1\nB: 2\n')).toBeNull()
  })
})
