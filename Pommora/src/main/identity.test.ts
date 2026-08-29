import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureIdentity } from './identity'
import { isUlid } from './ids'
import { pathExists } from './IO/atomicWrite'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES, SIDECAR_FILENAME } from './paths'

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
  it('mints { id, createdAt } + the agenda registration when absent', async () => {
    const r = await ensureIdentity(root)
    expect(r.created).toBe(true)
    const j = await readId()
    expect(Object.keys(j).sort()).toEqual(['agenda_singletons', 'createdAt', 'id'])
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

  // A file that EXISTS but carries no readable id is an established nexus with damaged identity,
  // not a new one — so it is repaired, not created. Reporting it as a creation would seed agenda
  // folders into a populated nexus and orphan every asset keyed to the old id.
  it('mints over a readable id-less file as a REPAIR, preserving its foreign keys', async () => {
    await writeId({ note: 'keep me' })
    const r = await ensureIdentity(root)
    expect(r.created).toBe(false)
    const j = await readId()
    expect(j.note).toBe('keep me')
    expect(typeof j.id === 'string' && isUlid(j.id as string)).toBeTruthy()
    expect(j.agenda_singletons).toBeUndefined()
    expect(await pathExists(join(root, 'Tasks'))).toBe(false)
  })

  it('does not re-seed a nexus whose id is present but not a string', async () => {
    await writeId({ id: 20260731, note: 'keep me' })
    const r = await ensureIdentity(root)
    expect(r.created).toBe(false)
    expect(await pathExists(join(root, 'Tasks'))).toBe(false)
    expect((await readId()).note).toBe('keep me')
  })
})

describe('the agenda singleton seed', () => {
  const cfg = async (folder: string, name: string): Promise<Record<string, unknown>> =>
    JSON.parse(await readFile(join(root, folder, name), 'utf8'))

  it('seeds both singletons at creation and registers them by sidecar id', async () => {
    await ensureIdentity(root)
    const j = await readId()
    const reg = j.agenda_singletons as { tasks: string; events: string }
    const task = await cfg('Tasks', SIDECAR_FILENAME.taskConfig)
    const event = await cfg('Events', SIDECAR_FILENAME.eventConfig)
    // The registration IS the record — a config whose id it doesn't name is inert.
    expect(reg.tasks).toBe(task.id)
    expect(reg.events).toBe(event.id)
    expect(isUlid(reg.tasks)).toBe(true)
    expect(isUlid(reg.events)).toBe(true)
    // Identity only: what fills these folders is the Agenda work's to decide, not the seed's.
    expect(Object.keys(task)).toEqual(['id'])
    expect(Object.keys(event)).toEqual(['id'])
  })

  it('is a creation event, not a repair — a second open re-seeds nothing', async () => {
    await ensureIdentity(root)
    const before = await readFile(idPath(), 'utf8')
    const firstTaskId = (await cfg('Tasks', SIDECAR_FILENAME.taskConfig)).id
    const r = await ensureIdentity(root)
    expect(r.created).toBe(false)
    expect(await readFile(idPath(), 'utf8')).toBe(before)
    expect((await cfg('Tasks', SIDECAR_FILENAME.taskConfig)).id).toBe(firstTaskId)
  })

  // Existing nexuses gain their pair when Agenda is actually built — seeding one here would
  // silently recreate folders a user deliberately removed.
  it('never retro-seeds a nexus that already carries an identity', async () => {
    await writeId({ id: '01KVGMT8BFG350FZZXAMG1QDRC' })
    await ensureIdentity(root)
    expect(await pathExists(join(root, 'Tasks'))).toBe(false)
    expect(await pathExists(join(root, 'Events'))).toBe(false)
    expect((await readId()).agenda_singletons).toBeUndefined()
  })

  // Opening a plain folder as a nexus takes the create branch, so a user's own `Tasks/` of notes
  // is reachable here. Claiming it would stamp an agenda config into their content and drop the
  // whole folder out of Collections.
  it('never claims a folder that already exists, and registers nothing for it', async () => {
    await mkdir(join(root, 'Tasks'), { recursive: true })
    await writeFile(join(root, 'Tasks', 'Note.md'), '# mine')
    await ensureIdentity(root)
    const reg = (await readId()).agenda_singletons as Record<string, unknown> | undefined
    expect(await pathExists(join(root, 'Tasks', SIDECAR_FILENAME.taskConfig))).toBe(false)
    expect(reg?.tasks).toBeUndefined()
    expect(typeof reg?.events).toBe('string') // the untaken slot still seeds
  })
})
