import { join } from '../Paths/posix'
import { baseSidecar } from './schemas'
import { pathExists } from '../Files/atomicWrite'
import { listEntries } from '../Files/walk'
import { AGENDA_FOLDERS, type AgendaFolder, SIDECAR_FILENAME } from '../Paths/paths'
import { readSidecar } from '../Files/sidecar'

export type FolderKind = 'collection' | 'set' | AgendaFolder | 'unknown'

export type AgendaRegistration = Partial<Record<AgendaFolder, string>>

export interface FolderKindContext {
  agenda: AgendaRegistration
  homed: ReadonlySet<AgendaFolder>
  root: string
  adopting?: boolean
}

export function readAgendaRegistration(
  identity: Record<string, unknown> | null,
): AgendaRegistration {
  const raw = identity?.agenda_folders
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const rec = raw as Record<string, unknown>
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

  if (depth === 'nested') return 'set'
  if (ctx.adopting) return 'collection'
  return (await pathExists(join(absDir, SIDECAR_FILENAME.collection))) ? 'collection' : 'unknown'
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
  adopting = false,
): Promise<FolderKindContext> {
  const registered = readAgendaRegistration(identity)
  if (Object.keys(registered).length === 0) {
    return { agenda: {}, homed: new Set(), root, adopting }
  }

  // An unreadable root yields no entries, so no claims are counted and the recorded registration stands — a root Pommora cannot list is no evidence that anything duplicated it.
  const entries = (await listEntries(root)).filter((e) => e.kind === 'dir')
  // Counting is order-independent, so the reads fan out — this runs on every walk, and a serial pass costs one round trip per root folder per slot before anything can render.
  const found = await Promise.all(
    entries.flatMap((e) =>
      AGENDA_FOLDERS.map((slot) => readSidecar(join(root, e.name), slot, baseSidecar)),
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
  return { agenda, homed, root, adopting }
}
