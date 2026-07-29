import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setGovernedRootKeys } from './governedWrite'

let dir: string
let page: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'governed-'))
  page = join(dir, 'p.md')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('setGovernedRootKeys', () => {
  it('writes one governed key and preserves foreign keys and comments', async () => {
    await writeFile(page, '---\nid: p1\n# keep me\nfoo: bar\n---\nbody\n')
    await setGovernedRootKeys(page, { '<Status>': 'Done' }, ['<Status>'])
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Status>: Done')
    expect(out).toContain('# keep me')
    expect(out).toContain('foo: bar')
    expect(out).toContain('body')
  })

  it('leaves the other layer alone — a property write never touches a Context key', async () => {
    await writeFile(
      page,
      '---\nid: p1\n# keep\n<Status>: Active\n<Due>: 2026-08-01\n(Projects):\n  - Pommora\n---\n',
    )
    await setGovernedRootKeys(page, { '<Status>': 'Live' }, ['<Status>'])
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Status>: Live')
    expect(out).toContain('<Due>: 2026-08-01')
    expect(out).toContain('(Projects)')
    expect(out).toContain('# keep')
  })

  it('a governed key absent from the next values is deleted — that is how a clear is said', async () => {
    await writeFile(page, '---\nid: p1\n<Status>: Active\n---\n')
    await setGovernedRootKeys(page, {}, ['<Status>'])
    expect(await readFile(page, 'utf8')).not.toContain('<Status>')
  })

  it('a Context unassign deletes its key too', async () => {
    await writeFile(page, '---\nid: p1\n(Projects):\n  - Pommora\n---\n')
    await setGovernedRootKeys(page, {}, ['(Projects)'])
    expect(await readFile(page, 'utf8')).not.toContain('(Projects)')
  })

  it('stamps modified_at itself — listing it without supplying it would delete it', async () => {
    await writeFile(page, '---\nid: p1\nmodified_at: 2020-01-01T00:00:00.000Z\n---\n')
    await setGovernedRootKeys(page, { '<Status>': 'Done' }, ['<Status>'])
    const out = await readFile(page, 'utf8')
    expect(out).toMatch(/modified_at: 20[2-9]\d-/)
    expect(out).not.toContain('2020-01-01')
  })

  it('writes the key plain — neither glyph needs quoting', async () => {
    await writeFile(page, '---\nid: p1\n---\n')
    await setGovernedRootKeys(page, { '<Status>': 'Done', '(Areas)': ['Work'] }, [
      '<Status>',
      '(Areas)',
    ])
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Status>: Done')
    expect(out).toContain('(Areas):')
    expect(out).not.toContain('"<Status>"')
  })
})
