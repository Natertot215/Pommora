// The single read/write pair for folder sidecars, and the lock every read-modify-write of one
// runs under. Validates through a zod schema on read (foreign keys retained via looseObject) and
// writes atomically with stable, sorted JSON. CRUD reads the sidecar, mutates modeled fields on
// the returned object (foreign keys ride along), and writes it back — so foreign data is
// preserved.

import { readFile } from 'node:fs/promises'
import type { z } from 'zod'
import { sidecarPath, type SidecarKind } from './paths'
import { writeJson } from './IO/atomicWrite'
import { serializeOnFile } from './IO/fileLock'

/** Run a sidecar read-modify-write under that sidecar's own lock, reading FRESH inside it.
 *  Views, container config, within-folder orders, property assignment and the Remove cache all
 *  rewrite the same file whole, so they queue on one key or the last writer back silently drops
 *  whatever the others just set. The banner and icon patches reach the same key without coming
 *  through here — `rmwJsonStrict` derives it from the path they hand it. */
export function withSidecarLock<T>(
  absFolder: string,
  kind: SidecarKind,
  fn: () => Promise<T>,
): Promise<T> {
  return serializeOnFile(sidecarPath(absFolder, kind), fn)
}

/** Read + validate a folder's sidecar with its schema. Returns null when the file is
 *  absent, unparseable, or fails validation (the caller treats that as un-adopted). */
export async function readSidecar<S extends z.ZodType>(
  absFolder: string,
  kind: SidecarKind,
  schema: S,
): Promise<z.infer<S> | null> {
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(sidecarPath(absFolder, kind), 'utf8'))
  } catch {
    return null
  }
  const parsed = schema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/** Write a folder's sidecar atomically (sorted, stable JSON, trailing newline). The
 *  value should already be schema-shaped; any foreign keys on it are written through. */
export async function writeSidecar(
  absFolder: string,
  kind: SidecarKind,
  value: unknown,
): Promise<void> {
  await writeJson(sidecarPath(absFolder, kind), value)
}
