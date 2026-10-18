import { readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  contextWorldOf,
  reconcileGovernedRoot,
  type GovernedWorld,
} from '../Contexts/contextResolve'
import { splitFrontmatter } from '../Files/pageFile'
import { byKey, type PropertyDefinition } from './properties'
import { setGovernedRootKey } from './governedWrite'
import { encodeValue } from './propertyValue'

let dir: string
let page: string

beforeEach(async () => {
  dir = tempRoot('governed-')
  page = join(dir, 'p.md')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('setGovernedRootKey', () => {
  it('writes one governed key and preserves foreign keys and comments', async () => {
    await writeFile(page, '---\nid: p1\n# keep me\nfoo: bar\n---\nbody\n')
    await setGovernedRootKey(page, 'Status', 'Done')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Done')
    expect(out).toContain('# keep me')
    expect(out).toContain('foo: bar')
    expect(out).toContain('body')
  })

  it('a write that changes no byte leaves the file, and its modification time, alone', async () => {
    await writeFile(page, '---\nid: p1\nStatus: Done\n---\nbody\n')
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(page, past, past)
    await setGovernedRootKey(page, 'Status', 'Done')
    expect(Math.floor((await stat(page)).mtimeMs / 1000)).toBe(Math.floor(past.getTime() / 1000))
  })

  it('leaves the other layer alone — a property write never touches a Context key', async () => {
    await writeFile(
      page,
      '---\nid: p1\n# keep\nStatus: Active\nDue: 2026-08-01\n<Projects>:\n  - Pommora\n---\n',
    )
    await setGovernedRootKey(page, 'Status', 'Live')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Live')
    expect(out).toContain('Due: 2026-08-01')
    expect(out).toContain('<Projects>')
    expect(out).toContain('# keep')
  })

  it('a governed key absent from the next values is deleted — that is how a clear is said', async () => {
    await writeFile(page, '---\nid: p1\nStatus: Active\n---\n')
    await setGovernedRootKey(page, 'Status', undefined)
    expect(await readFile(page, 'utf8')).not.toContain('Status')
  })

  it('a Context unassign deletes its key too', async () => {
    await writeFile(page, '---\nid: p1\n<Projects>:\n  - Pommora\n---\n')
    await setGovernedRootKey(page, '<Projects>', undefined)
    expect(await readFile(page, 'utf8')).not.toContain('<Projects>')
  })

  it('writes no modified_at — a legacy one survives as foreign frontmatter', async () => {
    await writeFile(page, '---\nid: p1\nmodified_at: 2020-01-01T00:00:00.000Z\n---\n')
    await setGovernedRootKey(page, 'Status', 'Done')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('modified_at: 2020-01-01T00:00:00.000Z')
    expect(out.match(/modified_at/g)).toHaveLength(1)
  })

  it('writes the key plain — neither glyph needs quoting', async () => {
    await writeFile(page, '---\nid: p1\n---\n')
    await setGovernedRootKey(page, 'Status', 'Done')
    await setGovernedRootKey(page, '<Areas>', ['Work'])
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Done')
    expect(out).toContain('<Areas>:')
    expect(out).not.toContain('"Status"')
  })
})

describe('setGovernedRootKey with a world — the three precedence rules', () => {
  const priority: PropertyDefinition = {
    id: 'prop_priority',
    label: 'Priority',
    key: 'Priority',
    type: 'select',
    select_options: [{ key: 'High', label: 'High' }],
  }
  const status: PropertyDefinition = {
    id: 'prop_status',
    label: 'Status',
    key: 'Status',
    type: 'select',
    select_options: [{ key: 'Open', label: 'Open' }],
  }
  const world: GovernedWorld = {
    contexts: contextWorldOf([
      {
        def: { id: 'ctx_areas', title: 'Areas' },
        spaces: [{ kind: 'space', id: 'sp', title: 'Health', path: 'x', contextId: 'ctx_areas' }],
      },
    ]),
    defs: byKey([priority, status]),
  }

  it('an unassign deletes its key while the reconcile repairs the siblings', async () => {
    await writeFile(page, '---\nid: p1\n<Areas>:\n  - Health\nPriority: High\n---\nbody\n')
    await setGovernedRootKey(page, '<Areas>', undefined, world)
    const out = await readFile(page, 'utf8')
    expect(out).not.toContain('Areas')
    expect(out).toContain('Priority:\n  - High')
  })

  it('a clear deletes its key while a drifted sibling is repaired', async () => {
    await writeFile(page, '---\nid: p1\nPriority:\n  - High\nStatus: Open\n---\nbody\n')
    await setGovernedRootKey(page, 'Priority', undefined, world)
    const out = await readFile(page, 'utf8')
    expect(out).not.toContain('Priority')
    expect(out).toContain('Status:\n  - Open')
  })

  it('keeps a mixed Context list — an unresolvable Space is never dropped by a sibling write', async () => {
    await writeFile(page, '---\nid: p1\n<Areas>:\n  - Health\n  - Ghost\n---\nbody\n')
    await setGovernedRootKey(page, 'Status', 'Open', world)
    const out = await readFile(page, 'utf8')
    expect(out).toContain('- Health')
    expect(out).toContain('- Ghost')
    expect(out).toContain('Status: Open')
  })

  it('keeps a wholly unresolvable Context value rather than deleting the key', async () => {
    await writeFile(page, '---\nid: p1\n<Areas>:\n  - Ghost\n---\nbody\n')
    await setGovernedRootKey(page, 'Status', 'Open', world)
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Areas>')
    expect(out).toContain('- Ghost')
  })

  it('keeps an own property that reconciles to blank rather than deleting it during a sibling write', async () => {
    await writeFile(page, '---\nid: p1\nPriority: Bogus\n---\nbody\n')
    await setGovernedRootKey(page, 'Status', 'Done', world)
    const fm = splitFrontmatter(await readFile(page, 'utf8'))
    expect(fm.Priority).toBe('Bogus')
    expect(fm.Status).toBe('Done')
  })

  it('withholds an own multi-select that reconciles smaller, keeping the original list', async () => {
    const tags: PropertyDefinition = {
      id: 'prop_tags',
      label: 'Tags',
      key: 'Tags',
      type: 'multiSelect',
      select_options: [{ key: 'alpha', label: 'alpha' }],
    }
    await writeFile(page, "---\nid: p1\nTags:\n  - ''\n  - alpha\n---\nbody\n")
    await setGovernedRootKey(page, 'Status', 'Done', {
      ...world,
      defs: byKey([tags]),
    })
    const fm = splitFrontmatter(await readFile(page, 'utf8'))
    expect(fm.Tags).toEqual(['', 'alpha'])
  })
})

describe('setGovernedRootKey — spellings', () => {
  const tags: PropertyDefinition = {
    id: 'prop_tags',
    label: 'Tags',
    key: 'Tags',
    type: 'multiSelect',
    select_options: [
      { key: 'a', label: 'a' },
      { key: 'Docs', label: 'Docs' },
      { key: 'Work', label: 'Work' },
    ],
  }
  const done: PropertyDefinition = { id: 'prop_done', label: 'Done', key: 'Done', type: 'checkbox' }
  const price: PropertyDefinition = {
    id: 'prop_price',
    label: 'Price',
    key: 'Price',
    type: 'number',
  }
  const status: PropertyDefinition = {
    id: 'prop_status',
    label: 'Status',
    key: 'Status',
    type: 'select',
    select_options: [
      { key: 'Open', label: 'Open' },
      { key: 'Done', label: 'Done' },
    ],
  }
  const stage: PropertyDefinition = {
    id: 'prop_stage',
    label: 'Stage',
    key: 'Stage',
    type: 'select',
    select_options: [{ key: 'done', label: 'Done' }],
  }
  const world: GovernedWorld = {
    contexts: contextWorldOf([]),
    defs: byKey([tags, done, status, price, stage]),
  }
  const seeded = async (keys: string): Promise<void> =>
    writeFile(page, `---\nid: p1\n${keys}\nfoo: bar\n---\nbody\n`)
  const lines = async (): Promise<string[]> => (await readFile(page, 'utf8')).split('\n')

  it('writes the exact key after the other keys, leaving another casing of it as written', async () => {
    await seeded('status: Open')
    await setGovernedRootKey(page, 'Status', ['Done'], world)
    const fm = splitFrontmatter(await readFile(page, 'utf8'))
    expect(Object.keys(fm)).toEqual(['id', 'status', 'foo', 'Status'])
    expect(fm.status).toBe('Open')
    expect(fm.Status).toEqual(['Done'])
  })

  it('a checked box over an unchecked word lands as its pair’s checked word, cased alike', async () => {
    await seeded('Done: No')
    await setGovernedRootKey(page, 'Done', true, world)
    expect(splitFrontmatter(await readFile(page, 'utf8')).Done).toBe('Yes')
  })

  it('a number lands in the spelling the file holds: quoted stays quoted, formatted stays formatted', async () => {
    await seeded(`Price: '30'`)
    await setGovernedRootKey(page, 'Price', 31, world)
    expect(await lines()).toContain(`Price: '31'`)
    await seeded('Price: $1,200')
    await setGovernedRootKey(page, 'Price', 1300, world)
    expect(await lines()).toContain('Price: $1,300')
  })

  it('a write of the value a flow list already holds leaves the file byte-identical', async () => {
    await seeded('Tags: [a]')
    const before = await readFile(page, 'utf8')
    await setGovernedRootKey(page, 'Tags', ['a'], world)
    expect(await readFile(page, 'utf8')).toBe(before)
  })

  it('a write of an option’s label over the key it holds leaves the file byte-identical, as the reconcile leaves it', async () => {
    await seeded('Stage: [done]')
    const before = await readFile(page, 'utf8')
    await setGovernedRootKey(
      page,
      'Stage',
      encodeValue(stage, { kind: 'select', value: 'Done' }),
      world,
    )
    expect(await readFile(page, 'utf8')).toBe(before)
    const held = splitFrontmatter(before)
    expect(reconcileGovernedRoot(held, world)).toEqual({ root: held, changed: [] })
  })

  it('a Multi-Select write keeps the words no option names after the picked ones, and a clear drops the key', async () => {
    await seeded('Tags: [Docs, Ideas]')
    await setGovernedRootKey(page, 'Tags', ['Docs', 'Work'], world)
    expect(await lines()).toContain('Tags: [Docs, Work, Ideas]')
    await setGovernedRootKey(page, 'Tags', undefined, world)
    expect(await readFile(page, 'utf8')).not.toContain('Tags')
  })

  it('a banner write, which passes no world, writes its exact key beside another casing of it', async () => {
    await seeded('Banner: x')
    await setGovernedRootKey(page, 'banner', '[[b.png]]')
    const fm = splitFrontmatter(await readFile(page, 'utf8'))
    expect(fm.Banner).toBe('x')
    expect(fm.banner).toBe('[[b.png]]')
  })
})
