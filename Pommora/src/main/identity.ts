// Per-Nexus identity (`.nexus/nexus.json`) — the id that keys the asset folders and flips the
// walk into sidecar mode. Created eagerly on open, or a touched folder would stay in "raw mode"
// with its stamped sidecars ignored.

import { mkdir } from 'node:fs/promises'
import { newId } from './ids'
import { nowIso } from './crud/util'
import { readJsonStrict, writeJson } from './io/atomicWrite'
import { asString } from './coerce'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES } from './paths'

/** A fresh identity: the keying id + the nexus's birth date. Single source for both the
 *  open-time ensure and the lazy create on the first description/photo write. */
export function defaultIdentity(): { id: string; createdAt: string } {
  return { id: newId(), createdAt: nowIso() }
}

/** Ensure `.nexus/nexus.json` exists and carries an id. Absent → mint a fresh identity.
 *  Present with an id → returned untouched, byte-identical, whatever else it holds or lacks.
 *  Present without one → mint an id over it, preserving its foreign keys. */
export async function ensureIdentity(root: string): Promise<{ id: string; created: boolean }> {
  const path = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  const read = await readJsonStrict(path)
  // A nexus.json that exists but can't be read must not be re-minted over — the id it holds
  // keys the asset folders. The session runs on a throwaway id, nothing is written, and the
  // next open reads the real one.
  if (!read.ok && read.error.code !== 'not-found') return { id: newId(), created: false }
  const existing = read.ok ? read.value : null
  const existingId = existing && asString(existing.id)

  if (existing && existingId) return { id: existingId, created: false }

  await mkdir(nexusDir(root), { recursive: true })
  const identity = defaultIdentity()
  await writeJson(path, { ...existing, ...identity })
  return { id: identity.id, created: true }
}
