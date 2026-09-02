import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, realpath, rm, mkdir, symlink, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renameContextOp, renameSpaceOp, replayPendingRename } from './contextCascade'
import { clearJournal, readJournal, writeJournal } from './contextJournal'
import { contextsRegistryFile, contextsDir, nexusDir } from '../paths'
import { splitFrontmatter } from '../readNexus'
import { pathExists } from '../IO/atomicWrite'
import { closeSession, openSession } from '../session'

let root: string
const page = () => join(root, 'Notes', 'A.md')
const other = () => join(root, 'Notes', 'B.md')
const csSidecar = () => join(contextsDir(root), 'Classes', 'CS 161', '_space.json')

beforeEach(async () => {
  // The journal slot's clear only lands for the live session's root, as production's does.
  root = await realpath(await mkdtemp(join(tmpdir(), 'pom-cascade-')))
  await openSession(root)
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({
      contexts: [
        { id: 'ctx_projects', title: 'Projects', singular: 'Project' },
        { id: 'ctxC', title: 'Classes', singular: 'Class' },
      ],
    }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await mkdir(join(contextsDir(root), 'Classes', 'CS 161'), { recursive: true })
  await writeFile(csSidecar(), JSON.stringify({ id: 'sp-cs', '<Projects>': ['Pommora'] }))
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(page(), '---\nid: p1\n<Projects>:\n  - Pommora\n  - pommora\n---\nbody')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
  closeSession()
})

const regTitle = async (id: string): Promise<string | undefined> => {
  const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
  return reg.contexts.find((c: { id: string }) => c.id === id)?.title
}

const fmOf = async (file: string): Promise<Record<string, unknown>> =>
  splitFrontmatter(await readFile(file, 'utf8')) as Record<string, unknown>

describe('case folding on renames', () => {
  it('a case-only Context rename of itself passes; a case-variant of ANOTHER fails', async () => {
    expect((await renameContextOp(root, 'ctx_projects', 'classes')).ok).toBe(false)
    const self = await renameContextOp(root, 'ctx_projects', 'PROJECTS')
    expect(self.ok).toBe(true)
    const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
    expect(reg.contexts.find((c: { id: string }) => c.id === 'ctx_projects').title).toBe('PROJECTS')
  })

  it('a case-only Space rename passes (its own folder is not a collision)', async () => {
    const r = await renameSpaceOp(root, 'sp-pom', 'POMMORA')
    expect(r.ok).toBe(true)
    expect((await fmOf(page()))['<Projects>']).toEqual(['POMMORA', 'pommora'])
  })
})

describe('renameContextOp', () => {
  it('rewrites the KEY in both scopes, commits the registry, clears the journal', async () => {
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    const fm = await fmOf(page())
    expect(fm['<Ventures>']).toEqual(['Pommora', 'pommora'])
    expect('<Projects>' in fm).toBe(false)
    const sc = JSON.parse(await readFile(csSidecar(), 'utf8'))
    expect(sc['<Ventures>']).toEqual(['Pommora'])
    expect(sc.id).toBe('sp-cs')
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora'))).toBe(true)
    expect(await readJournal(root)).toBeNull()
  })

  it('merges + dedupes into a pre-existing inert key wearing the new title', async () => {
    await writeFile(
      other(),
      '---\nid: p2\n<Projects>:\n  - Pommora\n<Ventures>:\n  - Other\n  - Pommora\nforeign: 1\n---\nbody',
    )
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    const fm = await fmOf(other())
    expect(fm['<Ventures>']).toEqual(['Other', 'Pommora'])
    expect('<Projects>' in fm).toBe(false)
    expect(fm.foreign).toBe(1)
  })

  it('rejects a taken title without journaling; a sigil glyph is legal', async () => {
    expect((await renameContextOp(root, 'ctx_projects', 'Classes')).ok).toBe(false)
    expect(await readJournal(root)).toBeNull()
    expect(await regTitle('ctx_projects')).toBe('Projects')
    // Positional stripping round-trips a glyph, so the title carries no ban of its own.
    expect((await renameContextOp(root, 'ctx_projects', 'No[pe')).ok).toBe(true)
    expect(await regTitle('ctx_projects')).toBe('No[pe')
  })
})

describe('a renamed Context key keeps its place on every page carrying it', () => {
  it('rewrites the key where it sits, with the comment attached to it', async () => {
    const before =
      '---\ntitle: Alpha\n# which clients this is for\n<Projects>:\n  - Pommora\nstatus: draft\nauthor: Username\n---\nbody'
    await writeFile(other(), before)
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(await readFile(other(), 'utf8')).toBe(
      '---\ntitle: Alpha\n# which clients this is for\n<Ventures>:\n  - Pommora\nstatus: draft\nauthor: Username\n---\nbody',
    )
  })

  it('a merge into a pre-existing key lands at the renamed key’s place', async () => {
    await writeFile(
      other(),
      '---\nid: p2\n# tags\n<Projects>:\n  - Pommora\n<Ventures>:\n  - Other\nforeign: 1\n---\nbody',
    )
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(await readFile(other(), 'utf8')).toBe(
      '---\nid: p2\n# tags\n<Ventures>:\n  - Other\n  - Pommora\nforeign: 1\n---\nbody',
    )
  })

  it('a page whose frontmatter cannot round-trip is left byte-identical, and the rename completes around it', async () => {
    // A tab-indented sequence: admitted by identity, refused by the round-trip gate.
    const unwritable = '---\nID: 01KVGMT8BFP350FZZXAMG1QDVA\n<Projects>:\n\t- Pommora\n---\nbody'
    await writeFile(other(), unwritable)
    expect((await renameContextOp(root, 'ctx_projects', 'Ventures')).ok).toBe(true)
    expect(await readFile(other(), 'utf8')).toBe(unwritable)
    expect((await fmOf(page()))['<Ventures>']).toEqual(['Pommora', 'pommora'])
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await readJournal(root)).toBeNull()
  })
})

describe('renameSpaceOp', () => {
  it('rewrites ONLY the exact canonical old title as a value (near-miss forms stay)', async () => {
    const r = await renameSpaceOp(root, 'sp-pom', 'Pommora 2')
    expect(r.ok).toBe(true)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora 2', 'pommora'])
    const sc = JSON.parse(await readFile(csSidecar(), 'utf8'))
    expect(sc['<Projects>']).toEqual(['Pommora 2'])
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora 2'))).toBe(true)
    expect(await readJournal(root)).toBeNull()
  })

  it('dedupes when the new title already rides alongside the old', async () => {
    await writeFile(other(), '---\nid: p2\n<Projects>:\n  - Pommora\n  - Sapphire\n---\nbody')
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    expect((await renameSpaceOp(root, 'sp-pom', 'Sapphire')).ok).toBe(false) // folder taken
    await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    const r = await renameSpaceOp(root, 'sp-pom', 'Sapphire')
    expect(r.ok).toBe(true)
    expect((await fmOf(other()))['<Projects>']).toEqual(['Sapphire'])
  })
})

describe('skip-aware journal (D-7b)', () => {
  it('an unreadable file is skipped, the registry still commits, the journal survives; the next replay heals it', async () => {
    // A dangling symlink wearing the `.md` suffix: the sweep enumerates it by name, then fails to
    // read it — the skip path, without needing a permission trick.
    const broken = join(root, 'Notes', 'Broken.md')
    await symlink(join(root, 'Notes', 'Nowhere.md'), broken)
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    const j = await readJournal(root)
    expect(j?.skipped).toEqual([broken])

    // Replace it with a real file still carrying the OLD key — replay retries and completes.
    await rm(broken)
    await writeFile(broken, '---\nid: pb\n<Projects>:\n  - Pommora\n---\nbody')
    await replayPendingRename(root)
    expect((await fmOf(broken))['<Ventures>']).toEqual(['Pommora'])
    expect(await readJournal(root)).toBeNull()
  })
})

describe('unlink cascades (D-3)', () => {
  it('unlinkContextKey strips the wrapped key from both scopes', async () => {
    const { unlinkContextKey } = await import('./contextCascade')
    const r = await unlinkContextKey(root, 'Projects')
    expect(r.ok).toBe(true)
    expect('<Projects>' in (await fmOf(page()))).toBe(false)
    expect('<Projects>' in JSON.parse(await readFile(csSidecar(), 'utf8'))).toBe(false)
  })

  it('unlinkSpaceValue strips only the exact title, dropping an emptied key', async () => {
    await writeFile(other(), '---\nid: p2\n<Projects>:\n  - Pommora\n---\nbody')
    const { unlinkSpaceValue } = await import('./contextCascade')
    const r = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(r.ok).toBe(true)
    // The near-miss survives (reconcile owns it); an emptied key is removed outright.
    expect((await fmOf(page()))['<Projects>']).toEqual(['pommora'])
    expect('<Projects>' in (await fmOf(other()))).toBe(false)
  })
})

describe('the sweep tells the truth about what it did (G-2)', () => {
  const PAGE_C = '01KVGMT8BFP350FZZXAMG1QDTA'

  it('unlinkContextKey returns each swept root’s identity and stripped values; an Unknown root is refused, never touched', async () => {
    await writeFile(
      join(root, 'Notes', 'C.md'),
      `---\nID: ${PAGE_C}\n<Projects>:\n  - Pommora\n---\nbody`,
    )
    await writeFile(
      join(root, 'Notes', 'Alien.md'),
      `---\nID: 01KVGMT8BFT350FZZXAMG1QDTB\n<Projects>:\n  - Pommora\n---\nbody`,
    )
    const { unlinkContextKey } = await import('./contextCascade')
    const r = await unlinkContextKey(root, 'Projects')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const { captured, refused } = r.value
    expect(refused).toEqual([join(root, 'Notes', 'Alien.md')])
    expect((await fmOf(join(root, 'Notes', 'Alien.md')))['<Projects>']).toEqual(['Pommora'])
    // Captures discriminate by id key: the ID page, the id-less legacy page (honest,
    // unrestorable), and the Space sidecar.
    expect(captured).toContainEqual({ id: PAGE_C, kind: 'page', values: ['Pommora'] })
    expect(captured).toContainEqual({ kind: 'page', values: ['Pommora', 'pommora'] })
    expect(captured).toContainEqual({ id: 'sp-cs', kind: 'space', values: ['Pommora'] })
    expect(captured).toHaveLength(3)
  })

  it('unlinkSpaceValue captures the removed title per root; zero matches is an empty list', async () => {
    const { unlinkSpaceValue } = await import('./contextCascade')
    const r = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.captured).toContainEqual({ kind: 'page', values: ['Pommora'] })
    expect(r.value.captured).toContainEqual({ id: 'sp-cs', kind: 'space', values: ['Pommora'] })
    expect(r.value.captured).toHaveLength(2)

    const again = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(again.ok && again.value.captured).toEqual([])
  })
})

describe('a delete sweep never strips a passenger (G-1a)', () => {
  const pomSidecar = () => join(contextsDir(root), 'Projects', 'Pommora', '_space.json')

  it('roots under the deleted Context keep their keys; outside roots still lose them', async () => {
    await writeFile(pomSidecar(), JSON.stringify({ id: 'sp-pom', '<Projects>': ['Sapphire'] }))
    const { unlinkContextKey } = await import('./contextCascade')
    const r = await unlinkContextKey(root, 'Projects', join(contextsDir(root), 'Projects'))
    expect(r.ok).toBe(true)
    // The passenger keeps the key it will carry into the trash.
    const pom = JSON.parse(await readFile(pomSidecar(), 'utf8'))
    expect(pom['<Projects>']).toEqual(['Sapphire'])
    // The control: the sweep still ran everywhere outside the subtree.
    expect('<Projects>' in (await fmOf(page()))).toBe(false)
    expect('<Projects>' in JSON.parse(await readFile(csSidecar(), 'utf8'))).toBe(false)
  })

  it('the rename cascade still reaches inside its own Context — the skip is the delete’s alone', async () => {
    await writeFile(pomSidecar(), JSON.stringify({ id: 'sp-pom', '<Projects>': ['Sapphire'] }))
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    const pom = JSON.parse(
      await readFile(join(contextsDir(root), 'Ventures', 'Pommora', '_space.json'), 'utf8'),
    )
    expect(pom['<Ventures>']).toEqual(['Sapphire'])
    expect('<Projects>' in pom).toBe(false)
  })
})

describe('replayPendingRename (D-7a crash windows)', () => {
  it('completes a rename crashed before the registry commit', async () => {
    // Crash simulation: journal written, folder renamed, files NOT yet cascaded,
    // registry still on the old title.
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Ventures',
      skipped: [],
    })
    await rm(join(contextsDir(root), 'Projects'), { recursive: true })
    await mkdir(join(contextsDir(root), 'Ventures', 'Pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Ventures', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Ventures>']).toEqual(['Pommora', 'pommora'])
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await readJournal(root)).toBeNull()
  })

  it('is idempotent — replaying twice equals once', async () => {
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Ventures',
      skipped: [],
    })
    await replayPendingRename(root)
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Ventures>']).toEqual(['Pommora', 'pommora'])
    expect(await regTitle('ctx_projects')).toBe('Ventures')
    expect(await readJournal(root)).toBeNull()
  })

  it('discards a journal whose registry mapping no longer holds', async () => {
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'SomethingElse',
      newTitle: 'Ventures',
      skipped: [],
    })
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora', 'pommora'])
    expect(await regTitle('ctx_projects')).toBe('Projects')
    expect(await readJournal(root)).toBeNull()
  })

  it('discards a space journal whose freed old title was re-minted (never hijacks)', async () => {
    // sp-pom already renamed to "Pommora 2"; a NEW space claimed "Pommora" since.
    await rm(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora 2'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora 2', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
      JSON.stringify({ id: 'sp-new' }),
    )
    await writeJournal(root, {
      contextId: 'ctx_projects',
      spaceId: 'sp-pom',
      oldTitle: 'Pommora',
      newTitle: 'Pommora 2',
      skipped: [],
    })
    await replayPendingRename(root)
    // Untouched: the value "Pommora" now belongs to sp-new.
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora', 'pommora'])
    expect(await readJournal(root)).toBeNull()
  })

  it('completes a space rename crashed before the cascade', async () => {
    await rm(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
    await mkdir(join(contextsDir(root), 'Projects', 'Pommora 2'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Pommora 2', '_space.json'),
      JSON.stringify({ id: 'sp-pom' }),
    )
    await writeJournal(root, {
      contextId: 'ctx_projects',
      spaceId: 'sp-pom',
      oldTitle: 'Pommora',
      newTitle: 'Pommora 2',
      skipped: [],
    })
    await replayPendingRename(root)
    expect((await fmOf(page()))['<Projects>']).toEqual(['Pommora 2', 'pommora'])
    expect(await readJournal(root)).toBeNull()
  })
})

afterEach(async () => {
  const held = await readJournal(root)
  if (held) await clearJournal(root, held).catch(() => {})
})

describe('the journal slot law', () => {
  it('a stranded record survives a later write and a stranger clear; its own clear lands', async () => {
    const owed = {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Projects 2',
      skipped: ['Notes/A.md'],
    }
    await writeJournal(root, owed)
    const stranger = { contextId: 'ctxC', oldTitle: 'Classes', newTitle: 'Classes 2', skipped: [] }
    await writeJournal(root, stranger)
    expect((await readJournal(root))?.contextId).toBe('ctx_projects')
    await clearJournal(root, stranger)
    expect(await readJournal(root)).not.toBeNull()
    // The settle's re-write of the SAME rename with a new skip list updates the held record.
    await writeJournal(root, { ...owed, skipped: [] })
    expect((await readJournal(root))?.skipped).toEqual([])
    await clearJournal(root, owed)
    expect(await readJournal(root)).toBeNull()
  })

  it('a newer rename of the same entity supersedes the stranded record', async () => {
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Work',
      skipped: ['Notes/A.md'],
    })
    // The user renames back — the newer intent must displace the abandoned one, or the next
    // open's replay re-applies "Projects → Work" over their choice.
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Work',
      newTitle: 'Projects',
      skipped: [],
    })
    expect((await readJournal(root))?.newTitle).toBe('Projects')
  })

  it('a rename-back after a skip leaves nothing for the replay to revert', async () => {
    // Strand a record by hand (the shape a skipped sweep leaves), then run the counter-rename
    // end to end: its journal supersedes, its cascade lands, and the replay is inert.
    await renameContextOp(root, 'ctx_projects', 'Work')
    await writeJournal(root, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Work',
      skipped: ['Notes/A.md'],
    })
    expect((await renameContextOp(root, 'ctx_projects', 'Projects')).ok).toBe(true)
    expect(await readJournal(root)).toBeNull()
    await replayPendingRename(root)
    expect(await regTitle('ctx_projects')).toBe('Projects')
    expect((await fmOf(page()))['<Projects>']).toBeDefined()
  })
})

describe('neither clearing a value nor renaming a key writes a modified_at', () => {
  it('unlinkSpaceValue strips the value and nothing else', async () => {
    const { unlinkSpaceValue } = await import('./contextCascade')
    expect((await unlinkSpaceValue(root, 'Projects', 'Pommora')).ok).toBe(true)
    const fm = await fmOf(page())
    expect(fm['<Projects>']).toEqual(['pommora'])
    expect('modified_at' in fm).toBe(false)
  })

  it('a key-only rename moves the key and nothing else', async () => {
    const { renameContextOp } = await import('./contextCascade')
    const r = await renameContextOp(root, 'ctx_projects', 'Ventures')
    expect(r.ok).toBe(true)
    const fm = await fmOf(page())
    expect(fm['<Ventures>']).toBeDefined()
    expect('modified_at' in fm).toBe(false)
  })
})
