import { basename, join, relative } from './posix'
import { holdsName } from './names'
import { ARCHIVE_DIR_REL, hiddenName, TRASH_DIR } from './nexusPaths'

export type ArchiveStore = { kind: 'archive'; id: string }

export type BundleStore = { kind: 'trash' } | ArchiveStore

export const archiveDirRel = (collectionId: string): string => `${ARCHIVE_DIR_REL}/${collectionId}`

/** The Archive a Collection id names: the id becomes one folder under the Archive's root, and a sidecar can carry any string as its id. */
export const archiveStoreOf = (id: string | undefined): ArchiveStore | null =>
  id !== undefined && holdsName(id) ? { kind: 'archive', id } : null

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

export interface Stored {
  store: BundleStore
  bundle: string | null
  inner: string[]
  origin: string
}

/** Where a path inside a store sits, from the path alone, so the walk, the index, every reach, and every display read one rule: its store; the bundle holding it, the folder wearing its mint's stamp so a chain or artifact folder that only wears the suffix is never taken for it (root-relative, null for a chain folder or anything left beside the bundles); its segments below the bundle; and where it lived, that one folder taken out. Null outside both stores, their roots included. */
export function storeOf(rel: string): Stored | null {
  const segs = rel.split('/')
  const store: BundleStore | null =
    segs[0] === TRASH_DIR && segs.length > 1
      ? { kind: 'trash' }
      : `${segs[0]}/${segs[1]}` === ARCHIVE_DIR_REL && segs.length > 2
        ? { kind: 'archive', id: segs[2] }
        : null
  if (!store) return null
  const { dir, suffix } = layoutOf(store)
  const depth = dir.split('/').length
  const below = segs.slice(depth)
  const at = below.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
  return {
    store,
    bundle: at === -1 ? null : segs.slice(0, depth + at + 1).join('/'),
    inner: at === -1 ? [] : below.slice(at + 1),
    origin: below.filter((_, i) => i !== at).join('/'),
  }
}

/** The bundle a store path lies in, and the inner item it names inside the bundle's artifact when it names one: the address a row restores, deletes, and files back by. Null for anything else, the artifact itself and a hidden segment included. */
export function bundleAddressOf(
  root: string,
  abs: string,
): { bundle: string; store: BundleStore; item?: string } | null {
  const at = storeOf(relative(root, abs))
  if (!at?.bundle) return null
  const bundle = join(root, at.bundle)
  if (!at.inner.length) return { bundle, store: at.store }
  return at.inner.length > 1 && !at.inner.some(hiddenName)
    ? { bundle, store: at.store, item: abs }
    : null
}

/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. */
export const originPathOf = (root: string, file: string): string =>
  storeOf(relative(root, file))!.origin
