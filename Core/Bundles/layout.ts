import { basename, join, relative } from '../Paths/posix'
import { hiddenName } from '../Paths/exclusion'
import {
  type ArchiveStore,
  archiveDirRel,
  archivedCollectionIdOf,
  TRASH_DIR,
} from '../Paths/nexusPaths'

export type BundleStore = { kind: 'trash' } | ArchiveStore

export function layoutOf(store: BundleStore): { dir: string; suffix: string } {
  switch (store.kind) {
    case 'trash':
      return { dir: TRASH_DIR, suffix: '.deleted' }
    case 'archive':
      return { dir: archiveDirRel(store.id), suffix: '.archived' }
  }
}

export const fileStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')

const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/

export function storedAtOf(bundlePath: string): number | null {
  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
  if (!m) return null
  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
  return Number.isNaN(t) ? null : t
}

export const stampedLeaf = (stamp: string, n: number, base: string): string =>
  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`

/** The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix is never taken for it. */
const stampedSegment = (segs: readonly string[], suffix: string): number =>
  segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)

/** The bundle a store path lies in, and the inner item it names inside the bundle's artifact when it names one: the address a row restores, deletes, and files back by. Null for anything else, the artifact itself and a hidden segment included. */
export function bundleAddressOf(
  root: string,
  abs: string,
): { bundle: string; store: BundleStore; item?: string } | null {
  const rel = relative(root, abs)
  const id = archivedCollectionIdOf(rel)
  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
  const { dir, suffix } = layoutOf(store)
  if (!rel.startsWith(`${dir}/`)) return null
  const segs = rel.split('/')
  const at = stampedSegment(segs, suffix)
  if (at === -1) return null
  const bundle = join(root, ...segs.slice(0, at + 1))
  if (segs.length === at + 1) return { bundle, store }
  const inner = segs.slice(at + 1)
  return inner.length > 1 && !inner.some(hiddenName) ? { bundle, store, item: abs } : null
}

/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. */
export function originPathOf(root: string, store: BundleStore, file: string): string {
  const { dir, suffix } = layoutOf(store)
  const segs = relative(join(root, dir), file).split('/')
  const bundle = stampedSegment(segs, suffix)
  return segs.filter((_, i) => i !== bundle).join('/')
}
