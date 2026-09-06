import { describe, it, expect, beforeEach } from 'vitest'
import { installMachine, machine, type DirEntry, type FileStat, type Machine } from './machine'
import { dirname, join } from '../Paths/posix'
import { corpusFilesUnder, listEntries } from '../Files/walk'
import {
  atomicWriteFile,
  readJsonStrict,
  readTextOrNull,
  rewritePageSerialized,
  rewritePreservingTimes,
  writeJson,
} from '../Files/atomicWrite'

interface Entry {
  text: string
  mtimeMs: number
}

let files: Map<string, Entry>
let dirs: Set<string>
let clock: number

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const memoryMachine = (): Machine => {
  const held = new Set<string>()
  const chains = new Map<string, Promise<unknown>>()
  const put = (p: string, text: string): void => {
    files.set(p, { text, mtimeMs: ++clock })
  }
  return {
    readText: async (p) => files.get(p)?.text ?? null,
    readBytes: async (p) => {
      const e = files.get(p)
      return e ? encoder.encode(e.text) : null
    },
    writeText: async (p, text) => put(p, text),
    writeBytes: async (p, bytes) => put(p, decoder.decode(bytes)),
    writeRaw: async (p, text, mtimeMs) => {
      files.set(p, { text, mtimeMs })
    },
    stat: async (p): Promise<FileStat | null> => {
      const e = files.get(p)
      if (e)
        return { size: e.text.length, mtimeMs: e.mtimeMs, birthtimeMs: null, isDirectory: false }
      return dirs.has(p) ? { size: 0, mtimeMs: 0, birthtimeMs: null, isDirectory: true } : null
    },
    readDir: async (p): Promise<DirEntry[]> => {
      const out: DirEntry[] = []
      for (const d of dirs)
        if (dirname(d) === p) out.push({ name: d.slice(p.length + 1), kind: 'dir' })
      for (const f of files.keys())
        if (dirname(f) === p) out.push({ name: f.slice(p.length + 1), kind: 'file' })
      return out
    },
    mkdir: async (p) => {
      if (dirs.has(p)) return 'exists'
      dirs.add(p)
      return 'created'
    },
    rename: async (from, to) => {
      const e = files.get(from)
      if (!e) throw new Error(`ENOENT ${from}`)
      files.delete(from)
      files.set(to, e)
    },
    remove: async (p) => {
      files.delete(p)
      dirs.delete(p)
    },
    utimes: async (p, mtimeMs) => {
      const e = files.get(p)
      if (e) e.mtimeMs = mtimeMs
    },
    realpath: async (p) => p,
    lock: (key, fn) => {
      if (held.has(key)) return Promise.reject(new Error(`Re-entrant file lock on ${key}`))
      const run = async () => {
        held.add(key)
        try {
          return await fn()
        } finally {
          held.delete(key)
        }
      }
      const next = (chains.get(key) ?? Promise.resolve()).then(run, run)
      chains.set(
        key,
        next.catch(() => undefined),
      )
      return next
    },
    sha256Hex: (text) => `sha256:${text}`,
  }
}

const ROOT = '/nexus'
const SCOPE = { excluded: ['Hidden'], assetDir: '.nexus/assets' }

beforeEach(() => {
  files = new Map()
  dirs = new Set([ROOT, join(ROOT, 'Notes'), join(ROOT, 'Hidden'), join(ROOT, '.trash')])
  clock = 1000
  installMachine(memoryMachine())
  files.set(join(ROOT, 'Notes', 'A.md'), { text: '---\nID: x\n---\nbody\n', mtimeMs: 500 })
  files.set(join(ROOT, 'Hidden', 'B.md'), { text: 'hidden\n', mtimeMs: 500 })
  files.set(join(ROOT, '.trash', 'C.md'), { text: 'trashed\n', mtimeMs: 500 })
})

describe('Core over an in-memory machine', () => {
  it('walks the corpus through readDir, pruning what the scope excludes', async () => {
    expect(await corpusFilesUnder(ROOT, ROOT, SCOPE)).toEqual(['Notes/A.md'])
    expect((await listEntries(ROOT)).map((e) => e.name).sort()).toEqual([
      '.trash',
      'Hidden',
      'Notes',
    ])
    expect(await listEntries(join(ROOT, 'Missing'))).toEqual([])
  })

  it('writes and reads a page and a JSON file through the seam', async () => {
    const page = join(ROOT, 'Notes', 'A.md')
    expect(await rewritePageSerialized(page, (c) => `${c}more\n`)).toBe(true)
    expect(await readTextOrNull(page)).toBe('---\nID: x\n---\nbody\nmore\n')
    await writeJson(join(ROOT, 'Notes', '_pagecollection.json'), { id: 'c1' })
    const read = await readJsonStrict(join(ROOT, 'Notes', '_pagecollection.json'))
    expect(read.ok && read.value).toEqual({ id: 'c1' })
    expect(await readTextOrNull(join(ROOT, 'ghost.md'))).toBeNull()
  })

  it('a sweep rewrite keeps the modification time; a plain write moves it', async () => {
    const page = join(ROOT, 'Notes', 'A.md')
    await rewritePreservingTimes(page, 'swept\n')
    expect(files.get(page)).toEqual({ text: 'swept\n', mtimeMs: 500 })
    await atomicWriteFile(page, 'edited\n')
    expect(files.get(page)?.mtimeMs).toBeGreaterThan(500)
  })

  it('the lock refuses a re-take of a held key and nests different keys', async () => {
    const m = machine()
    await expect(m.lock('a', () => m.lock('a', async () => 'inner'))).rejects.toThrow(/Re-entrant/)
    await expect(m.lock('a', () => m.lock('b', async () => 'inner'))).resolves.toBe('inner')
    await expect(m.lock('a', async () => 'after')).resolves.toBe('after')
  })
})
