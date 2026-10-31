import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyFile, mkdir, open, readFile, rename, rm, utimes, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { putJson, readJsonAt, failLandings, seedNexus, tempRoot } from '../Testing/hostFs'
import { bundleOf, settledMutate } from '../Testing/settledMutate'
import { assignProperty } from '../Properties/assignment'
import { createProperty, renameProperty } from '../Properties/registryProperty'
import { renameOption, setValueFormat } from '../Properties/optionOps'
import * as optionOps from '../Properties/optionOps'
import { optionsOf, type PropertyDefinition } from '../Properties/properties'
import { OWED_REL } from '../Paths/nexusPaths'
import { keyedOptionId } from './ids'
import { finishOwed } from './finishOwed'
import type { Pushes } from '../Contract/bridge'
import type { Changed } from '../Files/writeEcho'
import * as indexSeed from '../Index/indexSeed'
import * as liveTree from './liveTree'
import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import * as readNexusModule from './readNexus'
import { readNexus } from './readNexus'
import * as adopt from './adopt'
import { atomicWriteFile, pathExists } from '../Files/atomicWrite'
import { readNotes } from './owed'
import { updatePageBody } from './page'
import * as pageFile from '../Files/pageFile'
import { splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { ID_KEY } from './identityMark'
import { stabilize } from './treeStabilize'
import { applyEvents, oweCascade, owedFor, oweSeen, oweWalk } from './fileEvents'
import { settleNow, recordHanded, settleBatch } from './settle'
import type { NexusChange, NexusTree } from './tree'
import { applyDelta } from './treeDelta'
import * as session from './session'
import { closeSession, openSession, whileAdopting } from './session'
import { writeExcludedFolders } from '../Settings/settings'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { machine } from '../Platform/machine'
import * as bundles from '../Bundles/bundle'
import { readRecord } from '../Bundles/record'
import { contextsRegistryFile } from '../Paths/paths'
import { handleMutate } from './mutate'

const sweep = vi.hoisted(() => ({ hold: null as Promise<void> | null, entered: () => {} }))
vi.mock('./governedSweep', async (importOriginal) => {
  const real = await importOriginal<typeof import('./governedSweep')>()
  return {
    ...real,
    sweepGovernedRoots: async (...args: Parameters<typeof real.sweepGovernedRoots>) => {
      sweep.entered()
      await sweep.hold
      return real.sweepGovernedRoots(...args)
    },
  }
})

const ULID_A = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
const ULID_B = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'
const ULID_C = '01CX5ZZKBKPCTAV9WEVGEMMVRC'
const ULID_D = '01DX5ZZKBKPCTAV9WEVGEMMVRD'

let root: string
let shown: NexusTree
let pushes: [keyof Pushes, unknown][]
const pusher = {
  push: <K extends keyof Pushes>(channel: K, value: Pushes[K]) => {
    pushes.push([channel, value])
  },
  watch: vi.fn(async () => {}),
}
const abs = (...segs: string[]): string => join(root, ...segs)
const ev = (event: Changed['event'], ...segs: string[]): Changed => ({
  event,
  absPath: abs(...segs),
  origin: 'watched',
})
const ahead = (...segs: string[]): Promise<void> =>
  utimes(abs(...segs), new Date(Date.now() + 86_400_000), new Date(Date.now() + 86_400_000))
const channels = (): string[] => pushes.map(([c]) => c)
const payload = (channel: keyof Pushes): unknown => pushes.find(([c]) => c === channel)?.[1]
const gate = <T>(): { promise: Promise<T>; open: (v: T) => void; fail: (e: Error) => void } => {
  let open!: (v: T) => void
  let fail!: (e: Error) => void
  const promise = new Promise<T>((res, rej) => {
    open = res
    fail = rej
  })
  return { promise, open, fail }
}

beforeEach(async () => {
  root = tempRoot('pom-settle-')
  pushes = []
  await mkdir(abs('.nexus', 'interface', 'homepage'), { recursive: true })
  await writeFile(abs('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
  await mkdir(abs('Notes'))
  await writeFile(abs('Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\nalpha\n`)
  await openSession(root)
  shown = recordHanded(await refreshTree(root)).tree
})
afterEach(async () => {
  dropLiveTree()
  closeSession()
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('what a settle pushes for a batch', () => {
  it('names an outside edit of a page in pages:changed and its container in values:changed', async () => {
    await writeFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\n---\n\nedited\n`)
    await applyEvents(root, [ev('change', 'Notes', 'A.md'), ev('change', 'Notes', 'A.md')])
    await settleNow(pusher, root)
    expect(channels()).toEqual(['pages:changed', 'values:changed'])
    expect(payload('pages:changed')).toEqual(['Notes/A.md'])
    expect(payload('values:changed')).toEqual([{ rel: 'Notes', pageIds: [ULID_A] }])
  })

  it('pushes the tree once when it moved, and a tile host once however often it was named', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await applyEvents(root, [
      ev('add', 'Notes', 'B.md'),
      ev('change', '.nexus', 'interface', 'homepage', '_tiles.json'),
      ev('change', '.nexus', 'interface', 'homepage', '_tiles.json'),
    ])
    await settleNow(pusher, root)
    expect(channels()).toEqual([
      'nexus:changed',
      'pages:changed',
      'values:changed',
      'tiles:changed',
    ])
    expect(applyDelta(shown, (payload('nexus:changed') as NexusChange).delta)).toEqual(
      heldTreeOf(root),
    )
    expect(payload('tiles:changed')).toEqual({ host: { kind: 'homepage' }, ids: [] })
  })

  it('merges a cascade’s pages and hosts with the batch’s, once each', async () => {
    await applyEvents(root, [
      ev('change', 'Notes', 'A.md'),
      ev('change', '.nexus', 'interface', 'homepage', '_tiles.json'),
    ])
    oweCascade(
      root,
      ['Notes/A.md', 'Other/B.md'],
      [
        { host: { kind: 'homepage' }, ids: ['t1'] },
        { host: { kind: 'space', id: 'sp1' }, ids: ['t2'] },
      ],
    )
    await settleNow(pusher, root)
    expect(payload('pages:changed')).toEqual(['Notes/A.md', 'Other/B.md'])
    expect(pushes.filter(([c]) => c === 'tiles:changed').map(([, v]) => v)).toEqual([
      { host: { kind: 'homepage' }, ids: ['t1'] },
      { host: { kind: 'space', id: 'sp1' }, ids: ['t2'] },
    ])
  })

  it('marks a page whose only writes were its editor’s own saves as body-only', async () => {
    const text = `---\nID: ${ULID_A}\n---\n\nmine\n`
    await writeFile(abs('Notes', 'A.md'), text)
    await applyEvents(root, [
      { event: 'change', absPath: abs('Notes', 'A.md'), origin: 'own', text, bodyOnly: true },
    ])
    await settleNow(pusher, root)
    expect(payload('values:changed')).toEqual([
      { rel: 'Notes', pageIds: [ULID_A], bodyOnly: [ULID_A] },
    ])
  })

  it('groups the value push by container, resolving ids through nested Sets', async () => {
    await mkdir(abs('Notes', 'Deep'))
    await writeFile(abs('Notes', 'Deep', '_pageset.json'), JSON.stringify({ id: ULID_C }))
    await writeFile(abs('Notes', 'Deep', 'D.md'), `---\nID: ${ULID_D}\n---\n\ndelta\n`)
    recordHanded(await refreshTree(root))
    await applyEvents(root, [
      ev('change', 'Notes', 'A.md'),
      ev('change', 'Notes', 'Deep', 'D.md'),
      ev('change', 'Notes', 'A.md'),
    ])
    await settleNow(pusher, root)
    expect(payload('values:changed')).toEqual([
      { rel: 'Notes', pageIds: [ULID_A] },
      { rel: 'Notes/Deep', pageIds: [ULID_D] },
    ])
  })

  it('a page written outside the editor as well as by it isn’t body-only', async () => {
    const text = `---\nID: ${ULID_A}\n---\n\nmine\n`
    await writeFile(abs('Notes', 'A.md'), text)
    await applyEvents(root, [
      { event: 'change', absPath: abs('Notes', 'A.md'), origin: 'own', text, bodyOnly: true },
      { event: 'change', absPath: abs('Notes', 'A.md'), origin: 'own', text },
    ])
    await settleNow(pusher, root)
    expect(payload('values:changed')).toEqual([{ rel: 'Notes', pageIds: [ULID_A] }])
  })

  it('a settle drains what it pushed', async () => {
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    await settleNow(pusher, root)
    pushes = []
    await settleNow(pusher, root)
    expect(pushes).toEqual([])
  })

  it('a page the tree doesn’t hold still names its container, with no id', async () => {
    await writeFile(abs('Notes', 'Foreign.md'), '---\nID: 42\n---\n\nforeign\n')
    await applyEvents(root, [ev('add', 'Notes', 'Foreign.md')])
    await settleNow(pusher, root)
    expect(payload('values:changed')).toEqual([{ rel: 'Notes', pageIds: [] }])
  })

  it('what one root owed is dropped once another root’s event arrives', async () => {
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    owedFor('/elsewhere')
    await settleNow(pusher, root)
    expect(pushes).toEqual([])
  })

  it('sends the whole tree, under the next version, to a window that holds none of this root', async () => {
    const { version } = recordHanded({
      ...shown,
      nexus: { ...shown.nexus, rootPath: '/elsewhere' },
    })
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await applyEvents(root, [ev('add', 'Notes', 'B.md')])
    await settleNow(pusher, root)
    expect(payload('nexus:changed')).toEqual({
      version: version + 1,
      delta: { set: heldTreeOf(root) },
    })
  })

  it('pushes nothing for a batch that changed nothing', async () => {
    await applyEvents(root, [ev('change', '.nexus', 'interface', 'sidepane.json')])
    await settleNow(pusher, root)
    expect(pushes).toEqual([])
  })

  it('owes the walk for an event that arrives with no live tree', async () => {
    dropLiveTree()
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    expect(owedFor(root).walk).toBe(true)
  })
})

describe('the settle', () => {
  it('an event whose arm resumes after a concurrent settle has pushed still owes its walk to the next settle', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    const reached = gate<void>()
    const read = gate<never>()
    const text = machine().readText
    let failing = true
    // The index's read of B is held and then fails, and so does the patch's own read after it.
    vi.spyOn(machine(), 'readText').mockImplementation((path) => {
      if (!failing || path !== abs('Notes', 'B.md')) return text(path)
      reached.open()
      return read.promise
    })
    const applying = applyEvents(root, [ev('add', 'Notes', 'B.md')])
    await reached.promise
    oweCascade(root, ['Notes/A.md'], [])
    await settleNow(pusher, root)
    expect(channels()).toEqual(['pages:changed'])
    const walk = vi.spyOn(liveTree, 'refreshTree')
    read.fail(new Error('mid-read'))
    await applying
    failing = false
    expect(owedFor(root).walk).toBe(true)
    await settleNow(pusher, root)
    expect(walk).toHaveBeenCalledTimes(1)
    expect(heldTreeOf(root)?.collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B])
  })

  it('a walk leaves a page it lists missing for the page’s own event, and a scope change that excludes or admits an unrelated folder leaves it listed while it is written, for its own event to stamp', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    await settleBatch(pusher, root, [ev('change', '.nexus', 'nexus.json')])
    expect(heldTreeOf(root)?.unreadable).toEqual([
      { path: 'Notes/Bare.md', kind: 'page', reason: 'missing' },
    ])
    expect(await readFile(abs('Notes', 'Bare.md'), 'utf8')).toBe('bare\n')
    const writer = await open(abs('Notes', 'Bare.md'), 'w')
    await writer.write('first half\n')
    for (const excluded of [['Elsewhere'], []]) {
      await writeExcludedFolders(root, excluded)
      await settleNow(pusher, root)
      expect(heldTreeOf(root)?.unreadable).toEqual([
        { path: 'Notes/Bare.md', kind: 'page', reason: 'missing' },
      ])
    }
    await writer.write('second half\n')
    await writer.close()
    await settleBatch(pusher, root, [ev('change', 'Notes', 'Bare.md')])
    const text = await readFile(abs('Notes', 'Bare.md'), 'utf8')
    expect(text).toContain('first half\nsecond half\n')
    const held = heldTreeOf(root)
    const bare = held?.collections[0]?.pages.find((p) => p.path === 'Notes/Bare.md')
    expect(bare?.id).toBe(splitFrontmatter(text)[ID_KEY])
    expect(held?.unreadable).toBeUndefined()
  })

  it('a Space a walk lists missing its ID holds the pages tagged with it once its stamp lands', async () => {
    await mkdir(abs('.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
    await writeFile(
      abs('.nexus', 'contexts', 'contexts.json'),
      JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
    )
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n<Areas>:\n  - Home\n---\n\nbeta\n`)
    oweWalk(root)
    await settleNow(pusher, root)
    await writeFile(abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'), '{}')
    oweWalk(root)
    await settleNow(pusher, root)
    const held = heldTreeOf(root)
    const home = held?.contexts[0]?.spaces[0]
    expect(held?.collections[0]?.pages.find((p) => p.id === ULID_B)?.contextValues).toEqual({
      ctx1: [home?.id],
    })
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it.each([
    ['a Set with a sidecar', ['Notes', 'Fresh'], true],
    ['a Set without one', ['Notes', 'Fresh'], false],
    ['a root folder', ['Fresh'], false],
  ] as const)('a note still being written into a folder that just appeared keeps every byte, and is stamped by its own event once still (%s)', async (_, dir, sidecar) => {
    await mkdir(abs(...dir))
    if (sidecar) await writeFile(abs(...dir, '_pageset.json'), JSON.stringify({ id: ULID_C }))
    const writer = await open(abs(...dir, 'Note.md'), 'w')
    await writer.write('first half\n')
    await settleBatch(pusher, root, [ev('addDir', ...dir)])
    await writer.write('second half\n')
    await writer.close()
    await settleBatch(pusher, root, [ev('add', ...dir, 'Note.md')])
    const text = await readFile(abs(...dir, 'Note.md'), 'utf8')
    expect(text).toContain('first half\nsecond half\n')
    const held = heldTreeOf(root)
    const pages = held?.collections.flatMap((c) => [...c.pages, ...c.sets.flatMap((s) => s.pages)])
    expect(pages?.find((p) => p.path === [...dir, 'Note.md'].join('/'))?.id).toBe(
      splitFrontmatter(text)[ID_KEY],
    )
    expect(held?.unreadable).toBeUndefined()
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('a folder that appears with a fresh ID-less note doesn’t list it', async () => {
    await mkdir(abs('Notes', 'Fresh'))
    await writeFile(abs('Notes', 'Fresh', '_pageset.json'), JSON.stringify({ id: ULID_C }))
    await writeFile(abs('Notes', 'Fresh', 'Note.md'), 'note\n')
    await applyEvents(root, [ev('addDir', 'Notes', 'Fresh')])
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
    expect(owedFor(root).stamp).toEqual([])
    await settleNow(pusher, root)
    expect(await readFile(abs('Notes', 'Fresh', 'Note.md'), 'utf8')).toBe('note\n')
  })

  it('a future-dated note that is the first in a new root folder is stamped and held', async () => {
    await mkdir(abs('Ideas'))
    await writeFile(abs('Ideas', 'First.md'), 'first\n')
    await ahead('Ideas', 'First.md')
    await settleBatch(pusher, root, [ev('add', 'Ideas', 'First.md')])
    const held = heldTreeOf(root)
    expect(held?.collections.find((c) => c.path === 'Ideas')?.pages.map((p) => p.id)).toEqual([
      splitFrontmatter(await readFile(abs('Ideas', 'First.md'), 'utf8'))[ID_KEY],
    ])
    expect(held?.unreadable).toBeUndefined()
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it.each([
    ['the folder', ['addDir', 'add']],
    ['the note', ['add', 'addDir']],
  ] as const)('a Set and its note arriving in one batch hold the note, whichever event comes first (%s first)', async (_, order) => {
    await mkdir(abs('Notes', 'Fresh'))
    await writeFile(abs('Notes', 'Fresh', 'Note.md'), 'note\n')
    await ahead('Notes', 'Fresh', 'Note.md')
    const of = {
      addDir: ev('addDir', 'Notes', 'Fresh'),
      add: ev('add', 'Notes', 'Fresh', 'Note.md'),
    }
    await settleBatch(
      pusher,
      root,
      order.map((e) => of[e]),
    )
    const held = heldTreeOf(root)
    expect(held?.collections[0]?.sets[0]?.pages.map((p) => p.id)).toEqual([
      splitFrontmatter(await readFile(abs('Notes', 'Fresh', 'Note.md'), 'utf8'))[ID_KEY],
    ])
    expect(held?.unreadable).toBeUndefined()
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('a note in an Agenda folder nested in a folder that just appeared without a sidecar is left as it is', async () => {
    await mkdir(abs('Stuff', 'Tasks'), { recursive: true })
    await writeFile(abs('Stuff', 'Tasks', '_taskconfig.json'), JSON.stringify({ id: ULID_D }))
    await writeFile(abs('Stuff', 'Tasks', 't.md'), 'task\n')
    await settleBatch(pusher, root, [
      ev('addDir', 'Stuff'),
      ev('addDir', 'Stuff', 'Tasks'),
      ev('add', 'Stuff', 'Tasks', '_taskconfig.json'),
      ev('add', 'Stuff', 'Tasks', 't.md'),
    ])
    expect(await readFile(abs('Stuff', 'Tasks', 't.md'), 'utf8')).toBe('task\n')
  })

  it('a note that left before its batch applied, beside a folder that just appeared without a sidecar, owes no walk', async () => {
    await mkdir(abs('A'))
    await writeFile(abs('A', 'x.md'), 'x\n')
    const walk = vi.spyOn(liveTree, 'refreshTree')
    await settleBatch(pusher, root, [
      ev('addDir', 'A'),
      ev('add', 'A', 'x.md'),
      ev('add', 'A', 'Gone.md'),
    ])
    expect(walk).not.toHaveBeenCalled()
    expect(
      heldTreeOf(root)
        ?.collections.find((c) => c.path === 'A')
        ?.pages.map((p) => p.title),
    ).toEqual(['x'])
  })

  it('a settle landing while a stamp pass is under way keeps the folders newly in reach for the pass', async () => {
    await mkdir(abs('Archive', 'Sub'), { recursive: true })
    await writeFile(abs('Archive', 'X.md'), 'x\n')
    await writeFile(abs('Archive', 'Sub', 'Q.md'), 'q\n')
    await writeExcludedFolders(root, ['Archive'])
    await settleNow(pusher, root)
    const read = readNexusModule.readFolder
    let fired = false
    vi.spyOn(readNexusModule, 'readFolder').mockImplementation(async (r, rel, tree) => {
      if (rel === 'Archive/Sub' && !fired) {
        fired = true
        await settleNow(pusher, root)
      }
      return read(r, rel, tree)
    })
    await writeExcludedFolders(root, [])
    await settleNow(pusher, root)
    expect(fired).toBe(true)
    const text = await readFile(abs('Archive', 'Sub', 'Q.md'), 'utf8')
    const held = heldTreeOf(root)
    expect(
      held?.collections.find((c) => c.path === 'Archive')?.sets[0]?.pages.map((p) => p.id),
    ).toEqual([splitFrontmatter(text)[ID_KEY]])
    expect(held?.unreadable).toBeUndefined()
  })

  it('a walk owed while a settle is past its walk is paid by the next settle', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    vi.spyOn(session, 'adopting').mockImplementationOnce(() => {
      oweWalk(root)
      return false
    })
    await settleNow(pusher, root)
    await settleNow(pusher, root)
    expect(heldTreeOf(root)?.collections[0]?.pages.map((p) => p.id)).toEqual([ULID_A, ULID_B])
  })

  it('a folder listed again while its stamp is in flight is held once the stamp lands', async () => {
    await mkdir(abs('A'))
    await writeFile(abs('A', 'x.md'), `---\nID: ${ULID_B}\n---\n\nx\n`)
    const reached = gate<void>()
    const release = gate<void>()
    const stampMissing = adopt.stampMissing
    vi.spyOn(adopt, 'stampMissing').mockImplementationOnce(async (r, listed) => {
      reached.open()
      await release.promise
      return stampMissing(r, listed)
    })
    const batch = settleBatch(pusher, root, [ev('addDir', 'A')])
    await reached.promise
    oweWalk(root)
    await settleNow(pusher, root)
    release.open()
    await batch
    const held = heldTreeOf(root)
    expect(held?.collections.find((c) => c.path === 'A')?.pages.map((p) => p.id)).toEqual([ULID_B])
    expect(held?.unreadable).toBeUndefined()
  })

  it('a batch of notes under a folder that just appeared without a sidecar indexes each note at most twice', async () => {
    await mkdir(abs('Bulk'))
    const names = Array.from({ length: 50 }, (_, i) => `n${i}.md`)
    for (const name of names) await writeFile(abs('Bulk', name), `${name}\n`)
    const indexed = vi.spyOn(indexSeed, 'indexWrittenPages')
    await settleBatch(pusher, root, [
      ev('addDir', 'Bulk'),
      ...names.map((name) => ev('add', 'Bulk', name)),
    ])
    expect(heldTreeOf(root)?.collections.find((c) => c.path === 'Bulk')?.pages).toHaveLength(50)
    const times = new Map<string, number>()
    for (const [, written] of indexed.mock.calls)
      for (const { absPath } of written) times.set(absPath, (times.get(absPath) ?? 0) + 1)
    for (const name of names) expect(times.get(abs('Bulk', name))).toBeLessThanOrEqual(2)
  })

  it('a note that carries its ID, arriving with a folder that has no sidecar, keeps every byte of a rewrite a later walk finds half written', async () => {
    await mkdir(abs('Ideas'))
    await writeFile(abs('Ideas', 'Kept.md'), `---\nID: ${ULID_B}\n---\n\nkept\n`)
    await settleBatch(pusher, root, [ev('addDir', 'Ideas'), ev('add', 'Ideas', 'Kept.md')])
    expect(
      heldTreeOf(root)
        ?.collections.find((c) => c.path === 'Ideas')
        ?.pages.map((p) => p.id),
    ).toEqual([ULID_B])
    const writer = await open(abs('Ideas', 'Kept.md'), 'w')
    await writer.write('first half\n')
    oweWalk(root)
    await settleNow(pusher, root)
    await writer.write('second half\n')
    await writer.close()
    expect(await readFile(abs('Ideas', 'Kept.md'), 'utf8')).toBe('first half\nsecond half\n')
  })

  it.each([
    ['the folders', ['A', 'A/B', 'A/B/note.md']],
    ['the note', ['A/B/note.md', 'A', 'A/B']],
  ] as const)('a note two sidecar-less folders deep, arriving with neither folder held, is stamped and held (%s first)', async (_, order) => {
    await mkdir(abs('A', 'B'), { recursive: true })
    await writeFile(abs('A', 'B', 'note.md'), 'note\n')
    await settleBatch(
      pusher,
      root,
      order.map((rel) => ev(rel.endsWith('.md') ? 'add' : 'addDir', ...rel.split('/'))),
    )
    const held = heldTreeOf(root)
    expect(held?.collections.find((c) => c.path === 'A')?.sets[0]?.pages.map((p) => p.id)).toEqual([
      splitFrontmatter(await readFile(abs('A', 'B', 'note.md'), 'utf8'))[ID_KEY],
    ])
    expect(held?.unreadable).toBeUndefined()
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('un-excluding a folder that was adopted before holds the notes added while it was excluded', async () => {
    await mkdir(abs('Archive'))
    await writeFile(abs('Archive', '_pagecollection.json'), JSON.stringify({ id: ULID_C }))
    recordHanded(await refreshTree(root))
    await writeExcludedFolders(root, ['Archive'])
    await settleNow(pusher, root)
    await writeFile(abs('Archive', 'New.md'), 'new\n')
    await writeExcludedFolders(root, [])
    await settleNow(pusher, root)
    const held = heldTreeOf(root)
    expect(held?.unreadable).toBeUndefined()
    const archive = held?.collections.find((c) => c.path === 'Archive')
    expect(archive?.pages.map((p) => p.id)).toEqual([
      splitFrontmatter(await readFile(abs('Archive', 'New.md'), 'utf8'))[ID_KEY],
    ])
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('an editor save during a walk doesn’t restart it, and the walk installs what a fresh read answers', async () => {
    const reading = gate<void>()
    const release = gate<void>()
    const walk = readNexusModule.readNexus
    const reads = vi.spyOn(readNexusModule, 'readNexus').mockImplementation(async (r) => {
      const walked = await walk(r)
      reading.open()
      await release.promise
      return walked
    })
    const walking = refreshTree(root)
    await reading.promise
    for (let i = 0; i < 5; i++)
      await updatePageBody(abs('Notes', 'A.md'), `edit ${i}\n`, undefined, true)
    release.open()
    await walking
    expect(reads).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
    const held = heldTreeOf(root)
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('un-excluding folders of ID-less notes stamps and holds them, and re-arms the watch once', async () => {
    await mkdir(abs('Archive', 'Old'), { recursive: true })
    await writeFile(abs('Archive', 'X.md'), 'x\n')
    await writeFile(abs('Archive', 'Old', 'Y.md'), 'y\n')
    await mkdir(abs('Notes', 'Sub'))
    await writeFile(abs('Notes', 'Sub', 'Z.md'), 'z\n')
    await writeExcludedFolders(root, ['Archive', 'Notes/Sub'])
    await settleNow(pusher, root)
    pusher.watch.mockClear()
    await writeExcludedFolders(root, [])
    await settleNow(pusher, root)
    const held = heldTreeOf(root)
    expect(held?.unreadable).toBeUndefined()
    const paths = held?.collections.flatMap((c) => [
      ...c.pages.map((p) => p.path),
      ...(c.sets ?? []).flatMap((s) => s.pages.map((p) => p.path)),
    ])
    expect(paths).toEqual(
      expect.arrayContaining(['Archive/X.md', 'Archive/Old/Y.md', 'Notes/Sub/Z.md']),
    )
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
    expect(pusher.watch).toHaveBeenCalledTimes(1)
  })

  it('a settings file rewritten outside and read by a walk before its event re-arms the watch once, and stamps and holds the notes it un-excludes', async () => {
    await mkdir(abs('Archive'))
    await writeFile(abs('Archive', 'X.md'), 'x\n')
    await writeExcludedFolders(root, ['Archive'])
    await settleNow(pusher, root)
    pusher.watch.mockClear()
    await writeFile(abs('.nexus', 'settings.json'), '{}\n')
    oweWalk(root)
    await settleNow(pusher, root)
    await settleBatch(pusher, root, [ev('change', '.nexus', 'settings.json')])
    const held = heldTreeOf(root)
    expect(held?.unreadable).toBeUndefined()
    expect(held?.collections.find((c) => c.path === 'Archive')?.pages.map((p) => p.id)).toEqual([
      splitFrontmatter(await readFile(abs('Archive', 'X.md'), 'utf8'))[ID_KEY],
    ])
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
    expect(pusher.watch).toHaveBeenCalledTimes(1)
  })

  it('a settle while an open is under way pushes nothing, and the next one pushes what was owed', async () => {
    oweCascade(root, ['Notes/A.md'], [])
    await whileAdopting(() => settleNow(pusher, root))
    expect(pushes).toEqual([])
    await settleNow(pusher, root)
    expect(pushes).toEqual([['pages:changed', ['Notes/A.md']]])
  })

  it('an open begun after a settle drained what was owed leaves the next one the same tiles', async () => {
    const opened = gate<void>()
    let opening: Promise<void> | undefined
    vi.spyOn(optionOps, 'registerHeldOptions').mockImplementationOnce(async () => {
      opening = whileAdopting(() => opened.promise)
    })
    owedFor(root).options.add('Notes')
    oweCascade(root, [], [{ host: { kind: 'homepage' }, ids: ['t1', 't2'] }])
    await settleNow(pusher, root)
    expect(pushes).toEqual([])
    opened.open()
    await opening
    await settleNow(pusher, root)
    expect(payload('tiles:changed')).toEqual({ host: { kind: 'homepage' }, ids: ['t1', 't2'] })
  })

  it('a settle that owes a reseed doesn’t delay a second settle behind it', async () => {
    const seeding = gate<indexSeed.SeedReread>()
    const seed = vi.spyOn(indexSeed, 'seedContentIndex').mockImplementation(() => seeding.promise)
    owedFor(root).corpus = true
    let firstDone = false
    const first = settleNow(pusher, root).then(() => {
      firstDone = true
    })
    await settleNow(pusher, root)
    expect(seed).toHaveBeenCalledTimes(1)
    expect(firstDone).toBe(false)
    seeding.open({ db: null, rels: [], renames: [], vanished: [], landed: [] })
    await first
    expect(firstDone).toBe(true)
  })

  it('a carry that throws leaves the settle whole', async () => {
    await mkdir(abs('Notes', 'Box'))
    await writeFile(abs('Notes', 'Box', '_pageset.json'), JSON.stringify({ id: ULID_C }))
    await writeFile(abs('Notes', 'Box', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await mkdir(abs('Other'))
    await writeFile(abs('Other', '_pagecollection.json'), JSON.stringify({ id: ULID_D }))
    shown = recordHanded(await refreshTree(root)).tree
    const real = bundles.archivedWithin
    const carry = vi
      .spyOn(bundles, 'archivedWithin')
      .mockImplementationOnce(real)
      .mockRejectedValue(new Error('boom'))
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const moved = await handleMutate(root, {
      op: 'moveSet',
      path: 'Notes/Box',
      newParentPath: 'Other',
      order: [ULID_C],
    })
    expect(moved.ok).toBe(true)
    await settleNow(pusher, root)
    expect(carry).toHaveBeenCalledTimes(2)
    expect(channels()).toEqual(['nexus:changed', 'values:changed'])
    expect(logged).toHaveBeenCalledWith('archive: the carry failed:', 'boom')
  })
})

describe('an outside batch’s turn', () => {
  const ULID_N = '01NX5ZZKBKPCTAV9WEVGEMMVRN'
  const bytes = (...segs: string[]): Promise<string> => readFile(abs(...segs), 'utf8')
  // An editor write and its gate's settle, answered by whether the settle returned before a wait no stamp of the batch's could fit in.
  const reply = async (): Promise<'replied' | 'waited'> => {
    await atomicWriteFile(abs('Notes', 'New.md'), `---\nID: ${ULID_N}\n---\n\nnew\n`)
    return Promise.race([
      settleNow(pusher, root).then(() => 'replied' as const),
      new Promise<'waited'>((r) => setTimeout(() => r('waited'), 200)),
    ])
  }
  // What the window holds once it applies every tree it was pushed.
  const windowTree = (): NexusTree =>
    pushes
      .filter(([c]) => c === 'nexus:changed')
      .reduce((t, [, v]) => applyDelta(t, (v as NexusChange).delta), shown)
  const agrees = async (): Promise<void> => {
    const live = heldTreeOf(root)
    expect(live && stabilize(await readNexus(root), live)).toBe(live)
  }
  const held = (rel: string): string | undefined =>
    heldTreeOf(root)?.collections[0]?.pages.find((p) => p.path === rel)?.id

  it('a reply’s settle doesn’t wait on the stamps of a batch that has applied', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    const stamping = gate<void>()
    const release = gate<void>()
    const stampMissing = adopt.stampMissing
    vi.spyOn(adopt, 'stampMissing').mockImplementationOnce(async (...args) => {
      stamping.open()
      await release.promise
      return stampMissing(...args)
    })
    const batch = settleBatch(pusher, root, [ev('add', 'Notes', 'Bare.md')])
    await stamping.promise
    expect(await reply()).toBe('replied')
    expect(held('Notes/New.md')).toBe(ULID_N)
    release.open()
    await batch
    expect(held('Notes/Bare.md')).toBe(splitFrontmatter(await bytes('Notes', 'Bare.md'))[ID_KEY])
    await agrees()
  })

  it('a held page saved outside without its ID gets the ID it held back, and the window never sees it leave', async () => {
    await writeFile(abs('Notes', 'A.md'), 'alpha, rewritten\n')
    await settleBatch(pusher, root, [ev('change', 'Notes', 'A.md')])
    expect(splitFrontmatter(await bytes('Notes', 'A.md'))[ID_KEY]).toBe(ULID_A)
    expect(held('Notes/A.md')).toBe(ULID_A)
    expect(windowTree()).toEqual(heldTreeOf(root))
    expect(windowTree().collections[0].pages.map((p) => p.id)).toEqual([ULID_A])
    await agrees()
  })

  it('a held page whose ID another file took in the same batch is stamped fresh, and the other keeps it', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_A}\n---\n\nalpha\n`)
    await writeFile(abs('Notes', 'A.md'), 'a new note\n')
    await settleBatch(pusher, root, [ev('add', 'Notes', 'B.md'), ev('change', 'Notes', 'A.md')])
    const stamped = splitFrontmatter(await bytes('Notes', 'A.md'))[ID_KEY]
    expect(stamped).not.toBe(ULID_A)
    expect(held('Notes/A.md')).toBe(stamped)
    expect(held('Notes/B.md')).toBe(ULID_A)
  })

  it('a reply while a batch applies stamps nothing the batch listed, and the window isn’t shown it as unreadable', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    await writeFile(abs('Notes', 'Late.md'), 'late\n')
    const reached = gate<void>()
    const release = gate<void>()
    const sidecar = abs('Notes', '_pagecollection.json')
    const read = machine().readText
    let armed = true
    vi.spyOn(machine(), 'readText').mockImplementation(async (path) => {
      if (armed && path === sidecar) {
        armed = false
        reached.open()
        await release.promise
      }
      return read(path)
    })
    const batch = settleBatch(pusher, root, [
      ev('add', 'Notes', 'Bare.md'),
      ev('change', 'Notes', '_pagecollection.json'),
      ev('add', 'Notes', 'Late.md'),
    ])
    await reached.promise
    expect(await reply()).toBe('replied')
    expect(await bytes('Notes', 'Bare.md')).toBe('bare\n')
    expect(windowTree().unreadable).toBeUndefined()
    release.open()
    await batch
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
    expect(windowTree()).toEqual(heldTreeOf(root))
    await agrees()
  })

  it('a walk that read a file before the batch stamped it walks again, and holds the stamp', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    const stamping = gate<void>()
    const release = gate<void>()
    const stamped = gate<void>()
    const stampMissing = adopt.stampMissing
    vi.spyOn(adopt, 'stampMissing').mockImplementationOnce(async (...args) => {
      stamping.open()
      await release.promise
      const landed = await stampMissing(...args)
      stamped.open()
      return landed
    })
    const walking = gate<void>()
    const walkRelease = gate<void>()
    const walk = readNexusModule.readNexus
    vi.spyOn(readNexusModule, 'readNexus').mockImplementationOnce(async (at) => {
      const tree = await walk(at)
      walking.open()
      await walkRelease.promise
      return tree
    })
    const batch = settleBatch(pusher, root, [ev('add', 'Notes', 'Bare.md')])
    await stamping.promise
    await applyEvents(root, [ev('change', '.nexus', 'nexus.json')])
    const replied = settleNow(pusher, root)
    await walking.promise
    release.open()
    await stamped.promise
    walkRelease.open()
    await replied
    await batch
    expect(held('Notes/Bare.md')).toBe(splitFrontmatter(await bytes('Notes', 'Bare.md'))[ID_KEY])
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
    expect(windowTree()).toEqual(heldTreeOf(root))
    await agrees()
  })

  it('a stamp never lands on a file while the batch that listed it is still reading it', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    const reached = gate<void>()
    const release = gate<void>()
    const page = abs('Notes', 'Bare.md')
    const read = machine().readText
    let reads = 0
    // The index's read of Bare fails, so the patch reads it for each event, and the second read is held.
    vi.spyOn(machine(), 'readText').mockImplementation(async (path) => {
      if (path !== page) return read(path)
      if (++reads === 1) throw new Error('unreadable')
      const text = await read(path)
      if (reads === 3) {
        reached.open()
        await release.promise
      }
      return text
    })
    const batch = settleBatch(pusher, root, [
      ev('add', 'Notes', 'Bare.md'),
      ev('change', 'Notes', 'Bare.md'),
    ])
    await reached.promise
    await reply()
    expect(await bytes('Notes', 'Bare.md')).toBe('bare\n')
    release.open()
    await batch
    expect(held('Notes/Bare.md')).toBe(splitFrontmatter(await bytes('Notes', 'Bare.md'))[ID_KEY])
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
    await agrees()
  })
})

describe('held options — the Multi-Select members a changed file holds are registered', () => {
  const SPACE = ['.nexus', 'contexts', 'Areas', 'Home', '_space.json'] as const
  const page = (id: string, fm = ''): string => `---\nID: ${id}\n${fm}---\n\nbody\n`
  const tags = (...members: string[]): string =>
    `Tags:\n${members.map((m) => `  - ${m}\n`).join('')}`
  // An outside edit of the property list, settled as the file event it raises.
  const registry = (first: string): Promise<void> =>
    writeFile(
      abs('.nexus', 'properties.json'),
      JSON.stringify({
        order: ['tags', 'kind'],
        defs: {
          tags: {
            id: 'tags',
            label: 'Tags',
            key: 'Tags',
            type: 'multiSelect',
            select_options: [{ key: first, label: first, color: 'blue' }],
          },
          kind: {
            id: 'kind',
            label: 'Kind',
            key: 'Kind',
            type: 'select',
            select_options: [{ key: 'Note', label: 'Note' }],
          },
        },
      }),
    )
  const stored = async (id: string) =>
    (
      await readJsonAt<{
        defs: Record<string, { select_options: { label: string; color?: string }[] }>
      }>(abs('.nexus', 'properties.json'))
    ).defs[id]?.select_options ?? []
  const options = async (id = 'tags'): Promise<string[]> => (await stored(id)).map((o) => o.label)
  const walked = async (): Promise<void> => {
    shown = recordHanded(await refreshTree(root)).tree
  }

  beforeEach(async () => {
    await registry('alpha')
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', properties: ['tags', 'kind'] }),
    )
    await mkdir(abs('Loose'))
    await writeFile(abs('Loose', '_pagecollection.json'), JSON.stringify({ id: 'c2' }))
    await writeFile(abs('Loose', 'L.md'), page(ULID_C))
    await mkdir(abs('.nexus', 'contexts', 'Areas', 'Home'), { recursive: true })
    await writeFile(
      abs('.nexus', 'contexts', 'contexts.json'),
      JSON.stringify({ contexts: [{ id: 'ctx1', title: 'Areas' }] }),
    )
    await writeFile(abs(...SPACE), JSON.stringify({ id: ULID_D }))
    await walked()
  })
  afterEach(() => {
    sweep.hold = null
    sweep.entered = () => {}
  })

  it('an outside edit registers the member its page holds after the options already there, in the push that carries the page', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('alpha', 'Ideas')))
    await settleBatch(pusher, root, [ev('change', 'Notes', 'A.md')])
    expect(await stored('tags')).toEqual([
      { id: 'opt_alpha', key: 'alpha', label: 'alpha', color: 'blue' },
      { id: expect.stringMatching(/^opt_[0-9A-HJKMNP-TV-Z]{26}$/), key: 'Ideas', label: 'Ideas' },
    ])
    expect(channels()).toEqual(['nexus:changed', 'pages:changed', 'values:changed'])
    const pushed = applyDelta(shown, (payload('nexus:changed') as NexusChange).delta)
    const def = pushed.config.registry.find((d) => d.id === 'tags') as PropertyDefinition
    expect(optionsOf(def).map((o) => o.label)).toEqual(['alpha', 'Ideas'])
  })

  it('an in-app toggle of another option registers the member the page already holds', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('Ideas')))
    await walked()
    const reply = await settledMutate(root, {
      op: 'setProperty',
      path: 'Notes/A.md',
      propertyId: 'tags',
      value: { kind: 'multiSelect', value: ['opt_alpha'] },
    })
    expect(reply.ok).toBe(true)
    expect(await options()).toEqual(['alpha', 'Ideas'])
  })

  it('an in-app write of a different property registers the member the page already holds', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('Ideas')))
    await walked()
    const reply = await settledMutate(root, {
      op: 'setProperty',
      path: 'Notes/A.md',
      propertyId: 'kind',
      value: { kind: 'select', value: 'opt_Note' },
    })
    expect(reply.ok).toBe(true)
    expect(await options()).toEqual(['alpha', 'Ideas'])
  })

  it('two pages holding one member in two casings register one option', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('Claude')))
    await writeFile(abs('Notes', 'B.md'), page(ULID_B, tags('claude')))
    await settleBatch(pusher, root, [ev('change', 'Notes', 'A.md'), ev('add', 'Notes', 'B.md')])
    expect(await options()).toEqual(['alpha', 'Claude'])
  })

  it('a Select value its definition doesn’t register stays unregistered', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, `Kind: Draft\n${tags('Ideas')}`))
    await settleBatch(pusher, root, [ev('change', 'Notes', 'A.md')])
    expect(await options()).toEqual(['alpha', 'Ideas'])
    expect(await options('kind')).toEqual(['Note'])
  })

  it('a page whose Collection doesn’t assign the property registers nothing', async () => {
    await writeFile(abs('Loose', 'L.md'), page(ULID_C, tags('Zeta')))
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('Ideas')))
    await settleBatch(pusher, root, [ev('change', 'Loose', 'L.md'), ev('change', 'Notes', 'A.md')])
    expect(await options()).toEqual(['alpha', 'Ideas'])
  })

  it('an editor’s body save registers nothing', async () => {
    const text = page(ULID_B, tags('Zeta'))
    await writeFile(abs('Notes', 'B.md'), text)
    await walked()
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('Ideas')))
    await settleBatch(pusher, root, [
      { event: 'change', absPath: abs('Notes', 'B.md'), origin: 'own', text, bodyOnly: true },
      ev('change', 'Notes', 'A.md'),
    ])
    expect(await options()).toEqual(['alpha', 'Ideas'])
  })

  it('an outside edit of a Space sidecar registers the member it holds', async () => {
    await writeFile(abs(...SPACE), JSON.stringify({ id: ULID_D, Tags: ['Ideas'] }))
    await settleBatch(pusher, root, [ev('change', ...SPACE)])
    expect(await options()).toEqual(['alpha', 'Ideas'])
  })

  it('assigning the property to a Collection registers the member its page already holds', async () => {
    await writeFile(abs('Loose', 'L.md'), page(ULID_C, tags('Ideas')))
    await walked()
    expect((await assignProperty(root, abs('Loose'), 'tags')).ok).toBe(true)
    await settleNow(pusher, root)
    expect(await options()).toEqual(['alpha', 'Ideas'])
  })

  it('un-excluding a Set registers the member a page added while it was excluded holds', async () => {
    await mkdir(abs('Notes', 'Old'))
    await writeFile(abs('Notes', 'Old', '_pageset.json'), JSON.stringify({ id: 's1' }))
    await walked()
    await writeExcludedFolders(root, ['Notes/Old'])
    await settleNow(pusher, root)
    await writeFile(abs('Notes', 'Old', 'New.md'), page(ULID_B, tags('Ideas')))
    await writeExcludedFolders(root, [])
    await settleNow(pusher, root)
    expect(await options()).toEqual(['alpha', 'Ideas'])
  })

  it('a settle during an option rename’s cascade registers the new member alone, once the cascade ends', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('alpha', 'Ideas')))
    const entered = gate<void>()
    const release = gate<void>()
    sweep.entered = () => entered.open()
    sweep.hold = release.promise
    const renaming = renameOption(root, 'tags', 'opt_alpha', 'beta')
    await entered.promise
    const settling = settleBatch(pusher, root, [ev('change', 'Notes', 'A.md')])
    expect(
      await Promise.race([
        settling.then(() => 'settled' as const),
        new Promise<'waited'>((r) => setTimeout(() => r('waited'), 200)),
      ]),
    ).toBe('waited')
    release.open()
    expect((await renaming).ok).toBe(true)
    await settling
    expect(await options()).toEqual(['beta', 'Ideas'])
    expect(splitFrontmatter(await readFile(abs('Notes', 'A.md'), 'utf8')).Tags).toEqual([
      'beta',
      'Ideas',
    ])
  })

  it('an open that begins while a settle waits on a cascade leaves what the settle owed for the next one', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('alpha', 'Ideas')))
    const entered = gate<void>()
    const release = gate<void>()
    const opened = gate<void>()
    sweep.entered = () => entered.open()
    sweep.hold = release.promise
    const renaming = renameOption(root, 'tags', 'opt_alpha', 'beta')
    await entered.promise
    const settling = settleBatch(pusher, root, [ev('change', 'Notes', 'A.md')])
    await new Promise((wake) => setTimeout(wake, 50))
    const opening = whileAdopting(() => opened.promise)
    release.open()
    await renaming
    await settling
    opened.open()
    await opening
    pushes = []
    await settleNow(pusher, root)
    expect(channels()).toEqual(['nexus:changed', 'pages:changed', 'values:changed'])
    expect(await options()).toEqual(['beta', 'Ideas'])
  })

  it('a page a rename’s sweep skipped registers its new member alone, and the finish still reaches it', async () => {
    await registry('beta')
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('alpha')))
    await walked()
    await putJson(abs(OWED_REL), {
      tags: { kind: 'property', options: { [keyedOptionId('beta')]: { rename: ['alpha'] } } },
    })
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('alpha', 'Ideas')))
    await settleBatch(pusher, root, [ev('change', 'Notes', 'A.md')])
    expect(await options()).toEqual(['beta', 'Ideas'])
    await finishOwed(root)
    expect(splitFrontmatter(await readFile(abs('Notes', 'A.md'), 'utf8')).Tags).toEqual([
      'beta',
      'Ideas',
    ])
  })

  it('a rename owed over two keys shields every old key its entry names', async () => {
    await registry('beta')
    await walked()
    await putJson(abs(OWED_REL), {
      tags: {
        kind: 'property',
        options: {
          [keyedOptionId('beta')]: { rename: ['alpha'] },
          [keyedOptionId('delta')]: { rename: ['gamma'] },
        },
      },
    })
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('alpha', 'gamma')))
    await settleBatch(pusher, root, [ev('change', 'Notes', 'A.md')])
    expect(await options()).toEqual(['beta'])
  })

  it('renaming the property onto a key its Collection’s pages already hold registers their members', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, 'Labels:\n  - Ideas\n'))
    await walked()
    expect((await renameProperty(root, 'tags', 'Labels')).ok).toBe(true)
    await settleNow(pusher, root)
    expect(await options()).toEqual(['alpha', 'Ideas'])
  })

  it('creating a property under a key a Space holds registers the Space’s members', async () => {
    await writeFile(abs(...SPACE), JSON.stringify({ id: ULID_D, Labels: ['Ideas'] }))
    await walked()
    const created = await createProperty(root, {
      id: 'labels',
      label: 'Labels',
      type: 'multiSelect',
    })
    expect(created.ok).toBe(true)
    await settleNow(pusher, root)
    expect(await options('labels')).toEqual(['Option 1', 'Ideas'])
  })

  it('a registry change that names no key, such as an option edit, owes no file', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('alpha', 'Ideas')))
    await walked()
    const registrar = vi.spyOn(optionOps, 'registerHeldOptions')
    await registry('beta')
    await settleBatch(pusher, root, [ev('change', '.nexus', 'properties.json')])
    expect(registrar).not.toHaveBeenCalled()
    expect(await options()).toEqual(['beta'])
  })

  it('a member its Value Format can’t write stays unregistered until a Value Format change can write it', async () => {
    const held = JSON.parse(await readFile(abs('.nexus', 'properties.json'), 'utf8'))
    held.defs.tags.value_format = 'UPPERCASE'
    await writeFile(abs('.nexus', 'properties.json'), JSON.stringify(held))
    await walked()
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('alpha', 'green')))
    await settleBatch(pusher, root, [ev('change', 'Notes', 'A.md')])
    expect(await options()).toEqual(['alpha'])
    expect((await setValueFormat(root, 'tags', 'lowercase')).ok).toBe(true)
    await settleNow(pusher, root)
    expect(await options()).toEqual(['alpha', 'green'])
  })

  it('an outside registry edit that re-cases a Multi-Select’s name registers its members', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, 'TAGS:\n  - Ideas\n'))
    await walked()
    const held = JSON.parse(await readFile(abs('.nexus', 'properties.json'), 'utf8'))
    held.defs.tags.label = 'TAGS'
    held.defs.tags.key = 'TAGS'
    await writeFile(abs('.nexus', 'properties.json'), JSON.stringify(held))
    await settleBatch(pusher, root, [ev('change', '.nexus', 'properties.json')])
    expect(await options()).toContain('Ideas')
  })

  it('a rename that changes only the name’s casing moves the key', async () => {
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, tags('Ideas')))
    await walked()
    expect((await renameProperty(root, 'tags', 'TAGS')).ok).toBe(true)
    await settleNow(pusher, root)
    expect(await readFile(abs('Notes', 'A.md'), 'utf8')).toContain('\nTAGS:\n  - Ideas\n')
  })

  it('a registry arriving from outside with a property a Collection already assigns registers the members its pages hold', async () => {
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', properties: ['tags', 'kind', 'labels'] }),
    )
    await writeFile(abs('Notes', 'A.md'), page(ULID_A, 'Labels:\n  - Ideas\n'))
    await walked()
    const held = JSON.parse(await readFile(abs('.nexus', 'properties.json'), 'utf8'))
    held.order.push('labels')
    held.defs.labels = {
      id: 'labels',
      label: 'Labels',
      key: 'Labels',
      type: 'multiSelect',
      select_options: [],
    }
    await writeFile(abs('.nexus', 'properties.json'), JSON.stringify(held))
    await settleBatch(pusher, root, [ev('change', '.nexus', 'properties.json')])
    expect(await options('labels')).toEqual(['Ideas'])
  })
})

describe('a heading renamed while no watcher listened', () => {
  const page = (...headings: string[]): Promise<void> =>
    writeFile(
      abs('Notes', 'A.md'),
      `---\nID: ${ULID_A}\n---\n\n${headings.map((h) => `## ${h}\n`).join('\n')}`,
    )
  const linker = (heading: string): Promise<void> =>
    writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\n[[A#${heading}]]\n`)
  const linked = async (): Promise<string> =>
    splitEnvelope(await readFile(abs('Notes', 'B.md'), 'utf8')).body
  const renamedOutside = async (...headings: string[]): Promise<void> => {
    await page(...headings)
    await ahead('Notes', 'A.md')
  }

  beforeEach(async () => {
    installStores(memoryStores().stores)
    await page('Setup', 'Keep')
    await linker('Setup')
    recordHanded(await refreshTree(root))
    await indexSeed.seedContentIndex(root)
  })
  afterEach(() => installStores(NO_STORES))

  it('the catch-up cascades it into the page that links it', async () => {
    await renamedOutside('Intro', 'Keep')
    await settleBatch(pusher, root, [], true)
    expect(await linked()).toBe('[[A#Intro]]\n')
    expect(payload('pages:changed')).toEqual(expect.arrayContaining(['Notes/B.md']))
  })

  it('two headings renamed in one edit cascade nothing', async () => {
    await renamedOutside('Intro', 'Kept')
    await settleBatch(pusher, root, [], true)
    expect(await linked()).toBe('[[A#Setup]]\n')
    expect(payload('pages:changed')).toEqual(['Notes/A.md'])
  })

  it('a catch-up that finds no heading changed cascades nothing and pushes nothing', async () => {
    await settleBatch(pusher, root, [], true)
    expect(await linked()).toBe('[[A#Setup]]\n')
    expect(pushes).toEqual([])
  })

  it('a rename owed while a settle walks is paid by the next settle', async () => {
    const reached = gate<void>()
    const walked = gate<NexusTree>()
    vi.spyOn(liveTree, 'refreshTree').mockImplementationOnce(() => {
      reached.open()
      return walked.promise
    })
    oweWalk(root)
    const settling = settleNow(pusher, root)
    await reached.promise
    await renamedOutside('Intro', 'Keep')
    await applyEvents(root, [ev('change', 'Notes', 'A.md')])
    walked.open(await readNexus(root))
    await settling
    await settleNow(pusher, root)
    expect(await linked()).toBe('[[A#Intro]]\n')
  })

  it('a linker another device already rewrote is left as it is', async () => {
    await renamedOutside('Intro', 'Keep')
    await linker('Intro')
    await ahead('Notes', 'B.md')
    const before = await readFile(abs('Notes', 'B.md'), 'utf8')
    await settleBatch(pusher, root, [], true)
    expect(await readFile(abs('Notes', 'B.md'), 'utf8')).toBe(before)
    expect(payload('pages:changed')).toEqual(expect.arrayContaining(['Notes/A.md', 'Notes/B.md']))
  })
})

describe('a page created while no watcher listened', () => {
  it('is an arrival at the catch-up, so a sole holder’s bare links take its path', async () => {
    installStores(memoryStores().stores)
    try {
      await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\n[[A]]\n`)
      recordHanded(await refreshTree(root))
      await indexSeed.seedContentIndex(root)
      await mkdir(abs('Notes', 'Sub'))
      await writeFile(abs('Notes', 'Sub', '_pageset.json'), JSON.stringify({ id: 's-sub' }))
      await writeFile(abs('Notes', 'Sub', 'A.md'), `---\nID: ${ULID_C}\n---\n\nsub\n`)
      await settleBatch(pusher, root, [], true)
      expect(splitEnvelope(await readFile(abs('Notes', 'B.md'), 'utf8')).body).toBe(
        '[[Notes/A|A]]\n',
      )
    } finally {
      installStores(NO_STORES)
    }
  })
})

describe('an own write of a page', () => {
  it('is parsed once, the index’s parse serving the tree’s patch', async () => {
    installStores(memoryStores().stores)
    try {
      recordHanded(await refreshTree(root))
      await indexSeed.seedContentIndex(root)
      const parses = vi.spyOn(pageFile, 'parsePage')
      await atomicWriteFile(abs('Notes', 'A.md'), `---\nID: ${ULID_A}\nicon: moon\n---\n\nmine\n`)
      await settleNow(pusher, root)
      expect(parses).toHaveBeenCalledTimes(1)
    } finally {
      installStores(NO_STORES)
    }
  })
})

describe('a re-spell on the notes', () => {
  const failing: string[] = []
  const linker = (): string => abs('Notes', 'L.md')

  beforeEach(() => {
    failLandings((file) => failing.some((f) => file.endsWith(f)))
  })
  afterEach(() => {
    failing.length = 0
  })

  const renamed = async (from: string, to: string) =>
    settledMutate(root, { op: 'rename', path: `Notes/${from}.md`, kind: 'page', newName: to })

  const seedLinked = async (): Promise<void> => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(linker(), `---\nID: ${ULID_C}\n---\n\nSee [[B]].\n`)
    await refreshTree(root)
    failing.push('Notes/L.md')
  }

  it('a page move that misses a linker owes the re-spell', async () => {
    await seedLinked()
    const r = await renamed('B', 'C')
    expect(r.ok && r.value.cascade?.owed).toBe(true)
    expect((await readNotes(root))[ULID_B]).toMatchObject({ kind: 'relink' })
    failing.length = 0
    await finishOwed(root)
    expect(await readFile(linker(), 'utf8')).toContain('See [[C]].')
    expect(await readNotes(root)).toEqual({})
  })

  it('a page move names a linker it can’t safely rewrite once and owes nothing', async () => {
    await writeFile(abs('Notes', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
    await writeFile(linker(), `---\nID: ${ULID_C}\nPhase:\n\t- Draft\n---\n\nSee [[B]].\n`)
    await refreshTree(root)
    const r = await renamed('B', 'C')
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade?.warning).toBe('Couldn’t safely rewrite “L”.')
    expect(r.value.cascade).not.toHaveProperty('owed')
    expect(await readNotes(root)).toEqual({})
  })

  it('a second move carries what the first missed', async () => {
    await seedLinked()
    await renamed('B', 'C')
    await renamed('C', 'D')
    failing.length = 0
    await finishOwed(root)
    expect(await readFile(linker(), 'utf8')).toContain('See [[D]].')
    expect(await readNotes(root)).toEqual({})
  })

  it('a restore’s re-spell owes what it missed', async () => {
    await mkdir(abs('Notes', 'Deep'))
    await writeFile(abs('Notes', 'Deep', '_pageset.json'), JSON.stringify({ id: 'set_deep' }))
    await writeFile(abs('Notes', 'Deep', 'X.md'), `---\nID: ${ULID_D}\n---\n\nx\n`)
    await refreshTree(root)
    const bundle = bundleOf(
      await settledMutate(root, { op: 'delete', path: 'Notes/Deep/X.md', kind: 'page' }),
    )
    await writeFile(abs('Notes', 'X.md'), `---\nID: ${ULID_B}\n---\n\nx\n`)
    await writeFile(linker(), `---\nID: ${ULID_C}\n---\n\nSee [[X]].\n`)
    await refreshTree(root)
    failing.push('Notes/L.md')
    const r = await settledMutate(root, { op: 'restore', bundlePath: bundle })
    expect(r.ok && r.value.cascade?.owed).toBe(true)
    failing.length = 0
    await finishOwed(root)
    expect(await readFile(linker(), 'utf8')).not.toContain('See [[X]].')
    expect(await readNotes(root)).toEqual({})
  })

  it('a restore re-spells a key only its returning page answered', async () => {
    await mkdir(abs('Notes', 'Deep'))
    await writeFile(abs('Notes', 'Deep', '_pageset.json'), JSON.stringify({ id: 'set_deep' }))
    await writeFile(abs('Notes', 'Deep', 'X.md'), `---\nID: ${ULID_D}\n---\n\nx\n`)
    await writeFile(linker(), `---\nID: ${ULID_C}\n---\n\nSee [[Deep/X]].\n`)
    await refreshTree(root)
    const bundle = bundleOf(
      await settledMutate(root, { op: 'delete', path: 'Notes/Deep/X.md', kind: 'page' }),
    )
    const moved = await settledMutate(root, {
      op: 'rename',
      path: 'Notes/Deep',
      kind: 'set',
      newName: 'Moved',
    })
    if (!moved.ok) throw new Error(moved.error.message)
    expect(await readFile(linker(), 'utf8')).toContain('See [[Deep/X]].')
    expect((await settledMutate(root, { op: 'restore', bundlePath: bundle })).ok).toBe(true)
    expect(await pathExists(abs('Notes', 'Moved', 'X.md'))).toBe(true)
    expect(await readFile(linker(), 'utf8')).not.toContain('[[Deep/X]]')
  })

  // A Set whose page links its sibling by path, trashed and restored beside a new Set under its name.
  const repairMissed = async (): Promise<{ landed: string; p: string }> => {
    await mkdir(abs('Notes', 'Deep'))
    await writeFile(abs('Notes', 'Deep', '_pageset.json'), JSON.stringify({ id: 'set_deep' }))
    await writeFile(abs('Notes', 'Deep', 'P.md'), `---\nID: ${ULID_B}\n---\n\nSee [[Deep/Q]].\n`)
    await writeFile(abs('Notes', 'Deep', 'Q.md'), `---\nID: ${ULID_C}\n---\n\nq\n`)
    await refreshTree(root)
    const bundle = bundleOf(
      await settledMutate(root, { op: 'delete', path: 'Notes/Deep', kind: 'set' }),
    )
    await mkdir(abs('Notes', 'Deep'))
    await writeFile(abs('Notes', 'Deep', '_pageset.json'), JSON.stringify({ id: 'set_new' }))
    await writeFile(abs('Notes', 'Deep', 'Q.md'), `---\nID: ${ULID_D}\n---\n\nq\n`)
    await refreshTree(root)
    failing.push('/P.md')
    const r = await settledMutate(root, { op: 'restore', bundlePath: bundle })
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade?.owed).toBe(true)
    const [landed = '', entry] =
      Object.entries(await readNotes(root)).find(([, e]) => e.kind === 'relink' && e.files) ?? []
    expect(entry).toMatchObject({ kind: 'relink', files: [`${landed}/P.md`, `${landed}/Q.md`] })
    return { landed, p: abs(landed, 'P.md') }
  }

  it('a restore’s repair of its own files owes what it missed', async () => {
    const { landed, p } = await repairMissed()
    expect(landed).not.toBe('Notes/Deep')
    failing.length = 0
    await finishOwed(root)
    expect(await readFile(p, 'utf8')).not.toContain('[[Deep/Q]]')
    expect(await readNotes(root)).toEqual({})
  })

  it('a restore’s owed repair follows its files through a rename', async () => {
    const { landed } = await repairMissed()
    const moved = await settledMutate(root, {
      op: 'rename',
      path: landed,
      kind: 'set',
      newName: 'Moved',
    })
    if (!moved.ok) throw new Error(moved.error.message)
    failing.length = 0
    await finishOwed(root)
    expect(await readFile(abs('Notes', 'Moved', 'P.md'), 'utf8')).toContain('See [[Moved/Q|Q]].')
    expect(await readNotes(root)).toEqual({})
  })

  it('a landed file gone before the finish leaves the repair’s entry', async () => {
    const { p } = await repairMissed()
    await rm(p)
    await refreshTree(root)
    await finishOwed(root)
    expect(await readNotes(root)).toEqual({})
  })

  // A Context whose Space links its sibling, trashed and restored as “Areas (2)” beside a new Context under its title, its Space’s re-key missed.
  const rekeyMissed = async (): Promise<void> => {
    const work = abs('.nexus', 'contexts', 'Areas', 'Work', '_space.json')
    await putJson(abs('.nexus', 'contexts', 'contexts.json'), {
      contexts: [{ id: 'ctx_areas', title: 'Areas' }],
    })
    await putJson(work, { id: 'sp_w', '<Areas>': ['Home'] })
    await putJson(abs('.nexus', 'contexts', 'Areas', 'Home', '_space.json'), { id: 'sp_h' })
    await refreshTree(root)
    const bundle = bundleOf(
      await settledMutate(root, { op: 'delete', path: '.nexus/contexts/Areas', kind: 'context' }),
    )
    await putJson(abs('.nexus', 'contexts', 'contexts.json'), {
      contexts: [{ id: 'ctx_new', title: 'Areas' }],
    })
    await mkdir(abs('.nexus', 'contexts', 'Areas'))
    await refreshTree(root)
    failing.push('Areas (2)/Work/_space.json')
    const r = await settledMutate(root, { op: 'restore', bundlePath: bundle })
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade?.owed).toBe(true)
    expect(Object.values(await readNotes(root))).toContainEqual(
      expect.objectContaining({ kind: 'relink', rekey: ['Areas', 'Areas (2)'] }),
    )
  }

  it('a Context restored under a new title owes the re-key a Space sidecar missed', async () => {
    await rekeyMissed()
    failing.length = 0
    await finishOwed(root)
    const rekeyed = abs('.nexus', 'contexts', 'Areas (2)', 'Work', '_space.json')
    expect(await readJsonAt(rekeyed)).toMatchObject({ '<Areas (2)>': ['Home'] })
    expect(await readNotes(root)).toEqual({})
  })

  it('a restored Context’s owed re-key follows its Space through a rename', async () => {
    await rekeyMissed()
    const moved = await settledMutate(root, { op: 'renameSpace', spaceId: 'sp_w', newName: 'Job' })
    if (!moved.ok) throw new Error(moved.error.message)
    failing.length = 0
    await finishOwed(root)
    const rekeyed = abs('.nexus', 'contexts', 'Areas (2)', 'Job', '_space.json')
    expect(await readJsonAt(rekeyed)).toMatchObject({ '<Areas (2)>': ['Home'] })
    expect(await readNotes(root)).toEqual({})
  })

  it('a restored Context’s owed re-key follows it through a rename', async () => {
    await rekeyMissed()
    const moved = await settledMutate(root, {
      op: 'renameContext',
      contextId: 'ctx_areas',
      newName: 'Life',
    })
    if (!moved.ok) throw new Error(moved.error.message)
    failing.length = 0
    await finishOwed(root)
    const rekeyed = abs('.nexus', 'contexts', 'Life', 'Work', '_space.json')
    expect(await readJsonAt(rekeyed)).toMatchObject({ '<Life>': ['Home'] })
    expect(await readNotes(root)).toEqual({})
  })
})

describe('an item moved out of a store by hand', () => {
  const LINKER = ULID_C
  const linker = (): string => abs('Notes', 'Linker.md')
  const keys = async () => splitFrontmatter(await readFile(linker(), 'utf8'))
  const trashed = async () => bundles.listBundles(root, { kind: 'trash' })
  const removed = async (path: string, kind: 'page' | 'set', op: 'delete' | 'archive') => {
    const r = await settledMutate(root, { op, path, kind })
    expect(r.ok, `${op} ${path}`).toBe(true)
    return op === 'delete'
      ? bundleOf(r)
      : (await bundles.listBundles(root, { kind: 'archive', id: 'c1' }))[0].bundlePath
  }
  const movedOut = async (from: string, ...to: string[]): Promise<void> => {
    await mkdir(abs(...to.slice(0, -1)), { recursive: true })
    await rename(abs(from), abs(...to))
  }
  const dragged = async (from: string, ...to: string[]): Promise<void> => {
    await movedOut(from, ...to)
    await applyEvents(root, [ev('unlink', from), ev('add', ...to)])
    await settleNow(pusher, root)
  }
  const relinkNotes = async (): Promise<string> =>
    JSON.stringify(Object.entries(await readNotes(root)).filter(([, e]) => e.kind === 'relink'))

  beforeEach(async () => {
    installStores(memoryStores().stores)
    await seedNexus(root, {
      defs: [
        { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
        { id: 'prop_see', label: 'See', key: 'See', type: 'link' },
      ],
    })
    await writeFile(
      abs('Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'c1', properties: ['prop_related', 'prop_see'] }),
    )
    await mkdir(abs('Notes', 'Daily'))
    await writeFile(abs('Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 's-daily' }))
    await writeFile(abs('Notes', 'Daily', 'Alpha.md'), `---\nID: ${ULID_B}\n---\n\nalpha\n`)
    await writeFile(abs('Notes', 'Daily', 'Beta.md'), `---\nID: ${ULID_D}\n---\n\nbeta\n`)
    await writeFile(
      linker(),
      `---\nID: ${LINKER}\nRelated: "[[Alpha]]"\nSee: "[[Beta]]"\n---\n\n[[Notes/Daily/Beta]]\n`,
    )
    recordHanded(await refreshTree(root))
    await indexSeed.seedContentIndex(root)
  })
  afterEach(() => installStores(NO_STORES))

  it('a page moved out of the Trash while the app runs finishes as its restore', async () => {
    const bundle = await removed('Notes/Daily/Alpha.md', 'page', 'delete')
    expect((await keys()).Related).toBeUndefined()
    await dragged(`${bundle}/Alpha.md`, 'Notes', 'Alpha.md')
    expect((await keys()).Related).toBe('[[Alpha]]')
    expect(await pathExists(abs(bundle))).toBe(false)
    expect(await relinkNotes()).not.toContain('.trash')
  })

  it('a page moved out of the Trash while the app was closed finishes as its restore at the next open', async () => {
    const bundle = await removed('Notes/Daily/Alpha.md', 'page', 'delete')
    dropLiveTree()
    closeSession()
    await movedOut(`${bundle}/Alpha.md`, 'Notes', 'Alpha.md')
    await openSession(root)
    recordHanded(await refreshTree(root))
    oweSeen(root, await indexSeed.seedContentIndex(root))
    await settleNow(pusher, root)
    expect((await keys()).Related).toBe('[[Alpha]]')
    expect(await pathExists(abs(bundle))).toBe(false)
  })

  it('a page moved out of a trashed Set’s bundle takes back its own share, the Set’s row staying', async () => {
    const bundle = await removed('Notes/Daily', 'set', 'delete')
    await dragged(`${bundle}/Daily/Alpha.md`, 'Notes', 'Alpha.md')
    expect((await keys()).Related).toBe('[[Alpha]]')
    expect((await keys()).See).toBeUndefined()
    expect((await trashed()).map((b) => b.bundlePath)).toEqual([bundle])
    expect(await readRecord(abs(bundle))).toMatchObject({
      links: [{ page: LINKER, property: 'prop_see', value: '[[Beta]]' }],
    })
  })

  it('a page moved out of an Archive by hand finishes as the Archive’s restore', async () => {
    const bundle = await removed('Notes/Daily/Beta.md', 'page', 'archive')
    await dragged(`${bundle}/Beta.md`, 'Notes', 'Daily', 'Beta.md')
    expect(await pathExists(abs(bundle))).toBe(false)
    expect(splitEnvelope(await readFile(linker(), 'utf8')).body).toBe('[[Notes/Daily/Beta]]\n')
  })

  it('a page of a moved-out Set whose events land a settle after its bundle was spent keeps the Link values naming it', async () => {
    await writeFile(linker(), `---\nID: ${LINKER}\nSee: "[[Notes/Daily/Beta]]"\n---\n\nlinker\n`)
    recordHanded(await refreshTree(root))
    const bundle = await removed('Notes/Daily', 'set', 'delete')
    await movedOut(`${bundle}/Daily`, 'Notes', 'Weekly')
    await applyEvents(root, [
      ev('addDir', 'Notes', 'Weekly'),
      ev('add', 'Notes', 'Weekly', '_pageset.json'),
      ev('unlink', bundle, 'Daily', 'Alpha.md'),
      ev('add', 'Notes', 'Weekly', 'Alpha.md'),
    ])
    await settleNow(pusher, root)
    expect(await pathExists(abs(bundle))).toBe(false)
    await applyEvents(root, [
      ev('unlink', bundle, 'Daily', 'Beta.md'),
      ev('add', 'Notes', 'Weekly', 'Beta.md'),
    ])
    await settleNow(pusher, root)
    expect((await keys()).See).toBe('[[Notes/Weekly/Beta|Beta]]')
  })

  it('a copy out of the Trash stays a page of its own, its bundle whole', async () => {
    const bundle = await removed('Notes/Daily/Alpha.md', 'page', 'delete')
    await copyFile(abs(bundle, 'Alpha.md'), abs('Notes', 'Alpha.md'))
    await applyEvents(root, [ev('add', 'Notes', 'Alpha.md')])
    await settleNow(pusher, root)
    expect((await trashed()).map((b) => b.bundlePath)).toEqual([bundle])
    expect((await keys()).Related).toBeUndefined()
  })

  it('after an index rebuild, a page moved out while the app was closed returns live and current without its delete’s Link values, its bundle unlisted', async () => {
    await writeFile(
      abs('Notes', 'Daily', 'Alpha.md'),
      `---\nID: ${ULID_B}\nSee: "[[Beta]]"\n---\n\nalpha\n`,
    )
    recordHanded(await refreshTree(root))
    const bundle = await removed('Notes/Daily/Alpha.md', 'page', 'delete')
    expect((await renameProperty(root, 'prop_see', 'Seen')).ok).toBe(true)
    await settleNow(pusher, root)
    dropLiveTree()
    closeSession()
    await movedOut(`${bundle}/Alpha.md`, 'Notes', 'Alpha.md')
    installStores(memoryStores().stores)
    await openSession(root)
    recordHanded(await refreshTree(root))
    oweSeen(root, await indexSeed.seedContentIndex(root))
    await settleNow(pusher, root)
    expect(heldTreeOf(root)?.collections[0].pages.map((p) => p.title)).toContain('Alpha')
    expect(splitFrontmatter(await readFile(abs('Notes', 'Alpha.md'), 'utf8')).Seen).toBe('[[Beta]]')
    expect((await keys()).Related).toBeUndefined()
    expect(await trashed()).toEqual([])
  })

  describe('a Space or Context moved back', () => {
    const work = (...segs: string[]): string[] => ['.nexus', 'contexts', 'Areas', 'Work', ...segs]
    const alpha = async () =>
      splitFrontmatter(await readFile(abs('Notes', 'Daily', 'Alpha.md'), 'utf8'))
    const deleted = async (kind: 'space' | 'context', ...segs: string[]): Promise<string> => {
      const r = await settledMutate(root, { op: 'delete', path: join(...segs), kind })
      expect(r.ok).toBe(true)
      return bundleOf(r)
    }

    beforeEach(async () => {
      await putJson(contextsRegistryFile(root), { contexts: [{ id: 'ctx_areas', title: 'Areas' }] })
      await mkdir(abs(...work()), { recursive: true })
      await writeFile(abs(...work('_space.json')), JSON.stringify({ id: 'sp-work' }))
      await writeFile(
        abs('Notes', 'Daily', 'Alpha.md'),
        `---\nID: ${ULID_B}\n<Areas>:\n  - Work\n---\n\nalpha\n`,
      )
      recordHanded(await refreshTree(root))
      await indexSeed.seedContentIndex(root)
    })

    it('a Space moved back into its Context’s folder by hand finishes as its restore, tagging its members again', async () => {
      const bundle = await deleted('space', ...work())
      expect((await alpha())['<Areas>']).toBeUndefined()
      await putJson(abs(OWED_REL), {
        'sp-work': { kind: 'space', contextId: 'ctx_areas', strip: ['Work'], bundle },
      })
      await rename(abs(bundle, 'Work'), abs(...work()))
      await applyEvents(root, [
        ev('unlinkDir', bundle, 'Work'),
        ev('addDir', ...work()),
        ev('add', ...work('_space.json')),
      ])
      await settleNow(pusher, root)
      expect((await alpha())['<Areas>']).toEqual(['Work'])
      expect(await pathExists(abs(bundle))).toBe(false)
      expect((await readNotes(root))['sp-work']).toEqual({
        kind: 'space',
        contextId: 'ctx_areas',
        rename: ['Work'],
      })
    })

    it('a Space copied back stays a Space of its own, its bundle whole', async () => {
      const bundle = await deleted('space', ...work())
      await mkdir(abs(...work()))
      await copyFile(abs(bundle, 'Work', '_space.json'), abs(...work('_space.json')))
      await applyEvents(root, [ev('addDir', ...work()), ev('add', ...work('_space.json'))])
      await settleNow(pusher, root)
      expect((await trashed()).map((b) => b.bundlePath)).toEqual([bundle])
      expect((await alpha())['<Areas>']).toBeUndefined()
    })

    it('a Context moved back by hand stays a plain arrival', async () => {
      const bundle = await deleted('context', '.nexus', 'contexts', 'Areas')
      await rename(abs(bundle, 'Areas'), abs('.nexus', 'contexts', 'Areas'))
      await applyEvents(root, [
        ev('unlinkDir', bundle, 'Areas'),
        ev('addDir', '.nexus', 'contexts', 'Areas'),
        ev('addDir', ...work()),
        ev('add', ...work('_space.json')),
      ])
      await settleNow(pusher, root)
      const registry = await readJsonAt<{ contexts: { title: string }[] }>(
        contextsRegistryFile(root),
      )
      expect(registry.contexts.map((c) => c.title)).not.toContain('Areas')
      expect(heldTreeOf(root)?.contexts.map((g) => g.def.title)).not.toContain('Areas')
      expect(await readRecord(abs(bundle))).toMatchObject({ entity: 'context' })
    })
  })
})
