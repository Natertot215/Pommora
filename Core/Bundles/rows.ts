import { dirname, join, relative, relJoin, titleFromPath } from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { asString } from '../Nexus/coerce'
import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
import { type MatchKey, matchKey } from '../Paths/caseFold'
import type { HeldKind } from '../Nexus/entities'
import type { NexusTree } from '../Nexus/tree'
import type { NexusPages } from '../Nexus/heldPages'
import { containerTrailById } from '../Nexus/treePatch'
import { type PropertyType, propertyType } from '../Properties/properties'
import { contextWorldOf } from '../Contexts/contextResolve'
import { type BundleStore, type ListedBundle, layoutOf, storedAtOf } from './bundle'
import { resolveRecord } from './placement'
import type { ArtifactRecord } from './record'

/** `kind` is absent on a historical crumb, which is a frozen folder name rather than a live entity. */
export interface BundleCrumb {
  kind?: HeldKind
  title: string
}

/** Main owns the parse: the renderer never sees a bundle suffix, a folder stamp, or the record union. */
export interface BundleRow {
  bundlePath: string
  kind: HeldKind | 'property'
  title: string
  /** A property row's type, which picks its icon. */
  propertyType?: PropertyType
  /** Resolved live from the recorded parent id, so a renamed ancestor reads true. */
  crumbs: BundleCrumb[]
  /** Set when the recorded parent resolves to nothing and `crumbs` fell back to the frozen chain. */
  historical?: boolean
  /** Epoch milliseconds from the bundle's own stamp; null when it won't parse. */
  storedAt: number | null
  /** False when restoring would refuse for want of a home — the signal to ask where instead. */
  homeResolves: boolean
  /** The search's key: the title, placed by the crumbs. */
  match: MatchKey
  /** The item's own icon: a page's from the metadata the tree holds, a Set's from the sidecar it took into its bundle. */
  icon?: string
  /** A page or Set as stored, by its record's id and its path inside the bundle: what the reader opens and a restore's Undo finds again. */
  stored?: { id: string; path: string }
}

/** The only surviving evidence of where something lived once its recorded parent is gone. A store mirrors the nexus faithfully, Contexts included, so a Space's chain arrives wearing the internal folders the live breadcrumb never shows — the store's root and the Contexts prefix both come back off. */
function frozenCrumbs(store: BundleStore, bundlePath: string): BundleCrumb[] {
  const segments = relative(layoutOf(store).dir, dirname(bundlePath)).split('/').filter(Boolean)
  const contexts = CONTEXTS_DIR_REL.split('/')
  const inContexts = contexts.every((seg, i) => segments[i] === seg)
  return (inContexts ? segments.slice(contexts.length) : segments).map((title) => ({ title }))
}

function liveCrumbs(record: ArtifactRecord, tree: NexusTree): BundleCrumb[] | null {
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
  const chain = containerTrailById(tree, record.parent.id)
  return chain?.map((n) => ({ kind: n.kind, title: n.title })) ?? null
}

function homeResolvesFor(
  record: ArtifactRecord,
  artifactName: string,
  tree: NexusTree,
  byId: NexusPages['byId'],
  restoring: string,
): boolean {
  const resolution = resolveRecord(record, artifactName, tree, byId, restoring)
  return !('refuse' in resolution) || resolution.refuse === 'id-live'
}

export const matched = (row: Omit<BundleRow, 'match'>): BundleRow => ({
  ...row,
  match: matchKey(row.title, row.crumbs.map((c) => c.title).join('/')),
})

async function iconOf(
  root: string,
  record: ArtifactRecord,
  path: string,
  tree: NexusTree,
): Promise<string | undefined> {
  switch (record.entity) {
    case 'page':
      return record.id === undefined ? undefined : tree.config.pageMetadata[record.id]?.icon
    case 'set':
      return asString((await readJsonObject(sidecarPath(join(root, path), 'set')))?.icon)
    default:
      return undefined
  }
}

/** A property record has no artifact to name it, so its title is its definition's own; it lived nowhere, so it always has a home to return to. */
export async function bundleRowOf(
  root: string,
  bundle: ListedBundle,
  store: BundleStore,
  tree: NexusTree,
  byId: NexusPages['byId'],
): Promise<BundleRow | null> {
  const { record, bundlePath, artifactName } = bundle
  if (record.entity === 'property') {
    const type = propertyType.safeParse(record.def.type)
    return matched({
      bundlePath,
      kind: 'property',
      title: typeof record.def.label === 'string' ? record.def.label : record.id,
      ...(type.success ? { propertyType: type.data } : {}),
      crumbs: [],
      storedAt: storedAtOf(bundlePath),
      homeResolves: true,
    })
  }
  if (!artifactName) return null
  const live = liveCrumbs(record, tree)
  const path = relJoin(bundlePath, artifactName)
  return matched({
    bundlePath,
    kind: record.entity,
    title: record.entity === 'page' ? titleFromPath(artifactName) : artifactName,
    crumbs: live ?? frozenCrumbs(store, bundlePath),
    ...(live ? {} : { historical: true }),
    storedAt: storedAtOf(bundlePath),
    icon: await iconOf(root, record, path, tree),
    ...((record.entity === 'page' || record.entity === 'set') && record.id
      ? { stored: { id: record.id, path } }
      : {}),
    homeResolves: homeResolvesFor(record, artifactName, tree, byId, bundlePath),
  })
}

export async function bundleRows(
  root: string,
  bundles: ListedBundle[],
  store: BundleStore,
  tree: NexusTree,
  byId: NexusPages['byId'],
): Promise<BundleRow[]> {
  const rows = await Promise.all(bundles.map((b) => bundleRowOf(root, b, store, tree, byId)))
  return rows.filter((row) => row !== null).sort((a, b) => (b.storedAt ?? -1) - (a.storedAt ?? -1))
}
