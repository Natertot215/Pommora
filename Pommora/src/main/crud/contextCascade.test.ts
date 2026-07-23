import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renameContextOp, renameSpaceOp, replayPendingRename } from './contextCascade'
import { clearJournal, readJournal, writeJournal } from './contextJournal'
import { contextsRegistryFile, contextsDir, nexusDir } from '../paths'
import { splitFrontmatter } from '../readNexus'
import { pathExists } from '../io/atomicWrite'

let root: string
const page = () => join(root, 'Notes', 'A.md')
const task = () => join(root, 'Tasks', 'T.task.json')
const csSidecar = () => join(contextsDir(root), 'Classes', 'CS 161', '_space.json')

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-cascade-'))
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({
      contexts: [
        { id: '_tier3', title: 'Projects', singular: 'Project' },
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
  await writeFile(csSidecar(), JSON.stringify({ id: 'sp-cs', '[Projects]': ['Pommora'] }))
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(page(), '---\nid: p1\n"[Projects]":\n  - Pommora\n  - pommora\n---\nbody')
  await mkdir(join(root, 'Tasks'), { recursive: true })
  await writeFile(task(), JSON.stringify({ id: 't1', '[Projects]': ['Pommora'], foreign: 1 }))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const regTitle = async (id: string): Promise<string | undefined> => {
  const reg = JSON.parse(await readFile(contextsRegistryFile(root), 'utf8'))
  return reg.contexts.find((c: { id: string }) => c.id === id)?.title
}

describe('renameContextOp', () => {
  it('rewrites the KEY in all three scopes, commits the registry, clears the journal', async () => {
    const r = await renameContextOp(root, '_tier3', 'Ventures')
    expect(r.ok).toBe(true)
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Ventures]']).toEqual(['Pommora', 'pommora'])
    expect('[Projects]' in fm).toBe(false)
    const t = JSON.parse(await readFile(task(), 'utf8'))
    expect(t['[Ventures]']).toEqual(['Pommora'])
    expect(t.foreign).toBe(1)
    const sc = JSON.parse(await readFile(csSidecar(), 'utf8'))
    expect(sc['[Ventures]']).toEqual(['Pommora'])
    expect(await regTitle('_tier3')).toBe('Ventures')
    expect(await pathExists(join(contextsDir(root), 'Ventures', 'Pommora'))).toBe(true)
    expect(await readJournal(root)).toBeNull()
  })

  it('rejects a taken or bracketed title without journaling', async () => {
    expect((await renameContextOp(root, '_tier3', 'Classes')).ok).toBe(false)
    expect((await renameContextOp(root, '_tier3', 'No[pe')).ok).toBe(false)
    expect(await readJournal(root)).toBeNull()
    expect(await regTitle('_tier3')).toBe('Projects')
  })
})

describe('renameSpaceOp', () => {
  it('rewrites ONLY the exact canonical old title as a value (near-miss forms stay)', async () => {
    const r = await renameSpaceOp(root, 'sp-pom', 'Pommora 2')
    expect(r.ok).toBe(true)
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Projects]']).toEqual(['Pommora 2', 'pommora'])
    const t = JSON.parse(await readFile(task(), 'utf8'))
    expect(t['[Projects]']).toEqual(['Pommora 2'])
    const sc = JSON.parse(await readFile(csSidecar(), 'utf8'))
    expect(sc['[Projects]']).toEqual(['Pommora 2'])
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora 2'))).toBe(true)
    expect(await readJournal(root)).toBeNull()
  })

  it('dedupes when the new title already rides alongside the old', async () => {
    await writeFile(task(), JSON.stringify({ id: 't1', '[Projects]': ['Pommora', 'Sapphire'] }))
    await mkdir(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    await writeFile(
      join(contextsDir(root), 'Projects', 'Sapphire', '_space.json'),
      JSON.stringify({ id: 'sp-sap' }),
    )
    expect((await renameSpaceOp(root, 'sp-pom', 'Sapphire')).ok).toBe(false) // folder taken
    await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true })
    const r = await renameSpaceOp(root, 'sp-pom', 'Sapphire')
    expect(r.ok).toBe(true)
    const t = JSON.parse(await readFile(task(), 'utf8'))
    expect(t['[Projects]']).toEqual(['Sapphire'])
  })
})

describe('skip-aware journal (D-7b)', () => {
  it('an unreadable file is skipped, the registry still commits, the journal survives; the next replay heals it', async () => {
    // A directory wearing an agenda suffix: enumerated, unreadable as JSON → skipped.
    const broken = join(root, 'Tasks', 'Broken.task.json')
    await mkdir(broken)
    const r = await renameContextOp(root, '_tier3', 'Ventures')
    expect(r.ok).toBe(true)
    expect(await regTitle('_tier3')).toBe('Ventures')
    const j = await readJournal(root)
    expect(j?.skipped).toEqual([broken])

    // Fix the file with the OLD key still inside — replay retries and completes.
    await rm(broken, { recursive: true })
    await writeFile(broken, JSON.stringify({ id: 'tb', '[Projects]': ['Pommora'] }))
    await replayPendingRename(root)
    const healed = JSON.parse(await readFile(broken, 'utf8'))
    expect(healed['[Ventures]']).toEqual(['Pommora'])
    expect(await readJournal(root)).toBeNull()
  })
})

describe('unlink cascades (D-3)', () => {
  it('unlinkContextKey strips the bracketed key from all three scopes', async () => {
    const { unlinkContextKey } = await import('./contextCascade')
    const r = await unlinkContextKey(root, 'Projects')
    expect(r.ok).toBe(true)
    expect('[Projects]' in splitFrontmatter(await readFile(page(), 'utf8'))).toBe(false)
    expect('[Projects]' in JSON.parse(await readFile(task(), 'utf8'))).toBe(false)
    expect('[Projects]' in JSON.parse(await readFile(csSidecar(), 'utf8'))).toBe(false)
  })

  it('unlinkSpaceValue strips only the exact title, dropping an emptied key', async () => {
    const { unlinkSpaceValue } = await import('./contextCascade')
    const r = await unlinkSpaceValue(root, 'Projects', 'Pommora')
    expect(r.ok).toBe(true)
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Projects]']).toEqual(['pommora']) // the near-miss survives (reconcile owns it)
    const t = JSON.parse(await readFile(task(), 'utf8'))
    expect('[Projects]' in t).toBe(false) // emptied → key removed
  })
})

describe('replayPendingRename (D-7a crash windows)', () => {
  it('completes a rename crashed before the registry commit', async () => {
    // Crash simulation: journal written, folder renamed, files NOT yet cascaded,
    // registry still on the old title.
    await writeJournal(root, {
      contextId: '_tier3',
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
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Ventures]']).toEqual(['Pommora', 'pommora'])
    expect(await regTitle('_tier3')).toBe('Ventures')
    expect(await readJournal(root)).toBeNull()
  })

  it('is idempotent — replaying twice equals once', async () => {
    await writeJournal(root, {
      contextId: '_tier3',
      oldTitle: 'Projects',
      newTitle: 'Ventures',
      skipped: [],
    })
    await replayPendingRename(root)
    await replayPendingRename(root)
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Ventures]']).toEqual(['Pommora', 'pommora'])
    expect(await regTitle('_tier3')).toBe('Ventures')
    expect(await readJournal(root)).toBeNull()
  })

  it('discards a journal whose registry mapping no longer holds', async () => {
    await writeJournal(root, {
      contextId: '_tier3',
      oldTitle: 'SomethingElse',
      newTitle: 'Ventures',
      skipped: [],
    })
    await replayPendingRename(root)
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Projects]']).toEqual(['Pommora', 'pommora'])
    expect(await regTitle('_tier3')).toBe('Projects')
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
      contextId: '_tier3',
      spaceId: 'sp-pom',
      oldTitle: 'Pommora',
      newTitle: 'Pommora 2',
      skipped: [],
    })
    await replayPendingRename(root)
    // Untouched: the value "Pommora" now belongs to sp-new.
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Projects]']).toEqual(['Pommora', 'pommora'])
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
      contextId: '_tier3',
      spaceId: 'sp-pom',
      oldTitle: 'Pommora',
      newTitle: 'Pommora 2',
      skipped: [],
    })
    await replayPendingRename(root)
    const fm = splitFrontmatter(await readFile(page(), 'utf8'))
    expect(fm['[Projects]']).toEqual(['Pommora 2', 'pommora'])
    expect(await readJournal(root)).toBeNull()
  })
})

afterEach(async () => {
  await clearJournal(root).catch(() => {})
})
