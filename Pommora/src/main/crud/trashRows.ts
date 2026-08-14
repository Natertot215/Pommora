// The trash browser's read shape. Main owns every parse the renderer would otherwise have to
// learn — the bundle's stamp encoding, the `.deleted` suffix, and the record union — and answers
// two questions the menu needs before any restore is attempted: what kind this is, and whether the
// place it came from still exists.

import { basename, dirname } from 'node:path'
import type { CollectionNode, NexusTree, SetNode, TrashCrumb, TrashRow } from '@shared/types'
import { type ListedBundle, type RecordFile, resolveRecord } from '../provenance'

/** `trashStamp` writes an ISO instant with `:` and `.` flattened to `-`, so reading it back is a
 *  fixed unreplace rather than a guess. The optional counter that follows de-collides same-instant
 *  deletes and carries no time of its own. */
const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/

function deletedAtOf(bundlePath: string): number | null {
  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
  if (!m) return null
  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
  return Number.isNaN(t) ? null : t
}

type Container = CollectionNode | SetNode

/** The container's ancestry, outermost first — the tree walked structurally rather than a path
 *  split, because a crumb chain built from names is the one thing the record model refuses. */
function containerChain(tree: NexusTree, id: string): Container[] | null {
  const inSets = (sets: SetNode[] | undefined, trail: Container[]): Container[] | null => {
    for (const s of sets ?? []) {
      const next = [...trail, s]
      if (s.id === id) return next
      const hit = inSets(s.sets, next)
      if (hit) return hit
    }
    return null
  }
  for (const c of tree.collections) {
    if (c.id === id) return [c]
    const hit = inSets(c.sets, [c])
    if (hit) return hit
  }
  return null
}

/** The frozen `.trash` chain the bundle sits in — the only surviving evidence of where something
 *  lived once its recorded parent is gone. Folder names, so the crumbs carry no kind. */
function frozenCrumbs(bundlePath: string): TrashCrumb[] {
  const dir = dirname(bundlePath)
  return dir
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '.trash')
    .map((title) => ({ title }))
}

/** Live crumbs, or null when the recorded parent resolves to nothing. A Collection and a Context
 *  both sit at a root that cannot go missing, so both resolve to an empty chain rather than to
 *  nothing. */
function liveCrumbs(record: RecordFile, tree: NexusTree): TrashCrumb[] | null {
  if (record.entity === 'property') return null
  if (record.entity === 'context') return []
  if (record.entity === 'space') {
    const parent = record.parent
    if (parent.kind !== 'context') return null
    const group = tree.contexts?.find((g) => g.def.id === parent.id)
    return group ? [{ kind: 'context', title: group.def.title }] : null
  }
  if (record.parent.kind === 'root') return record.entity === 'collection' ? [] : null
  if (record.parent.kind !== 'container') return null
  const chain = containerChain(tree, record.parent.id)
  return chain?.map((n) => ({ kind: n.kind, title: n.title })) ?? null
}

/** A restore would land this where it came from. `id-live` is deliberately not a homeless verdict —
 *  the home is there and a destination cannot fix a duplicate identity. */
function homeResolvesFor(record: RecordFile, artifactName: string, tree: NexusTree): boolean {
  if (record.entity === 'property') return false
  const resolution = resolveRecord(record, artifactName, tree)
  return !('refuse' in resolution) || resolution.refuse === 'id-live'
}

/** Shape one bundle, or null for the kinds this list cannot show. The filter is the record's own
 *  discriminator rather than the absence of an artifact: `listBundles` waives the artifact
 *  requirement for a property bundle on purpose, so testing for one would admit it as a titleless,
 *  dateless row that Delete All would then destroy unread. */
export function trashRowOf(bundle: ListedBundle, tree: NexusTree): TrashRow | null {
  const { record, bundlePath, artifactName } = bundle
  if (record.entity === 'property' || !artifactName) return null
  const live = liveCrumbs(record, tree)
  return {
    bundlePath,
    kind: record.entity,
    title: record.entity === 'page' ? artifactName.replace(/\.md$/i, '') : artifactName,
    crumbs: live ?? frozenCrumbs(bundlePath),
    ...(live ? {} : { historical: true }),
    deletedAt: deletedAtOf(bundlePath),
    homeResolves: homeResolvesFor(record, artifactName, tree),
  }
}

/** Newest first: `listBundles` returns filesystem order, and what was just lost belongs at the top.
 *  A row whose stamp wouldn't parse still lists — it sorts last rather than disappearing. */
export function trashRows(bundles: ListedBundle[], tree: NexusTree): TrashRow[] {
  const rows: TrashRow[] = []
  for (const b of bundles) {
    const row = trashRowOf(b, tree)
    if (row) rows.push(row)
  }
  return rows.sort((a, b) => (b.deletedAt ?? -1) - (a.deletedAt ?? -1))
}
