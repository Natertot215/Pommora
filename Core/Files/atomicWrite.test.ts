import { stableStringify } from './stableJson'
import { ok } from '../Contract/result'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rm, mkdir, readFile, readdir, writeFile, stat, utimes } from 'node:fs/promises'
import { dirname, join, basename } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import {
  atomicWriteBinary,
  atomicWriteFile,
  editJsonStrict,
  landBytes,
  rewritePageSerialized,
  writeJson,
  readJsonStrict,
  rmwJsonStrict,
  readAppFile,
  readKept,
  setRepairSeed,
  updateNexusConfig,
  relocate,
  rewritePreservingTimes,
  updateNexusFile,
} from './atomicWrite'
import { discardFile, mintBundle, trashFileFlat } from '../Trash/bundle'
import { type FileEvent, isRecentWrite, setOwnTap, setWriteTap } from './writeEcho'
import { machine } from '../Platform/machine'

let dir: string
beforeEach(async () => {
  dir = tempRoot('pom-io-')
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('atomicWriteFile', () => {
  it('writes and overwrites a file', async () => {
    const p = join(dir, 'a.txt')
    await atomicWriteFile(p, 'first')
    expect(await readFile(p, 'utf8')).toBe('first')
    await atomicWriteFile(p, 'second')
    expect(await readFile(p, 'utf8')).toBe('second')
  })
})

describe('rewritePageSerialized', () => {
  it("keeps the file's modification time — a same-size rewrite included", async () => {
    const file = join(dir, 'p.md')
    await writeFile(file, '---\nStatus: Old\n---\nbody\n')
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(file, past, past)
    expect(await rewritePageSerialized(file, (c) => c.replace('Old', 'New'))).toBe(true)
    expect(await readFile(file, 'utf8')).toContain('Status: New')
    expect(Math.floor((await stat(file)).mtimeMs / 1000)).toBe(Math.floor(past.getTime() / 1000))
  })
})

describe('stableStringify', () => {
  it('is deterministic regardless of key insertion order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
  })

  it('sorts nested object keys but preserves array order', () => {
    expect(stableStringify({ z: { y: 1, x: 2 }, list: [3, 1, 2] })).toBe(
      '{\n  "list": [\n    3,\n    1,\n    2\n  ],\n  "z": {\n    "x": 2,\n    "y": 1\n  }\n}',
    )
  })
})

describe('writeJson', () => {
  it('writes sorted JSON with a trailing newline that parses back', async () => {
    const p = join(dir, 'c.json')
    const value = { b: 1, a: { d: 4, c: 3 } }
    await writeJson(p, value)
    const text = await readFile(p, 'utf8')
    expect(text.endsWith('\n')).toBe(true)
    expect(JSON.parse(text)).toEqual(value)
    expect(text).toBe(`${stableStringify(value)}\n`)
  })
})

describe('readJsonStrict', () => {
  it('a leading BOM is encoding, not corruption', async () => {
    const p = join(dir, 'bom.json')
    await writeFile(p, '\uFEFF{"a":1}')
    expect(await readJsonStrict(p)).toEqual(ok({ a: 1 }))
  })
})

describe('rmwJsonStrict', () => {
  it('read-modify-writes an existing file, preserving sibling keys', async () => {
    const p = join(dir, 'state.json')
    await writeJson(p, { count: 1, keep: 'me' })
    const written = await rmwJsonStrict(p, (cur) => ({ ...cur, count: 2 }))
    expect(written.ok).toBe(true)
    expect(await readJsonAt(p)).toEqual({ count: 2, keep: 'me' })
  })

  it('seeds a missing file when a seed is given', async () => {
    const p = join(dir, 'absent.json')
    const written = await rmwJsonStrict(
      p,
      (cur) => ({ ...cur, added: true }),
      () => ({ seed: 1 }),
    )
    expect(written.ok).toBe(true)
    expect(await readJsonAt(p)).toEqual({ seed: 1, added: true })
  })

  it('fails on a missing file without a seed, writing nothing', async () => {
    const p = join(dir, 'absent.json')
    const written = await rmwJsonStrict(p, (cur) => cur)
    expect(written.ok).toBe(false)
    if (!written.ok) expect(written.error.code).toBe('not-found')
    await expect(stat(p)).rejects.toThrow()
  })

  it('fails on corrupt JSON and leaves the file byte-identical — a seed never applies', async () => {
    const p = join(dir, 'corrupt.json')
    await writeFile(p, '{ not valid', 'utf8')
    const written = await rmwJsonStrict(
      p,
      (cur) => ({ ...cur, n: 1 }),
      () => ({}),
    )
    expect(written.ok).toBe(false)
    if (!written.ok) expect(written.error.code).toBe('operation-failed')
    expect(await readFile(p, 'utf8')).toBe('{ not valid')
  })

  it('fails on a non-object file and leaves it byte-identical', async () => {
    const p = join(dir, 'array.json')
    await writeFile(p, '[1, 2]', 'utf8')
    const written = await rmwJsonStrict(
      p,
      (cur) => cur,
      () => ({}),
    )
    expect(written.ok).toBe(false)
    expect(await readFile(p, 'utf8')).toBe('[1, 2]')
  })
})

describe('editJsonStrict', () => {
  const bump = (cur: Record<string, unknown>) => ({ ...cur, n: 2 })

  it('an absent path stays absent and no folder is created', async () => {
    const p = join(dir, 'missing', 'a.json')
    expect(await editJsonStrict(p, bump)).toBe('absent')
    await expect(stat(dirname(p))).rejects.toThrow()
  })

  it('a corrupt file stays byte-identical and nothing is set aside', async () => {
    const p = join(dir, 'a.json')
    await writeFile(p, '{nope')
    expect(await editJsonStrict(p, bump)).toBe('corrupt')
    expect(await readFile(p, 'utf8')).toBe('{nope')
    expect((await readdir(dir)).filter((f) => f.includes('.bad-'))).toEqual([])
  })

  it('an unreadable path writes nothing', async () => {
    const p = join(dir, 'a.json')
    await mkdir(p)
    expect(await editJsonStrict(p, bump)).toBe('unreadable')
    expect((await stat(p)).isDirectory()).toBe(true)
  })

  it('an unchanged edit re-dates nothing', async () => {
    const p = join(dir, 'a.json')
    await writeJson(p, { n: 1 })
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(p, past, past)
    expect(await editJsonStrict(p, () => null)).toBe('unchanged')
    expect(Math.floor((await stat(p)).mtimeMs / 1000)).toBe(Math.floor(past.getTime() / 1000))
  })

  it('a written edit becomes the last read', async () => {
    const p = join(dir, 'a.json')
    await writeJson(p, { n: 1 })
    expect(await editJsonStrict(p, bump)).toBe('written')
    await writeFile(p, '{ corrupt')
    expect(await readAppFile(p)).toEqual({ n: 2 })
  })
})

describe('readAppFile and a repairable updateNexusFile', () => {
  const damage = (file: string) => writeFile(file, '{ corrupt')
  const aside = async (file: string) =>
    (await readdir(dirname(file))).find((f) => f.startsWith(`.${basename(file)}.bad-`))

  it('a damaged file reads as the last write, and the next write rebuilds from it', async () => {
    const file = join(dir, 'state.json')
    await updateNexusFile(file, () => ({ order: ['a'] }), true)
    await damage(file)
    expect(await readAppFile(file)).toEqual({ order: ['a'] })
    await updateNexusFile(file, (cur) => ({ ...cur, pinned: ['p'] }), true)
    expect(await readJsonAt(file)).toEqual({ order: ['a'], pinned: ['p'] })
    expect(await readFile(join(dir, (await aside(file)) ?? ''), 'utf8')).toBe('{ corrupt')
  })

  it('a repair lands the last read even when the write finds nothing to change', async () => {
    const file = join(dir, 'state.json')
    await writeFile(file, JSON.stringify({ order: ['a'] }))
    await readAppFile(file)
    await damage(file)
    await updateNexusFile(file, () => null, true)
    expect(await readJsonAt(file)).toEqual({ order: ['a'] })
  })

  it('a file never read cleanly rebuilds from the repair seed, and a deleted one reads as absent', async () => {
    const file = join(dir, 'state.json')
    await writeFile(file, JSON.stringify({ order: ['old'] }))
    await readAppFile(file)
    await rm(file)
    expect(await readAppFile(file)).toBeNull()
    await damage(file)
    setRepairSeed((abs) => (abs === file ? { order: ['synced'] } : null))
    try {
      await updateNexusFile(file, (cur) => ({ ...cur, pinned: ['p'] }), true)
    } finally {
      setRepairSeed(null)
    }
    expect(await readJsonAt(file)).toEqual({ order: ['synced'], pinned: ['p'] })
  })

  it('readKept answers a file damaged after a clean read with that read', async () => {
    const file = join(dir, 'settings.json')
    await writeFile(file, JSON.stringify({ a: 1 }))
    await readKept(file)
    await damage(file)
    expect(await readKept(file)).toEqual({ a: 1 })
  })

  it('a file read absent then damaged reads null, and a write still rebuilds it from the repair seed', async () => {
    const file = join(dir, 'state.json')
    expect(await readKept(file)).toBeNull()
    await damage(file)
    expect(await readKept(file)).toBeNull()
    expect(await readAppFile(file)).toBeNull()
    setRepairSeed((abs) => (abs === file ? { order: ['synced'] } : null))
    try {
      await updateNexusFile(file, (cur) => ({ ...cur, pinned: ['p'] }), true)
    } finally {
      setRepairSeed(null)
    }
    expect(await readJsonAt(file)).toEqual({ order: ['synced'], pinned: ['p'] })
  })

  it('a damaged file this session never saw fails readKept by name and reads empty through readAppFile', async () => {
    const file = join(dir, 'settings.json')
    await damage(file)
    await expect(readKept(file)).rejects.toThrow('Couldn’t read “settings.json”.')
    expect(await readAppFile(file)).toBeNull()
  })

  it('a hand-authored file keeps the copy its last write landed', async () => {
    expect((await updateNexusConfig(dir, 'settings', () => ({ excluded: ['X'] }))).ok).toBe(true)
    const file = join(dir, '.nexus', 'settings.json')
    await damage(file)
    expect(await readKept(file)).toEqual({ excluded: ['X'] })
  })

  it('a file that refuses repair leaves its damaged copy in place', async () => {
    const file = join(dir, 'settings.json')
    await damage(file)
    expect((await updateNexusFile(file, () => ({ a: 1 }), false)).ok).toBe(false)
    expect(await readFile(file, 'utf8')).toBe('{ corrupt')
    expect(await aside(file)).toBeUndefined()
  })
})

describe('mintBundle', () => {
  it('creates the bundle under the mirrored chain while the source stays live', async () => {
    await mkdir(join(dir, 'Notes', 'Daily'), { recursive: true })
    const p = join(dir, 'Notes', 'Daily', 'Beta.md')
    await atomicWriteFile(p, 'bye')
    const bundle = await mintBundle(dir, p)
    expect(dirname(bundle)).toBe(join(dir, '.trash', 'Notes', 'Daily'))
    expect(basename(bundle).endsWith('__Beta.md.deleted')).toBe(true)
    expect((await stat(bundle)).isDirectory()).toBe(true)
    expect(await readFile(p, 'utf8')).toBe('bye')
  })

  it('de-collides within one timestamp — two mints never share a bundle', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
    try {
      const p = join(dir, 'twice.md')
      const first = await mintBundle(dir, p)
      const second = await mintBundle(dir, p)
      expect(second).not.toBe(first)
      expect(basename(second)).toBe('2026-08-01T12-00-00-000Z__1__twice.md.deleted')
    } finally {
      vi.useRealTimers()
    }
  })

  it('lands flat when the source is not under the root', async () => {
    const outside = tempRoot('pom-out-')
    try {
      const bundle = await mintBundle(dir, join(outside, 'Stray.md'))
      expect(dirname(bundle)).toBe(join(dir, '.trash'))
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })
})

describe('relocate', () => {
  it('moves the artifact in under its original basename and clears the original', async () => {
    const p = join(dir, '12__Notes.md')
    await atomicWriteFile(p, 'bye')
    const bundle = await mintBundle(dir, p)
    const dest = join(bundle, '12__Notes.md')
    await relocate(p, dest)
    expect(await readFile(dest, 'utf8')).toBe('bye')
    await expect(stat(p)).rejects.toThrow()
  })

  it('rejects when the source vanished — the caller surfaces it', async () => {
    const p = join(dir, 'ghost.md')
    const bundle = await mintBundle(dir, p)
    await expect(relocate(p, join(bundle, 'ghost.md'))).rejects.toThrow()
  })
})

describe('trashFileFlat', () => {
  it('moves a file into .trash under a stamped leaf and removes the original', async () => {
    const p = join(dir, 'doomed.md')
    await atomicWriteFile(p, 'bye')
    const dest = await trashFileFlat(dir, p)
    expect(dest).toContain('.trash')
    expect(await readFile(dest, 'utf8')).toBe('bye')
    await expect(stat(p)).rejects.toThrow()
  })

  it('records both ends of the move', async () => {
    const p = join(dir, 'reported.md')
    await atomicWriteFile(p, 'bye')
    const seen: string[] = []
    setWriteTap({ wrote: (w) => seen.push(w), renamed: () => {} })
    const dest = await trashFileFlat(dir, p)
    setWriteTap(null)
    expect(seen).toEqual([p, dest])
  })

  it('mirrors the folder chain the file was deleted from', async () => {
    await mkdir(join(dir, 'Notes', 'Daily'), { recursive: true })
    const p = join(dir, 'Notes', 'Daily', 'Beta.md')
    await atomicWriteFile(p, 'bye')
    const dest = await trashFileFlat(dir, p)
    expect(dest.startsWith(join(dir, '.trash', 'Notes', 'Daily'))).toBe(true)
    expect(basename(dest).endsWith('__Beta.md')).toBe(true)
    expect(await readFile(dest, 'utf8')).toBe('bye')
  })

  it('de-collides two trashes of the same name from the same folder', async () => {
    const p = join(dir, 'twice.md')
    await atomicWriteFile(p, 'one')
    const first = await trashFileFlat(dir, p)
    await atomicWriteFile(p, 'two')
    const second = await trashFileFlat(dir, p)
    expect(second).not.toBe(first)
    expect(await readFile(first, 'utf8')).toBe('one')
    expect(await readFile(second, 'utf8')).toBe('two')
  })
})

describe('landBytes', () => {
  it('records no echo and stamps the given mtime', async () => {
    const p = join(dir, 'landed.md')
    const when = 1600000000000
    await landBytes(p, new TextEncoder().encode('arrived'), when)
    expect(isRecentWrite(p)).toBe(false)
    expect((await stat(p)).mtimeMs).toBe(when)
    expect(await readFile(p, 'utf8')).toBe('arrived')
  })
})

describe('the own tap', () => {
  const noted: { ev: FileEvent; text: string | null; mtimeMs: number | null }[] = []
  beforeEach(() => {
    noted.length = 0
    setOwnTap(async (ev) => {
      const st = await stat(ev.absPath).catch(() => null)
      const text = st?.isFile() ? await readFile(ev.absPath, 'utf8') : null
      noted.push({ ev, text, mtimeMs: st?.mtimeMs ?? null })
    })
  })
  afterEach(() => setOwnTap(null))

  it('notes one change carrying its text, once the file holds it', async () => {
    const p = join(dir, 'a.md')
    await atomicWriteFile(p, 'first')
    expect(noted).toEqual([
      {
        ev: { event: 'change', absPath: p, origin: 'own', text: 'first', bodyOnly: false },
        text: 'first',
        mtimeMs: expect.any(Number),
      },
    ])
  })

  it('notes a preserved-time rewrite after the file keeps its old time', async () => {
    const p = join(dir, 'p.md')
    await writeFile(p, 'old')
    const past = new Date('2020-06-01T12:00:00Z')
    await utimes(p, past, past)
    await rewritePreservingTimes(p, 'new')
    expect(noted).toHaveLength(1)
    expect(noted[0].ev).toEqual({ event: 'change', absPath: p, origin: 'own', text: 'new' })
    expect(noted[0].text).toBe('new')
    expect(Math.floor((noted[0].mtimeMs ?? 0) / 1000)).toBe(Math.floor(past.getTime() / 1000))
  })

  it('notes a binary write as an add', async () => {
    const p = join(dir, 'x.png')
    await atomicWriteBinary(p, new TextEncoder().encode('bytes'))
    expect(noted.map((n) => n.ev)).toEqual([{ event: 'add', absPath: p, origin: 'own' }])
  })

  it('notes a relocate as a move, with the source free for the tap to lock', async () => {
    const from = join(dir, 'from.md')
    const to = join(dir, 'to.md')
    await writeFile(from, 'moving')
    const locked: string[] = []
    setOwnTap((ev) =>
      ev.event === 'move'
        ? machine().lock(ev.from, async () => {
            locked.push(ev.from)
          })
        : Promise.resolve(),
    )
    await relocate(from, to)
    expect(locked).toEqual([from])
    expect(await readFile(to, 'utf8')).toBe('moving')
  })

  it('notes a discard as an unlink', async () => {
    const p = join(dir, 'gone.md')
    await writeFile(p, 'bye')
    await discardFile(dir, p, { trashMode: 'nexus', trashToSystem: async () => {} })
    expect(noted.map((n) => n.ev)).toEqual([{ event: 'unlink', absPath: p, origin: 'own' }])
    expect(noted[0].text).toBeNull()
  })

  it('with no tap set, a write lands as before', async () => {
    setOwnTap(null)
    const p = join(dir, 'quiet.md')
    await atomicWriteFile(p, 'quiet')
    expect(await readFile(p, 'utf8')).toBe('quiet')
    expect(noted).toEqual([])
  })
})
