import { mkdir, writeFile } from 'node:fs/promises'
import { join, relative } from '../Paths/posix'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { fault } from '../Contract/result'
import { dropLiveTree } from '../Nexus/liveTree'
import { putJson, tempRoot } from '../Testing/hostFs'
import { sidecarPath } from '../Paths/paths'
import { seedPropertyBundle } from '../Testing/fixtures'
import { mintBundle } from './bundle'
import { writeRecord } from './record'

const { sessionRoot } = vi.hoisted(() => ({ sessionRoot: vi.fn() }))
vi.mock('../Nexus/session', () => ({ sessionRoot, adopting: () => false }))
vi.mock('../Nexus/heldPages', async (importOriginal) => {
  const held = await importOriginal<typeof import('../Nexus/heldPages')>()
  return { ...held, nexusPages: vi.fn(held.nexusPages) }
})
const { nexusPages } = await import('../Nexus/heldPages')

const { bundlesHandlers } = await import('./handlers')

const ctx = {} as HostContext
let root = ''

beforeEach(async () => {
  root = tempRoot('bundle-handlers-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  sessionRoot.mockReturnValue(root)
})

afterEach(() => {
  sessionRoot.mockReset()
  dropLiveTree()
})

describe('bundles:list', () => {
  it('lists the Trash’s rows for the trash store', async () => {
    await seedPropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x', label: 'Stage', key: 'Stage' },
      values: {},
    })
    const listed = await bundlesHandlers['bundles:list'](ctx, { kind: 'trash' })
    expect(listed.ok && listed.value.map((r) => [r.kind, r.title])).toEqual([['property', 'Stage']])
  })

  it('lists an Archive whose Collection id isn’t ULID-shaped', async () => {
    const store = { kind: 'archive', id: 'col-foreign' } as const
    const bundle = await mintBundle(root, store, join(root, 'Notes', 'Alpha.md'), {
      entity: 'page',
      parent: { kind: 'unaddressable' },
    })
    await writeFile(join(bundle, 'Alpha.md'), '# Alpha\n')
    const listed = await bundlesHandlers['bundles:list'](ctx, store)
    expect(listed.ok && listed.value.map((r) => [r.kind, r.title])).toEqual([['page', 'Alpha']])
  })

  it('refuses an archive id that isn’t one safe path segment', async () => {
    for (const id of ['../x', 'a/b', '..', ''])
      expect(await bundlesHandlers['bundles:list'](ctx, { kind: 'archive', id })).toEqual(
        fault('A store is required.'),
      )
  })

  it('listed within a top-level Set, a Collection’s Archive holds only what left from within it', async () => {
    for (const [dir, id] of [
      ['Notes/Daily/Morning', 'set-morning'],
      ['Notes/Weekly', 'set-weekly'],
    ])
      await mkdir(join(root, dir), { recursive: true }).then(() =>
        writeFile(join(root, dir, '_pageset.json'), JSON.stringify({ id })),
      )
    await writeFile(
      join(root, 'Notes', 'Daily', '_pageset.json'),
      JSON.stringify({ id: 'set-daily' }),
    )
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes' }),
    )
    const store = { kind: 'archive', id: 'col-notes' } as const
    const archived = async (from: string, title: string, parent: string, trail?: string[]) => {
      const bundle = await mintBundle(root, store, join(root, from, `${title}.md`), {
        entity: 'page',
        parent: { kind: 'container', id: parent },
        ...(trail ? { trail } : {}),
      })
      await writeFile(join(bundle, `${title}.md`), `# ${title}\n`)
    }
    await archived('Notes/Daily/Morning', 'Held', 'set-morning')
    await archived('Notes/Daily/Evening', 'Stored', 'set-evening', ['col-notes', 'set-daily'])
    await archived('Notes/Weekly', 'Elsewhere', 'set-weekly', ['col-notes'])
    const listed = await bundlesHandlers['bundles:list'](ctx, store, 'set-daily')
    expect(listed.ok && listed.value.map((r) => r.title).sort()).toEqual(['Held', 'Stored'])
  })

  it('refuses a `within` that isn’t a string', async () => {
    expect(
      await bundlesHandlers['bundles:list'](ctx, { kind: 'archive', id: 'col-notes' }, 7),
    ).toEqual(fault('Invalid Set id.'))
  })

  it('refuses a `within` on the Trash, which holds no Set’s place', async () => {
    expect(await bundlesHandlers['bundles:list'](ctx, { kind: 'trash' }, 'set-daily')).toEqual(
      fault('Only an Archive lists within a Set.'),
    )
  })

  it('refuses a store it can’t read', async () => {
    for (const store of [null, { kind: 'shelf' }, { kind: 'archive' }])
      expect(await bundlesHandlers['bundles:list'](ctx, store)).toEqual(
        fault('A store is required.'),
      )
  })
})

describe('bundles:children', () => {
  const BUNDLE = '.trash/2026-10-17T00-00-00-000Z__A.deleted'
  const P_ID = '01KVGMT8BFP350FZZXAMG1QDVP'
  const seedTrashedCollection = async (): Promise<void> => {
    const at = (...segs: string[]): string => join(root, BUNDLE, ...segs)
    await putJson(sidecarPath(at('A'), 'collection'), { id: 'colA' })
    await putJson(sidecarPath(at('A', 'S'), 'set'), { id: 'setS' })
    await writeFile(at('A', 'S', 'P.md'), `---\nID: ${P_ID}\n---\n# P\n`)
    await writeFile(at('A', 'Q.md'), '# Q\n')
    await writeRecord(at(), { entity: 'collection', id: 'colA', parent: { kind: 'root' } })
  }
  const titles = (reply: Awaited<ReturnType<(typeof bundlesHandlers)['bundles:children']>>) =>
    reply.ok && reply.value.map((rows) => rows.map((r) => r.title))

  it('answers each address’s inner items in the addresses’ order, reading the pages once for the call', async () => {
    await seedTrashedCollection()
    vi.mocked(nexusPages).mockClear()
    const reply = await bundlesHandlers['bundles:children'](ctx, [`${BUNDLE}/A/S`, BUNDLE])
    expect(titles(reply)).toEqual([['P'], ['S', 'Q']])
    expect(reply.ok && reply.value[0][0].stored).toEqual({ id: P_ID, path: `${BUNDLE}/A/S/P.md` })
    expect(nexusPages).toHaveBeenCalledTimes(1)
  })

  it('answers no rows for a gone address, one escaping the root, a page’s or property’s bundle, or an inner page, beside the others it answers', async () => {
    await seedTrashedCollection()
    const page = await mintBundle(root, { kind: 'trash' }, join(root, 'Notes', 'Alpha.md'), {
      entity: 'page',
      parent: { kind: 'unaddressable' },
    })
    await writeFile(join(page, 'Alpha.md'), '# Alpha\n')
    const property = await seedPropertyBundle(root, {
      entity: 'property',
      id: 'prop_x',
      def: { id: 'prop_x' },
      values: {},
    })
    const reply = await bundlesHandlers['bundles:children'](ctx, [
      `${BUNDLE}/A/Gone`,
      '../outside',
      relative(root, page),
      relative(root, property),
      `${BUNDLE}/A/S/P.md`,
      BUNDLE,
    ])
    expect(titles(reply)).toEqual([[], [], [], [], [], ['S', 'Q']])
  })

  it('refuses addresses that aren’t an array of strings', async () => {
    for (const raw of [undefined, 'x', [7], [BUNDLE, null]])
      expect(await bundlesHandlers['bundles:children'](ctx, raw as string[])).toEqual(
        fault('Addresses are required.'),
      )
  })
})
