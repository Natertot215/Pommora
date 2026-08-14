// The provenance half of the record: one JSON inside every nexus-trashed artifact's deletion
// bundle. It records what departed and where it belonged — ids, never name-based locations —
// written by the delete BEFORE anything is destroyed, read by restore, removed with the bundle
// it spends, never entering the live tree.
//
// The write is all-or-nothing per record: a kind's REQUIRED payload failing to gather (a Context
// whose registry entry cannot be read) writes no record at all — a recordless bundle is not a
// bundle, so it degrades that one entity to hand-restore where a silently incomplete record
// would be trusted by restore. The parent is not a required payload: it degrades to
// `unaddressable`.

import type { Dirent } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path'
import { z } from 'zod'
import { contextKey, type ContextsRegistry } from '@shared/contexts'
import { contentId } from '@shared/identity'
import { errText, fail, ok, type Result } from '@shared/result'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import { ensureFolderId } from './adopt'
import { mutateRegistryFile } from './contextsRegistry'
import type { SweepCapture, UnlinkOutcome } from './crud/contextCascade'
import { reconcile } from './crud/reconcile'
import { restoreProperty } from './crud/restoreProperty'
import { scrubReturning } from './crud/restoreScrub'
import { sweepAdmits } from './crud/util'
import { hiddenName } from './exclusion'
import {
  BUNDLE_SUFFIX,
  mintBundle,
  pathExists,
  readJsonObject,
  rewritePageSerialized,
  writeJson,
} from './io/atomicWrite'
import { listEntries } from './io/walk'
import { serializeOnFile } from './io/fileLock'
import { mergeFrontmatter, splitEnvelope } from './io/pageFile'
import { recordWrite } from './io/writeEcho'
import { SIDECAR_FILENAME, SPACE_SIDECAR } from './paths'
import { readNexus, splitFrontmatter } from './readNexus'
import { projectBaseline } from './record'

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

const sidecarId = async (absFolder: string, name: string): Promise<string | undefined> => {
  const raw = await readJsonObject(join(absFolder, name))
  return typeof raw?.id === 'string' ? raw.id : undefined
}

/** The parent of a content entity: the nexus root, a container by sidecar id, or `unaddressable`.
 *
 *  A folder the filesystem handed Pommora — made in Finder, or by an agent — carries no persisted
 *  id until an open stamps it, and the tree's placeholder for it is a path hash, which this record
 *  may never store. So the parent is given an identity before it is named by one; only a sidecar
 *  that exists and cannot be read stays `unaddressable`, because minting over it would destroy the
 *  schema and views it still holds. */
async function gatherParentRef(root: string, absEntity: string): Promise<ParentRef> {
  const parentDir = dirname(absEntity)
  if (parentDir === root) return { kind: 'root' }
  const read = async (): Promise<string | undefined> =>
    (await sidecarId(parentDir, SIDECAR_FILENAME.set)) ??
    (await sidecarId(parentDir, SIDECAR_FILENAME.collection))
  let id = await read()
  if (!id) {
    await ensureFolderId(root, parentDir)
    id = await read()
  }
  return id ? { kind: 'container', id } : { kind: 'unaddressable' }
}

export async function gatherContentRecord(
  root: string,
  kind: 'page' | 'collection' | 'set',
  abs: string,
): Promise<RecordFile> {
  const parent = await gatherParentRef(root, abs)
  const id =
    kind === 'page'
      ? contentId(splitFrontmatter(await readFile(abs, 'utf8').catch(() => '')))
      : await sidecarId(abs, SIDECAR_FILENAME[kind])
  return { entity: kind, ...(id ? { id } : {}), parent }
}

/** A sweep that never ran, could not read a root, or was refused one left the membership thinner
 *  than the truth — the record says so rather than reading complete. */
const sweepIncomplete = (swept: UnlinkOutcome | null): boolean =>
  swept === null || swept.skipped.length > 0 || swept.refused.length > 0

/** A Space's own id is its required payload — its sidecar unreadable means no record. The parent
 *  Context resolves through the registry read taken before the erase. */
export async function gatherSpaceRecord(
  abs: string,
  registry: Result<ContextsRegistry> | null,
  swept: UnlinkOutcome | null,
): Promise<RecordFile | null> {
  const id = await sidecarId(abs, SPACE_SIDECAR)
  if (!id) return null
  const contextTitle = basename(dirname(abs))
  const def = registry?.ok ? registry.value.contexts.find((c) => c.title === contextTitle) : undefined
  const captured = swept?.captured ?? []
  const members = captured
    .filter((c): c is SweepCapture & { id: string } => typeof c.id === 'string')
    .map((c) => ({ id: c.id, kind: c.kind }))
  // An id-less tagging root was genuinely stripped but cannot be restored — the members
  // list is thinner than the truth and the record says so.
  const partial = sweepIncomplete(swept) || members.length < captured.length
  return {
    entity: 'space',
    id,
    parent: def ? { kind: 'context', id: def.id } : { kind: 'unaddressable' },
    members,
    ...(partial ? { partial: true as const } : {}),
  }
}

export interface ContextEvidence {
  entry: { id: string; title: string; singular?: string; icon?: string }
  /** Space title → id, from the Context's OWN folder — the scoped read, never the whole world. */
  spaceIds: Map<string, string>
  unresolved: boolean
}

/** Gather points 0 and 1 for a Context delete: the registry entry (required — null means no
 *  record) and the own-folder Space map that joins captured titles to ids. Scoped to this
 *  Context's folder deliberately: an unreadable sidecar in an UNRELATED Context is not this
 *  delete's evidence and must not suppress its record. */
export async function gatherContextEvidence(
  abs: string,
  title: string,
  registry: Result<ContextsRegistry>,
): Promise<ContextEvidence | null> {
  if (!registry.ok) return null
  const entry = registry.value.contexts.find((c) => c.title === title)
  if (!entry) return null
  const spaceIds = new Map<string, string>()
  let unresolved = false
  let dirs: Dirent[] = []
  try {
    dirs = await readdir(abs, { withFileTypes: true })
  } catch {
    unresolved = true
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const sidecar = join(abs, d.name, SPACE_SIDECAR)
    const raw = await readJsonObject(sidecar)
    if (typeof raw?.id === 'string') spaceIds.set(d.name, raw.id)
    // Absent sidecar = a plain folder, silent; present-but-unusable marks the evidence
    // incomplete rather than silently thinning the membership join.
    else if (await pathExists(sidecar)) unresolved = true
  }
  return { entry: { ...entry }, spaceIds, unresolved }
}

export function buildContextRecord(
  evidence: ContextEvidence,
  swept: UnlinkOutcome | null,
): RecordFile {
  const membership = (swept?.captured ?? []).map((c) => ({
    root: { ...(c.id ? { id: c.id } : {}), kind: c.kind },
    spaces: c.values.map((title) => {
      const id = evidence.spaceIds.get(title)
      return id ? { id, title } : { title }
    }),
  }))
  const partial = evidence.unresolved || sweepIncomplete(swept)
  return {
    entity: 'context',
    registry: evidence.entry,
    membership,
    ...(partial ? { partial: true as const } : {}),
  }
}

// ---------- resolution ----------

export interface Placement {
  /** Nexus-relative directory the artifact re-enters; '' is the root. */
  dir: string
  /** Final basename for the artifact — extension included for pages. */
  finalName: string
  /** For a Space or Context: the final title restore writes everywhere (folder, registry,
   *  re-applied membership keys). Recorded titles are labels; this is the decision. */
  finalTitle?: string
}

export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
export type Resolution = { place: Placement } | { refuse: Refusal }

/** The property shape is artifact-less — there is nothing to place. */
export type ArtifactRecord = Exclude<RecordFile, { entity: 'property' }>

const fold = (s: string): string => s.normalize('NFC').toLowerCase()

/** The create convention: a name already held — case- and form-insensitively — gains a counter. */
const disambiguate = (base: string, taken: string[]): string => {
  const held = taken.map(fold)
  const isTaken = (title: string): boolean => held.includes(fold(title))
  if (!isTaken(base)) return base
  let n = 2
  while (isTaken(`${base} ${n}`)) n++
  return `${base} ${n}`
}

function findContainer(tree: NexusTree, id: string): CollectionNode | SetNode | null {
  const inSets = (sets: SetNode[] | undefined): SetNode | null => {
    for (const s of sets ?? []) {
      if (s.id === id) return s
      const hit = inSets(s.sets)
      if (hit) return hit
    }
    return null
  }
  for (const c of tree.collections) {
    if (c.id === id) return c
    const hit = inSets(c.sets)
    if (hit) return hit
  }
  return null
}

/** THE decision. A placement with final names against the CURRENT tree — a renamed parent
 *  resolves to its renamed path — or a typed refusal. The acting code branches on nothing:
 *  every name and title choice is made here, because choosing is deciding. A live id refusal
 *  outranks every other answer — nothing may write over a living identity. */
export function resolveRecord(
  record: ArtifactRecord,
  baseName: string,
  tree: NexusTree,
): Resolution {
  const live = projectBaseline(tree).entries
  const recordId = record.entity === 'context' ? record.registry.id : record.id
  if (recordId && live[recordId]) return { refuse: 'id-live' }

  if (record.entity === 'context') {
    const finalTitle = disambiguate(
      record.registry.title,
      tree.contexts.map((g) => g.def.title),
    )
    return { place: { dir: '.nexus/contexts', finalName: finalTitle, finalTitle } }
  }

  if (record.entity === 'space') {
    const parent = record.parent
    if (parent.kind === 'unaddressable') return { refuse: 'unaddressable' }
    if (parent.kind !== 'context') return { refuse: 'cannot-hold' }
    const group = tree.contexts.find((g) => g.def.id === parent.id)
    if (!group) return { refuse: 'parent-gone' }
    const finalTitle = disambiguate(
      baseName,
      group.spaces.map((s) => s.title),
    )
    return { place: { dir: `.nexus/contexts/${group.def.title}`, finalName: finalTitle, finalTitle } }
  }

  switch (record.parent.kind) {
    case 'unaddressable':
      return { refuse: 'unaddressable' }
    case 'context':
      return { refuse: 'cannot-hold' }
    case 'root': {
      if (record.entity !== 'collection') return { refuse: 'cannot-hold' }
      const finalName = disambiguate(
        baseName,
        tree.collections.map((c) => c.title),
      )
      return { place: { dir: '', finalName } }
    }
    case 'container': {
      if (record.entity === 'collection') return { refuse: 'cannot-hold' }
      const parent = findContainer(tree, record.parent.id)
      if (!parent)
        return live[record.parent.id] ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
      // A page and a Set share one folder namespace — both sibling sets block both kinds.
      const siblings = [...parent.pages.map((p) => p.title), ...(parent.sets ?? []).map((s) => s.title)]
      if (record.entity === 'page') {
        const finalTitle = disambiguate(baseName.replace(/\.md$/i, ''), siblings)
        return { place: { dir: parent.path, finalName: `${finalTitle}.md` } }
      }
      return { place: { dir: parent.path, finalName: disambiguate(baseName, siblings) } }
    }
  }
}

// ---------- the spend path ----------

export interface ListedBundle {
  /** Nexus-relative bundle path — the reference the restore op takes. */
  bundlePath: string
  record: RecordFile
  /** The artifact's own basename, as it was when it left. Absent only for the artifact-less
   *  `property` bundle. It is the sole source of a row's title, and the walk already had it. */
  artifactName?: string
}

/** Every spendable bundle under `.trash`. A bundle is a `.deleted` folder HOLDING A RECORD — the
 *  name alone can't decide it, because `.trash` mirrors the nexus and a user's own folder may
 *  wear that name anywhere in the chain. A bundle's interior is trashed content rather than trash
 *  structure, so the walk stops at one and never reads a deletion out of what it holds.
 *
 *  A content bundle with no artifact is a deletion that never finished: skipped, and never
 *  removed — the record is the only evidence that destruction happened. */
export async function listBundles(root: string): Promise<ListedBundle[]> {
  const out: ListedBundle[] = []
  const walk = async (dir: string): Promise<void> => {
    for (const e of await listEntries(dir)) {
      if (!e.isDirectory()) continue
      const abs = join(dir, e.name)
      const record = e.name.endsWith(BUNDLE_SUFFIX) ? await readRecord(abs) : null
      if (!record) {
        await walk(abs)
        continue
      }
      const artifact = record.entity === 'property' ? null : await bundleArtifact(abs)
      if (record.entity !== 'property' && !artifact) continue
      out.push({
        bundlePath: relative(root, abs),
        record,
        ...(artifact ? { artifactName: basename(artifact) } : {}),
      })
    }
  }
  await walk(join(root, '.trash'))
  return out
}

const REFUSAL_TEXT: Record<Refusal, string> = {
  'parent-gone': 'The place this belonged to no longer exists.',
  'cannot-hold': 'The place this belonged to can no longer hold it.',
  unaddressable: 'Where this belonged was never recorded.',
  'id-live': 'Something in the nexus already carries this identity.',
}

/** Merge titles into a governed context key on one root — a page's frontmatter under its file
 *  lock, or a Space sidecar. True only when the write landed; the reconcile loop spends on it. */
async function addContextValues(
  root: string,
  entry: { kind: string; path: string } | undefined,
  key: string,
  titles: string[],
): Promise<boolean> {
  if (!entry || (entry.kind !== 'page' && entry.kind !== 'space')) return false
  const merge = (raw: Record<string, unknown>): unknown[] => {
    const existing = Array.isArray(raw[key])
      ? (raw[key] as unknown[]).filter((v): v is string => typeof v === 'string')
      : []
    return [...existing, ...titles.filter((t) => !existing.includes(t))]
  }
  if (entry.kind === 'page') {
    const abs = join(root, entry.path)
    return rewritePageSerialized(abs, (content) => {
      if (!sweepAdmits(content)) return null
      const raw = splitFrontmatter(content)
      return mergeFrontmatter(content, { [key]: merge(raw) }, [key], splitEnvelope(content).body)
    }).catch(() => false)
  }
  const file = join(root, entry.path, SPACE_SIDECAR)
  return serializeOnFile(file, async () => {
    const raw = await readJsonObject(file)
    if (!raw) return false
    await writeJson(file, { ...raw, [key]: merge(raw) })
    return true
  })
}

/** Re-key the restored subtree's own context keys to the final title. These are the passengers
 *  the delete's sweep deliberately left intact; a pre-existing key already wearing the new
 *  title merges and dedupes rather than being overwritten. */
async function rekeyPassengers(
  absContextDir: string,
  oldTitle: string,
  newTitle: string,
): Promise<void> {
  const oldKey = contextKey(oldTitle)
  const newKey = contextKey(newTitle)
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  for (const d of await listEntries(absContextDir)) {
    if (!d.isDirectory()) continue
    const file = join(absContextDir, d.name, SPACE_SIDECAR)
    await serializeOnFile(file, async () => {
      const raw = await readJsonObject(file)
      if (!raw || !(oldKey in raw)) return
      const existing = strings(raw[newKey])
      const merged = [...existing, ...strings(raw[oldKey]).filter((v) => !existing.includes(v))]
      const next = { ...raw }
      delete next[oldKey]
      if (merged.length) next[newKey] = merged
      await writeJson(file, next)
    })
  }
}

/** Current Space titles inside a restored Context folder, by sidecar id — the membership join
 *  runs on ids; the as-restored folder names are what gets written. */
async function restoredSpaceTitles(absContextDir: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  for (const d of await listEntries(absContextDir)) {
    if (!d.isDirectory()) continue
    const raw = await readJsonObject(join(absContextDir, d.name, SPACE_SIDECAR))
    if (typeof raw?.id === 'string') titles.set(raw.id, d.name)
  }
  return titles
}

/** The assertion both spend paths make for themselves. Path, root and suffix are not sufficient:
 *  `.trash` mirrors the nexus, so a user's own folder wearing the bundle suffix passes all three
 *  while holding real bundles inside it. A bundle is a folder holding a record.
 *
 *  Both sides are already canonical — the session root is realpath'd when it opens, and the op's
 *  path resolver realpaths both ends again before this is reached. */
async function openBundle(root: string, bundleAbs: string): Promise<Result<RecordFile>> {
  const trashPrefix = join(root, '.trash') + sep
  if (!bundleAbs.startsWith(trashPrefix) || !bundleAbs.endsWith(BUNDLE_SUFFIX))
    return fail('operation-failed', 'Only a trash record can be spent.')
  const record = await readRecord(bundleAbs)
  return record ? ok(record) : fail('operation-failed', 'That deletion record is unreadable.')
}

/** Give a bundle up for good: the artifact leaves for the operating system's trash, or is erased
 *  outright when the switch is on, and the spent bundle is removed behind it. The record has no
 *  value past the moment its entity is given up, and a user who later opens the system's trash
 *  should find the file rather than a stamped folder wrapping it.
 *
 *  Artifact first is deliberate. If the bundle's removal then fails, what is left is a record with
 *  no artifact — litter the listing already skips. The reverse order risks the opposite orphan
 *  while the artifact is still live. */
export async function emptyBundle(
  root: string,
  bundleAbs: string,
  deps: { permanentDelete?: boolean; trashToSystem: (absPath: string) => Promise<void> },
): Promise<Result<null>> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  const artifactAbs = opened.value.entity === 'property' ? null : await bundleArtifact(bundleAbs)
  if (artifactAbs) {
    if (deps.permanentDelete === true) await rm(artifactAbs, { recursive: true, force: true })
    else await deps.trashToSystem(artifactAbs)
  }
  await rm(bundleAbs, { recursive: true, force: true })
  return ok(null)
}

/** Substitute a chosen parent for the recorded one, so every placement guarantee still comes from
 *  the one function that owns them. Only three kinds can be homeless and so only three admit a
 *  destination: a Context re-enters the registry and a Collection returns to the nexus root, and
 *  neither of those parents can go missing. The pick arrives by the same untrusted route as the
 *  bundle path, so it is resolved against the live tree rather than believed — and the matrix it
 *  is held to is the write path's own: a page or Set lands in a container, a Space in a Context. */
function withDestination(
  record: ArtifactRecord,
  destination: { kind: 'container' | 'context'; id: string },
  tree: NexusTree,
): Result<ArtifactRecord> {
  switch (record.entity) {
    case 'space':
      if (destination.kind !== 'context')
        return fail('invalid-path', 'A Space lives in a Context.')
      if (!tree.contexts?.some((g) => g.def.id === destination.id))
        return fail('not-found', 'That Context no longer exists.')
      return ok({ ...record, parent: { kind: 'context', id: destination.id } })
    case 'page':
    case 'set':
      if (destination.kind !== 'container')
        return fail('invalid-path', 'Pages and Sets live in Collections and Sets.')
      if (!findContainer(tree, destination.id))
        return fail('not-found', 'That place no longer exists.')
      return ok({ ...record, parent: { kind: 'container', id: destination.id } })
    default:
      return fail('operation-failed', 'That kind cannot be given a destination.')
  }
}

/** The mover: resolve against the CURRENT tree inside the op (the world may have changed since
 *  listing), place the artifact under the resolver's final names, remove the spent bundle, and
 *  per kind re-enter the registry and re-apply membership through the shared reconcile loop.
 *  Branches on nothing — every decision is the resolver's. A `destination` substitutes the
 *  recorded parent before the resolver runs, so the placement guarantees stay the resolver's too. */
export async function restoreArtifact(
  root: string,
  bundleAbs: string,
  destination?: { kind: 'container' | 'context'; id: string },
): Promise<Result<null>> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  // A property has no artifact to place — its whole restore is a rebuild from the record, and it
  // spends the same bundle on the same terms.
  if (opened.value.entity === 'property') {
    if (destination) return fail('operation-failed', 'That kind cannot be given a destination.')
    const rebuilt = await restoreProperty(root, opened.value)
    if (!rebuilt.ok) return rebuilt
    await rm(bundleAbs, { recursive: true, force: true })
    return ok(null)
  }
  const artifactAbs = await bundleArtifact(bundleAbs)
  if (!artifactAbs)
    return fail('not-found', 'That deletion never finished; there is nothing to restore.')

  const tree = await readNexus(root)
  // The substitution happens once, here, and everything downstream reads the rehomed record — the
  // resolver's placement, the reconcile's owning Collection, and a Space's membership reapply,
  // which must write the key of the Context it is landing in rather than the one it left.
  const rehomed = destination ? withDestination(opened.value, destination, tree) : ok(opened.value)
  if (!rehomed.ok) return rehomed
  const record = rehomed.value
  const resolution = resolveRecord(record, basename(artifactAbs), tree)
  if ('refuse' in resolution) return fail('operation-failed', REFUSAL_TEXT[resolution.refuse])
  const { dir, finalName, finalTitle } = resolution.place

  const targetAbs = join(root, dir, finalName)
  // Records are plain user-visible JSON — shape validation is not safety validation. The final
  // name must be a plain basename landing exactly in the resolver's chosen directory, inside
  // the nexus and outside the trash; anything else is a recorded title steering the move.
  const targetRel = relative(root, targetAbs)
  if (
    targetRel.startsWith('..') ||
    isAbsolute(targetRel) ||
    targetRel.split(sep)[0] === '.trash' ||
    dirname(targetAbs) !== join(root, dir) ||
    basename(targetAbs) !== finalName
  )
    return fail('operation-failed', 'That restore record points outside the nexus.')
  // The tree is the resolver's universe; a file the walk cannot see (an Unknown squatter)
  // could still occupy the target — refuse rather than clobber what nothing adjudicated.
  if (await pathExists(targetAbs))
    return fail('exists', 'Something already sits at the restored location.')
  // The bundle was frozen at its delete while the world moved on, so the returning content is
  // reconciled against the CURRENT world here — in the trash, before anything lands. Every root
  // the Contexts layer governs is reached: a page's frontmatter and a Space's sidecar alike. A
  // returning Context is the one subject the live world cannot answer for — it is still in
  // transit — so its own key is left for the post-move rekey to settle, and the rest is judged.
  const owner =
    record.entity === 'collection'
      ? artifactAbs
      : record.entity === 'page' || record.entity === 'set'
        ? tree.collections.find((c) => dir === c.path || dir.startsWith(`${c.path}/`))?.path
        : undefined
  await scrubReturning(
    root,
    tree,
    artifactAbs,
    owner === undefined ? null : owner === artifactAbs ? artifactAbs : join(root, owner),
    record.entity === 'context' ? contextKey(record.registry.title) : undefined,
  )
  // A Context's identity lives ONLY in its registry entry, so it re-enters BEFORE anything
  // moves: a refused write leaves the bundle intact — the restore is retryable — where an
  // append after the move would destroy the evidence on failure and reply ok.
  const title = finalTitle ?? finalName
  if (record.entity === 'context') {
    const committed = await mutateRegistryFile(root, (cur) => ({
      contexts: [...cur.contexts, { ...record.registry, title }],
    }))
    if (!committed.ok) return committed
  }
  recordWrite(artifactAbs)
  recordWrite(targetAbs)
  try {
    await mkdir(dirname(targetAbs), { recursive: true })
    await rename(artifactAbs, targetAbs)
  } catch (e) {
    // The move is the irreversible half; the append is the reversible one. Reversing it keeps
    // the failure retryable — a ghost entry would trip the next attempt's own id-live guard.
    if (record.entity === 'context')
      await mutateRegistryFile(root, (cur) => ({
        contexts: cur.contexts.filter((c) => !(c.id === record.registry.id && c.title === title)),
      }))
    return fail('operation-failed', errText(e))
  }
  // Recursive: convention-skipped litter may still sit inside the spent bundle.
  await rm(bundleAbs, { recursive: true, force: true })

  const roots = projectBaseline(tree).entries
  if (record.entity === 'context') {
    // The delete's sweep left the subtree's own keys untouched (passengers); under a
    // disambiguated final title they would point at whoever now owns the recorded one.
    if (title !== record.registry.title)
      await rekeyPassengers(targetAbs, record.registry.title, title)
    const titlesById = await restoredSpaceTitles(targetAbs)
    const additions: Record<string, string[]> = {}
    for (const m of record.membership) {
      if (!m.root.id) continue
      const titles = m.spaces
        .map((s) => (s.id ? titlesById.get(s.id) : undefined))
        .filter((t): t is string => typeof t === 'string')
      if (titles.length) additions[m.root.id] = titles
    }
    await reapply(root, roots, contextKey(title), additions)
  } else if (record.entity === 'space' && record.parent.kind === 'context') {
    const parentId = record.parent.id
    const group = tree.contexts.find((g) => g.def.id === parentId)
    if (group) {
      const additions = Object.fromEntries(
        record.members
          .filter((m): m is typeof m & { id: string } => typeof m.id === 'string')
          .map((m) => [m.id, [title]]),
      )
      await reapply(root, roots, contextKey(group.def.title), additions)
    }
  }
  return ok(null)
}

/** Membership re-apply, spent through the shared loop — what didn't land is named, never
 *  rolled back and never silently claimed. */
async function reapply(
  root: string,
  roots: Record<string, { kind: string; path: string }>,
  key: string,
  additions: Record<string, string[]>,
): Promise<void> {
  const { kept } = await reconcile(additions, (id, titles) =>
    addContextValues(root, roots[id], key, titles),
  )
  const unspent = Object.keys(kept)
  if (unspent.length)
    console.warn(`restore: membership for ${key} did not re-apply to: ${unspent.join(', ')}`)
}
