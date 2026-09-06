import { join } from '../Locations/posix'
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
    members: z.array(memberRoot),
    partial: z.literal(true).optional(),
  }),
  z.looseObject({
    entity: z.literal('property'),
    id: z.string(),
    def: z.looseObject({ id: z.string() }),
    values: z.record(z.string(), z.unknown()),
    assignments: z.array(z.string()).optional(),
    partial: z.literal(true).optional(),
  }),
  z.looseObject({
    entity: z.literal('context'),
    registry: z.looseObject({
      id: z.string(),
      title: z.string(),
      singular: z.string().optional(),
      icon: z.string().optional(),
    }),
    membership: z.array(z.looseObject({ root: memberRoot, spaces: z.array(spaceRef) })),
    partial: z.literal(true).optional(),
  }),
])

export type RecordFile = z.infer<typeof recordFile>
export type ParentRef = z.infer<typeof parentRef>

export async function writeRecord(bundleDir: string, record: RecordFile): Promise<void> {
  await writeJson(join(bundleDir, RECORD_FILENAME), record)
}

export async function writePropertyBundle(
  root: string,
  record: Extract<RecordFile, { entity: 'property' }>,
): Promise<string> {
  const bundle = await mintBundle(root, join(root, `property-${record.id}`))
  await writeRecord(bundle, record)
  return bundle
}

export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
  const raw = await readJsonObject(join(bundleDir, RECORD_FILENAME))
  if (raw === null) return null
  const parsed = recordFile.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export async function bundleArtifact(bundleDir: string): Promise<string | null> {
  const found = (await listEntries(bundleDir)).filter((e) => !hiddenName(e.name))
  return found.length === 1 ? join(bundleDir, found[0].name) : null
}
