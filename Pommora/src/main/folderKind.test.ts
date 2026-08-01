import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readAgendaRegistration,
  resolveFolderKind,
  type FolderKindContext,
} from './folderKind'
import { SIDECAR_FILENAME } from './paths'

const TASKS = '01KVGMT8BFG350FZZXAMG1QDT1'
const EVENTS = '01KVGMT8BFG350FZZXAMG1QDE1'
let root: string
const REG = (): FolderKindContext => ({
  agenda: { tasks: TASKS, events: EVENTS },
  sidecarMode: true,
  root,
})
const RAW = (): FolderKindContext => ({ agenda: {}, sidecarMode: false, root })
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-kind-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const dir = async (name: string, files: Record<string, unknown> = {}): Promise<string> => {
  const abs = join(root, name)
  await mkdir(abs, { recursive: true })
  for (const [k, v] of Object.entries(files)) await writeFile(join(abs, k), JSON.stringify(v))
  return abs
}

describe('readAgendaRegistration', () => {
  it('reads a recorded pair', () => {
    expect(readAgendaRegistration({ agenda_singletons: { tasks: TASKS, events: EVENTS } })).toEqual({
      tasks: TASKS,
      events: EVENTS,
    })
  })

  // A nexus that records nothing registers nothing — and every agenda config it holds is inert,
  // which is the state every existing nexus is in until the Agenda work seeds its pair.
  it('registers nothing for an absent, empty or malformed field', () => {
    for (const identity of [
      null,
      {},
      { agenda_singletons: null },
      { agenda_singletons: 'Tasks' },
      { agenda_singletons: [] },
      { agenda_singletons: { tasks: 42, events: '' } },
    ]) {
      expect(readAgendaRegistration(identity)).toEqual({})
    }
  })

  it('takes the half it can read when only one slot is recorded', () => {
    expect(readAgendaRegistration({ agenda_singletons: { tasks: TASKS } })).toEqual({ tasks: TASKS })
  })
})

describe('resolveFolderKind', () => {
  it('classifies a registered agenda singleton at the root by its sidecar id', async () => {
    const t = await dir('Tasks', { [SIDECAR_FILENAME.taskConfig]: { id: TASKS } })
    const e = await dir('Events', { [SIDECAR_FILENAME.eventConfig]: { id: EVENTS } })
    expect(await resolveFolderKind(t, 'root', REG())).toBe('tasks-singleton')
    expect(await resolveFolderKind(e, 'root', REG())).toBe('events-singleton')
  })

  // The registration IS the guard: a hand-made config matches no record, so it stays inert bytes
  // rather than becoming a second Tasks folder feeding the same list.
  it('leaves an unregistered agenda config unknown, however well-formed', async () => {
    const d = await dir('Fake Tasks', { [SIDECAR_FILENAME.taskConfig]: { id: 'ANOTHERULID000000000000000' } })
    expect(await resolveFolderKind(d, 'root', REG())).toBe('unknown')
  })

  it('leaves an agenda config with no readable id unknown', async () => {
    const d = await dir('Broken', {})
    await writeFile(join(d, SIDECAR_FILENAME.taskConfig), '{ corrupt')
    expect(await resolveFolderKind(d, 'root', REG())).toBe('unknown')
  })

  it('leaves a registered agenda config unknown when it sits nested', async () => {
    const d = await dir('Notes/Tasks', { [SIDECAR_FILENAME.taskConfig]: { id: TASKS } })
    expect(await resolveFolderKind(d, 'nested', REG())).toBe('unknown')
  })

  it('refuses to guess when a folder carries both an agenda config and a container sidecar', async () => {
    const d = await dir('Both', {
      [SIDECAR_FILENAME.taskConfig]: { id: TASKS },
      [SIDECAR_FILENAME.collection]: { id: '01KVGMT8BFG350FZZXAMG1QDC1' },
    })
    expect(await resolveFolderKind(d, 'root', REG())).toBe('unknown')
  })

  it('classifies containers by position once no agenda config is in play', async () => {
    const c = await dir('Notes', { [SIDECAR_FILENAME.collection]: { id: '01KVGMT8BFG350FZZXAMG1QDC2' } })
    const s = await dir('Notes/Daily', { [SIDECAR_FILENAME.set]: { id: '01KVGMT8BFG350FZZXAMG1QDS1' } })
    const bare = await dir('Notes/Bare')
    expect(await resolveFolderKind(c, 'root', REG())).toBe('collection')
    expect(await resolveFolderKind(s, 'nested', REG())).toBe('set')
    // Position alone makes a nested folder a Set — the page world needs no sidecar check.
    expect(await resolveFolderKind(bare, 'nested', REG())).toBe('set')
  })

  it('leaves a sidecar-less root folder unknown in sidecar mode', async () => {
    const d = await dir('Stray')
    expect(await resolveFolderKind(d, 'root', REG())).toBe('unknown')
  })

  // A raw nexus has no container sidecars at all; every root folder is a Collection by position.
  it('classifies a sidecar-less root folder as a Collection in raw mode', async () => {
    const d = await dir('Stray')
    expect(await resolveFolderKind(d, 'root', RAW())).toBe('collection')
  })

  it('still refuses an agenda config in raw mode when nothing registers it', async () => {
    const d = await dir('Tasks', { [SIDECAR_FILENAME.taskConfig]: { id: TASKS } })
    expect(await resolveFolderKind(d, 'root', RAW())).toBe('unknown')
  })
})
