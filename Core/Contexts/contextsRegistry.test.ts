import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureContextsRegistry, mutateRegistryFile, readRegistryStrict } from './contextsRegistry'
import { contextsRegistryFile, nexusDir } from '../Paths/paths'
import { readJsonStrict, rmwJsonStrict } from '../Files/atomicWrite'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-ctxreg-'))
  await mkdir(join(root, '.nexus', 'contexts'), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('paths', () => {
  it('lays the registry file out under .nexus', () => {
    expect(contextsRegistryFile(root)).toBe(join(root, '.nexus', 'contexts', 'contexts.json'))
  })
})

// The open path is the ONLY seeder: every create reads the registry strictly and fails on a missing file, so a nexus that opens without one can never mint its first Context.
describe('ensureContextsRegistry', () => {
  it('seeds the three contexts on a true fresh nexus, then leaves the file alone', async () => {
    await mkdir(nexusDir(root), { recursive: true })
    await ensureContextsRegistry(root)

    const r = await readRegistryStrict(root)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(new Set(r.value.contexts.map((c) => c.id)).size).toBe(3)
    expect(r.value.contexts.map((c) => c.title)).toEqual(['Areas', 'Topics', 'Projects'])

    const seeded = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    await ensureContextsRegistry(root)
    expect(JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))).toEqual(seeded)
  })

  it('leaves a corrupt registry untouched, and the strict read fails', async () => {
    await writeFile(contextsRegistryFile(root), '{nope')
    await ensureContextsRegistry(root)
    expect(await readFile(contextsRegistryFile(root), 'utf8')).toBe('{nope')
    expect((await readRegistryStrict(root)).ok).toBe(false)
  })
})

describe('mutateRegistryFile', () => {
  it('round-trips unknown fields at both levels', async () => {
    await ensureContextsRegistry(root)
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
    const after = await readRegistryStrict(root)
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
