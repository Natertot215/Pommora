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

export interface Machine {
  /** Absent → null; any other failure throws. */
  readText(p: string): Promise<string | null>
  readBytes(p: string): Promise<Uint8Array | null>
  writeText(p: string, text: string): Promise<void>
  writeBytes(p: string, bytes: Uint8Array): Promise<void>
  stat(p: string): Promise<FileStat | null>
  /** Absent → []. */
  readDir(p: string): Promise<DirEntry[]>
  mkdir(p: string): Promise<'created' | 'exists'>
  rename(from: string, to: string): Promise<void>
  remove(p: string): Promise<void>
  utimes(p: string, mtimeMs: number): Promise<void>
  /** Hosts without one return `p`. */
  realpath(p: string): Promise<string>
  /** Re-taking a key already held inside `fn` rejects rather than deadlocks. */
  lock<T>(key: string, fn: () => Promise<T>): Promise<T>
  sha256Hex(text: string): string
  trashToSystem?(p: string): Promise<void>
}

export interface KeyValueStore {
  get(scope: string, key: string): string | null
  set(scope: string, key: string, value: string | null): void
  entries(scope: string): Record<string, string>
}

let installed: Machine | undefined

export function installMachine(m: Machine): void {
  installed = m
}

export function machine(): Machine {
  if (!installed) throw new Error('no platform installed')
  return installed
}
