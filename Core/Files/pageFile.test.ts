import { describe, it, expect } from 'vitest'
import {
  splitEnvelope,
  splitFrontmatter,
  assembleEnvelope,
  mergeFrontmatter,
  renameFrontmatterKey,
  sweepParse,
} from './pageFile'

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

  it('reads a legacy envelope (separator blank line) to the same body', () => {
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

describe('renameFrontmatterKey — the key keeps its place', () => {
  const page = (fm: string): string => assembleEnvelope(`${fm}\n`, 'Body')
  const fmOf = (out: string | null): string | null =>
    out === null ? null : splitEnvelope(out).frontmatter

  it('renames the key where it sits, keeping the comment attached to it', () => {
    const before =
      'title: Alpha\n# which clients this is for\n<Projects>:\n  - Pommora\nstatus: draft'
    const out = renameFrontmatterKey(page(before), '<Projects>', '<Ventures>', 'prefer-new')
    expect(fmOf(out)).toBe(
      'title: Alpha\n# which clients this is for\n<Ventures>:\n  - Pommora\nstatus: draft',
    )
  })

  it('leaves the body alone', () => {
    const out = renameFrontmatterKey(page('Status: Old'), 'Status', 'Stage', 'prefer-new')
    expect(splitEnvelope(out ?? '').body).toBe('Body')
  })

  it('prefer-new drops the old key, the pre-existing one keeping its own place', () => {
    const out = renameFrontmatterKey(
      page('Status: Stale\nkeep: 1\nStage: Fresh'),
      'Status',
      'Stage',
      'prefer-new',
    )
    expect(fmOf(out)).toBe('keep: 1\nStage: Fresh')
  })

  it('merge folds both lists into one at the renamed key’s place, deduped', () => {
    const out = renameFrontmatterKey(
      page(
        'id: p2\n# tags\n<Projects>:\n  - Pommora\n<Ventures>:\n  - Other\n  - Pommora\nforeign: 1',
      ),
      '<Projects>',
      '<Ventures>',
      'merge',
    )
    expect(fmOf(out)).toBe('id: p2\n# tags\n<Ventures>:\n  - Other\n  - Pommora\nforeign: 1')
  })

  it('answers null for a page holding neither key', () => {
    expect(renameFrontmatterKey(page('<Other>: x'), 'Status', 'Stage', 'prefer-new')).toBeNull()
  })

  it('answers null for frontmatter that cannot round-trip, in either shape', () => {
    // A tab-indented sequence never parses; an unresolved alias parses clean and refuses to serialize. Both would lose everything the parser did not recover.
    expect(
      renameFrontmatterKey(page('<Projects>:\n\t- Pommora'), '<Projects>', '<Ventures>', 'merge'),
    ).toBeNull()
    expect(
      renameFrontmatterKey(
        page('<Projects>:\n  - Pommora\nother: *word'),
        '<Projects>',
        '<Ventures>',
        'merge',
      ),
    ).toBeNull()
  })
})

describe('mergeFrontmatter — a key moved to another spelling keeps its place', () => {
  it('writes the new spelling where the dropped one sat', () => {
    expect(
      mergeFrontmatter(
        '---\na: 1\ntags:\n  - x\nb: 2\n---\nbody',
        { Tags: ['x'] },
        ['tags', 'Tags'],
        'body',
      ),
    ).toBe('---\na: 1\nTags:\n  - x\nb: 2\n---\nbody')
  })

  it('takes the first dropped spelling’s place when two are dropped', () => {
    expect(
      mergeFrontmatter(
        '---\na: 1\ntags:\n  - x\nb: 2\nTAGS:\n  - y\n---\nbody',
        { Tags: ['x', 'y'] },
        ['tags', 'TAGS', 'Tags'],
        'body',
      ),
    ).toBe('---\na: 1\nTags:\n  - x\n  - y\nb: 2\n---\nbody')
  })

  it('a moved key whose value is unchanged keeps its node, comments included', () => {
    expect(
      mergeFrontmatter(
        '---\ntags:\n  - x # first\n  - y\n---\nbody',
        { Tags: ['x', 'y'] },
        ['tags', 'Tags'],
        'body',
      ),
    ).toBe('---\nTags:\n  - x # first\n  - y\n---\nbody')
  })

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
})
