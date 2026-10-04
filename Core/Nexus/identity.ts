import { machine } from '../Platform/machine'
import { errText, valueOr } from '../Contract/result'
import { newId } from './ids'
import { readJsonStrict, readKept, writeJson } from '../Files/atomicWrite'
import { asString } from './coerce'
import { nexusDir, nexusConfig, tileHostDir } from '../Paths/paths'
import {
  AGENDA_FOLDERS,
  ASSETS_DIR_REL,
  CONTEXTS_DIR_REL,
  NEXUS_CONFIG_FILES,
} from '../Paths/nexusPaths'
import { join } from '../Paths/posix'
import { createFolderEntity } from './folderEntity'
import type { AgendaRegistration } from './folderKind'

/** Absent is raw mode; a damaged file reads as its last parse, never as raw mode, which would ignore every sidecar's identity. */
export async function readIdentity(root: string): Promise<Record<string, unknown> | null> {
  const identity = await readKept(nexusConfig(root, NEXUS_CONFIG_FILES.identity))
  return identity && retireAgendaKey(identity)
}

export async function ensureIdentity(
  root: string,
): Promise<{ id: string | null; created: boolean }> {
  const path = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  const read = await readJsonStrict(path)
  if (!read.ok && read.error.code !== 'not-found') return { id: null, created: false }
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

export async function ensureConfigLayout(root: string): Promise<void> {
  await machine().mkdir(join(root, ASSETS_DIR_REL))
  await machine().mkdir(join(root, CONTEXTS_DIR_REL))
  await machine().mkdir(tileHostDir(root))
}

function retireAgendaKey(identity: Record<string, unknown>): Record<string, unknown> {
  if (!('agenda_singletons' in identity)) return identity
  const { agenda_singletons, ...rest } = identity
  return { agenda_folders: agenda_singletons, ...rest }
}

async function seedAgenda(root: string): Promise<AgendaRegistration> {
  const out: AgendaRegistration = {}
  for (const slot of AGENDA_FOLDERS) {
    const title = slot.charAt(0).toUpperCase() + slot.slice(1)
    const id = newId()
    if ((await createFolderEntity(root, slot, title, id)).ok) out[slot] = id
  }
  return out
}
