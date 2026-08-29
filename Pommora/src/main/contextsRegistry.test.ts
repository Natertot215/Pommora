import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureContextsRegistry, mutateRegistryFile, readRegistry } from './contextsRegistry'
import { contextsRegistryFile, nexusDir } from './paths'
import { readJsonStrict, rmwJsonStrict } from './IO/atomicWrite'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-ctxreg-'))
  await mkdir(nexusDir(root), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('paths', () => {
  it('lays the registry file out under .nexus', () => {
    expect(contextsRegistryFile(root)).toBe(join(root, '.nexus', 'contexts.json'))
  })
})

describe('readRegistry', () => {
  it('seeds the three contexts on a true fresh nexus and writes the file', async () => {
    const r = await readRegistry(root)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.contexts.map((c) => c.id)).toHaveLength(3)
    expect(new Set(r.value.contexts.map((c) => c.id)).size).toBe(3) // distinct minted ids
    expect(r.value.contexts.map((c) => c.title)).toEqual(['Areas', 'Topics', 'Projects'])
    const onDisk = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(onDisk.contexts).toHaveLength(3)
  })

  // The open path is the ONLY seeder: every create reads the registry strictly and fails on a
  // missing file, so a nexus that opens without one can never mint its first Context.
  it('ensureContextsRegistry seeds a fresh nexus, and leaves an existing registry alone', async () => {
    await mkdir(nexusDir(root), { recursive: true })
    await ensureContextsRegistry(root)
    const seeded = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(seeded.contexts.map((c: { title: string }) => c.title)).toEqual([
      'Areas',
      'Topics',
      'Projects',
    ])

    await ensureContextsRegistry(root)
    const again = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(again).toEqual(seeded) // idempotent — ids don't re-mint on the next open
  })

  it('fails on corrupt JSON and leaves the file untouched', async () => {
    await writeFile(contextsRegistryFile(root), '{nope')
    const r = await readRegistry(root)
    expect(r.ok).toBe(false)
    expect(await readFile(contextsRegistryFile(root), 'utf8')).toBe('{nope')
  })
})

describe('mutateRegistryFile', () => {
  it('round-trips unknown fields at both levels', async () => {
    await readRegistry(root)
    const before = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    before.foreign = { keep: true }
    before.contexts[0].future_field = 7
    await writeFile(contextsRegistryFile(root), JSON.stringify(before))

    const r = await mutateRegistryFile(root, (reg) => ({
      contexts: [...reg.contexts, { id: 'ctxNew', title: 'Classes', singular: 'Class' }],
    }))
    expect(r.ok).toBe(true)
    const after = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(after.foreign).toEqual({ keep: true })
    expect(after.contexts[0].future_field).toBe(7)
    expect(after.contexts).toHaveLength(4)
  })

  it('fails without writing when the registry is unreadable', async () => {
    const r = await mutateRegistryFile(root, (reg) => reg)
    expect(r.ok).toBe(false)
  })

  // The file is read-modify-written whole, under its own per-path lock, so neither of two
  // overlapping mutations may drop the other's change.
  it('concurrent mutations both land', async () => {
    await ensureContextsRegistry(root)
    await Promise.all([
      mutateRegistryFile(root, (cur) => ({
        ...cur,
        contexts: [...cur.contexts, { id: 'ctx_x', title: 'X', singular: 'X' }],
      })),
      mutateRegistryFile(root, (cur) => ({
        ...cur,
        contexts: [...cur.contexts, { id: 'ctx_y', title: 'Y', singular: 'Y' }],
      })),
    ])
    const after = await readRegistry(root)
    expect(after.ok).toBe(true)
    if (!after.ok) return
    const titles = after.value.contexts.map((c) => c.title)
    expect(titles).toContain('X')
    expect(titles).toContain('Y')
  })
})

describe('strict JSON IO', () => {
  it('readJsonStrict distinguishes missing from corrupt', async () => {
    const missing = await readJsonStrict(join(root, 'none.json'))
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error.code).toBe('not-found')
    await writeFile(join(root, 'bad.json'), '{nope')
    const bad = await readJsonStrict(join(root, 'bad.json'))
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error.code).toBe('operation-failed')
  })

  it('rmwJsonStrict never falls back to empty — a missing file fails, no write happens', async () => {
    const target = join(root, 'space.json')
    const r = await rmwJsonStrict(target, (cur) => ({ ...cur, x: 1 }))
    expect(r.ok).toBe(false)
    const read = await readJsonStrict(target)
    expect(read.ok).toBe(false)
  })

  it('rmwJsonStrict rewrites an existing file through the mutator', async () => {
    const target = join(root, 'space.json')
    await writeFile(target, JSON.stringify({ id: 'sp1', color: 'cyan' }))
    const r = await rmwJsonStrict(target, (cur) => ({ ...cur, banner: 'b.png' }))
    expect(r.ok).toBe(true)
    const after = JSON.parse(await readFile(target, 'utf8'))
    expect(after).toEqual({ id: 'sp1', color: 'cyan', banner: 'b.png' })
  })
})
