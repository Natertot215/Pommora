// A null answer means no index, and an empty array is a genuine empty result: the title, Context, and key-holder queries fall back to a scan on null, while the heading cascade and the Matrix graph wait for the index.

import { errText } from '../Contract/result'
import {
  type ContentIndexStore,
  contentIndexStore,
  type IndexedStat,
  type PageRelations,
  type PageIndexRow,
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

export function upsertPageIndexes(rows: readonly PageIndexRow[]): void {
  guarded(`upsert of ${rows.length} pages`, (db) => db.upsertPageIndexes(rows))
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

export function queryHeadingMentions(
  normalizedTitle: string,
  normalizedHeading: string,
): string[] | null {
  return queryPaths((db) => db.queryHeadingMentions(normalizedTitle, normalizedHeading))
}

export function readHeadings(paths?: string[]): Record<string, string[]> | null {
  return queried((db) => db.readHeadings(paths))
}

export function queryKeyHolders(key: string): string[] | null {
  return queryPaths((db) => db.queryKeyHolders(key))
}

/** The pages holding a Context key in any casing, or — given a normalized Space title — those whose key names that Space. */
export function queryMembers(key: string, title?: string): string[] | null {
  return title === undefined
    ? queryKeyHolders(key)
    : queryPaths((db) => db.queryMembers(key, title))
}

export function readPageRelations(paths?: string[]): PageRelations | null {
  return contentIndexStore() !== readyDb ? null : queried((db) => db.readPageRelations(paths))
}

export function readIndexedStat(path: string): IndexedStat | null {
  return queried((db) => db.readIndexedStat(path))
}

export function readIndexedStats(): Map<string, IndexedStat> | null {
  return queried((db) => db.readIndexedStats())
}
