import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mutateRegistryFile, readRegistry } from './contextsRegistry'
import { contextsRegistryFile, nexusDir, spaceDir } from './paths'
import { readJsonStrict, rmwJsonStrict } from './io/atomicWrite'
import { DEFAULT_LABELS } from '@shared/types'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-ctxreg-'))
  await mkdir(nexusDir(root), { recursive: true })
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('paths', () => {
  it('lays out the registry file and space dirs under .nexus', () => {
    expect(contextsRegistryFile(root)).toBe(join(root, '.nexus', 'contexts.json'))
    expect(spaceDir(root, 'Projects', 'Pommora')).toBe(
      join(root, '.nexus', 'contexts', 'Projects', 'Pommora'),
    )
  })
})

describe('readRegistry', () => {
  it('seeds the three contexts on a true fresh nexus and writes the file', async () => {
    const r = await readRegistry(root, DEFAULT_LABELS)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.contexts.map((c) => c.id)).toHaveLength(3)
    expect(new Set(r.value.contexts.map((c) => c.id)).size).toBe(3) // distinct minted ids
    expect(r.value.contexts.map((c) => c.title)).toEqual(['Areas', 'Topics', 'Projects'])
    const onDisk = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(onDisk.contexts).toHaveLength(3)
  })

  it('fails on corrupt JSON and leaves the file untouched', async () => {
    await writeFile(contextsRegistryFile(root), '{nope')
    const r = await readRegistry(root, DEFAULT_LABELS)
    expect(r.ok).toBe(false)
    expect(await readFile(contextsRegistryFile(root), 'utf8')).toBe('{nope')
  })
})

describe('mutateRegistryFile', () => {
  it('round-trips unknown fields at both levels', async () => {
    await readRegistry(root, DEFAULT_LABELS)
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
