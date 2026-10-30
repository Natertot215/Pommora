import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from '../Paths/posix'
import { realpathPosix, windows } from './hostFs'
import {
  type DirEntry,
  entryKind,
  fileStat,
  type FileStat,
  type Landing,
  type Machine,
  machine,
  sameFile,
} from '../Platform/machine'

const sha256Hex = (input: string | Uint8Array): string =>
  createHash('sha256').update(input).digest('hex')

function chainLock(): Machine['lock'] {
  const chains = new Map<string, Promise<unknown>>()
  const heldKeys = new AsyncLocalStorage<Map<string, { settled: boolean }>>()
  return <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const held = heldKeys.getStore()
    if (held?.get(key)?.settled === false)
      return Promise.reject(new Error(`Re-entrant file lock on ${key}`))
    const live = { settled: false }
    const next = new Map(held).set(key, live)
    const guarded = (): Promise<T> =>
      heldKeys.run(next, fn).finally(() => {
        live.settled = true
      })
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

/** Resolves once a second caller waits on `key`'s lock, so a race test pauses on the lock itself rather than on a timer. */
export function lockContention(key: string): { contended: Promise<void>; restore: () => void } {
  const m = machine()
  const lock = m.lock
  let inFlight = 0
  let contend = (): void => {}
  const contended = new Promise<void>((resolve) => {
    contend = resolve
  })
  m.lock = <T>(k: string, fn: () => Promise<T>): Promise<T> => {
    if (k !== key) return lock(k, fn)
    if (inFlight) contend()
    inFlight++
    return lock(k, fn).finally(() => {
      inFlight--
    })
  }
  return {
    contended,
    restore: () => {
      m.lock = lock
    },
  }
}

type MemoryFile = { text: string; mtimeMs: number; ctimeMs: number }

export interface MemoryFs {
  files: Map<string, MemoryFile>
  dirs: Set<string>
}

export function memoryMachine(): { machine: Machine; fs: MemoryFs } {
  const files = new Map<string, MemoryFile>()
  const dirs = new Set<string>()
  let clock = 1000
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const entryStat = (e: MemoryFile): FileStat => ({
    size: e.text.length,
    mtimeMs: e.mtimeMs,
    ctimeMs: e.ctimeMs,
    birthtimeMs: null,
    isDirectory: false,
  })
  const machine: Machine = {
    readText: async (p) => files.get(p)?.text ?? null,
    readBytes: async (p) => {
      const e = files.get(p)
      return e ? encoder.encode(e.text) : null
    },
    land: (list) =>
      Promise.allSettled(
        list.map(async ({ path, data, mtimeMs, expect }) => {
          if (dirs.has(path)) throw new Error(`EISDIR ${path}`)
          if (expect !== undefined && !sameFile(expect, await machine.stat(path)))
            throw new Error(`${path} changed`)
          const text = typeof data === 'string' ? data : decoder.decode(data)
          const e = { text, mtimeMs: mtimeMs ?? ++clock, ctimeMs: ++clock }
          files.set(path, e)
          return entryStat(e)
        }),
      ),
    stat: async (p): Promise<FileStat | null> => {
      const e = files.get(p)
      if (e) return entryStat(e)
      return dirs.has(p)
        ? { size: 0, mtimeMs: 0, ctimeMs: 0, birthtimeMs: null, isDirectory: true }
        : null
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
      files.set(to, { ...e, ctimeMs: ++clock })
    },
    remove: async (p) => {
      files.delete(p)
      dirs.delete(p)
    },
    realpath: async (p) => p,
    lock: chainLock(),
    sha256Hex,
    platform: 'posix',
    home: '/Users/test',
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

// The fast double Core's suites install: the host's temp and rename without its flush, its mode, or its symlink's target, which `nodeMachine.test.ts` carries.
async function landOnDisk({ path, data, mtimeMs, expect }: Landing): Promise<FileStat> {
  const was = await absentToNull(stat(path))
  if (expect !== undefined && !sameFile(expect, was && fileStat(was)))
    throw new Error(`${path} changed`)
  const tmp = join(dirname(path), `.landing-${randomBytes(6).toString('hex')}`)
  try {
    await writeFile(tmp, data, { flag: 'wx' })
    if (mtimeMs !== undefined) await utimes(tmp, mtimeMs / 1000, mtimeMs / 1000)
    await rename(tmp, path)
  } catch (e) {
    await rm(tmp, { force: true })
    throw e
  }
  return fileStat(await stat(path))
}

export function diskMachine(): Machine {
  return {
    readText: (p) => absentToNull(readFile(p, 'utf8')),
    readBytes: (p) => absentToNull(readFile(p)),
    land: (list) => Promise.allSettled(list.map(landOnDisk)),
    async stat(p) {
      const s = await absentToNull(stat(p))
      return s && fileStat(s)
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
    realpath: realpathPosix,
    lock: chainLock(),
    sha256Hex,
    platform: windows ? 'windows' : 'posix',
    home: '/Users/test',
  }
}
