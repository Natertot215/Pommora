// A content file whose key contradicts the folder it sits in is Unknown — invisible to every read, and byte-untouched by every write. "Untouched" is asserted against the BYTES, not against a flag.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ID_KEY, kindOf } from './identityMark'
import { readNexus } from './readNexus'
import { stampAdopted } from './adopt'
import { agendaContext, resolveFolderKind } from './folderKind'
import { pathExists, readJsonObject } from '../IO/atomicWrite'
import { renameCascade } from './cascade'
import { handleMutate, type MutateDeps } from './mutate'
import { openSession, closeSession } from './session'
import {
  contextsRegistryFile,
  nexusDir,
  nexusConfig,
  NEXUS_CONFIG_FILES,
  SIDECAR_FILENAME,
} from '../Locations/paths'

const TASK_ULID = '01KVGMT8BFT350FZZXAMG1QDRD'
const deps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

/** A file whose key contradicts the Collection it sits in, or whose value can't be an identity. */
const UNKNOWN_FILES: Record<string, string> = {
  'Contradicting.md': `---\n${ID_KEY}: ${TASK_ULID}\n---\n\nlinks to [[Target]]\n`,
  'Malformed.md': `---\n${ID_KEY}: not a ulid\n---\n\nlinks to [[Target]]\n`,
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-admit-'))
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(
    nexusConfig(root, NEXUS_CONFIG_FILES.identity),
    JSON.stringify({ id: '01KVGMT8BFP350FZZXAMG1QDNX', createdAt: '2026' }),
  )
  await writeFile(nexusConfig(root, NEXUS_CONFIG_FILES.settings), '{}')
  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(
    join(root, 'Notes', SIDECAR_FILENAME.collection),
    JSON.stringify({ id: '01KVGMT8BFP350FZZXAMG1QDC1' }),
  )
  for (const [name, body] of Object.entries(UNKNOWN_FILES)) {
    await writeFile(join(root, 'Notes', name), body)
  }
  await writeFile(
    join(root, 'Notes', 'Member.md'),
    `---\n${ID_KEY}: 01KVGMT8BFP350FZZXAMG1QDM1\n---\n\nlinks to [[Target]]\n`,
  )
  await writeFile(join(root, 'Notes', 'Adoptable.md'), 'no frontmatter, links to [[Target]]\n')
})
afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const titles = async (): Promise<string[]> => {
  const t = await readNexus(root)
  return (t.collections?.[0]?.pages ?? []).map((p) => p.title).sort()
}
const bytes = (name: string): Promise<string> => readFile(join(root, 'Notes', name), 'utf8')

describe('the Unknown matrix, on disk', () => {
  it('keeps every Unknown file out of the walked tree, and admits the two that belong', async () => {
    expect(await titles()).toEqual(['Adoptable', 'Member'])
  })

  it('leaves every Unknown file byte-identical through adoption', async () => {
    const before = await Promise.all(Object.keys(UNKNOWN_FILES).map(bytes))
    await stampAdopted(root)
    expect(await Promise.all(Object.keys(UNKNOWN_FILES).map(bytes))).toEqual(before)
  })

  it('adopts the id-less page in the same pass that refuses the Unknown ones', async () => {
    await stampAdopted(root)
    // The control proves the pass ran at all — otherwise "untouched" is vacuously true.
    expect(await bytes('Adoptable.md')).toContain(`${ID_KEY}:`)
  })

  it('never stamps a SECOND key onto a file that already contradicts its folder', async () => {
    await stampAdopted(root)
    const after = await bytes('Contradicting.md')
    expect(after).toContain(`${ID_KEY}: ${TASK_ULID}`)
    expect(after.match(new RegExp(`^${ID_KEY}:`, 'gm'))).toHaveLength(1)
  })
})

describe('the nexus-wide write sweeps', () => {
  it('the link cascade rewrites members and id-less pages, never an Unknown one', async () => {
    const before = await Promise.all(Object.keys(UNKNOWN_FILES).map(bytes))
    const r = await renameCascade(root, 'Target', 'Renamed')
    expect(r.ok).toBe(true)

    expect(await bytes('Member.md')).toContain('[[Renamed]]')
    expect(await bytes('Adoptable.md')).toContain('[[Renamed]]')
    expect(await Promise.all(Object.keys(UNKNOWN_FILES).map(bytes))).toEqual(before)
  })

  // The walk admits a `.MD` case-insensitively, so the sweeps have to reach it on the same terms. A file the tree shows but no sweep rewrites goes quietly stale: its links survive a rename and its property cells read empty.
  it('sweeps an upper-case .MD page on the same terms as any other member', async () => {
    await writeFile(
      join(root, 'Notes', 'Upper.MD'),
      `---\n${ID_KEY}: 01KVGMT8BFP350FZZXAMG1QDV1\n---\n\nlinks to [[Target]]\n`,
    )
    expect(await titles()).toContain('Upper')

    const r = await renameCascade(root, 'Target', 'Renamed')
    expect(r.ok).toBe(true)
    expect(await bytes('Upper.MD')).toContain('[[Renamed]]')
  })

  it('a Context RENAME sweeps a member but leaves an Unknown file alone', async () => {
    await openSession(root)
    const made = await handleMutate({ op: 'createContextGroup', name: 'Projects' }, deps)
    expect(made.ok).toBe(true)
    if (!made.ok) return
    const contextId = made.value.created!.id

    const tagged = (key: string, id: string): string =>
      `---\n${key}: ${id}\n<Projects>:\n  - Pommora\n---\nbody\n`
    await writeFile(join(root, 'Notes', 'Contradicting.md'), tagged(ID_KEY, TASK_ULID))
    await writeFile(join(root, 'Notes', 'Member.md'), tagged(ID_KEY, '01KVGMT8BFP350FZZXAMG1QDM1'))
    const before = await bytes('Contradicting.md')

    const r = await handleMutate({ op: 'renameContext', contextId, newName: 'Ventures' }, deps)
    expect(r.ok).toBe(true)
    expect(await bytes('Member.md')).toContain('<Ventures>:')
    expect(await bytes('Contradicting.md')).toBe(before)
  })
})

describe('the move backstop', () => {
  it('refuses a page moved into a folder that holds no pages', async () => {
    await openSession(root)
    await mkdir(join(root, 'Nowhere'), { recursive: true })
    const r = await handleMutate(
      { op: 'movePage', path: 'Notes/Member.md', newParentPath: 'Nowhere' },
      deps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('invalid-path')
    expect(await bytes('Member.md')).toContain(ID_KEY)
  })

  // The nexus root holds no content of its own. `depth` is caller-supplied, so without an explicit root arm the resolver called it a Set and the one main-side check passed for that destination.
  it('refuses a move onto the nexus root itself', async () => {
    await openSession(root)
    const r = await handleMutate(
      { op: 'movePage', path: 'Notes/Member.md', newParentPath: '.' },
      deps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('invalid-path')
  })

  // A registered singleton is a real, adopted, root-level folder — everything a Collection is — and still not a place a page may land. The backstop refuses every agenda destination the same way, registered or not.
  it('refuses a page moved into a registered agenda singleton', async () => {
    const TASKS = '01KVGMT8BFP350FZZXAMG1QDT1'
    await writeFile(
      nexusConfig(root, NEXUS_CONFIG_FILES.identity),
      JSON.stringify({
        id: '01KVGMT8BFP350FZZXAMG1QDNX',
        createdAt: '2026',
        agenda_singletons: { tasks: TASKS },
      }),
    )
    await mkdir(join(root, 'Tasks'), { recursive: true })
    await writeFile(join(root, 'Tasks', SIDECAR_FILENAME.taskConfig), JSON.stringify({ id: TASKS }))
    await openSession(root)

    const r = await handleMutate(
      { op: 'movePage', path: 'Notes/Member.md', newParentPath: 'Tasks' },
      deps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    // The MESSAGE, not just the code: resolveUnderRoot refuses with `invalid-path` as well, so a code-only assertion passes for a destination that never reached the backstop at all.
    expect(r.error.message).toBe('Pages live in Collections and Sets.')
    expect(await bytes('Member.md')).toContain(ID_KEY)
  })

  it('still allows a move into a real Set', async () => {
    await openSession(root)
    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Daily', SIDECAR_FILENAME.set),
      JSON.stringify({ id: '01KVGMT8BFP350FZZXAMG1QDS1' }),
    )
    const r = await handleMutate(
      { op: 'movePage', path: 'Notes/Member.md', newParentPath: 'Notes/Daily' },
      deps,
    )
    expect(r.ok).toBe(true)
  })
})

describe('agenda singleton adoption', () => {
  const TASKS = '01KVGMT8BFP350FZZXAMG1QDT1'

  const withRegisteredTasks = async (): Promise<void> => {
    await writeFile(
      nexusConfig(root, NEXUS_CONFIG_FILES.identity),
      JSON.stringify({
        id: '01KVGMT8BFP350FZZXAMG1QDNX',
        createdAt: '2026',
        agenda_singletons: { tasks: TASKS },
      }),
    )
    await mkdir(join(root, 'Tasks', 'Nested'), { recursive: true })
    await writeFile(join(root, 'Tasks', SIDECAR_FILENAME.taskConfig), JSON.stringify({ id: TASKS }))
    await writeFile(join(root, 'Tasks', 'Buy milk.md'), 'no frontmatter\n')
    await writeFile(join(root, 'Tasks', 'Nested', 'Deep.md'), 'no frontmatter\n')
  }

  it('stamps direct members with the agenda kind, never the page one', async () => {
    await withRegisteredTasks()
    await stampAdopted(root)
    const task = await readFile(join(root, 'Tasks', 'Buy milk.md'), 'utf8')
    expect(kindOf(task.match(new RegExp(`^${ID_KEY}: (\\S+)`, 'm'))![1])).toBe('task')
  })

  it('is flat — it neither container-stamps itself nor reaches anything below it', async () => {
    await withRegisteredTasks()
    await stampAdopted(root)
    expect(await readFile(join(root, 'Tasks', 'Nested', 'Deep.md'), 'utf8')).not.toContain('ID:')
    await expect(
      readFile(join(root, 'Tasks', 'Nested', SIDECAR_FILENAME.set), 'utf8'),
    ).rejects.toThrow()
    await expect(
      readFile(join(root, 'Tasks', SIDECAR_FILENAME.collection), 'utf8'),
    ).rejects.toThrow()
  })

  it('carries a registered singleton back to the root when it is found nested', async () => {
    await withRegisteredTasks()
    await mkdir(join(root, 'Notes', 'Tasks'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Tasks', SIDECAR_FILENAME.taskConfig),
      JSON.stringify({ id: TASKS }),
    )
    await rm(join(root, 'Tasks'), { recursive: true, force: true })

    await stampAdopted(root)
    expect(await readFile(join(root, 'Tasks', SIDECAR_FILENAME.taskConfig), 'utf8')).toContain(
      TASKS,
    )
    await expect(
      readFile(join(root, 'Notes', 'Tasks', SIDECAR_FILENAME.taskConfig), 'utf8'),
    ).rejects.toThrow()
  })

  it('refuses to re-home onto a name already taken at the root', async () => {
    await withRegisteredTasks()
    await mkdir(join(root, 'Notes', 'Tasks'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Tasks', SIDECAR_FILENAME.taskConfig),
      JSON.stringify({ id: TASKS }),
    )
    // `Tasks/` still exists at the root — two folders claiming one place is the user's to resolve.
    await stampAdopted(root)
    expect(
      await readFile(join(root, 'Notes', 'Tasks', SIDECAR_FILENAME.taskConfig), 'utf8'),
    ).toContain(TASKS)
  })

  // Every duplication mechanism copies the id the registration keys on, so two folders answer to one record — the same ambiguity a single folder claiming two kinds already gets: no arm picks. Nothing is written, so deleting the stray config restores the nexus completely.
  it('drops a contested slot — a duplicated config makes BOTH folders inert', async () => {
    await withRegisteredTasks()
    await mkdir(join(root, 'Tasks copy'), { recursive: true })
    await writeFile(
      join(root, 'Tasks copy', SIDECAR_FILENAME.taskConfig),
      JSON.stringify({ id: TASKS }),
    )
    await writeFile(join(root, 'Tasks copy', 'Copied.md'), 'no frontmatter\n')

    await stampAdopted(root)
    expect(await readFile(join(root, 'Tasks copy', 'Copied.md'), 'utf8')).toBe('no frontmatter\n')
    expect(await readFile(join(root, 'Tasks', 'Buy milk.md'), 'utf8')).toBe('no frontmatter\n')
  })

  // Re-homing matches a registered id at any depth; contest detection only ever looked at the root's own children, so a copy filed inside a Collection read as the singleton having been dragged away — it was carried out of the folder the user put it in, and on the next open the two contested the slot and de-registered the real one.
  it('leaves a nested duplicate where the user filed it while the real singleton is home', async () => {
    await withRegisteredTasks()
    await mkdir(join(root, 'Notes', 'Tasks copy'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Tasks copy', SIDECAR_FILENAME.taskConfig),
      JSON.stringify({ id: TASKS }),
    )

    await stampAdopted(root)
    expect(await pathExists(join(root, 'Notes', 'Tasks copy'))).toBe(true)
    expect(await pathExists(join(root, 'Tasks copy'))).toBe(false)
    const identity = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
    const ctx = await agendaContext(root, identity, true)
    expect(await resolveFolderKind(join(root, 'Tasks'), 'root', ctx)).toBe('tasks-singleton')
  })

  // A folder that crossed depth outside the app carries the wrong sidecar. Its identity is renamed, not replaced — a second sidecar would leave one folder with two competing ids.
  it('migrates a stale container sidecar rather than minting a second id', async () => {
    const SET_ID = '01KVGMT8BFP350FZZXAMG1QDS9'
    await mkdir(join(root, 'Stray'), { recursive: true })
    await writeFile(
      join(root, 'Stray', SIDECAR_FILENAME.set),
      JSON.stringify({ id: SET_ID, icon: 'box' }),
    )
    await writeFile(join(root, 'Stray', 'Note.md'), 'no frontmatter\n')

    await stampAdopted(root)
    const coll = JSON.parse(
      await readFile(join(root, 'Stray', SIDECAR_FILENAME.collection), 'utf8'),
    )
    expect(coll.id).toBe(SET_ID)
    expect(coll.icon).toBe('box')
    await expect(readFile(join(root, 'Stray', SIDECAR_FILENAME.set), 'utf8')).rejects.toThrow()
  })

  it('leaves an UNREGISTERED agenda folder entirely alone', async () => {
    await mkdir(join(root, 'Tasks'), { recursive: true })
    await writeFile(join(root, 'Tasks', SIDECAR_FILENAME.taskConfig), JSON.stringify({ id: TASKS }))
    await writeFile(join(root, 'Tasks', 'Buy milk.md'), 'no frontmatter\n')
    await stampAdopted(root)
    expect(await readFile(join(root, 'Tasks', 'Buy milk.md'), 'utf8')).toBe('no frontmatter\n')
    expect((await readNexus(root)).collections?.map((c) => c.title)).toEqual(['Notes'])
  })
})
