import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureIdentity } from './identity'
import { isUlid } from './ids'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES } from './paths'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-identity-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const idPath = () => nexusConfig(root, NEXUS_CONFIG_FILES.identity)
const readId = async (): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(idPath(), 'utf8'))
const writeId = async (v: object): Promise<void> => {
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(idPath(), JSON.stringify(v))
}

describe('ensureIdentity', () => {
  it('mints { id, createdAt } when absent', async () => {
    const r = await ensureIdentity(root)
    expect(r.created).toBe(true)
    const j = await readId()
    expect(Object.keys(j).sort()).toEqual(['createdAt', 'id'])
    expect(typeof j.id === 'string' && isUlid(j.id as string)).toBeTruthy()
    expect(Number.isNaN(Date.parse(j.createdAt as string))).toBe(false)
  })

  it('returns an id-carrying file untouched, whatever else it holds or lacks', async () => {
    await writeId({ id: 'existing-ulid', description: 'keep me' })
    const before = await readFile(idPath(), 'utf8')
    const r = await ensureIdentity(root)
    expect(r.created).toBe(false)
    expect(r.id).toBe('existing-ulid')
    expect(await readFile(idPath(), 'utf8')).toBe(before)
  })

  it('leaves a complete file byte-identical (no churn on re-open)', async () => {
    await writeId({ id: 'nx', createdAt: '2026-06-24T20:00:00Z' })
    const before = await readFile(idPath(), 'utf8')
    const r = await ensureIdentity(root)
    expect(r.created).toBe(false)
    expect(await readFile(idPath(), 'utf8')).toBe(before)
  })

  it('runs the session on a throwaway id when nexus.json is unreadable — file untouched', async () => {
    await mkdir(nexusDir(root), { recursive: true })
    await writeFile(idPath(), '{ corrupt', 'utf8')
    const r = await ensureIdentity(root)
    expect(r.created).toBe(false)
    expect(isUlid(r.id)).toBe(true)
    expect(await readFile(idPath(), 'utf8')).toBe('{ corrupt')
  })

  it('minting over a readable id-less file preserves its foreign keys', async () => {
    await writeId({ note: 'keep me' })
    const r = await ensureIdentity(root)
    expect(r.created).toBe(true)
    const j = await readId()
    expect(j.note).toBe('keep me')
    expect(typeof j.id === 'string' && isUlid(j.id as string)).toBeTruthy()
  })
})
