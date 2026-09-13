import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, realpath, rename, rm, stat, utimes } from 'node:fs/promises'
import writeFileAtomic from 'write-file-atomic'
import type { DirEntry, Machine } from '@pommora/core/Platform/machine'
import { serializeOnFile } from './fileLock'
import { isWindows, posixPath } from './hostPath'
import { basename } from '@pommora/core/Paths/posix'

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

const HELD = new Set(['EBUSY', 'EPERM', 'EACCES'])
const HOLDER_ATTEMPTS = 5

async function outlastHolder<T>(p: string, op: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await op()
    } catch (e) {
      if (!isWindows || !HELD.has((e as NodeJS.ErrnoException).code ?? '')) throw e
      if (attempt === HOLDER_ATTEMPTS)
        throw new Error(`${basename(p)} is held open by another app or isn't writable.`, {
          cause: e,
        })
      await new Promise((resolve) => setTimeout(resolve, attempt * 100))
    }
  }
}

const entryKind = (e: { isFile(): boolean; isDirectory(): boolean }): DirEntry['kind'] =>
  e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other'

const asBuffer = (bytes: Uint8Array): Buffer =>
  Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)

export const nodeMachine: Machine = {
  readText: (p) => absentToNull(readFile(p, 'utf8')),
  readBytes: (p) => absentToNull(readFile(p)),
  writeText: (p, text) => outlastHolder(p, () => writeFileAtomic(p, text, { encoding: 'utf8' })),
  writeBytes: (p, bytes) => outlastHolder(p, () => writeFileAtomic(p, asBuffer(bytes))),
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
  rename: (from, to) => outlastHolder(from, () => rename(from, to)),
  remove: (p) => outlastHolder(p, () => rm(p, { recursive: true, force: true })),
  utimes: (p, mtimeMs) => utimes(p, mtimeMs / 1000, mtimeMs / 1000),
  realpath: async (p) => posixPath(await realpath(p)),
  lock: serializeOnFile,
  sha256Hex: (text) => createHash('sha256').update(text).digest('hex'),
  platform: isWindows ? 'windows' : 'posix',
}
