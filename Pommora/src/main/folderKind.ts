// What a folder IS, decided in one place. Kind is declared by the well-known sidecar filename a
// folder carries — never by its name — and classification is depth-aware, so a nested agenda
// config reads as Unknown rather than as an ordinary Set.
//
// An agenda config only counts where the nexus RECORDS it: registration by sidecar id is the
// guard, which is what makes a duplicated, hand-made or relocated config inert bytes instead of a
// second singleton feeding the same list. No special case does that work.

import { readdir } from 'node:fs/promises'
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
  /** The nexus root. It holds no content of its own, so it is never a container. */
  root?: string
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
  if (ctx.root !== undefined && absDir === ctx.root) return 'unknown'
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

/**
 * Build the context for a nexus, with contested slots dropped.
 *
 * Registration keys on the config sidecar's id, and every ordinary duplication mechanism — a
 * Finder duplicate, `cp -R`, a restored backup, a sync conflict copy — reproduces that id. Two
 * folders then answer to one record, which is the same ambiguity `resolveFolderKind` already
 * refuses within a single folder: when more than one claims a slot, no arm may pick between them.
 *
 * Dropping the slot here rather than adding an arm to the resolver is what makes it total — every
 * consumer reads Unknown for free because `registered` is undefined, and the re-homing pass
 * short-circuits before it can relocate anyone's folder. The real singleton goes inert alongside
 * its copy, deliberately: nothing is written, so deleting the stray config restores the nexus
 * completely, which is exactly what stamping the copy's members would make impossible.
 */
export async function agendaContext(
  root: string,
  identity: Record<string, unknown> | null,
  sidecarMode: boolean,
): Promise<FolderKindContext> {
  const registered = readAgendaRegistration(identity)
  const slots = Object.keys(registered) as (keyof AgendaRegistration)[]
  if (slots.length === 0) return { agenda: {}, sidecarMode, root }

  let entries: string[]
  try {
    entries = (await readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  } catch {
    return { agenda: registered, sidecarMode, root }
  }

  const claims = new Map<string, number>()
  for (const name of entries) {
    for (const slot of AGENDA_SLOTS) {
      const sidecar = await readSidecar(join(root, name), slot.sidecar, baseSidecar)
      if (sidecar?.id) claims.set(sidecar.id, (claims.get(sidecar.id) ?? 0) + 1)
    }
  }
  const agenda: AgendaRegistration = {}
  for (const slot of slots) {
    const id = registered[slot]
    if (id && (claims.get(id) ?? 0) <= 1) agenda[slot] = id
  }
  return { agenda, sidecarMode, root }
}
