import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, realpath, rename, rm, stat, utimes } from 'node:fs/promises'
import writeFileAtomic from 'write-file-atomic'
import type { DirEntry, Machine } from '@pommora/core/Platform/machine'
import { serializeOnFile } from './fileLock'

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

const asBuffer = (bytes: Uint8Array): Buffer =>
  Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)

export const nodeMachine: Machine = {
  readText: (p) => absentToNull(readFile(p, 'utf8')),
  readBytes: (p) => absentToNull(readFile(p)),
  writeText: (p, text) => writeFileAtomic(p, text, { encoding: 'utf8' }),
  writeBytes: (p, bytes) => writeFileAtomic(p, asBuffer(bytes)),
  async writeRaw(p, text, mtimeMs) {
    await writeFileAtomic(p, text, { encoding: 'utf8' })
    await utimes(p, mtimeMs / 1000, mtimeMs / 1000)
  },
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
  lock: serializeOnFile,
  sha256Hex: (text) => createHash('sha256').update(text).digest('hex'),
}
