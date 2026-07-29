// Per-Nexus identity (`.nexus/nexus.json`), Swift-compatible. Swift creates this eagerly
// on open (NexusManager.openPicked); React must too, or a React-touched folder stays in
// "raw mode" (its stamped sidecars ignored) and drifts from Swift's expected shape —
// breaking the goal of opening the same folder in either app with no conflict.

import { mkdir } from 'node:fs/promises'
import { newId } from './ids'
import { readJsonStrict, writeJson } from './io/atomicWrite'
import { asString } from './coerce'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES } from './paths'

// Swift `AtomicJSON` uses `.iso8601` (ISO8601DateFormatter, internet-date-time, NO
// fractional seconds). JS `toISOString()` appends milliseconds, which Swift's default
// .iso8601 decoder rejects — strip them so Swift can read our timestamp. Shared by every
// .nexus config writer that emits a Swift-decodable date.
export function swiftISODate(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** The on-disk shape every nexus is written at: Contexts are a registry of Spaces. */
export const NEXUS_SCHEMA_VERSION = 2

/** A fresh identity in Swift's shape. Single source for both the open-time ensure and the
 *  lazy create-defaults on the first description/photo write. */
export function defaultIdentity(): { schemaVersion: number; id: string; createdAt: string } {
  return { schemaVersion: NEXUS_SCHEMA_VERSION, id: newId(), createdAt: swiftISODate() }
}

/** Ensure `.nexus/nexus.json` exists in Swift's `{ schemaVersion, id, createdAt }` shape.
 *  Absent → create with a fresh ULID. Present → backfill only missing schemaVersion/
 *  createdAt (foreign keys + existing id untouched); a complete file is left byte-identical,
 *  so re-opening never churns it. */
export async function ensureIdentity(root: string): Promise<{ id: string; created: boolean }> {
  const path = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  const read = await readJsonStrict(path)
  // A nexus.json that exists but can't be read must not be re-minted over — the id it holds
  // keys the asset folders. The session runs on a throwaway id, nothing is written, and the
  // next open reads the real one.
  if (!read.ok && read.error.code !== 'not-found') return { id: newId(), created: false }
  const existing = read.ok ? read.value : null
  const existingId = existing && asString(existing.id)

  if (existing && existingId) {
    const patch: Record<string, unknown> = {}
    if (typeof existing.schemaVersion !== 'number') patch.schemaVersion = NEXUS_SCHEMA_VERSION
    if (!asString(existing.createdAt)) patch.createdAt = swiftISODate()
    if (Object.keys(patch).length > 0) await writeJson(path, { ...existing, ...patch })
    return { id: existingId, created: false }
  }

  await mkdir(nexusDir(root), { recursive: true })
  const identity = defaultIdentity()
  await writeJson(path, { ...existing, ...identity })
  return { id: identity.id, created: true }
}
