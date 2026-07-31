// What a folder IS, decided in one place. Kind is declared by the well-known sidecar filename a
// folder carries — never by its name — and the answer is depth-aware rather than root-only, so a
// nested agenda config can no longer read as an ordinary Set.
//
// An agenda config only counts where the nexus RECORDS it: registration by sidecar id is the
// guard, which is what makes a duplicated, hand-made or relocated config inert bytes instead of a
// second singleton feeding the same list. No special case does that work.

import { join } from 'node:path'
import { baseSidecar } from '@shared/schemas'
import { pathExists } from './io/atomicWrite'
import { SIDECAR_FILENAME, type SidecarKind } from './paths'
import { readSidecar } from './sidecarIO'

export type FolderKind = 'collection' | 'set' | 'tasks-singleton' | 'events-singleton' | 'unknown'

/** The canonical agenda singletons a nexus records, by sidecar id. */
export interface AgendaRegistration {
  tasks?: string
  events?: string
}

export interface FolderKindContext {
  agenda: AgendaRegistration
  /** A raw, un-adopted nexus carries no container sidecars — there, position alone classifies. */
  sidecarMode: boolean
}

const AGENDA_SLOTS = [
  { sidecar: 'taskConfig', kind: 'tasks-singleton', slot: 'tasks' },
  { sidecar: 'eventConfig', kind: 'events-singleton', slot: 'events' },
] as const satisfies readonly {
  sidecar: SidecarKind
  kind: FolderKind
  slot: keyof AgendaRegistration
}[]

/** The registration recorded on `nexus.json`, read leniently: a nexus that records nothing simply
 *  registers nothing, and every agenda config it holds is inert. Only a string id can register a
 *  folder, so garbage in the field registers nothing rather than matching something. */
export function readAgendaRegistration(identity: Record<string, unknown> | null): AgendaRegistration {
  const raw = identity?.agenda_singletons
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const rec = raw as Record<string, unknown>
  const out: AgendaRegistration = {}
  if (typeof rec.tasks === 'string' && rec.tasks) out.tasks = rec.tasks
  if (typeof rec.events === 'string' && rec.events) out.events = rec.events
  return out
}

/**
 * Classify `absDir`. `depth` is positional: `'root'` for a direct child of the nexus, `'nested'`
 * for anything below. Unknown is the honest answer for anything this can't place — it is not an
 * error, and the callers render nothing for it.
 */
export async function resolveFolderKind(
  absDir: string,
  depth: 'root' | 'nested',
  ctx: FolderKindContext,
): Promise<FolderKind> {
  const present = await Promise.all(
    AGENDA_SLOTS.map((s) => pathExists(join(absDir, SIDECAR_FILENAME[s.sidecar]))),
  )
  const claimed = AGENDA_SLOTS.filter((_, i) => present[i])

  if (claimed.length > 0) {
    // Two agenda configs, or an agenda config beside a container sidecar: the folder makes two
    // claims at once and no arm may pick between them.
    if (claimed.length > 1) return 'unknown'
    const [slot] = claimed
    if (await hasContainerSidecar(absDir)) return 'unknown'
    // Nested is disqualifying on its own — the singleton's recorded place is the nexus root.
    if (depth !== 'root') return 'unknown'
    const sidecar = await readSidecar(absDir, slot.sidecar, baseSidecar)
    const registered = ctx.agenda[slot.slot]
    return sidecar && registered && sidecar.id === registered ? slot.kind : 'unknown'
  }

  if (depth === 'nested') return 'set'
  if (!ctx.sidecarMode) return 'collection'
  return (await pathExists(join(absDir, SIDECAR_FILENAME.collection))) ? 'collection' : 'unknown'
}

async function hasContainerSidecar(absDir: string): Promise<boolean> {
  const [collection, set] = await Promise.all([
    pathExists(join(absDir, SIDECAR_FILENAME.collection)),
    pathExists(join(absDir, SIDECAR_FILENAME.set)),
  ])
  return collection || set
}
