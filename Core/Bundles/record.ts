import { join, relDirname } from '../Paths/posix'
import { z } from 'zod'
import type { CascadeReport, StrippedLink } from '../Nexus/cascade'
import { isPlainObject } from '../Contract/validators'
import type { Result } from '../Contract/result'
import { stashBlock } from '../Properties/properties'
import { readJsonObject, rmwJsonStrict, writeJson } from '../Files/atomicWrite'
import { contextEntry } from '../Contexts/contexts'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '../Nexus/tree'
import { containerAt, containerTrailById } from '../Nexus/treePatch'

/** The underscore is load-bearing: the artifact shares this folder under its own real name, so the record wears a prefix no entity may. */
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
    /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
    links: z.array(strippedLink).optional(),
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
    place,
    /** Its place in the Property Panel's Context order, which moves apart from the registry's. */
    panel: place,
    spaceOrder: z.array(z.string()).optional(),
    membership: z.array(z.object({ root: memberRoot, spaces: z.array(spaceRef) })),
    partial: z.literal(true).optional(),
  }),
])

export type RecordFile = z.infer<typeof recordFile>
export type ContentRecord = Extract<RecordFile, { entity: 'page' | 'collection' | 'set' }>
export type ContainerRecord = Extract<RecordFile, { entity: 'collection' | 'set' }>
export type InnerRecord = Extract<RecordFile, { entity: 'page' | 'set' }>
export type PropertyRecord = Extract<RecordFile, { entity: 'property' }>
/** A partly recorded entry's restore says so, since some of what it held may not have been written down. */
export const recordedPartly = (record: RecordFile, title: string): CascadeReport | undefined =>
  'partial' in record && record.partial
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

export const decodeRecord = (raw: unknown): RecordFile | null => {
  const parsed = recordFile.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
  return decodeRecord(await readRawRecord(bundleDir))
}

/** Merges what `patch` answers into the record in place, raw, answering whether it could. */
export const patchRecord = (
  bundleDir: string,
  patch: (raw: RawRecord) => RawRecord,
): Promise<Result<RawRecord>> =>
  rmwJsonStrict(join(bundleDir, RECORD_FILENAME), (raw) => ({ ...raw, ...patch(raw) }))

const sameLink = (a: StrippedLink, b: unknown): boolean =>
  isPlainObject(b) && a.page === b.page && a.property === b.property && a.value === b.value

const patchLinks = (
  bundleDir: string,
  edit: (held: unknown[]) => unknown[],
): Promise<Result<RawRecord>> =>
  patchRecord(bundleDir, (raw) => {
    const links = edit(Array.isArray(raw.links) ? raw.links : [])
    return { links: links.length ? links : undefined }
  })

/** Each of `links` the record doesn't already hold joins its `links`, so a finish run again over what its strip missed parks nothing twice. */
export const appendLinks = (
  bundleDir: string,
  links: readonly StrippedLink[],
): Promise<Result<RawRecord>> =>
  patchLinks(bundleDir, (held) => [
    ...held,
    ...links.filter((l) => !held.some((h) => sameLink(l, h))),
  ])

export const removeLinks = (
  bundleDir: string,
  links: readonly StrippedLink[],
): Promise<Result<RawRecord>> =>
  patchLinks(bundleDir, (held) => held.filter((h) => !links.some((l) => sameLink(l, h))))

export function placeOf(ids: readonly string[], id: string): Place | undefined {
  const at = ids.indexOf(id)
  if (at === -1) return undefined
  const above = ids[at + 1]
  const below = ids[at - 1]
  return { ...(above ? { above } : {}), ...(below ? { below } : {}) }
}

const trailAbove = (tree: NexusTree, containerId: string): string[] | null =>
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

/** The trail an origin stands on once a container on its chain stands at `held`, its ids Collection first: those down to it, then those the origin's record stored below it. */
export function retrailed(origin: Origin, held: readonly string[]): string[] {
  const chain = [...origin.trail, origin.parent]
  return [...held, ...chain.slice(chain.indexOf(held[held.length - 1]) + 1)].slice(0, -1)
}

/** `origin` on the trail it stands on now: down to the deepest container on its chain the tree holds, then the ids its record stored below that one; null when the tree holds none of them. */
export function currentOrigin(tree: NexusTree, origin: Origin): Origin | null {
  const held = [...origin.trail, origin.parent]
    .reverse()
    .map((id) => containerTrailById(tree, id))
    .find((trail) => trail !== null)
  if (!held) return null
  const ids = held.map((n) => n.id)
  return { ...origin, trail: retrailed(origin, ids) }
}

export const standingCollection = (tree: NexusTree, origin: Origin): string =>
  collectionOf(currentOrigin(tree, origin) ?? origin)

export function gatherContentRecord(
  tree: NexusTree,
  node: PageNode | CollectionNode | SetNode,
): ContentRecord {
  const atRoot = node.kind === 'collection'
  const container = atRoot ? null : containerAt(tree, relDirname(node.path))
  const siblings: readonly { id: string }[] | undefined = atRoot
    ? tree.collections
    : node.kind === 'page'
      ? container?.pages
      : container?.sets
  const placed =
    siblings &&
    placeOf(
      siblings.map((n) => n.id),
      node.id,
    )
  const trail = container ? trailAbove(tree, container.id) : null
  return {
    entity: node.kind,
    id: node.id,
    ...(node.kind !== 'page' && node.icon ? { icon: node.icon } : {}),
    parent: atRoot
      ? { kind: 'root' }
      : container
        ? { kind: 'container', id: container.id }
        : { kind: 'unaddressable' },
    ...(placed ? { place: placed } : {}),
    ...(trail ? { trail } : {}),
  }
}
