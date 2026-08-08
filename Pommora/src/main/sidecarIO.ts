// The single read/write pair for folder sidecars. Validates through a zod schema on
// read (foreign keys retained via looseObject) and writes atomically with stable,
// sorted JSON. CRUD reads the sidecar, mutates modeled fields on the returned object
// (foreign keys ride along), and writes it back — so foreign data is preserved.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { z } from 'zod'
import { SIDECAR_FILENAME, sidecarPath, type SidecarKind } from './paths'
import { writeJson } from './io/atomicWrite'
import { serializeOnFile } from './io/fileLock'

/** Run a sidecar read-modify-write under that sidecar's own lock, reading FRESH inside it.
 *  Views, container config, orders, properties and the banner/icon patches all rewrite the
 *  same file whole, so they queue on one key — the sidecar's path — or the last writer back
 *  silently drops whatever the others just set. */
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
    raw = JSON.parse(await readFile(join(absFolder, SIDECAR_FILENAME[kind]), 'utf8'))
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
  await writeJson(join(absFolder, SIDECAR_FILENAME[kind]), value)
}
