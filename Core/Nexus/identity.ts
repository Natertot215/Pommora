import { machine } from '../Platform/machine'
import { errText, ok, type Result, valueOr } from '../Contract/result'
import { newId } from './ids'
import { readJsonStrict, writeJson } from '../Files/atomicWrite'
import { asString } from './coerce'
import { AGENDA_FOLDERS, nexusDir, nexusConfig, NEXUS_CONFIG_FILES } from '../Paths/paths'
import { createFolderEntity } from './folderEntity'
import type { AgendaRegistration } from './folderKind'

export async function readIdentity(root: string): Promise<Result<Record<string, unknown>>> {
  const read = await readJsonStrict(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
  return read.ok ? ok(retireAgendaKey(read.value)) : read
}

export async function ensureIdentity(root: string): Promise<{ id: string; created: boolean }> {
  const path = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  const read = await readJsonStrict(path)
  // A nexus.json that exists but can't be read must not be re-minted over — the id it holds keys the asset folders. The session runs on a throwaway id, nothing is written, and the next open reads the real one.
  if (!read.ok && read.error.code !== 'not-found') return { id: newId(), created: false }
  const existing = valueOr(read, null)
  const existingId = existing && asString(existing.id)
  if (existing && existingId) {
    if ('agenda_singletons' in existing) {
      await writeJson(path, retireAgendaKey(existing)).catch((e) =>
        console.error('nexus.json retired-key cleanup failed:', errText(e)),
      )
    }
    return { id: existingId, created: false }
  }

  await machine().mkdir(nexusDir(root))
  const id = newId()
  // Stamped once, not per write: the second write below lands after the folders are seeded, and re-reading the clock there would record the end of seeding as the nexus's creation moment.
  const createdAt = new Date().toISOString()
  // An id-less file is a damaged identity, not a new nexus: mint an id over it and seed nothing, or folders its owner deleted would be recreated and every asset keyed to the old id orphaned.
  if (existing) {
    await writeJson(path, { ...retireAgendaKey(existing), id, createdAt })
    return { id, created: false }
  }

  await writeJson(path, { id, createdAt })
  const agenda_folders = await seedAgenda(root)
  if (Object.keys(agenda_folders).length) {
    await writeJson(path, { id, createdAt, agenda_folders })
  }
  return { id, created: true }
}

function retireAgendaKey(identity: Record<string, unknown>): Record<string, unknown> {
  if (!('agenda_singletons' in identity)) return identity
  const { agenda_singletons, ...rest } = identity
  return { agenda_folders: agenda_singletons, ...rest }
}

async function seedAgenda(root: string): Promise<AgendaRegistration> {
  const out: AgendaRegistration = {}
  for (const slot of AGENDA_FOLDERS) {
    const made = await createFolderEntity(root, slot, slot.charAt(0).toUpperCase() + slot.slice(1))
    if (made.ok) out[slot] = made.value.id
  }
  return out
}
