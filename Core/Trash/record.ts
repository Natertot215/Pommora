// The provenance record: one JSON inside every nexus-trashed artifact's deletion bundle. It
// records what departed and where it belonged — ids, never name-based locations — written by the
// delete BEFORE anything is destroyed, read by restore, removed with the bundle it spends, never
// entering the live tree.
//
// The write is all-or-nothing per record: a kind's REQUIRED payload failing to gather (a Context
// whose registry entry cannot be read) writes no record at all, degrading that entity to
// hand-restore rather than trusting a silently incomplete one. The parent is not required — it
// degrades to `unaddressable`.

import { join } from 'node:path'
import { z } from 'zod'
import { hiddenName } from '../Locations/exclusion'
import { mintBundle } from './bundle'
import { readJsonObject, writeJson } from '../IO/atomicWrite'
import { listEntries } from '../IO/walk'

/** The underscore is load-bearing, not decoration: the artifact shares this folder under its own
 *  real name, so the record wears a prefix no entity may. Every naming gate refuses a hidden
 *  prefix — the same convention the walk hides by — and the atomic writer's temp sibling inherits
 *  this name's prefix, so it is skipped alongside Finder's litter. */
export const RECORD_FILENAME = '_record.json'

const parentRef = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('root') }),
  z.object({ kind: z.literal('container'), id: z.string() }),
  z.object({ kind: z.literal('context'), id: z.string() }),
  z.object({ kind: z.literal('unaddressable') }),
])

const memberRoot = z.looseObject({ id: z.string().optional(), kind: z.enum(['page', 'space']) })
const spaceRef = z.looseObject({ id: z.string().optional(), title: z.string() })

const contentRecord = <E extends string>(entity: E) =>
  z.looseObject({
    entity: z.literal(entity),
    id: z.string().optional(),
    parent: parentRef,
    partial: z.literal(true).optional(),
  })

export const recordFile = z.discriminatedUnion('entity', [
  contentRecord('page'),
  contentRecord('collection'),
  contentRecord('set'),
  z.looseObject({
    entity: z.literal('space'),
    id: z.string(),
    parent: parentRef,
    /** The id-bearing roots whose frontmatter carried this Space's tag at the delete. */
    members: z.array(memberRoot),
    partial: z.literal(true).optional(),
  }),
  z.looseObject({
    entity: z.literal('property'),
    id: z.string(),
    /** The registry definition the delete removes — restore has nothing else to rebuild from. */
    def: z.looseObject({ id: z.string() }),
    /** Page id → the raw value the scrub stripped. Ids, never paths. */
    values: z.record(z.string(), z.unknown()),
    /** Collection sidecar ids that assigned it — without these a restored property belongs to
     *  nothing and shows nowhere. Absent on records written before it was recorded. */
    assignments: z.array(z.string()).optional(),
    partial: z.literal(true).optional(),
  }),
  z.looseObject({
    entity: z.literal('context'),
    /** The registry entry the erase destroys — a hand-restored folder returns nothing without it. */
    registry: z.looseObject({
      id: z.string(),
      title: z.string(),
      singular: z.string().optional(),
      icon: z.string().optional(),
    }),
    /** Per swept root, the Space list its stripped key held — ids joined at gather, titles as labels. */
    membership: z.array(z.looseObject({ root: memberRoot, spaces: z.array(spaceRef) })),
    partial: z.literal(true).optional(),
  }),
])

export type RecordFile = z.infer<typeof recordFile>
export type ParentRef = z.infer<typeof parentRef>

/** Atomic, inside the bundle the delete minted — `.trash` is unwatched, so this costs no
 *  watcher event. Written before the destruction it describes; the artifact arrives after. */
export async function writeRecord(bundleDir: string, record: RecordFile): Promise<void> {
  await writeJson(join(bundleDir, RECORD_FILENAME), record)
}

/** The artifact-less shape: a property delete trashes nothing, so its bundle holds the record
 *  alone. The synthetic source names the bundle and lands it flat in `.trash`. */
export async function writePropertyBundle(
  root: string,
  record: Extract<RecordFile, { entity: 'property' }>,
): Promise<string> {
  const bundle = await mintBundle(root, join(root, `property-${record.id}`))
  await writeRecord(bundle, record)
  return bundle
}

/** Null for missing, unreadable, or shape-mismatched — a record is trusted by restore, so a
 *  file that does not validate is not a record, and its folder is not a bundle. */
export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
  const raw = await readJsonObject(join(bundleDir, RECORD_FILENAME))
  if (raw === null) return null
  const parsed = recordFile.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/** The one artifact a settled bundle holds, or null when the deletion never finished. Names the
 *  walk hides — Finder's `.DS_Store`, AppleDouble litter, the record itself — are skipped rather
 *  than read as a second candidate: `invalidName` forbids those prefixes, so no real entity
 *  wears one. */
export async function bundleArtifact(bundleDir: string): Promise<string | null> {
  const found = (await listEntries(bundleDir)).filter((e) => !hiddenName(e.name))
  return found.length === 1 ? join(bundleDir, found[0].name) : null
}
