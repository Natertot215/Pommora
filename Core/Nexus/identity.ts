import { machine } from '../Platform/machine'
import { newId } from '../Locations/ids'
import { readJsonStrict, writeJson } from '../IO/atomicWrite'
import { asString } from '../Locations/coerce'
import { nexusDir, nexusConfig, NEXUS_CONFIG_FILES } from '../Locations/paths'
import { createFolderEntity } from './folderEntity'
import { AGENDA_SLOTS, type AgendaRegistration } from './folderKind'

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

  await machine().mkdir(nexusDir(root))
  const id = newId()
  // Stamped once, not per write: the second write below lands after the folders are seeded, and
  // re-reading the clock there would record the end of seeding as the nexus's creation moment.
  const createdAt = new Date().toISOString()
  // A file that EXISTS but carries no readable id is an established nexus with a damaged
  // identity, not a new one: mint an id over it and seed nothing, or folders its owner deleted
  // would be recreated and every asset keyed to the old id orphaned.
  if (existing) {
    await writeJson(path, { ...existing, id, createdAt })
    return { id, created: false }
  }

  await writeJson(path, { id, createdAt })
  const agenda_singletons = await seedAgendaSingletons(root)
  if (Object.keys(agenda_singletons).length) {
    await writeJson(path, { id, createdAt, agenda_singletons })
  }
  return { id, created: true }
}

async function seedAgendaSingletons(root: string): Promise<AgendaRegistration> {
  const out: AgendaRegistration = {}
  for (const { slot, sidecar, seedName } of AGENDA_SLOTS) {
    const made = await createFolderEntity(root, sidecar, seedName)
    if (made.ok) out[slot] = made.value.id
  }
  return out
}
