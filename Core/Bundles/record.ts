import { dirname, join, relative } from '../Paths/posix'
import { z } from 'zod'
import type { CascadeReport } from '../Nexus/cascade'
import { stashBlock } from '../Properties/propertyStash'
import { readJsonObject, rmwJsonStrict, writeJson } from '../Files/atomicWrite'
import { index } from '../Files/decoders'
import { stampedIdOf } from '../Files/pageFile'
import { sidecarIdentity } from '../Files/sidecar'
import { contextEntry } from '../Contexts/contexts'
import type { ContainerKind } from '../Nexus/entities'
import type { NexusTree } from '../Nexus/tree'
import { containerAt, containerTrailById } from '../Nexus/treePatch'

/** The underscore is load-bearing: the artifact shares this folder under its own real name, so the record wears a prefix no entity may. The atomic writer's temp sibling inherits it too, so it is skipped alongside Finder's litter. */
const RECORD_FILENAME = '_record.json'

const parentRef = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('root') }),
  z.object({ kind: z.literal('container'), id: z.string() }),
  z.object({ kind: z.literal('context'), id: z.string() }),
  z.object({ kind: z.literal('unaddressable') }),
])

const memberRoot = z.object({
  id: z.string().optional(),
  kind: z.enum(['page', 'space']),
  above: z.string().optional(),
})
const spaceRef = z.object({ id: z.string().optional(), title: z.string() })

/** A Link value a delete stripped whole: its page's id, its property, its value, and the key its line stood above; `StrippedLink` is its type. */
export const strippedLink = z.object({
  page: z.string(),
  property: z.string(),
  value: z.string(),
  above: z.string().optional(),
})

/** The page each outbound link under the artifact named at the delete, by its id and its path then under the key it was written with, so a restore follows it by identity and re-spells only what changed since. */
const linkTargets = z.record(z.string(), z.object({ id: z.string(), path: z.string() })).optional()

/** The ids of the siblings it sat above and below in its origin's order as it left, so a restore lands it back between them. */
const place = z.object({ above: z.string().optional(), below: z.string().optional() }).optional()

export type Place = NonNullable<z.infer<typeof place>>

const contentRecord = <E extends string>(entity: E) =>
  z.object({
    entity: z.literal(entity),
    id: z.string().optional(),
    icon: z.string().optional(),
    parent: parentRef,
    place,
    /** The ids of the containers above `parent`, Collection first; read once the tree no longer holds `parent`, and kept current in the Archive by its carry. */
    trail: z.array(z.string()).optional(),
    /** A Trash record's only: the Archive bundle a delete took the item out of, where its Undo returns it. */
    archive: z.string().optional(),
    /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
    links: z.array(strippedLink).optional(),
    targets: linkTargets,
    partial: z.literal(true).optional(),
  })

// The record itself is never rewritten from its decode; `def` and `registry` decode loose because a restore writes them back. A page's or Set's record decodes whole, so a delete from the Archive and its Undo each write the other store's record from it.
const recordFile = z.discriminatedUnion('entity', [
  contentRecord('page'),
  contentRecord('collection'),
  contentRecord('set'),
  z.object({
    entity: z.literal('space'),
    id: z.string(),
    icon: z.string().optional(),
    parent: parentRef,
    place,
    members: z.array(memberRoot),
    targets: linkTargets,
    partial: z.literal(true).optional(),
  }),
  z.object({
    entity: z.literal('property'),
    id: z.string(),
    // The definition as it stood, kept whole for the restore to decode.
    def: z.looseObject({ id: z.string() }),
    values: z.record(z.string(), z.unknown()),
    above: z.record(z.string(), z.string()).optional(),
    assignments: z.array(z.string()).optional(),
    stashes: z.record(z.string(), stashBlock).optional(),
    partial: z.literal(true).optional(),
  }),
  z.object({
    entity: z.literal('context'),
    registry: contextEntry,
    at: index.optional(),
    membership: z.array(z.object({ root: memberRoot, spaces: z.array(spaceRef) })),
    targets: linkTargets,
    partial: z.literal(true).optional(),
  }),
])

export type RecordFile = z.infer<typeof recordFile>
/** A partly recorded entry's restore says so, since some of what it held may not have been written down. */
export const recordedPartly = (record: RecordFile, title: string): CascadeReport | undefined =>
  record.partial
    ? {
        pages: [],
        hosts: [],
        warning: `“${title}” was recorded partly, so some of what it held may not come back.`,
      }
    : undefined

/** The property shape is artifact-less — there is nothing to place. */
export type ArtifactRecord = Exclude<RecordFile, { entity: 'property' }>

/** A record as its file holds it, which a write that carries it on keeps whole, since a record is never rewritten from its decode. */
export type RawRecord = Record<string, unknown>

export async function writeRecord(
  bundleDir: string,
  record: RecordFile | RawRecord,
): Promise<void> {
  await writeJson(join(bundleDir, RECORD_FILENAME), record)
}

export const readRawRecord = (bundleDir: string): Promise<RawRecord | null> =>
  readJsonObject(join(bundleDir, RECORD_FILENAME))

export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
  const raw = await readRawRecord(bundleDir)
  if (raw === null) return null
  const parsed = recordFile.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/** Merges what `patch` answers into the record in place, raw. */
export async function patchRecord(
  bundleDir: string,
  patch: (raw: RawRecord) => RawRecord,
): Promise<void> {
  await rmwJsonStrict(join(bundleDir, RECORD_FILENAME), (raw) => ({ ...raw, ...patch(raw) }))
}

export function placeOf(ids: readonly string[], id: string): Place | undefined {
  const at = ids.indexOf(id)
  if (at === -1) return undefined
  const above = ids[at + 1]
  const below = ids[at - 1]
  return { ...(above ? { above } : {}), ...(below ? { below } : {}) }
}

export const trailAbove = (tree: NexusTree, containerId: string): string[] | null =>
  containerTrailById(tree, containerId)
    ?.slice(0, -1)
    .map((n) => n.id) ?? null

type Origin = { parent: string; trail: string[] }

/** The container a page or Set left, and the ids it stored above it. */
export const originOf = (record: RecordFile): Origin | null =>
  (record.entity === 'page' || record.entity === 'set') && record.parent.kind === 'container'
    ? { parent: record.parent.id, trail: record.trail ?? [] }
    : null

export const collectionOf = ({ parent, trail }: Origin): string => trail[0] ?? parent

/** Whether an origin lies within the Set `setId`: by `held`, the tree's trail above its parent, while the tree holds the parent, else by the trail it stored. */
export const originWithin = (origin: Origin, setId: string, held: string[] | null): boolean =>
  origin.parent === setId || (held ?? origin.trail).includes(setId)

/** A page's stamped id, or a container's sidecar id and icon. */
export async function identityOf(
  kind: 'page' | ContainerKind,
  abs: string,
): Promise<{ id?: string; icon?: string }> {
  return kind === 'page'
    ? { id: (await stampedIdOf(abs)) ?? undefined }
    : sidecarIdentity(abs, kind)
}

export async function gatherContentRecord(
  root: string,
  tree: NexusTree,
  kind: 'page' | ContainerKind,
  abs: string,
): Promise<RecordFile> {
  const { id, icon } = await identityOf(kind, abs)
  const atRoot = dirname(abs) === root
  const container = atRoot ? null : containerAt(tree, relative(root, dirname(abs)))
  const siblings: readonly { id: string }[] | undefined = atRoot
    ? tree.collections
    : kind === 'page'
      ? container?.pages
      : container?.sets
  const placed =
    id && siblings
      ? placeOf(
          siblings.map((n) => n.id),
          id,
        )
      : undefined
  const trail = container ? trailAbove(tree, container.id) : null
  return {
    entity: kind,
    ...(id ? { id } : {}),
    ...(icon ? { icon } : {}),
    parent: atRoot
      ? { kind: 'root' }
      : container
        ? { kind: 'container', id: container.id }
        : { kind: 'unaddressable' },
    ...(placed ? { place: placed } : {}),
    ...(trail ? { trail } : {}),
  }
}
