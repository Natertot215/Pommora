import { createHash, randomBytes } from 'node:crypto'
import { constants, realpathSync, type Stats } from 'node:fs'
import { lstat, mkdir, open, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import {
  entryKind,
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

// Each temp writes through to its drive, so one flush of the drive's cache makes a whole group durable. Node names no write-through flag on Windows, so this is libuv's own `UV_FS_O_DSYNC` (`uv/win.h`, `FILE_FLAG_WRITE_THROUGH`).
const UV_FS_O_DSYNC = 0x04000000
const TEMP_FLAGS =
  constants.O_WRONLY |
  constants.O_CREAT |
  constants.O_EXCL |
  (isWindows ? UV_FS_O_DSYNC : constants.O_DSYNC)

// Beside its file, or a symlink's target, which it lands at (a link to nothing is landed over), so the rename stays on one volume; dotted, so the walk, the watcher, and sync never admit it, which is also why a temp a crash or a folder moved mid-flush strands is left where it lies; and fixed-length, so a file named to the length limit still has room for it. Answers the drive the temp sits on, the flush that empties that drive's cache, and the file's commit, which lands it once that flush answers and answers the stat the file then holds while its time and size are still the temp's, which a rename keeps, and the temp's own otherwise, so an outside write landing between the rename and the stat is heard.
async function stage({ path: named, data, mtimeMs, expect }: Landing): Promise<{
  dev: number
  flush: () => Promise<void>
  commit: (flushed: Promise<void>) => Promise<FileStat>
}> {
  const path = (await absentToNull(lstat(named)))?.isSymbolicLink()
    ? posixPath(await realpath(named).catch(() => named))
    : named
  const temp = join(dirname(path), `.landing-${randomBytes(6).toString('hex')}`)
  const handle = await open(temp, TEMP_FLAGS)
  const discard = async (e: unknown): Promise<never> => {
    await handle.close()
    await rm(temp, { force: true })
    throw e
  }
  let own: Stats
  try {
    await handle.writeFile(data)
    // A volume that refuses the time leaves the file dated now; its bytes still land.
    if (mtimeMs !== undefined) await handle.utimes(mtimeMs / 1000, mtimeMs / 1000).catch(() => {})
    own = await handle.stat()
  } catch (e) {
    return discard(e)
  }
  return {
    dev: own.dev,
    flush: () => handle.sync(),
    commit: async (flushed) => {
      try {
        await flushed
        const held = await absentToNull(stat(path))
        if (expect !== undefined && !sameFile(expect, held && fileStat(held)))
          throw new Error(`${basename(path)} changed while its write waited.`)
        // The temp was created through the umask, so the file keeps the permissions it had; a volume that refuses them leaves the temp's, and its bytes still land.
        if (held && held.mode !== own.mode) await handle.chmod(held.mode).catch(() => {})
        await handle.close()
        await outlastHolder(path, () => rename(temp, path))
        const now = fileStat(await stat(path))
        return now.mtimeMs === own.mtimeMs && now.size === own.size ? now : fileStat(own)
      } catch (e) {
        return discard(e)
      }
    },
  }
}

export const nodeMachine: Machine = {
  readText: (p) => absentToNull(readFile(p, 'utf8')),
  readBytes: (p) => absentToNull(readFile(p)),
  async land(files) {
    const staged = await Promise.allSettled(files.map(stage))
    const flushes = new Map<number, Promise<void>>()
    for (const s of staged)
      if (s.status === 'fulfilled' && !flushes.has(s.value.dev))
        flushes.set(s.value.dev, s.value.flush())
    return Promise.allSettled(
      staged.map(async (s) => {
        if (s.status === 'rejected') throw s.reason
        return s.value.commit(flushes.get(s.value.dev)!)
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
