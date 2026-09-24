import { mkdirSync } from 'node:fs'
import { errText } from '@pommora/core/Contract/result'
import { installStores, NO_STORES } from '@pommora/core/Platform/stores'
import { openNexusDb } from './open'
import { openVersionsDb } from './versionsDb'
import type { Db } from './driver'
import { captureStore, contentIndexStore, keyValueStore, snapshotStore, syncStore } from './stores'

let db: Db | null = null
let versionsDb: Db | null = null

const openQuietly = (open: () => Db | null, note: string): Db | null => {
  try {
    return open()
  } catch (e) {
    console.error(note, errText(e))
    return null
  }
}

/** Never throws: opening a nexus must leave it browsable, not fail the adopt half-way through. */
export function openSessionDb(dir: string | null, root: string): void {
  closeSessionDb()
  if (dir === null) return
  db = openQuietly(() => {
    mkdirSync(dir, { recursive: true })
    return openNexusDb(dir, root)
  }, 'nexus.db: unavailable — operational state will not persist:')
  versionsDb = openQuietly(
    () => openVersionsDb(dir),
    'versions.db: unavailable — file history will not record:',
  )
  installStores({
    keyValue: db && keyValueStore(db),
    contentIndex: db && contentIndexStore(db),
    snapshots: versionsDb && snapshotStore(versionsDb),
    sync: db && syncStore(db),
    captures: versionsDb && captureStore(versionsDb),
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
