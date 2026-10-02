import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, open, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import type { Pushes } from '../Contract/bridge'
import type { Changed } from '../Files/writeEcho'
import * as indexSeed from '../Index/indexSeed'
import * as liveTree from './liveTree'
import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import * as readNexusModule from './readNexus'
import { readNexus } from './readNexus'
import * as adopt from './adopt'
import { atomicWriteFile } from '../Files/atomicWrite'
import { updatePageBody } from './page'
import { splitFrontmatter } from '../Files/pageFile'
import { ID_KEY } from './identityMark'
import { stabilize } from './treeStabilize'
import { applyEvents, oweCascade, owedFor, oweWalk } from './fileEvents'
import { settleNow, recordHanded, settleBatch } from './settle'
import type { NexusChange, NexusTree } from './tree'
import { applyDelta } from './treeDelta'
import * as session from './session'
import { closeSession, openSession, whileAdopting } from './session'
import { writeExcludedFolders } from '../Settings/settings'

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
  await mkdir(abs('.nexus', 'homepage'), { recursive: true })
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
      ev('change', '.nexus', 'homepage', '_tiles.json'),
      ev('change', '.nexus', 'homepage', '_tiles.json'),
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
    expect(payload('tiles:changed')).toEqual({ kind: 'homepage' })
  })

  it('merges a cascade’s pages and hosts with the batch’s, once each', async () => {
    await applyEvents(root, [
      ev('change', 'Notes', 'A.md'),
      ev('change', '.nexus', 'homepage', '_tiles.json'),
    ])
    oweCascade(
      root,
      ['Notes/A.md', 'Other/B.md'],
      [{ kind: 'homepage' }, { kind: 'space', id: 'sp1' }],
    )
    await settleNow(pusher, root)
    expect(payload('pages:changed')).toEqual(['Notes/A.md', 'Other/B.md'])
    expect(pushes.filter(([c]) => c === 'tiles:changed').map(([, v]) => v)).toEqual([
      { kind: 'homepage' },
      { kind: 'space', id: 'sp1' },
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
    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementationOnce(() => {
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
    const indexed = vi.spyOn(indexSeed, 'indexWrittenPage')
    await settleBatch(pusher, root, [
      ev('addDir', 'Bulk'),
      ...names.map((name) => ev('add', 'Bulk', name)),
    ])
    expect(heldTreeOf(root)?.collections.find((c) => c.path === 'Bulk')?.pages).toHaveLength(50)
    const times = new Map<string, number>()
    for (const [, file] of indexed.mock.calls) times.set(file, (times.get(file) ?? 0) + 1)
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
    seeding.open({ db: null, rels: [] })
    await first
    expect(firstDone).toBe(true)
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

  it('a reply while a batch applies stamps nothing the batch listed, and the window isn’t shown it as unreadable', async () => {
    await writeFile(abs('Notes', 'Bare.md'), 'bare\n')
    await writeFile(abs('Notes', 'Late.md'), 'late\n')
    const reached = gate<void>()
    const release = gate<void>()
    const read = readNexusModule.readPageRecord
    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementation(async (file, rel) => {
      if (rel === 'Notes/Late.md') {
        reached.open()
        await release.promise
      }
      return read(file, rel)
    })
    const batch = settleBatch(pusher, root, [
      ev('add', 'Notes', 'Bare.md'),
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
    const read = readNexusModule.readPageRecord
    let reads = 0
    vi.spyOn(readNexusModule, 'readPageRecord').mockImplementation(async (file, rel) => {
      const record = await read(file, rel)
      if (++reads === 2) {
        reached.open()
        await release.promise
      }
      return record
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
