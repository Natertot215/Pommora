// The enforcement the identity design exists to produce: a content file whose key contradicts the
// folder it sits in is Unknown — invisible to every read, and byte-untouched by every write.
// "Untouched" is asserted against the BYTES, not against a flag: the whole promise is that Pommora
// leaves a file it can't place exactly as the user wrote it.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KIND_ID_KEY } from '@shared/identity'
import { readNexus } from './readNexus'
import { stampAdopted } from './adopt'
import { agendaContext, resolveFolderKind } from './folderKind'
import { pathExists, readJsonObject } from './IO/atomicWrite'
import { renameCascade } from './CRUD/cascade'
import { handleMutate, type MutateDeps } from './mutate'
import { openSession, closeSession } from './session'
import {
  contextsRegistryFile,
  nexusDir,
  nexusConfig,
  NEXUS_CONFIG_FILES,
  SIDECAR_FILENAME,
} from './paths'

const ULID = '01KVGMT8BFG350FZZXAMG1QDRC'
const OTHER = '01KVGMT8BFG350FZZXAMG1QDRD'
const deps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string

/** A file whose key contradicts the Collection it sits in, or whose value can't be an identity. */
const UNKNOWN_FILES: Record<string, string> = {
  'Contradicting.md': `---\n${KIND_ID_KEY.task}: ${ULID}\n---\n\nlinks to [[Target]]\n`,
  'Malformed.md': `---\n${KIND_ID_KEY.page}: not a ulid\n---\n\nlinks to [[Target]]\n`,
  'Dual.md': `---\n${KIND_ID_KEY.page}: ${ULID}\n${KIND_ID_KEY.task}: ${OTHER}\n---\n\nlinks to [[Target]]\n`,
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-admit-'))
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(
    nexusConfig(root, NEXUS_CONFIG_FILES.identity),
    JSON.stringify({ id: '01KVGMT8BFG350FZZXAMG1QDNX', createdAt: '2026' }),
  )
  await writeFile(nexusConfig(root, NEXUS_CONFIG_FILES.settings), '{}')
  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(
    join(root, 'Notes', SIDECAR_FILENAME.collection),
    JSON.stringify({ id: '01KVGMT8BFG350FZZXAMG1QDC1' }),
  )
  for (const [name, body] of Object.entries(UNKNOWN_FILES)) {
    await writeFile(join(root, 'Notes', name), body)
  }
  // A well-formed member and an identity-less page, as the controls.
  await writeFile(
    join(root, 'Notes', 'Member.md'),
    `---\n${KIND_ID_KEY.page}: 01KVGMT8BFG350FZZXAMG1QDM1\n---\n\nlinks to [[Target]]\n`,
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
    // Contradicting, malformed and dual all vanish; a member and an id-less page both surface.
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
    expect(await bytes('Adoptable.md')).toContain(`${KIND_ID_KEY.page}:`)
  })

  it('never stamps a SECOND key onto a file that already contradicts its folder', async () => {
    await stampAdopted(root)
    const after = await bytes('Contradicting.md')
    expect(after).not.toContain(`${KIND_ID_KEY.page}:`)
    expect(after).toContain(`${KIND_ID_KEY.task}: ${ULID}`)
  })
})

describe('the nexus-wide write sweeps', () => {
  it('the link cascade rewrites members and id-less pages, never an Unknown one', async () => {
    const before = await Promise.all(Object.keys(UNKNOWN_FILES).map(bytes))
    const r = await renameCascade(root, 'Target', 'Renamed')
    expect(r.ok).toBe(true)

    // Swept: both admitted files.
    expect(await bytes('Member.md')).toContain('[[Renamed]]')
    expect(await bytes('Adoptable.md')).toContain('[[Renamed]]')
    // Untouched: every Unknown one still says [[Target]], byte for byte.
    expect(await Promise.all(Object.keys(UNKNOWN_FILES).map(bytes))).toEqual(before)
  })

  // The walk admits a `.MD` case-insensitively, so the sweeps have to reach it on the same terms.
  // A file the tree shows but no sweep rewrites goes quietly stale: its links survive a rename
  // and its property cells read empty.
  it('sweeps an upper-case .MD page on the same terms as any other member', async () => {
    await writeFile(
      join(root, 'Notes', 'Upper.MD'),
      `---\n${KIND_ID_KEY.page}: 01KVGMT8BFG350FZZXAMG1QDV1\n---\n\nlinks to [[Target]]\n`,
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

    // Both files carry the same context key; only one of them is admissible.
    const tagged = (key: string, id: string): string =>
      `---\n${key}: ${id}\n<Projects>:\n  - Pommora\n---\nbody\n`
    await writeFile(join(root, 'Notes', 'Contradicting.md'), tagged(KIND_ID_KEY.task, ULID))
    await writeFile(
      join(root, 'Notes', 'Member.md'),
      tagged(KIND_ID_KEY.page, '01KVGMT8BFG350FZZXAMG1QDM1'),
    )
    const before = await bytes('Contradicting.md')

    const r = await handleMutate({ op: 'renameContext', contextId, newName: 'Ventures' }, deps)
    expect(r.ok).toBe(true)
    // The member's key is rewritten — proof the sweep ran at all.
    expect(await bytes('Member.md')).toContain('<Ventures>:')
    // The Unknown file is byte-identical, still carrying the old key.
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
    // The refusal is a no-op, not a half-move.
    expect(await bytes('Member.md')).toContain(KIND_ID_KEY.page)
  })

  // The nexus root holds no content of its own. `depth` is caller-supplied, so without an explicit
  // root arm the resolver called it a Set and the one main-side check passed for that destination.
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

  // A registered singleton is a real, adopted, root-level folder — everything a Collection is —
  // and still not a place a page may land. The backstop refuses every agenda destination the same
  // way, registered or not, which is what lets the cheap check here stay equivalent to the full one.
  it('refuses a page moved into a registered agenda singleton', async () => {
    const TASKS = '01KVGMT8BFG350FZZXAMG1QDT1'
    await writeFile(
      nexusConfig(root, NEXUS_CONFIG_FILES.identity),
      JSON.stringify({
        id: '01KVGMT8BFG350FZZXAMG1QDNX',
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
    // The MESSAGE, not just the code: resolveUnderRoot refuses with `invalid-path` as well, so a
    // code-only assertion passes for a destination that never reached the backstop at all.
    expect(r.error.message).toBe('Pages live in Collections and Sets.')
    expect(await bytes('Member.md')).toContain(KIND_ID_KEY.page)
  })

  it('still allows a move into a real Set', async () => {
    await openSession(root)
    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Daily', SIDECAR_FILENAME.set),
      JSON.stringify({ id: '01KVGMT8BFG350FZZXAMG1QDS1' }),
    )
    const r = await handleMutate(
      { op: 'movePage', path: 'Notes/Member.md', newParentPath: 'Notes/Daily' },
      deps,
    )
    expect(r.ok).toBe(true)
  })
})

describe('agenda singleton adoption', () => {
  const TASKS = '01KVGMT8BFG350FZZXAMG1QDT1'

  const withRegisteredTasks = async (): Promise<void> => {
    await writeFile(
      nexusConfig(root, NEXUS_CONFIG_FILES.identity),
      JSON.stringify({
        id: '01KVGMT8BFG350FZZXAMG1QDNX',
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
    expect(task).toContain(`${KIND_ID_KEY.task}:`)
    expect(task).not.toContain(`${KIND_ID_KEY.page}:`)
  })

  it('is flat — it neither container-stamps itself nor reaches anything below it', async () => {
    await withRegisteredTasks()
    await stampAdopted(root)
    // No Sets over agenda: the subfolder gets no sidecar and its file no key.
    expect(await readFile(join(root, 'Tasks', 'Nested', 'Deep.md'), 'utf8')).not.toContain('ID:')
    await expect(
      readFile(join(root, 'Tasks', 'Nested', SIDECAR_FILENAME.set), 'utf8'),
    ).rejects.toThrow()
    // Its identity already lives in the config sidecar, so no container sidecar is written.
    await expect(
      readFile(join(root, 'Tasks', SIDECAR_FILENAME.collection), 'utf8'),
    ).rejects.toThrow()
  })

  it('carries a registered singleton back to the root when it is found nested', async () => {
    await withRegisteredTasks()
    // Simulate the Finder drag: the registered folder now sits inside a Collection.
    await mkdir(join(root, 'Notes', 'Tasks'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Tasks', SIDECAR_FILENAME.taskConfig),
      JSON.stringify({ id: TASKS }),
    )
    await rm(join(root, 'Tasks'), { recursive: true, force: true })

    await stampAdopted(root)
    // The registration names this exact folder, and the root is the only place it is valid.
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

  // Every duplication mechanism copies the id the registration keys on, so two folders answer to
  // one record. That is the same ambiguity a single folder claiming two kinds already gets: no arm
  // picks. Nothing is written, so deleting the stray config restores the nexus completely.
  it('drops a contested slot — a duplicated config makes BOTH folders inert', async () => {
    await withRegisteredTasks()
    await mkdir(join(root, 'Tasks copy'), { recursive: true })
    await writeFile(
      join(root, 'Tasks copy', SIDECAR_FILENAME.taskConfig),
      JSON.stringify({ id: TASKS }),
    )
    await writeFile(join(root, 'Tasks copy', 'Copied.md'), 'no frontmatter\n')

    await stampAdopted(root)
    // Neither folder's members are stamped — the copy's page keeps its adoptability.
    expect(await readFile(join(root, 'Tasks copy', 'Copied.md'), 'utf8')).toBe('no frontmatter\n')
    expect(await readFile(join(root, 'Tasks', 'Buy milk.md'), 'utf8')).toBe('no frontmatter\n')
  })

  // Re-homing matches a registered id at any depth; contest detection only ever looked at the
  // root's own children. A copy filed inside a Collection therefore read as the singleton having
  // been dragged away — so it was carried out of the folder the user put it in, and on the next
  // open the two of them contested the slot and de-registered the real one.
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
    // And the real singleton is still the registered one.
    const identity = await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
    const ctx = await agendaContext(root, identity, true)
    expect(await resolveFolderKind(join(root, 'Tasks'), 'root', ctx)).toBe('tasks-singleton')
  })

  // A folder that crossed depth outside the app carries the wrong sidecar. Its identity is
  // renamed, not replaced — a second sidecar would leave one folder with two competing ids.
  it('migrates a stale container sidecar rather than minting a second id', async () => {
    const SET_ID = '01KVGMT8BFG350FZZXAMG1QDS9'
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
    expect(coll.id).toBe(SET_ID) // the identity survived the crossing
    expect(coll.icon).toBe('box') // and so did everything riding with it
    await expect(readFile(join(root, 'Stray', SIDECAR_FILENAME.set), 'utf8')).rejects.toThrow()
  })

  it('leaves an UNREGISTERED agenda folder entirely alone', async () => {
    await mkdir(join(root, 'Tasks'), { recursive: true })
    await writeFile(join(root, 'Tasks', SIDECAR_FILENAME.taskConfig), JSON.stringify({ id: TASKS }))
    await writeFile(join(root, 'Tasks', 'Buy milk.md'), 'no frontmatter\n')
    await stampAdopted(root)
    // Nothing registers it, so it is inert bytes — not a singleton, and not a Collection either.
    expect(await readFile(join(root, 'Tasks', 'Buy milk.md'), 'utf8')).toBe('no frontmatter\n')
    expect((await readNexus(root)).collections?.map((c) => c.title)).toEqual(['Notes'])
  })
})
