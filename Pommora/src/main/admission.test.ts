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
import { renameCascade } from './crud/cascade'
import { handleMutate, type MutateDeps } from './mutate'
import { openSession, closeSession } from './session'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES, SIDECAR_FILENAME } from './paths'

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

  it('a Context rename leaves an Unknown file alone', async () => {
    await writeFile(
      join(root, 'Notes', 'Contradicting.md'),
      `---\n${KIND_ID_KEY.task}: ${ULID}\n(Projects):\n  - Pommora\n---\nbody\n`,
    )
    const before = await bytes('Contradicting.md')
    await openSession(root)
    await handleMutate({ op: 'createContextGroup', name: 'Projects' }, deps)
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
    expect(await readFile(join(root, 'Tasks', SIDECAR_FILENAME.taskConfig), 'utf8')).toContain(TASKS)
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
