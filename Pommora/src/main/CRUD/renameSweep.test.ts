import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renameSweep } from './registryProperty'

let root: string
let page: string

const seed = async (fm: string): Promise<void> => writeFile(page, `---\n${fm}---\nbody\n`)

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'sweep-'))
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
    await seed('id: p1\n<Status>: Old\n')
    await renameSweep(root, 'Status', 'Stage')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Stage>: Old')
    expect(out).not.toContain('<Status>')
  })

  it('keeps the key’s position and the comment attached to it', async () => {
    await seed('id: p1\n# which stage this is at\n<Status>: Old\nauthor: Username\n')
    await renameSweep(root, 'Status', 'Stage')
    expect(await readFile(page, 'utf8')).toBe(
      '---\nid: p1\n# which stage this is at\n<Stage>: Old\nauthor: Username\n---\nbody\n',
    )
  })

  it('drops the old key where the new one already holds a value', async () => {
    // A write landed under the new name while the sweep was running: it is the fresher of the two.
    await seed('id: p1\n<Status>: Stale\n<Stage>: Fresh\n')
    await renameSweep(root, 'Status', 'Stage')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Stage>: Fresh')
    expect(out).not.toContain('Stale')
  })

  it('is idempotent — a second sweep changes nothing', async () => {
    await seed('id: p1\n<Status>: Old\n')
    await renameSweep(root, 'Status', 'Stage')
    const once = await readFile(page, 'utf8')
    await renameSweep(root, 'Status', 'Stage')
    expect(await readFile(page, 'utf8')).toBe(once)
  })

  it('leaves an unmatched wrapped key inert, and every foreign key with it', async () => {
    await seed(
      'id: p1\n# keep\n<Status>: Old\n<Retired>: keep\n(Areas):\n  - Work\nforeign: keep\n',
    )
    await renameSweep(root, 'Status', 'Stage')
    const out = await readFile(page, 'utf8')
    expect(out).toContain('<Retired>: keep')
    expect(out).toContain('(Areas)')
    expect(out).toContain('foreign: keep')
    expect(out).toContain('# keep')
  })

  it('does not re-date a page — a key-only rename is not a content edit', async () => {
    await seed('id: p1\nmodified_at: 2020-01-01T00:00:00.000Z\n<Status>: Old\n')
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
