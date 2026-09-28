import { join } from '../Paths/posix'
import { z } from 'zod'
import { hiddenName, rootSegs } from '../Paths/exclusion'
import { mintBundle } from './bundle'
import { readJsonObject, writeJson } from '../Files/atomicWrite'
import { listEntries } from '../Files/walk'
import { contextEntry } from '../Contexts/contexts'

/** The underscore is load-bearing: the artifact shares this folder under its own real name, so the record wears a prefix no entity may. The atomic writer's temp sibling inherits it too, so it is skipped alongside Finder's litter. */
const RECORD_FILENAME = '_record.json'

const parentRef = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('root') }),
  z.object({ kind: z.literal('container'), id: z.string() }),
  z.object({ kind: z.literal('context'), id: z.string() }),
  z.object({ kind: z.literal('unaddressable') }),
])

const memberRoot = z.object({ id: z.string().optional(), kind: z.enum(['page', 'space']) })
const spaceRef = z.object({ id: z.string().optional(), title: z.string() })

const strippedLink = z.object({ page: z.string(), property: z.string(), value: z.string() })

const contentRecord = <E extends string>(entity: E) =>
  z.object({
    entity: z.literal(entity),
    id: z.string().optional(),
    parent: parentRef,
    /** The excluded entries a Collection or Set held, relative to it, so a restore lands with them wherever it lands. */
    excluded: z.array(z.string().refine((p) => rootSegs(p).length > 0)).optional(),
    /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
    links: z.array(strippedLink).optional(),
    partial: z.literal(true).optional(),
  })

// The record itself is never rewritten from its decode; `def` and `registry` decode loose because a restore writes them back.
const recordFile = z.discriminatedUnion('entity', [
  contentRecord('page'),
  contentRecord('collection'),
  contentRecord('set'),
  z.object({
    entity: z.literal('space'),
    id: z.string(),
    parent: parentRef,
    members: z.array(memberRoot),
    partial: z.literal(true).optional(),
  }),
  z.object({
    entity: z.literal('property'),
    id: z.string(),
    // The definition as it stood, kept whole for the restore to decode.
    def: z.looseObject({ id: z.string() }),
    values: z.record(z.string(), z.unknown()),
    assignments: z.array(z.string()).optional(),
    caches: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    partial: z.literal(true).optional(),
  }),
  z.object({
    entity: z.literal('context'),
    registry: contextEntry,
    at: z.number().int().nonnegative().optional(),
    membership: z.array(z.object({ root: memberRoot, spaces: z.array(spaceRef) })),
    partial: z.literal(true).optional(),
  }),
])

export type RecordFile = z.infer<typeof recordFile>
export type ParentRef = z.infer<typeof parentRef>
export type StrippedLink = z.infer<typeof strippedLink>

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
