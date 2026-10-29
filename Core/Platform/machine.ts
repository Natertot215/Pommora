import type { HostPlatform } from '../Contract/bridge'
export interface FileStat {
  size: number
  mtimeMs: number
  birthtimeMs: number | null
  isDirectory: boolean
}

export interface DirEntry {
  name: string
  kind: 'file' | 'dir' | 'other'
}

/** One file a landing writes: its bytes; the modification time it keeps in place of now, where given; and the stat its read saw, or null where its read found no file, so a file another writer changed or created since is left as that writer left it. */
export interface Landing {
  path: string
  data: string | Uint8Array
  mtimeMs?: number
  expect?: FileStat | null
}

/** Whether `now` is still the file `was` describes: the same time, size, and birth, which a file replaced whole doesn't keep; a `was` of null describes no file. */
export const sameFile = (was: FileStat | null, now: FileStat | null): boolean =>
  was === null
    ? now === null
    : now !== null &&
      now.mtimeMs === was.mtimeMs &&
      now.size === was.size &&
      now.birthtimeMs === was.birthtimeMs

export interface Machine {
  /** Absent → null; any other failure throws. */
  readText(p: string): Promise<string | null>
  readBytes(p: string): Promise<Uint8Array | null>
  /** Writes each file whole and answers each one in order, with the stat its new bytes hold or why they didn't land: a failed file leaves no partial file and costs only itself, a concurrent reader sees the old or the new bytes, never a torn mix, and the new bytes reach the drive before the name points at them. A group is flushed together, each file holding an open handle until it lands, so a caller passes a bounded group, each path once. */
  land(files: readonly Landing[]): Promise<PromiseSettledResult<FileStat>[]>
  stat(p: string): Promise<FileStat | null>
  /** Absent → []. */
  readDir(p: string): Promise<DirEntry[]>
  mkdir(p: string): Promise<'created' | 'exists'>
  rename(from: string, to: string): Promise<void>
  remove(p: string): Promise<void>
  /** Hosts without one return `p`. */
  realpath(p: string): Promise<string>
  /** Re-taking a key already held inside `fn` rejects rather than deadlocks. */
  lock<T>(key: string, fn: () => Promise<T>): Promise<T>
  sha256Hex(input: string | Uint8Array): string
  platform: HostPlatform
  home: string
  trashToSystem?(p: string): Promise<void>
}

let installed: Machine | undefined

export function installMachine(m: Machine): void {
  installed = m
}

export function machine(): Machine {
  if (!installed) throw new Error('no platform installed')
  return installed
}

/** `p`'s stat, or null when it's missing or can't be read; beside the seam rather than `readTextOrNull`, since the walk cache it serves can't import `atomicWrite.ts`, which imports the cache. */
export const statOrNull = (p: string): Promise<FileStat | null> =>
  machine()
    .stat(p)
    .catch(() => null)
