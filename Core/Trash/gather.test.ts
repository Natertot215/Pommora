import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from '../Paths/posix'
import { seedSpaceSidecar } from '../Testing/hostFs'
import { bundleNexusEachTest, onlyBundle, PAGE_A, PAGE_B, PAGE_C } from '../Testing/bundles'
import { describe, expect, it } from 'vitest'
import { pathExists } from '../Files/atomicWrite'
import { settledMutate } from '../Testing/settledMutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { bundleArtifact, listBundles } from '../Bundles/bundle'
import { readNexus } from '../Nexus/readNexus'
import { setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
import { refreshTree } from '../Nexus/liveTree'
import { stampMissing } from '../Nexus/adopt'

let root: string
bundleNexusEachTest('pom-gather-', (r) => (root = r))

describe('a delete’s record', () => {
  it('a page delete records identity + its parent container by the id the walk assigns', async () => {
    const tree = await readNexus(root)
    const dailyId = tree.collections[0].sets[0].id
    expect(dailyId).toBe('set-daily')

    const r = await settledMutate(root, {
      op: 'delete',
      path: 'Notes/Daily/Alpha.md',
      kind: 'page',
    })
    expect(r.ok).toBe(true)
    const { bundlePath, record } = await onlyBundle(root)
    const dir = join(root, bundlePath)
    expect(basename(dir).endsWith('__Alpha.md.deleted')).toBe(true)
    // The artifact keeps the name it always had — there is no stamped leaf to parse back.
    expect(await bundleArtifact(dir)).toBe(join(dir, 'Alpha.md'))
    expect(record).toMatchObject({
      entity: 'page',
      id: PAGE_A,
      parent: { kind: 'container', id: dailyId },
      trail: ['col-notes'],
    })
  })

  it('a root Collection delete records parent root; the folder sits inside the bundle', async () => {
    const r = await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' })
    expect(r.ok).toBe(true)
    const { bundlePath, record } = await onlyBundle(root)
    const dir = join(root, bundlePath)
    expect(await bundleArtifact(dir)).toBe(join(dir, 'Notes'))
    expect(record).toMatchObject({
      entity: 'collection',
      id: 'col-notes',
      parent: { kind: 'root' },
    })
    expect(record).not.toHaveProperty('trail')
  })

  it('a Space delete records its context parent and the id-bearing roots that tagged it', async () => {
    const r = await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle(root)
    expect(record).toMatchObject({
      entity: 'space',
      id: 'sp-pom',
      parent: { kind: 'context', id: 'ctx_projects' },
    })
    const members = (record as { members: { id: string; kind: string }[] }).members
    expect(members).toContainEqual({ id: PAGE_A, kind: 'page' })
    expect(members).toContainEqual({ id: 'sp-sap', kind: 'space' })
    expect(members).toHaveLength(2)
  })

  it('a Context delete records its registry entry and the outside membership map, spaces as {id, title}', async () => {
    const r = await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects',
      kind: 'context',
    })
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle(root)
    expect(record).toMatchObject({
      entity: 'context',
      registry: { id: 'ctx_projects', title: 'Projects', singular: 'Project', icon: 'target' },
    })
    const membership = (
      record as {
        membership: {
          root: { id?: string; kind: string }
          spaces: { id?: string; title: string }[]
        }[]
      }
    ).membership
    // The outside page is the only membership root — the in-Context Sapphire is a passenger whose own links ride the trash intact.
    expect(membership).toHaveLength(1)
    expect(membership[0].root).toEqual({ id: PAGE_A, kind: 'page' })
    expect(membership[0].spaces).toEqual([{ id: 'sp-pom', title: 'Pommora' }])
  })

  const placeOfOnly = async (): Promise<unknown> =>
    ((await onlyBundle(root)).record as { place?: unknown }).place

  it('a page records its place between its neighbours as the tree shows them', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbody`)
    await writeFile(join(root, 'Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_C}\n---\nbody`)
    await writeFile(
      join(root, 'Notes', 'Daily', '_pageset.json'),
      JSON.stringify({ id: 'set-daily', page_order: [PAGE_C, PAGE_A, PAGE_B] }),
    )
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' })
    expect(await placeOfOnly()).toEqual({ above: PAGE_B, below: PAGE_C })
  })

  it('a Set records its place in its container’s set_order', async () => {
    for (const [name, id] of [
      ['Weekly', 'set-week'],
      ['Monthly', 'set-month'],
    ]) {
      await mkdir(join(root, 'Notes', name), { recursive: true })
      await writeFile(join(root, 'Notes', name, '_pageset.json'), JSON.stringify({ id }))
    }
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'col-notes', set_order: ['set-week', 'set-daily', 'set-month'] }),
    )
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    expect(await placeOfOnly()).toEqual({ above: 'set-month', below: 'set-week' })
  })

  it('a Collection records its place among the root’s Collections', async () => {
    for (const [name, id] of [
      ['Plain', 'col-plain'],
      ['Zed', 'col-zed'],
    ]) {
      await mkdir(join(root, name), { recursive: true })
      await writeFile(join(root, name, '_pagecollection.json'), JSON.stringify({ id }))
    }
    await setCollectionOrder(root, ['col-zed', 'col-notes', 'col-plain'])
    await refreshTree(root)
    await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' })
    expect(await placeOfOnly()).toEqual({ above: 'col-plain', below: 'col-zed' })
  })

  it('a Space records its place in its Context’s order', async () => {
    await setSpaceOrder(root, 'ctx_projects', ['sp-sap', 'sp-pom'])
    await refreshTree(root)
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    expect(await placeOfOnly()).toEqual({ below: 'sp-sap' })
  })

  it('an unreadable registry refuses a Context delete before anything moves', async () => {
    await writeFile(contextsRegistryFile(root), '{corrupt')
    const r = await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects',
      kind: 'context',
    })
    expect(r.ok).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
    expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(true)
  })

  it('a page beneath an unreadable parent sidecar refuses the delete and leaves its bytes', async () => {
    await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), '{corrupt')
    await refreshTree(root)
    const before = await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')
    const r = await settledMutate(root, {
      op: 'delete',
      path: 'Notes/Daily/Alpha.md',
      kind: 'page',
    })
    expect(r.ok).toBe(false)
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')).toBe(before)
    expect(await readFile(join(root, 'Notes', 'Daily', '_pageset.json'), 'utf8')).toBe('{corrupt')
  })

  it('an id-less tagging root marks the Space record partial — its membership is unrestorable', async () => {
    await writeFile(join(root, 'Notes', 'Daily', 'NoId.md'), '---\n<Projects>:\n  - Pommora\n---\n')
    await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    const { record } = await onlyBundle(root)
    expect(record).toMatchObject({ entity: 'space', partial: true })
    const members = (record as { members: { id: string }[] }).members
    expect(members.every((m) => typeof m.id === 'string')).toBe(true)
  })

  it('an unreadable Space sidecar inside the Context marks its record partial', async () => {
    await mkdir(join(contextsDir(root), 'Projects', 'Broken'), { recursive: true })
    await writeFile(join(contextsDir(root), 'Projects', 'Broken', '_space.json'), '{corrupt')
    const r = await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects',
      kind: 'context',
    })
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle(root)
    expect(record).toMatchObject({ entity: 'context', partial: true })
  })

  it.each([
    ['context', '.nexus/contexts/Projects'],
    ['space', '.nexus/contexts/Projects/Pommora'],
  ] as const)('an unreadable Space sidecar in another Context leaves a %s deletable, partial, and the sidecar byte-identical', async (kind, path) => {
    const broken = await seedSpaceSidecar(root, 'Areas', 'Broken', {})
    await writeFile(broken, '{ corrupt')
    await refreshTree(root)
    const r = await settledMutate(root, { op: 'delete', path, kind })
    expect(r.ok).toBe(true)
    const { record } = await onlyBundle(root)
    expect(record).toMatchObject({ entity: kind, partial: true })
    expect(await readFile(broken, 'utf8')).toBe('{ corrupt')
  })

  it('a page deleted from a Finder-made folder records a real parent and restores', async () => {
    // No sidecar: exactly what appears when a folder is created outside the app, until the open stamps it.
    await mkdir(join(root, 'Notes', 'Inbox'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Inbox', 'Idea.md'), `---\nID: ${PAGE_C}\n---\nbody`)
    await stampMissing(root, (await readNexus(root)).unreadable)
    await refreshTree(root)
    const d = await settledMutate(root, { op: 'delete', path: 'Notes/Inbox/Idea.md', kind: 'page' })
    expect(d.ok).toBe(true)

    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(listed.record).toMatchObject({ entity: 'page', parent: { kind: 'container' } })
    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes', 'Inbox', 'Idea.md'))).toBe(true)
  })
})
