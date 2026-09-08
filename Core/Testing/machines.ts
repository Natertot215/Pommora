import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'
import {
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { dirname } from '../Paths/posix'
import type { DirEntry, FileStat, Machine } from '../Platform/machine'

const sha256Hex = (text: string): string => createHash('sha256').update(text).digest('hex')

export function chainLock(): Machine['lock'] {
  const chains = new Map<string, Promise<unknown>>()
  const heldKeys = new AsyncLocalStorage<ReadonlySet<string>>()
  return <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const held = heldKeys.getStore()
    if (held?.has(key)) return Promise.reject(new Error(`Re-entrant file lock on ${key}`))
    const next = new Set(held).add(key)
    const guarded = (): Promise<T> => heldKeys.run(next, fn)
    const run = (chains.get(key) ?? Promise.resolve()).then(guarded, guarded)
    chains.set(
      key,
      run.then(
        () => undefined,
        () => undefined,
      ),
    )
    return run
  }
}

export interface MemoryFs {
  files: Map<string, { text: string; mtimeMs: number }>
  dirs: Set<string>
}

export function memoryMachine(): { machine: Machine; fs: MemoryFs } {
  const files = new Map<string, { text: string; mtimeMs: number }>()
  const dirs = new Set<string>()
  let clock = 1000
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const put = (p: string, text: string): void => {
    files.set(p, { text, mtimeMs: ++clock })
  }
  const machine: Machine = {
    readText: async (p) => files.get(p)?.text ?? null,
    readBytes: async (p) => {
      const e = files.get(p)
      return e ? encoder.encode(e.text) : null
    },
    writeText: async (p, text) => put(p, text),
    writeBytes: async (p, bytes) => put(p, decoder.decode(bytes)),
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
    lock: chainLock(),
    sha256Hex,
  }
  return { machine, fs: { files, dirs } }
}

const isAbsent = (e: unknown): boolean => {
  const code = (e as NodeJS.ErrnoException).code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

async function absentToNull<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read
  } catch (e) {
    if (isAbsent(e)) return null
    throw e
  }
}

const entryKind = (e: { isFile(): boolean; isDirectory(): boolean }): DirEntry['kind'] =>
  e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other'

async function atomicWrite(p: string, data: string | Uint8Array): Promise<void> {
  const tmp = `${p}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  try {
    await writeFile(tmp, data)
    await rename(tmp, p)
  } catch (e) {
    await rm(tmp, { force: true })
    throw e
  }
}

export function diskMachine(): Machine {
  return {
    readText: (p) => absentToNull(readFile(p, 'utf8')),
    readBytes: (p) => absentToNull(readFile(p)),
    writeText: (p, text) => atomicWrite(p, text),
    writeBytes: (p, bytes) => atomicWrite(p, bytes),
    async stat(p) {
      const s = await absentToNull(stat(p))
      return (
        s && {
          size: s.size,
          mtimeMs: s.mtimeMs,
          birthtimeMs: s.birthtimeMs,
          isDirectory: s.isDirectory(),
        }
      )
    },
    async readDir(p) {
      const entries = await absentToNull(readdir(p, { withFileTypes: true }))
      return (entries ?? []).map((e) => ({ name: e.name, kind: entryKind(e) }))
    },
    async mkdir(p) {
      return (await mkdir(p, { recursive: true })) === undefined ? 'exists' : 'created'
    },
    rename,
    remove: (p) => rm(p, { recursive: true, force: true }),
    utimes: (p, mtimeMs) => utimes(p, mtimeMs / 1000, mtimeMs / 1000),
    realpath,
    lock: chainLock(),
    sha256Hex,
  }
}
