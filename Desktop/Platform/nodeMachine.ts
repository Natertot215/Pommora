import { createHash, randomBytes } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { lstat, mkdir, open, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import {
  type DirEntry,
  fileStat,
  type FileStat,
  type Landing,
  type Machine,
  sameFile,
} from '@pommora/core/Platform/machine'
import { serializeOnFile } from './fileLock'
import { isWindows, posixPath } from './hostPath'
import { basename, dirname, join } from '@pommora/core/Paths/posix'

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

// Beside its file, or a symlink's target, which it lands at (a link to nothing is landed over), so the rename stays on one volume; dotted, so the walk, the watcher, and sync never admit it, which is also why a temp a crash or a folder moved mid-flush strands is left where it lies; and fixed-length, so a file named to the length limit still has room for it. Answers the file's commit, which lands it once its group has flushed.
async function stage({
  path: named,
  data,
  mtimeMs,
  expect,
}: Landing): Promise<() => Promise<FileStat>> {
  const path = (await absentToNull(lstat(named)))?.isSymbolicLink()
    ? posixPath(await realpath(named).catch(() => named))
    : named
  const temp = join(dirname(path), `.landing-${randomBytes(6).toString('hex')}`)
  const handle = await open(temp, 'wx')
  const discard = async (e: unknown): Promise<never> => {
    await handle.close()
    await rm(temp, { force: true })
    throw e
  }
  try {
    await handle.writeFile(data)
    // A volume that refuses the time leaves the file dated now; its bytes still land.
    if (mtimeMs !== undefined) await handle.utimes(mtimeMs / 1000, mtimeMs / 1000).catch(() => {})
    await handle.sync()
  } catch (e) {
    return discard(e)
  }
  return async () => {
    try {
      const held = await absentToNull(stat(path))
      if (expect !== undefined && !sameFile(expect, held && fileStat(held)))
        throw new Error(`${basename(path)} changed while its write waited.`)
      const own = await handle.stat()
      // The temp was created through the umask, so the file keeps the permissions it had; a volume that refuses them leaves the temp's, and its bytes still land.
      if (held && held.mode !== own.mode) await handle.chmod(held.mode).catch(() => {})
      await handle.close()
      await outlastHolder(path, () => rename(temp, path))
      return fileStat(own)
    } catch (e) {
      return discard(e)
    }
  }
}

export const nodeMachine: Machine = {
  readText: (p) => absentToNull(readFile(p, 'utf8')),
  readBytes: (p) => absentToNull(readFile(p)),
  // Every temp is written and flushed before any rename, so the group's flushes overlap rather than wait in turn.
  async land(files) {
    const staged = await Promise.allSettled(files.map(stage))
    return Promise.allSettled(
      staged.map(async (s) => {
        if (s.status === 'rejected') throw s.reason
        return s.value()
      }),
    )
  },
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
  rename: (from, to) => outlastHolder(from, () => rename(from, to)),
  remove: (p) => outlastHolder(p, () => rm(p, { recursive: true, force: true })),
  realpath: async (p) => posixPath(await realpath(p)),
  lock: serializeOnFile,
  sha256Hex: (input) => createHash('sha256').update(input).digest('hex'),
  platform: isWindows ? 'windows' : 'posix',
  home: posixPath(realpathSync.native(homedir())),
}
