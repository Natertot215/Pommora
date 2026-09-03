// The trash browser's read shape. Main owns every parse the renderer would otherwise have to
// learn, and answers two questions the menu needs before any restore is attempted: what kind
// this is, and whether the place it came from still exists.

import { basename, dirname } from 'node:path'
import type { NexusTree, TrashCrumb, TrashRow } from '@shared/types'
import { CONTEXTS_DIR_REL, TRASH_DIR } from '@shared/nexusPaths'
import {
  type ArtifactRecord,
  containerChain,
  type ListedBundle,
  resolveRecord,
} from '../provenance'

/** `fileStamp` writes an ISO instant with `:` and `.` flattened to `-`. The optional counter
 *  that follows de-collides same-instant deletes and carries no time of its own. */
const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/

function deletedAtOf(bundlePath: string): number | null {
  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
  if (!m) return null
  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
  return Number.isNaN(t) ? null : t
}

/** The only surviving evidence of where something lived once its recorded parent is gone.
 *  `.trash` mirrors the nexus faithfully, Contexts included, so a Space's chain arrives wearing
 *  the internal folders the live breadcrumb never shows — both prefixes come back off. */
function frozenCrumbs(bundlePath: string): TrashCrumb[] {
  const segments = dirname(bundlePath)
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== TRASH_DIR)
  const contexts = CONTEXTS_DIR_REL.split('/')
  const inContexts = contexts.every((seg, i) => segments[i] === seg)
  return (inContexts ? segments.slice(contexts.length) : segments).map((title) => ({ title }))
}

/** Null when the recorded parent resolves to nothing. A Collection and a Context both sit at a
 *  root that cannot go missing, so both resolve to an empty chain rather than to nothing. */
function liveCrumbs(record: ArtifactRecord, tree: NexusTree): TrashCrumb[] | null {
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

/** `id-live` is deliberately not a homeless verdict — the home is there and a destination
 *  cannot fix a duplicate identity. */
function homeResolvesFor(record: ArtifactRecord, artifactName: string, tree: NexusTree): boolean {
  const resolution = resolveRecord(record, artifactName, tree)
  return !('refuse' in resolution) || resolution.refuse === 'id-live'
}

/** The filter is the record's own discriminator rather than the absence of an artifact:
 *  `listBundles` waives the artifact requirement for a property bundle on purpose, so testing for
 *  one would admit it as a titleless, dateless row that Delete All would then destroy unread. */
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

/** Newest first — what was just lost belongs at the top. A row whose stamp wouldn't parse
 *  still lists; it sorts last rather than disappearing. */
export function trashRows(bundles: ListedBundle[], tree: NexusTree): TrashRow[] {
  return bundles
    .map((b) => trashRowOf(b, tree))
    .filter((row) => row !== null)
    .sort((a, b) => (b.deletedAt ?? -1) - (a.deletedAt ?? -1))
}
