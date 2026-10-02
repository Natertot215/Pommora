import { isPlainObject } from '../Contract/validators'
import { join } from '../Paths/posix'
import { baseSidecar } from './schemas'
import { pathExists } from '../Files/atomicWrite'
import { isContentFile, listEntries, visibleFolders } from '../Files/walk'
import { outsideContent, type WatchScope } from '../Paths/exclusion'
import { AGENDA_FOLDERS, type AgendaFolder, SIDECAR_FILENAME } from '../Paths/nexusPaths'
import { readSidecar } from '../Files/sidecar'

export type FolderKind = 'collection' | 'set' | AgendaFolder | 'unknown'

export type AgendaRegistration = Partial<Record<AgendaFolder, string>>

export interface FolderKindContext {
  agenda: AgendaRegistration
  homed: ReadonlySet<AgendaFolder>
  root: string
}

export function readAgendaRegistration(
  identity: Record<string, unknown> | null,
): AgendaRegistration {
  const rec = identity?.agenda_folders
  if (!isPlainObject(rec)) return {}
  const out: AgendaRegistration = {}
  for (const slot of AGENDA_FOLDERS) {
    const id = rec[slot]
    if (typeof id === 'string' && id) out[slot] = id
  }
  return out
}

export async function resolveFolderKind(
  absDir: string,
  depth: 'root' | 'nested',
  ctx: FolderKindContext,
): Promise<FolderKind> {
  if (absDir === ctx.root) return 'unknown'
  const present = await Promise.all(
    AGENDA_FOLDERS.map((slot) => pathExists(join(absDir, SIDECAR_FILENAME[slot]))),
  )
  const claimed = AGENDA_FOLDERS.filter((_, i) => present[i])

  if (claimed.length > 0) {
    if (claimed.length > 1) return 'unknown'
    const [slot] = claimed
    if (await hasContainerSidecar(absDir)) return 'unknown'
    if (depth !== 'root') return 'unknown'
    const sidecar = await readSidecar(absDir, slot, baseSidecar)
    const registered = ctx.agenda[slot]
    return sidecar && registered && sidecar.id === registered ? slot : 'unknown'
  }

  return depth === 'nested' ? 'set' : 'collection'
}

async function hasContainerSidecar(absDir: string): Promise<boolean> {
  const [collection, set] = await Promise.all([
    pathExists(join(absDir, SIDECAR_FILENAME.collection)),
    pathExists(join(absDir, SIDECAR_FILENAME.set)),
  ])
  return collection || set
}

export async function agendaContext(
  root: string,
  identity: Record<string, unknown> | null,
): Promise<FolderKindContext> {
  const registered = readAgendaRegistration(identity)
  if (Object.keys(registered).length === 0) {
    return { agenda: {}, homed: new Set(), root }
  }

  // An unreadable root yields no entries, so no claims are counted and the recorded registration stands — a root Pommora cannot list is no evidence that anything duplicated it.
  const folders = await visibleFolders(root)
  // Counting is order-independent, so the reads fan out — this runs on every walk, and a serial pass costs one round trip per root folder per slot before anything can render.
  const found = await Promise.all(
    folders.flatMap((name) =>
      AGENDA_FOLDERS.map((slot) => readSidecar(join(root, name), slot, baseSidecar)),
    ),
  )
  const claims = new Map<string, number>()
  for (const sidecar of found) {
    if (sidecar?.id) claims.set(sidecar.id, (claims.get(sidecar.id) ?? 0) + 1)
  }
  const agenda: AgendaRegistration = {}
  const homed = new Set<AgendaFolder>()
  for (const slot of AGENDA_FOLDERS) {
    const id = registered[slot]
    if (!id) continue
    const claimants = claims.get(id) ?? 0
    if (claimants <= 1) agenda[slot] = id
    if (claimants >= 1) homed.add(slot)
  }
  return { agenda, homed, root }
}

// A root folder is a Collection once it has a Collection sidecar or holds pages or subfolders, so an empty, sidecar-less folder (stray junk) never becomes one.
export async function adoptsAsCollection(
  absDir: string,
  relDir: string,
  scope: WatchScope,
): Promise<boolean> {
  if (await pathExists(join(absDir, SIDECAR_FILENAME.collection))) return true
  for (const e of await listEntries(absDir)) {
    if (isContentFile(e)) return true
    if (e.kind === 'dir' && !outsideContent(`${relDir}/${e.name}`, scope)) return true
  }
  return false
}
