// What a folder IS, decided in one place. Kind is declared by the well-known sidecar filename a
// folder carries — never by its name — and classification is depth-aware, so a nested agenda
// config reads as Unknown rather than as an ordinary Set.
//
// An agenda config only counts where the nexus RECORDS it: registration by sidecar id is the
// guard, which is what makes a duplicated, hand-made or relocated config inert bytes instead of a
// second singleton feeding the same list. No special case does that work.

import { join } from 'node:path'
import { baseSidecar } from '@shared/schemas'
import { pathExists } from './io/atomicWrite'
import { listEntries } from './io/walk'
import { SIDECAR_FILENAME, type SidecarKind } from './paths'
import { readSidecar } from './sidecarIO'

export type FolderKind = 'collection' | 'set' | 'tasks-singleton' | 'events-singleton' | 'unknown'

/** Everything that separates one agenda slot from the other, stated once: the sidecar filename
 *  that declares it, the kind it resolves to, the key it registers under, and the name it is
 *  seeded with. Consumers derive from this table rather than restating the pairing — a mapping
 *  kept in more than one place is one edit away from disagreeing with itself. */
export const AGENDA_SLOTS = [
  { slot: 'tasks', sidecar: 'taskConfig', kind: 'tasks-singleton', seedName: 'Tasks' },
  { slot: 'events', sidecar: 'eventConfig', kind: 'events-singleton', seedName: 'Events' },
] as const satisfies readonly {
  slot: string
  sidecar: SidecarKind
  kind: FolderKind
  seedName: string
}[]

export type AgendaSlot = (typeof AGENDA_SLOTS)[number]['slot']

/** The canonical agenda singletons a nexus records, by sidecar id. */
export type AgendaRegistration = Partial<Record<AgendaSlot, string>>

export interface FolderKindContext {
  agenda: AgendaRegistration
  /** The nexus root. It holds no content of its own, so it is never a container. Required, not
   *  optional: an absent root once let the resolver classify the nexus root itself as a Set. */
  root: string
  /** A raw, un-adopted nexus carries no container sidecars — there, position alone classifies. */
  sidecarMode: boolean
}

/** The registration recorded on `nexus.json`, read leniently: a nexus that records nothing simply
 *  registers nothing, and every agenda config it holds is inert. Only a string id can register a
 *  folder, so garbage in the field registers nothing rather than matching something. */
export function readAgendaRegistration(identity: Record<string, unknown> | null): AgendaRegistration {
  const raw = identity?.agenda_singletons
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const rec = raw as Record<string, unknown>
  const out: AgendaRegistration = {}
  for (const { slot } of AGENDA_SLOTS) {
    const id = rec[slot]
    if (typeof id === 'string' && id) out[slot] = id
  }
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
  if (absDir === ctx.root) return 'unknown'
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
  if (Object.keys(registered).length === 0) return { agenda: {}, sidecarMode, root }

  // An unreadable root yields no entries, which counts no claims, which contests no slot — the
  // recorded registration stands. That is the right answer: a root Pommora cannot list is no
  // evidence that anything duplicated it.
  const entries = (await listEntries(root)).filter((e) => e.isDirectory())
  // Counting is order-independent, so the reads fan out — this runs on every walk, and a serial
  // pass costs one round trip per root folder per slot before anything can render.
  const found = await Promise.all(
    entries.flatMap((e) =>
      AGENDA_SLOTS.map((s) => readSidecar(join(root, e.name), s.sidecar, baseSidecar)),
    ),
  )
  const claims = new Map<string, number>()
  for (const sidecar of found) {
    if (sidecar?.id) claims.set(sidecar.id, (claims.get(sidecar.id) ?? 0) + 1)
  }
  const agenda: AgendaRegistration = {}
  for (const { slot } of AGENDA_SLOTS) {
    const id = registered[slot]
    if (id && (claims.get(id) ?? 0) <= 1) agenda[slot] = id
  }
  return { agenda, sidecarMode, root }
}
