// Spending a bundle: listing what is spendable, restoring an artifact to its resolved placement,
// and giving one up for good.

import { mkdir, rename, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path'
import { contextKey } from '../Properties/contexts'
import { TRASH_DIR } from '../Locations/nexusPaths'
import type { RestoreDestination } from '../Pages/mutateRequest'
import { errText, fail, ok, type Result } from '../Contract/result'
import type { NexusTree } from '../Nexus/tree'
import { mutateRegistryFile } from '../Contexts/contextsRegistry'
import { reconcile } from '../Properties/reconcile'
import { restoreProperty } from './restoreProperty'
import { scrubReturning } from './restoreScrub'
import { sweepAdmits } from '../Nexus/util'
import { BUNDLE_SUFFIX } from './bundle'
import { pathExists, readJsonObject, rewritePageSerialized, writeJson } from '../IO/atomicWrite'
import { isMarkdownFile, listEntries } from '../IO/walk'
import { serializeOnFile } from '../IO/fileLock'
import { mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { recordWrite } from '../IO/writeEcho'
import { noteValueWrite } from '../Nexus/valuesChanged'
import { SPACE_SIDECAR } from '../Locations/paths'
import { refreshTree } from '../Nexus/liveTree'
import { splitFrontmatter } from '../Nexus/readNexus'
import { projectBaseline } from '../Nexus/remintLedger'
import { type RecordFile, readRecord, bundleArtifact } from './record'
import { findContainer, resolveRecord, type ArtifactRecord, type Refusal } from './resolve'

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
  await walk(join(root, TRASH_DIR))
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
  const trashPrefix = join(root, TRASH_DIR) + sep
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
  if (opened.value.entity === 'property') {
    await rm(bundleAbs, { recursive: true, force: true })
    return ok(null)
  }
  // The same refusal restore makes, for the same reason and one stronger: `bundleArtifact` answers
  // only when the bundle holds exactly one visible entry, so a conflict copy dropped beside the
  // artifact by a sync client reads as no artifact at all. Removing the folder anyway would erase
  // the file the switch promised to hand to the operating system.
  const artifactAbs = await bundleArtifact(bundleAbs)
  if (!artifactAbs)
    return fail('not-found', "That deletion didn't finish, or something else is in with it.")
  if (deps.permanentDelete === true) await rm(artifactAbs, { recursive: true, force: true })
  else await deps.trashToSystem(artifactAbs)
  await rm(bundleAbs, { recursive: true, force: true })
  return ok(null)
}

/** The refusal a Collection, a Context and a property share: their parent cannot go missing, so
 *  there is nothing a pick could fix. */
const NO_DESTINATION = 'That kind cannot be given a destination.'

/** Substitute a chosen parent for the recorded one, so every placement guarantee still comes from
 *  the one function that owns them. Only three kinds can be homeless and so only three admit a
 *  destination: a Context re-enters the registry and a Collection returns to the nexus root, and
 *  neither of those parents can go missing. The pick arrives by the same untrusted route as the
 *  bundle path, so it is resolved against the live tree rather than believed — and the matrix it
 *  is held to is the write path's own: a page or Set lands in a container, a Space in a Context. */
function withDestination(
  record: ArtifactRecord,
  destination: RestoreDestination,
  tree: NexusTree,
): Result<ArtifactRecord> {
  switch (record.entity) {
    case 'space':
      if (destination.kind !== 'context') return fail('invalid-path', 'A Space lives in a Context.')
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
      return fail('operation-failed', NO_DESTINATION)
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
  destination?: RestoreDestination,
): Promise<Result<null>> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  // A property has no artifact to place — its whole restore is a rebuild from the record, and it
  // spends the same bundle on the same terms.
  if (opened.value.entity === 'property') {
    if (destination) return fail('operation-failed', NO_DESTINATION)
    const rebuilt = await restoreProperty(root, opened.value)
    if (!rebuilt.ok) return rebuilt
    await rm(bundleAbs, { recursive: true, force: true })
    return ok(null)
  }
  const artifactAbs = await bundleArtifact(bundleAbs)
  if (!artifactAbs)
    return fail('not-found', 'That deletion never finished; there is nothing to restore.')

  const tree = await refreshTree(root)
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
    targetRel.split(sep)[0] === TRASH_DIR ||
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
  if (isMarkdownFile(targetAbs)) noteValueWrite(root, targetAbs)
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
