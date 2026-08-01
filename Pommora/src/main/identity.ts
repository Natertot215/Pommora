// Per-Nexus identity (`.nexus/nexus.json`) — the id that keys the asset folders and flips the
// walk into sidecar mode. Created eagerly on open, or a touched folder would stay in "raw mode"
// with its stamped sidecars ignored.

import { mkdir } from 'node:fs/promises'
import { newId } from './ids'
import { nowIso } from './crud/util'
import { readJsonStrict, writeJson } from './io/atomicWrite'
import { asString } from './coerce'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES } from './paths'
import { createFolderEntity } from './crud/folderEntity'
import { AGENDA_SLOTS, type AgendaRegistration } from './folderKind'

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
  const id = newId()
  // Stamped once, not per write: the second write below lands after the folders are seeded, and
  // re-reading the clock there would record the end of seeding as the nexus's creation moment.
  const createdAt = nowIso()
  // A file that EXISTS but carries no readable id is an established nexus with a damaged
  // identity, not a new one: mint an id over it and seed nothing. Fusing the two would recreate
  // folders its owner deleted and orphan every asset keyed to the old id.
  if (existing) {
    await writeJson(path, { ...existing, id, createdAt })
    return { id, created: false }
  }

  // Identity lands BEFORE the folders exist. The reverse order can strand them: seeding writes
  // real folders, and a failure before the record persists leaves them permanently unregistered
  // — invisible to the walk, skipped by adoption, with no repair path, since registration is
  // written here and nowhere else.
  await writeJson(path, { id, createdAt })
  const agenda_singletons = await seedAgendaSingletons(root)
  // No empties: a nexus that could seed neither slot records no registration at all.
  if (Object.keys(agenda_singletons).length) {
    await writeJson(path, { id, createdAt, agenda_singletons })
  }
  return { id, created: true }
}

/**
 * Create the agenda singletons and return the registration that makes them canonical. Creation
 * only — an existing nexus is never retro-seeded, or reopening one would silently recreate the
 * folders a user removed.
 *
 * The configs carry identity and nothing else: what fills them is the Agenda work's call.
 * `createFolderEntity` refuses a name already on disk, which is what keeps this from claiming a
 * user's own `Tasks/` of notes — opening a plain folder as a nexus reaches this code, and stamping
 * an agenda config into their content would drop the whole folder out of Collections. A slot whose
 * name is taken simply goes unregistered rather than unregistering something else.
 */
async function seedAgendaSingletons(root: string): Promise<AgendaRegistration> {
  const out: AgendaRegistration = {}
  for (const { slot, sidecar, seedName } of AGENDA_SLOTS) {
    const made = await createFolderEntity(root, sidecar, seedName)
    if (made.ok) out[slot] = made.value.id
  }
  return out
}
