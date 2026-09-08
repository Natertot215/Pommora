import { errText } from '@pommora/core/Contract/result'
import { installStores, NO_STORES } from '@pommora/core/Platform/stores'
import { openNexusDb } from './open'
import { openVersionsDb } from './versionsDb'
import type { Db } from './driver'
import { contentIndexStore, keyValueStore, snapshotStore } from './stores'

let db: Db | null = null
let versionsDb: Db | null = null

export function sessionDb(): Db | null {
  return db
}

export function sessionVersionsDb(): Db | null {
  return versionsDb
}

const openQuietly = (open: () => Db | null, note: string): Db | null => {
  try {
    return open()
  } catch (e) {
    console.error(note, errText(e))
    return null
  }
}

/** Never throws: opening a nexus on read-only media must leave it browsable, not fail the adopt half-way through. */
export function openSessionDb(root: string): void {
  closeSessionDb()
  db = openQuietly(
    () => openNexusDb(root),
    'nexus.db: unavailable — operational state will not persist:',
  )
  versionsDb = openQuietly(
    () => openVersionsDb(root),
    'versions.db: unavailable — file history will not record:',
  )
  installStores({
    keyValue: db && keyValueStore(db),
    contentIndex: db && contentIndexStore(db),
    snapshots: versionsDb && snapshotStore(versionsDb),
  })
}

const closeQuietly = (handle: Db | null): void => {
  try {
    handle?.close()
  } catch {}
}

export function closeSessionDb(): void {
  closeQuietly(db)
  closeQuietly(versionsDb)
  db = null
  versionsDb = null
  installStores(NO_STORES)
}
