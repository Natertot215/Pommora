import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, mkdir, readFile, writeFile, stat, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, basename } from 'node:path'
import {
  atomicWriteFile,
  rewritePageSerialized,
  writeJson,
  rmwJsonStrict,
  stableStringify,
  mintBundle,
  settleBundle,
  trashFileFlat,
} from './atomicWrite'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pom-io-'))
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
  // A rewrite is a write the user did not make to that page, and mtime is Last Modified.
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

describe('rmwJsonStrict', () => {
  it('read-modify-writes an existing file, preserving sibling keys', async () => {
    const p = join(dir, 'state.json')
    await writeJson(p, { count: 1, keep: 'me' })
    const written = await rmwJsonStrict(p, (cur) => ({ ...cur, count: 2 }))
    expect(written.ok).toBe(true)
    expect(JSON.parse(await readFile(p, 'utf8'))).toEqual({ count: 2, keep: 'me' })
  })

  it('seeds a missing file when a seed is given', async () => {
    const p = join(dir, 'absent.json')
    const written = await rmwJsonStrict(
      p,
      (cur) => ({ ...cur, added: true }),
      () => ({ seed: 1 }),
    )
    expect(written.ok).toBe(true)
    expect(JSON.parse(await readFile(p, 'utf8'))).toEqual({ seed: 1, added: true })
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

describe('mintBundle', () => {
  it('creates the bundle under the mirrored chain while the source stays live', async () => {
    await mkdir(join(dir, 'Notes', 'Daily'), { recursive: true })
    const p = join(dir, 'Notes', 'Daily', 'Beta.md')
    await atomicWriteFile(p, 'bye')
    const bundle = await mintBundle(dir, p)
    expect(dirname(bundle)).toBe(join(dir, '.trash', 'Notes', 'Daily'))
    expect(basename(bundle).endsWith('__Beta.md.deleted')).toBe(true)
    expect((await stat(bundle)).isDirectory()).toBe(true)
    // Nothing destructive has happened yet — that is the whole point of minting first.
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
    const outside = await mkdtemp(join(tmpdir(), 'pom-out-'))
    try {
      const bundle = await mintBundle(dir, join(outside, 'Stray.md'))
      expect(dirname(bundle)).toBe(join(dir, '.trash'))
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })
})

describe('settleBundle', () => {
  it('moves the artifact in under its original basename and clears the original', async () => {
    const p = join(dir, '12__Notes.md')
    await atomicWriteFile(p, 'bye')
    const bundle = await mintBundle(dir, p)
    const dest = await settleBundle(bundle, p)
    expect(dest).toBe(join(bundle, '12__Notes.md'))
    expect(await readFile(dest, 'utf8')).toBe('bye')
    await expect(stat(p)).rejects.toThrow()
  })

  it('rejects when the source vanished — the caller surfaces it', async () => {
    const p = join(dir, 'ghost.md')
    const bundle = await mintBundle(dir, p)
    await expect(settleBundle(bundle, p)).rejects.toThrow()
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
