import type { KeyValueStore } from './machine'

export interface PageIndexEntry {
  mentions: string[]
  values: Record<string, unknown>
}

export interface IndexedStat {
  mtimeMs: number
  size: number
}

export interface ContentIndexStore {
  upsertPageIndex(path: string, entry: PageIndexEntry, stat: IndexedStat): void
  removePathIndex(path: string): void
  renamePathIndex(oldPath: string, newPath: string): void
  removePathPrefixIndex(dir: string): void
  renamePathPrefixIndex(oldDir: string, newDir: string): void
  queryMentions(normalizedTitle: string): string[]
  queryKeyHolders(key: string): string[]
  readIndexedStat(path: string): IndexedStat | null
  readIndexedStats(): Map<string, IndexedStat>
}

export type SnapshotSource = 'edit' | 'external' | 'restore'

export interface SnapshotRow {
  ts: number
  source: SnapshotSource
}

export interface SnapshotStore {
  addSnapshot(pageId: string, ts: number, source: SnapshotSource, text: string): void
  latestSnapshot(pageId: string): { ts: number; text: string } | null
  listSnapshots(pageId: string): SnapshotRow[]
  readSnapshot(pageId: string, ts: number): string | null
  deleteSnapshots(pageId: string, ts: readonly number[]): number
  clearSnapshots(): number
  sweepSnapshots(cutoffMs: number): number
}

export interface Stores {
  keyValue: KeyValueStore | null
  contentIndex: ContentIndexStore | null
  snapshots: SnapshotStore | null
}

let installed: Stores = { keyValue: null, contentIndex: null, snapshots: null }

export function installStores(stores: Stores): void {
  installed = stores
}

export const keyValueStore = (): KeyValueStore | null => installed.keyValue
export const contentIndexStore = (): ContentIndexStore | null => installed.contentIndex
export const snapshotStore = (): SnapshotStore | null => installed.snapshots
