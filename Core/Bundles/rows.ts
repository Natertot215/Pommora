import { basename, dirname, relative, relJoin, titleFromPath } from '../Paths/posix'
import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
import { type MatchKey, matchKey } from '../Paths/caseFold'
import type { HeldKind } from '../Nexus/entities'
import type { NexusTree } from '../Nexus/tree'
import type { NexusPages } from '../Nexus/heldPages'
import { containerTrailById } from '../Nexus/treePatch'
import { type PropertyType, typeIds } from '../Properties/properties'
import { contextWorldOf } from '../Contexts/contextResolve'
import type { InnerListing, ListedBundle } from './bundle'
import { type BundleStore, layoutOf, storedAtOf } from './layout'
import { resolveRecord } from './placement'
import type { ArtifactRecord } from './record'

/** `kind` is absent on a historical crumb, which is a frozen folder name rather than a live entity. */
export interface BundleCrumb {
  kind?: HeldKind
  title: string
}

/** Main owns the parse: the renderer never sees a bundle suffix, a folder stamp, or the record union. */
export interface BundleRow {
  /** Its address: a bundle's folder, or the inner item's own path. */
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
  /** The item's own icon: a page's from the metadata the tree holds, a container's or a Space's from its record, which keeps the sidecar's. */
  icon?: string
  /** A page or Set as stored, by its record's id and its path in the Nexus: what the reader opens and a restore's Undo finds again. */
  stored?: { id: string; path: string }
  /** Set when the delete recorded only part of what the item held. */
  partial?: true
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

export const matched = (row: Omit<BundleRow, 'match'>): BundleRow => ({
  ...row,
  match: matchKey(row.title, row.crumbs.map((c) => c.title).join('/')),
})

/** A property record has no artifact to name it, so its title is its definition's own; it lived nowhere, so it always has a home to return to. */
export function bundleRowOf(
  bundle: ListedBundle,
  store: BundleStore,
  tree: NexusTree,
  byId: NexusPages['byId'],
): BundleRow | null {
  const { record, bundlePath, artifactName } = bundle
  if (record.entity === 'property') {
    const type = typeIds.safeParse(record.def.type)
    return matched({
      bundlePath,
      kind: 'property',
      title: typeof record.def.label === 'string' ? record.def.label : record.id,
      ...(type.success ? { propertyType: type.data } : {}),
      crumbs: [],
      storedAt: storedAtOf(bundlePath),
      homeResolves: true,
      ...(record.partial ? { partial: true as const } : {}),
    })
  }
  if (!artifactName) return null
  return artifactRow(
    record,
    { bundlePath, path: relJoin(bundlePath, artifactName), storedAt: storedAtOf(bundlePath) },
    bundleCrumbs(record, store, bundlePath, tree),
    tree,
    byId,
  )
}

/** A bundle's trail: live from its recorded parent, else frozen from the chain it was filed under. */
function bundleCrumbs(
  record: ArtifactRecord,
  store: BundleStore,
  bundlePath: string,
  tree: NexusTree,
): { crumbs: BundleCrumb[]; historical: boolean } {
  const live = liveCrumbs(record, tree)
  return { crumbs: live ?? frozenCrumbs(store, bundlePath), historical: !live }
}

/** The one row an artifact reads as, a bundle's own or an inner item's: the place it shows, the date it entered, and whether its home still answers. */
function artifactRow(
  record: ArtifactRecord,
  at: { bundlePath: string; path: string; storedAt: number | null },
  place: { crumbs: BundleCrumb[]; historical: boolean },
  tree: NexusTree,
  byId: NexusPages['byId'],
): BundleRow {
  const name = basename(at.path)
  const icon =
    record.entity === 'page'
      ? record.id
        ? tree.config.pageMetadata[record.id]?.icon
        : undefined
      : record.entity === 'context'
        ? undefined
        : record.icon
  const home = resolveRecord(record, name, tree, byId, at.bundlePath)
  return matched({
    bundlePath: at.bundlePath,
    kind: record.entity,
    title: record.entity === 'page' ? titleFromPath(name) : name,
    crumbs: place.crumbs,
    ...(place.historical ? { historical: true } : {}),
    storedAt: at.storedAt,
    ...(icon ? { icon } : {}),
    ...((record.entity === 'page' || record.entity === 'set') && record.id
      ? { stored: { id: record.id, path: at.path } }
      : {}),
    homeResolves: !('refuse' in home) || home.refuse === 'id-live',
    ...(record.partial ? { partial: true as const } : {}),
  })
}

/** A bundle's inner items as rows: each addressed by its own path, dated by its bundle's stamp, its trail the bundle's own followed by the containers inside it down to the row's folder. */
export function innerRows(
  listed: InnerListing,
  tree: NexusTree,
  byId: NexusPages['byId'],
): BundleRow[] {
  const { bundle, store, record, folder, items } = listed
  const { crumbs, historical } = bundleCrumbs(record, store, bundle, tree)
  const [held, ...sets] = relative(bundle, folder).split('/')
  const place = {
    crumbs: [
      ...crumbs,
      { kind: record.entity, title: held },
      ...sets.map((title) => ({ kind: 'set' as const, title })),
    ],
    historical,
  }
  const storedAt = storedAtOf(bundle)
  return items.map(({ address, record }) =>
    artifactRow(record, { bundlePath: address, path: address, storedAt }, place, tree, byId),
  )
}

export function bundleRows(
  bundles: ListedBundle[],
  store: BundleStore,
  tree: NexusTree,
  byId: NexusPages['byId'],
): BundleRow[] {
  return bundles
    .map((b) => bundleRowOf(b, store, tree, byId))
    .filter((row) => row !== null)
    .sort((a, b) => (b.storedAt ?? -1) - (a.storedAt ?? -1))
}
