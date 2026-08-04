// The one keyed store every operational surface writes through. A change is a single-row upsert —
// no read-merge-write, no re-serialize, no temp file, no rename — which is why none of these
// surfaces needs a debounce, a write lock, or a drain at quit.
//
// Only Pommora writes here, so a decode failure is a bug rather than untrusted input: the row is
// dropped and logged instead of every read paying for validation.

import { errText } from '@shared/result'
import { sessionDb } from '../sessionDb'

export type Scope =
  | 'folds'
  | 'activeView'
  | 'viewOrder'
  | 'headingCols'
  | 'embedHeights'
  | 'linkTitle'
  | 'blockDoc'
  | 'tabs'
  | 'previews'
  | 'recents'
  | 'record'

/** The key a whole-scope singleton stores under — tabs, previews and recents are always read and
 *  written whole, so a row per entry would buy nothing. */
const SINGLETON = ''

function decode<T>(scope: Scope, key: string, raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T
  } catch (e) {
    console.error(`local_state: dropping undecodable row ${scope}/${key}:`, errText(e))
    return undefined
  }
}

export function readScope<T>(scope: Scope): Record<string, T> {
  const db = sessionDb()
  if (!db) return {}
  const rows = db.prepare('SELECT key, value FROM local_state WHERE scope = ?').all(scope) as {
    key: string
    value: string
  }[]
  const out: Record<string, T> = {}
  for (const r of rows) {
    const v = decode<T>(scope, r.key, r.value)
    if (v !== undefined) out[r.key] = v
  }
  return out
}

/** Set one key, or clear it when `value` is null — an emptied value deletes its key rather than
 *  persisting an empty container, matching the properties map and contexts. Returns false when no
 *  database is open, so a caller can report the failure instead of acknowledging a lost write. */
export function writeKey(scope: Scope, key: string, value: unknown): boolean {
  const db = sessionDb()
  if (!db) return false
  if (value === null) {
    db.prepare('DELETE FROM local_state WHERE scope = ? AND key = ?').run(scope, key)
    return true
  }
  db.prepare('INSERT OR REPLACE INTO local_state (scope, key, value) VALUES (?, ?, ?)').run(
    scope,
    key,
    JSON.stringify(value),
  )
  return true
}

export function readKey<T>(scope: Scope, key: string): T | null {
  const db = sessionDb()
  if (!db) return null
  const row = db
    .prepare('SELECT value FROM local_state WHERE scope = ? AND key = ?')
    .get(scope, key) as { value: string } | undefined
  if (!row) return null
  return decode<T>(scope, key, row.value) ?? null
}

export function readValue<T>(scope: Scope): T | null {
  return readKey<T>(scope, SINGLETON)
}

export function writeValue(scope: Scope, value: unknown): boolean {
  return writeKey(scope, SINGLETON, value)
}
