import { readFile, rm, writeFile, mkdir, stat } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { contextsDir } from '../Paths/paths'
import { tempRoot } from '../Testing/hostFs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renameSweep } from './registryProperty'

let root: string
let page: string

const seed = async (fm: string): Promise<void> => writeFile(page, `---\n${fm}---\nbody\n`)

beforeEach(async () => {
  root = tempRoot('sweep-')
  const col = join(root, 'Col')
  await mkdir(col, { recursive: true })
  await writeFile(join(col, '_pagecollection.json'), JSON.stringify({ id: 'c', properties: [] }))
  page = join(col, 'p.md')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('renameSweep', () => {
  it('renames the key in place when only the old one is there', async () => {
    await seed('id: p1\nStatus: Old\n')
    await renameSweep(root, 'Status', 'Stage')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Stage: Old')
    expect(out).not.toContain('Status')
  })

  it('keeps the key’s position and the comment attached to it', async () => {
    await seed('id: p1\n# which stage this is at\nStatus: Old\nauthor: Username\n')
    await renameSweep(root, 'Status', 'Stage')
    expect(await readFile(page, 'utf8')).toBe(
      '---\nid: p1\n# which stage this is at\nStage: Old\nauthor: Username\n---\nbody\n',
    )
  })

  it('drops the old key where the new one already holds a value', async () => {
    // A write landed under the new name while the sweep was running: it is the fresher of the two.
    await seed('id: p1\nStatus: Stale\nStage: Fresh\n')
    await renameSweep(root, 'Status', 'Stage')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('Stage: Fresh')
    expect(out).not.toContain('Stale')
  })

  it('is idempotent — a second sweep changes nothing', async () => {
    await seed('id: p1\nStatus: Old\n')
    await renameSweep(root, 'Status', 'Stage')
    const once = await readFile(page, 'utf8')
    await renameSweep(root, 'Status', 'Stage')
    expect(await readFile(page, 'utf8')).toBe(once)
  })

  it('leaves an unmatched wrapped key inert, and every foreign key with it', async () => {
    await seed('id: p1\n# keep\nStatus: Old\n<Retired>: keep\n<Areas>:\n  - Work\nforeign: keep\n')
    await renameSweep(root, 'Status', 'Stage')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Retired>: keep')
    expect(out).toContain('<Areas>')
    expect(out).toContain('foreign: keep')
    expect(out).toContain('# keep')
  })

  it('does not re-date a page — a key-only rename is not a content edit', async () => {
    await seed('id: p1\nmodified_at: 2020-01-01T00:00:00.000Z\nStatus: Old\n')
    await renameSweep(root, 'Status', 'Stage')
    expect(await readFile(page, 'utf8')).toContain('2020-01-01T00:00:00.000Z')
  })

  it('never touches a page holding neither key', async () => {
    await seed('id: p1\n<Other>: x\n')
    const before = await readFile(page, 'utf8')
    await renameSweep(root, 'Status', 'Stage')
    expect(await readFile(page, 'utf8')).toBe(before)
  })
})

describe('renameSweep reaches a Space sidecar', () => {
  const seedSpace = async (raw: Record<string, unknown>): Promise<string> => {
    const dir = join(contextsDir(root), 'Projects', 'Pommora')
    await mkdir(dir, { recursive: true })
    const file = join(dir, '_space.json')
    await writeFile(file, JSON.stringify(raw))
    return file
  }
  const sidecar = async (file: string): Promise<Record<string, unknown>> =>
    JSON.parse(await readFile(file, 'utf8'))

  it('moves the key and its $order entry together', async () => {
    const file = await seedSpace({
      id: 'sp1',
      Status: 'Old',
      $order: { contexts: ['ctxA'], properties: ['Other', 'Status'] },
    })
    await renameSweep(root, 'Status', 'Stage')
    const raw = await sidecar(file)
    expect(raw.Stage).toBe('Old')
    expect('Status' in raw).toBe(false)
    expect(raw.$order).toEqual({ contexts: ['ctxA'], properties: ['Other', 'Stage'] })
  })

  it('renames a listed entry on a sidecar that no longer holds the key', async () => {
    const file = await seedSpace({ id: 'sp1', $order: { properties: ['Status'] } })
    await renameSweep(root, 'Status', 'Stage')
    expect((await sidecar(file)).$order).toEqual({ properties: ['Stage'] })
  })

  it('leaves a sidecar with neither the key nor the entry byte-identical', async () => {
    const file = await seedSpace({ id: 'sp1', Other: 'x' })
    const bytes = await readFile(file, 'utf8')
    const mtime = (await stat(file)).mtimeMs
    await renameSweep(root, 'Status', 'Stage')
    expect(await readFile(file, 'utf8')).toBe(bytes)
    expect((await stat(file)).mtimeMs).toBe(mtime)
  })
})
