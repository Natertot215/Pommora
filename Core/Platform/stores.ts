import type { KeyValueStore } from './machine'

export interface Membership {
  key: string
  title: string
}

export interface PageIndexEntry {
  mentions: string[]
  values: Record<string, unknown>
  memberships: Membership[]
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
  queryMembers(key: string, title: string): string[]
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

export interface BaseRecord {
  path: string
  mtimeMs: number
  size: number
  hash: string
  blobSha: string
  version: number
  baseBytes: Uint8Array | null
}

export interface SyncStore {
  readBase(path: string): BaseRecord | null
  readAllBases(): BaseRecord[]
  readBasesUnder(prefix: string): BaseRecord[]
  upsertBase(record: BaseRecord): void
  renameBase(oldPath: string, newPath: string): void
  deleteBase(path: string): void
}

export type CaptureReason = 'local-lost' | 'remote-lost' | 'tombstone-lost' | 'merge-lost'

export interface CaptureStore {
  addCapture(path: string, ts: number, reason: CaptureReason, bytes: Uint8Array): void
  sweepCaptures(cutoffMs: number): number
}

export interface Stores {
  keyValue: KeyValueStore | null
  contentIndex: ContentIndexStore | null
  snapshots: SnapshotStore | null
  sync: SyncStore | null
  captures: CaptureStore | null
}

export const NO_STORES: Stores = {
  keyValue: null,
  contentIndex: null,
  snapshots: null,
  sync: null,
  captures: null,
}

let installed: Stores = NO_STORES

export function installStores(stores: Stores): void {
  installed = stores
}

export const keyValueStore = (): KeyValueStore | null => installed.keyValue
export const contentIndexStore = (): ContentIndexStore | null => installed.contentIndex
export const snapshotStore = (): SnapshotStore | null => installed.snapshots
export const syncStore = (): SyncStore | null => installed.sync
export const captureStore = (): CaptureStore | null => installed.captures
