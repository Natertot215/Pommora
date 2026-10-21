export interface KeyValueStore {
  get(scope: string, key: string): string | null
  /** One commit for every row; a null clears its key rather than storing it. */
  write(scope: string, rows: Record<string, string | null>): void
  entries(scope: string): Record<string, string>
}

// `citation` overlays rather than replaces: a link or embed inside a footnote definition emits its own kind AND a `citation` row, so a reader asking for body links sees it and a reader weighting footnotes sees it too. A `value` row is a link inside a frontmatter value, under `key`; every other kind carries `key` as ''.
export type RelationKind = 'body' | 'citation' | 'value' | 'embed' | 'space'

/** `target` is the written page half as `pageKey` reads it, a title or a path from the Nexus root or any tail of one, '' for a page's own heading, or the Space's title in a `space` row — resolution happens at read time. `qualifier` is a normalized heading key for a heading-naming link, a Context key for a `space` row, and '' otherwise. */
export interface Relation {
  kind: RelationKind
  target: string
  qualifier: string
  key: string
}

export interface PageHeading {
  text: string
  level: number
}

export interface PageIndexEntry {
  relations: Relation[]
  headings: PageHeading[]
  values: Record<string, unknown>
}

export interface IndexedStat {
  mtimeMs: number
  size: number
  /** The ID the page's frontmatter carries, when one is written: what pairs its rows' removal with where the tree holds it next. */
  id?: string
}

export interface RelationRow extends Relation {
  path: string
}

export interface PageRelationRow extends RelationRow {
  kind: Exclude<RelationKind, 'space'>
}

export interface PageRelations {
  relations: PageRelationRow[]
  pages: Record<string, { values: Record<string, unknown>; mtimeMs: number }>
}

export interface PageIndexRow {
  path: string
  entry: PageIndexEntry
  stat: IndexedStat
}

export interface ContentIndexStore {
  upsertPageIndexes(rows: readonly PageIndexRow[]): void
  removePathIndex(path: string): void
  renamePathIndex(oldPath: string, newPath: string): void
  removePathPrefixIndex(dir: string): void
  renamePathPrefixIndex(oldDir: string, newDir: string): void
  /** Every page linking any of `keys`; given a `qualifier`, only those naming that heading. */
  queryMentions(keys: readonly string[], qualifier?: string): string[]
  readHeadings(paths?: string[]): Record<string, PageHeading[]>
  /** Every page holding `key`. */
  queryKeyHolders(key: string): string[]
  /** Every page whose Context `key` names the Space of the trimmed NFC `title`. */
  queryMembers(key: string, title: string): string[]
  readIndexedStat(path: string): IndexedStat | null
  readIndexedStats(under?: string): Map<string, IndexedStat>
  /** Page → page rows only (every kind but `space`), plus every indexed page's governed values and mtime; `paths` narrows both, and `key` narrows the values to that one key. */
  readPageRelations(paths?: readonly string[], key?: string): PageRelations
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
  sweepSnapshots(cutoffMs: number, archived: { ids: readonly string[]; cutoffMs: number }): number
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
