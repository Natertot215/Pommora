import { basename, dirname, isAbsolute, join, relative } from '../Paths/posix'
import { contextKey } from '../Contexts/contexts'
import { TRASH_DIR } from '../Paths/nexusPaths'
import type { RestoreDestination } from '../Pages/mutateRequest'
import { errText, fail, ok, type Result } from '../Contract/result'
import type { NexusTree } from '../Nexus/tree'
import { mutateRegistryFile } from '../Contexts/contextsRegistry'
import { reconcile } from '../Properties/reconcile'
import { restoreProperty } from './restoreProperty'
import { scrubReturning } from './restoreScrub'
import { sweepGovernedRoots } from '../Properties/governedSweep'
import { BUNDLE_SUFFIX } from './bundle'
import { pathExists, readJsonObject, writeJson } from '../Files/atomicWrite'
import { isMarkdownFile, listEntries } from '../Files/walk'
import { machine } from '../Platform/machine'
import { mergeFrontmatter, splitEnvelope, splitFrontmatter } from '../Files/pageFile'
import { recordWrite } from '../Files/writeEcho'
import { noteValueWrite } from '../Nexus/valuesChanged'
import { SPACE_SIDECAR } from '../Paths/paths'
import { refreshTree } from '../Nexus/liveTree'

import { projectBaseline } from '../Nexus/remintLedger'
import { type RecordFile, readRecord, bundleArtifact } from './record'
import { findContainer, resolveRecord, type ArtifactRecord, type Refusal } from './resolve'

export interface ListedBundle {
  bundlePath: string
  record: RecordFile
  artifactName?: string
}

export async function listBundles(root: string): Promise<ListedBundle[]> {
  const out: ListedBundle[] = []
  const walk = async (dir: string): Promise<void> => {
    for (const e of await listEntries(dir)) {
      if (e.kind !== 'dir') continue
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
    const files = [join(root, entry.path)]
    const text = (content: string): string =>
      mergeFrontmatter(
        content,
        { [key]: merge(splitFrontmatter(content)) },
        [key],
        splitEnvelope(content).body,
      )
    const swept = await sweepGovernedRoots(root, { kind: 'files', files }, { text })
    return swept.touched.length > 0
  }
  const file = join(root, entry.path, SPACE_SIDECAR)
  return machine().lock(file, async () => {
    const raw = await readJsonObject(file)
    if (!raw) return false
    await writeJson(file, { ...raw, [key]: merge(raw) })
    return true
  })
}

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
    if (d.kind !== 'dir') continue
    const file = join(absContextDir, d.name, SPACE_SIDECAR)
    await machine().lock(file, async () => {
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

async function restoredSpaceTitles(absContextDir: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  for (const d of await listEntries(absContextDir)) {
    if (d.kind !== 'dir') continue
    const raw = await readJsonObject(join(absContextDir, d.name, SPACE_SIDECAR))
    if (typeof raw?.id === 'string') titles.set(raw.id, d.name)
  }
  return titles
}

async function openBundle(root: string, bundleAbs: string): Promise<Result<RecordFile>> {
  const trashPrefix = `${join(root, TRASH_DIR)}/`
  if (!bundleAbs.startsWith(trashPrefix) || !bundleAbs.endsWith(BUNDLE_SUFFIX))
    return fail('operation-failed', 'Only a trash record can be spent.')
  const record = await readRecord(bundleAbs)
  return record ? ok(record) : fail('operation-failed', 'That deletion record is unreadable.')
}

// Artifact first: a failed bundle removal then leaves a record with no artifact, litter the listing skips, where the reverse order would orphan a live artifact.
export async function emptyBundle(
  root: string,
  bundleAbs: string,
  deps: { permanentDelete?: boolean; trashToSystem: (absPath: string) => Promise<void> },
): Promise<Result<null>> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  if (opened.value.entity === 'property') {
    await machine().remove(bundleAbs)
    return ok(null)
  }
  const artifactAbs = await bundleArtifact(bundleAbs)
  if (!artifactAbs)
    return fail('not-found', "That deletion didn't finish, or something else is in with it.")
  if (deps.permanentDelete === true) await machine().remove(artifactAbs)
  else await deps.trashToSystem(artifactAbs)
  await machine().remove(bundleAbs)
  return ok(null)
}

const NO_DESTINATION = 'That kind cannot be given a destination.'

function withDestination(
  record: ArtifactRecord,
  destination: RestoreDestination,
  tree: NexusTree,
): Result<ArtifactRecord> {
  switch (record.entity) {
    case 'space':
      if (destination.kind !== 'context') return fail('invalid-path', 'A Space lives in a Context.')
      if (!tree.contexts.some((g) => g.def.id === destination.id))
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

export async function restoreArtifact(
  root: string,
  bundleAbs: string,
  destination?: RestoreDestination,
): Promise<Result<null>> {
  const opened = await openBundle(root, bundleAbs)
  if (!opened.ok) return opened
  if (opened.value.entity === 'property') {
    if (destination) return fail('operation-failed', NO_DESTINATION)
    const rebuilt = await restoreProperty(root, opened.value)
    if (!rebuilt.ok) return rebuilt
    await machine().remove(bundleAbs)
    return ok(null)
  }
  const artifactAbs = await bundleArtifact(bundleAbs)
  if (!artifactAbs)
    return fail('not-found', 'That deletion never finished; there is nothing to restore.')

  const tree = await refreshTree(root)
  const rehomed = destination ? withDestination(opened.value, destination, tree) : ok(opened.value)
  if (!rehomed.ok) return rehomed
  const record = rehomed.value
  const resolution = resolveRecord(record, basename(artifactAbs), tree)
  if ('refuse' in resolution) return fail('operation-failed', REFUSAL_TEXT[resolution.refuse])
  const { dir, finalName, finalTitle } = resolution.place

  const targetAbs = join(root, dir, finalName)
  // Records are plain user-visible JSON — shape validation is not safety validation. The final name must be a plain basename landing exactly in the resolver's chosen directory, inside the nexus and outside the trash; anything else is a recorded title steering the move.
  const targetRel = relative(root, targetAbs)
  if (
    targetRel.startsWith('..') ||
    isAbsolute(targetRel) ||
    targetRel.split('/')[0] === TRASH_DIR ||
    dirname(targetAbs) !== join(root, dir) ||
    basename(targetAbs) !== finalName
  )
    return fail('operation-failed', 'That restore record points outside the nexus.')
  // The tree is the resolver's universe; a file the walk cannot see (an Unknown squatter) could still occupy the target — refuse rather than clobber what nothing adjudicated.
  if (await pathExists(targetAbs))
    return fail('exists', 'Something already sits at the restored location.')
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
  // A Context's identity lives ONLY in its registry entry, so it re-enters BEFORE anything moves: a refused write leaves the bundle intact — the restore is retryable — where an append after the move would destroy the evidence on failure and reply ok.
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
    await machine().mkdir(dirname(targetAbs))
    await machine().rename(artifactAbs, targetAbs)
  } catch (e) {
    // The move is the irreversible half; the append is the reversible one. Reversing it keeps the failure retryable — a ghost entry would trip the next attempt's own id-live guard.
    if (record.entity === 'context')
      await mutateRegistryFile(root, (cur) => ({
        contexts: cur.contexts.filter((c) => !(c.id === record.registry.id && c.title === title)),
      }))
    return fail('operation-failed', errText(e))
  }
  await machine().remove(bundleAbs)

  const roots = projectBaseline(tree).entries
  if (record.entity === 'context') {
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
