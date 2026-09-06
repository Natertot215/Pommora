// A null answer means NO INDEX, never "no matches": every query caller falls back to its full scan on null, and an empty array is a genuine empty result it may trust.

import { errText } from '../Contract/result'
import {
  type ContentIndexStore,
  contentIndexStore,
  type IndexedStat,
  type PageIndexEntry,
} from '../Platform/stores'

function guarded(what: string, run: (db: ContentIndexStore) => void): void {
  const db = contentIndexStore()
  if (!db) return
  try {
    run(db)
  } catch (e) {
    console.error(`content index: ${what} failed:`, errText(e))
  }
}

export function upsertPageIndex(path: string, entry: PageIndexEntry, stat: IndexedStat): void {
  guarded(`upsert ${path}`, (db) => db.upsertPageIndex(path, entry, stat))
}

export function removePathIndex(path: string): void {
  guarded(`remove ${path}`, (db) => db.removePathIndex(path))
}

export function renamePathIndex(oldPath: string, newPath: string): void {
  guarded(`rename ${oldPath}`, (db) => db.renamePathIndex(oldPath, newPath))
}

export function removePathPrefixIndex(dir: string): void {
  guarded(`remove ${dir}/`, (db) => db.removePathPrefixIndex(dir))
}

export function renamePathPrefixIndex(oldDir: string, newDir: string): void {
  guarded(`rename ${oldDir}/`, (db) => db.renamePathPrefixIndex(oldDir, newDir))
}

// Until the seed stamps the store it finished against, half-filled tables would masquerade as "no matches".
let readyDb: ContentIndexStore | null = null

export function markIndexReady(): void {
  readyDb = contentIndexStore()
}

function queried<T>(run: (db: ContentIndexStore) => T): T | null {
  const db = contentIndexStore()
  if (!db) return null
  try {
    return run(db)
  } catch {
    return null
  }
}

function queryPaths(run: (db: ContentIndexStore) => string[]): string[] | null {
  if (contentIndexStore() !== readyDb) return null
  return queried(run)
}

export function queryMentions(normalizedTitle: string): string[] | null {
  return queryPaths((db) => db.queryMentions(normalizedTitle))
}

export function queryKeyHolders(key: string): string[] | null {
  return queryPaths((db) => db.queryKeyHolders(key))
}

export function readIndexedStat(path: string): IndexedStat | null {
  return queried((db) => db.readIndexedStat(path))
}

export function readIndexedStats(): Map<string, IndexedStat> | null {
  return queried((db) => db.readIndexedStats())
}
