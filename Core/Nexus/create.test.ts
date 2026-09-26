import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { splitFrontmatter } from '../Files/pageFile'
import type { TrashDeps } from '../Trash/bundle'
import { dropLiveTree, getLiveTree } from './liveTree'
import { closeSession, openSession } from './session'
import { handleMutate } from './mutate'
import { confirmMutation } from './mutatePatch'
import type { MutateRequest } from './mutateRequest'

let root: string
const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: (p) => rm(p, { force: true }) }

beforeEach(async () => {
  root = tempRoot('pom-create-')
  await mkdir(join(root, '.nexus', 'contexts', 'Areas', 'Work'), { recursive: true })
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'pt' }))
  await writeFile(
    join(root, '.nexus', 'contexts', 'Areas', 'Work', '_space.json'),
    JSON.stringify({ id: 'sp-work' }),
  )
  await writeFile(
    join(root, '.nexus', 'contexts', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'ctxA', title: 'Areas', singular: 'Area' }] }),
  )
  await openSession(root)
})
afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('createPage — Context seeds', () => {
  it('writes a seeded Space into the new page and the live tree', async () => {
    const req: MutateRequest = {
      op: 'createPage',
      parentPath: 'Notes',
      name: 'Seeded',
      seeds: { ctxA: { kind: 'context', value: ['sp-work'] } },
    }
    const r = await handleMutate(root, req, nexusDeps)
    if (!r.ok) throw new Error(r.error.message)
    await confirmMutation(root, req, r.value)
    const fm = splitFrontmatter(await readFile(join(root, 'Notes', 'Seeded.md'), 'utf8'))
    expect(fm['<Areas>']).toEqual(['Work'])
    const page = getLiveTree()?.collections[0]?.pages.find((p) => p.title === 'Seeded')
    expect(page?.contextValues).toEqual({ ctxA: ['sp-work'] })
  })
})
