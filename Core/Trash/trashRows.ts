import { basename, dirname, titleFromPath } from '../Paths/posix'
import type { NexusTree } from '../Nexus/tree'
import type { TrashCrumb, TrashRow } from './trashRow'
import { CONTEXTS_DIR_REL, TRASH_DIR } from '../Paths/nexusPaths'
import { type ArtifactRecord, resolveRecord } from './resolve'
import { containerTrailWhere } from '../Nexus/treePatch'
import type { ListedBundle } from './holdings'
import { propertyType } from '../Properties/properties'
import { contextWorldOf } from '../Contexts/contextResolve'

const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/

function deletedAtOf(bundlePath: string): number | null {
  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
  if (!m) return null
  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
  return Number.isNaN(t) ? null : t
}

/** The only surviving evidence of where something lived once its recorded parent is gone. `.trash` mirrors the nexus faithfully, Contexts included, so a Space's chain arrives wearing the internal folders the live breadcrumb never shows — both prefixes come back off. */
function frozenCrumbs(bundlePath: string): TrashCrumb[] {
  const segments = dirname(bundlePath)
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== TRASH_DIR)
  const contexts = CONTEXTS_DIR_REL.split('/')
  const inContexts = contexts.every((seg, i) => segments[i] === seg)
  return (inContexts ? segments.slice(contexts.length) : segments).map((title) => ({ title }))
}

function liveCrumbs(record: ArtifactRecord, tree: NexusTree): TrashCrumb[] | null {
  if (record.entity === 'context') return []
  if (record.entity === 'space') {
    const parent = record.parent
    if (parent.kind !== 'context') return null
    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
    return group ? [{ kind: 'context', title: group.def.title }] : null
  }
  if (record.parent.kind === 'root') return record.entity === 'collection' ? [] : null
  if (record.parent.kind !== 'container') return null
  // Walked structurally rather than split from a path, since a crumb chain built from names is what the record model refuses.
  const parentId = record.parent.id
  const chain = containerTrailWhere(tree, (n) => n.id === parentId)
  return chain?.map((n) => ({ kind: n.kind, title: n.title })) ?? null
}

function homeResolvesFor(record: ArtifactRecord, artifactName: string, tree: NexusTree): boolean {
  const resolution = resolveRecord(record, artifactName, tree)
  return !('refuse' in resolution) || resolution.refuse === 'id-live'
}

/** A property record has no artifact to name it, so its title is its definition's own; it lived nowhere, so it always has a home to return to. */
export function trashRowOf(bundle: ListedBundle, tree: NexusTree): TrashRow | null {
  const { record, bundlePath, artifactName } = bundle
  if (record.entity === 'property') {
    const type = propertyType.safeParse(record.def.type)
    return {
      bundlePath,
      kind: 'property',
      title: typeof record.def.name === 'string' ? record.def.name : record.id,
      ...(type.success ? { propertyType: type.data } : {}),
      crumbs: [],
      deletedAt: deletedAtOf(bundlePath),
      homeResolves: true,
    }
  }
  if (!artifactName) return null
  const live = liveCrumbs(record, tree)
  return {
    bundlePath,
    kind: record.entity,
    title: record.entity === 'page' ? titleFromPath(artifactName) : artifactName,
    crumbs: live ?? frozenCrumbs(bundlePath),
    ...(live ? {} : { historical: true }),
    deletedAt: deletedAtOf(bundlePath),
    homeResolves: homeResolvesFor(record, artifactName, tree),
  }
}

export function trashRows(bundles: ListedBundle[], tree: NexusTree): TrashRow[] {
  return bundles
    .map((b) => trashRowOf(b, tree))
    .filter((row) => row !== null)
    .sort((a, b) => (b.deletedAt ?? -1) - (a.deletedAt ?? -1))
}
