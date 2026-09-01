import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GovernedWorld } from '@shared/contextResolve'
import type { PropertyDefinition } from '@shared/properties'
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
    await setGovernedRootKeys(page, { Status: 'Done' }, ['Status'])
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Done')
    expect(out).toContain('# keep me')
    expect(out).toContain('foo: bar')
    expect(out).toContain('body')
  })

  it('leaves the other layer alone — a property write never touches a Context key', async () => {
    await writeFile(
      page,
      '---\nid: p1\n# keep\nStatus: Active\nDue: 2026-08-01\n<Projects>:\n  - Pommora\n---\n',
    )
    await setGovernedRootKeys(page, { Status: 'Live' }, ['Status'])
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Live')
    expect(out).toContain('Due: 2026-08-01')
    expect(out).toContain('<Projects>')
    expect(out).toContain('# keep')
  })

  it('a governed key absent from the next values is deleted — that is how a clear is said', async () => {
    await writeFile(page, '---\nid: p1\nStatus: Active\n---\n')
    await setGovernedRootKeys(page, {}, ['Status'])
    expect(await readFile(page, 'utf8')).not.toContain('Status')
  })

  it('a Context unassign deletes its key too', async () => {
    await writeFile(page, '---\nid: p1\n<Projects>:\n  - Pommora\n---\n')
    await setGovernedRootKeys(page, {}, ['<Projects>'])
    expect(await readFile(page, 'utf8')).not.toContain('<Projects>')
  })

  it('writes no modified_at — a legacy one survives as foreign frontmatter', async () => {
    await writeFile(page, '---\nid: p1\nmodified_at: 2020-01-01T00:00:00.000Z\n---\n')
    await setGovernedRootKeys(page, { Status: 'Done' }, ['Status'])
    const out = await readFile(page, 'utf8')
    expect(out).toContain('modified_at: 2020-01-01T00:00:00.000Z')
    expect(out.match(/modified_at/g)).toHaveLength(1)
  })

  it('writes the key plain — neither glyph needs quoting', async () => {
    await writeFile(page, '---\nid: p1\n---\n')
    await setGovernedRootKeys(page, { Status: 'Done', '<Areas>': ['Work'] }, ['Status', '<Areas>'])
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Status: Done')
    expect(out).toContain('<Areas>:')
    expect(out).not.toContain('"Status"')
  })
})

describe('setGovernedRootKeys with a world — the three precedence rules', () => {
  const priority: PropertyDefinition = {
    id: 'prop_priority',
    name: 'Priority',
    type: 'select',
    select_options: [{ value: 'High', label: 'High' }],
  }
  const status: PropertyDefinition = {
    id: 'prop_status',
    name: 'Status',
    type: 'select',
    select_options: [{ value: 'Open', label: 'Open' }],
  }
  const world: GovernedWorld = {
    registry: { contexts: [{ id: 'ctx_areas', title: 'Areas' }] },
    spacesByContext: new Map([
      [
        'ctx_areas',
        [{ kind: 'space', id: 'sp', title: 'Health', path: 'x', contextId: 'ctx_areas' }],
      ],
    ]),
    defs: new Map([
      ['Priority', priority],
      ['Status', status],
    ]),
  }

  it('an unassign deletes its key while the reconcile repairs the siblings', async () => {
    await writeFile(page, '---\nid: p1\n<Areas>:\n  - Health\nPriority: High\n---\nbody\n')
    await setGovernedRootKeys(page, {}, ['<Areas>'], world)
    const out = await readFile(page, 'utf8')
    expect(out).not.toContain('Areas')
    expect(out).toContain('Priority:\n  - High')
  })

  it('a clear deletes its key while a drifted sibling is repaired', async () => {
    await writeFile(page, '---\nid: p1\nPriority:\n  - High\nStatus: Open\n---\nbody\n')
    await setGovernedRootKeys(page, {}, ['Priority'], world)
    const out = await readFile(page, 'utf8')
    expect(out).not.toContain('Priority')
    expect(out).toContain('Status:\n  - Open')
  })

  it('reports the adoptions the reconcile found', async () => {
    const tags: PropertyDefinition = {
      id: 'prop_tags',
      name: 'Tags',
      type: 'multi_select',
      select_options: [{ value: 'alpha', label: 'alpha' }],
    }
    await writeFile(page, '---\nid: p1\nTags:\n  - alpha\n  - zeta\n---\nbody\n')
    const adoptions = await setGovernedRootKeys(page, { Status: ['Open'] }, ['Status'], {
      ...world,
      defs: new Map([['Tags', tags]]),
    })
    expect(adoptions).toEqual([{ propertyId: 'prop_tags', value: 'zeta' }])
    expect(await readFile(page, 'utf8')).toContain('- zeta')
  })
})
