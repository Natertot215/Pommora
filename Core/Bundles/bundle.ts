import { basename, dirname, join, relative } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import { hiddenName } from '../Paths/exclusion'
import { archiveStoreOf, holdsName } from '../Paths/names'
import {
  type ArchiveStore,
  archiveDirRel,
  archivedCollectionIdOf,
  TRASH_DIR,
} from '../Paths/nexusPaths'
import { machine } from '../Platform/machine'
import { fault, ok, type Result } from '../Contract/result'
import { type ConnPage, connPage } from '../Connections/pageIndex'
import { stampedIdOf } from '../Files/pageFile'
import { listEntries, listMarkdownFiles } from '../Files/walk'
import { relocate, removeOwn } from '../Files/atomicWrite'
import type { NexusTree } from '../Nexus/tree'
import {
  originOf,
  originWithin,
  type RawRecord,
  type RecordFile,
  readRawRecord,
  readRecord,
  trailAbove,
  writeRecord,
} from './record'

export type BundleStore = { kind: 'trash' } | ArchiveStore

export function layoutOf(store: BundleStore): { dir: string; suffix: string } {
  switch (store.kind) {
    case 'trash':
      return { dir: TRASH_DIR, suffix: '.deleted' }
    case 'archive':
      return { dir: archiveDirRel(store.id), suffix: '.archived' }
  }
}

export function storeOf(root: string, bundleAbs: string): BundleStore | null {
  const rel = relative(root, bundleAbs)
  const id = archivedCollectionIdOf(rel)
  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
  const { dir, suffix } = layoutOf(store)
  return rel.startsWith(`${dir}/`) && rel.endsWith(suffix) ? store : null
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

/** A store reads as a shadow of the nexus, so a stored item shows where it lived. A path that isn't under the root has no chain to mirror, and following its `..` would write outside the store entirely — it lands flat instead. */
export async function chainDir(
  root: string,
  store: BundleStore,
  absSource: string,
): Promise<string> {
  const rel = relative(root, absSource)
  const chain = rel && !escapes(rel) ? dirname(rel) : '.'
  const dir = join(root, layoutOf(store).dir, chain)
  await machine().mkdir(dir)
  return dir
}

/** `leaf` asks for one bundle name back, tried only when the source could have been minted under it: one name, stamped, ending in the source's own; a fresh stamp answers anything else, and a leaf something holds. */
export async function mintBundle(
  root: string,
  store: BundleStore,
  absSource: string,
  leaf?: string,
): Promise<string> {
  const dir = await chainDir(root, store, absSource)
  const base = `${basename(absSource)}${layoutOf(store).suffix}`
  const own =
    leaf !== undefined && holdsName(leaf) && storedAtOf(leaf) !== null && leaf.endsWith(`__${base}`)
  if (own && (await machine().mkdir(join(dir, leaf))) === 'created') return join(dir, leaf)
  const stamp = fileStamp()
  for (let n = 0; ; n++) {
    const bundle = join(dir, stampedLeaf(stamp, n, base))
    if ((await machine().mkdir(bundle)) === 'created') return bundle
  }
}

/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix stays in the path. */
export function originPathOf(root: string, store: BundleStore, file: string): string {
  const { dir, suffix } = layoutOf(store)
  const segs = relative(join(root, dir), file).split('/')
  const bundle = segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
  return segs.filter((_, i) => i !== bundle).join('/')
}

export async function bundleArtifact(bundleDir: string): Promise<string | null> {
  const found = (await listEntries(bundleDir)).filter((e) => !hiddenName(e.name))
  return found.length === 1 ? join(bundleDir, found[0].name) : null
}

/** Files `artifact` into a bundle minted in `to` for `origin`, `leaf` asked back, its record written ahead; a failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. */
export async function fileInto(
  root: string,
  to: BundleStore,
  origin: string,
  artifact: string,
  record: RecordFile | RawRecord,
  leaf?: string,
): Promise<string> {
  const bundle = await mintBundle(root, to, origin, leaf)
  try {
    await writeRecord(bundle, record)
    await relocate(artifact, join(bundle, basename(artifact)))
  } catch (e) {
    await removeOwn(bundle)
    throw e
  }
  return bundle
}

/** Moves a bundle's artifact into `to`, under the chain it left from, with its raw record spread with `extra`, and removes the emptied bundle; `leaf` asks for that bundle name back. */
export async function moveIntoStore(
  root: string,
  fromBundle: string,
  to: BundleStore,
  extra: RawRecord,
  leaf?: string,
): Promise<void> {
  const from = storeOf(root, fromBundle)
  const artifact = await bundleArtifact(fromBundle)
  const raw = await readRawRecord(fromBundle)
  if (!from || !artifact || !raw) return
  const origin = join(root, originPathOf(root, from, artifact))
  await fileInto(root, to, origin, artifact, { ...raw, ...extra }, leaf)
  await removeOwn(fromBundle)
}

export interface ListedBundle {
  bundlePath: string
  record: RecordFile
  artifactName?: string
}

/** The bundles in `from`'s Archive archived from within the Set `setId`, by ids rather than by the folder names their chains were spelled with: each origin is the Set or lies beneath it, on the trail the tree gives the origin now, or on the one its record stored once the tree no longer holds it. */
export async function archivedWithin(root: string, setId: string, from: string, tree: NexusTree) {
  const store = archiveStoreOf(from)
  if (!store) return []
  return (await listBundles(root, store)).flatMap((listed) => {
    const origin = originOf(listed.record)
    if (!origin) return []
    const held = trailAbove(tree, origin.parent)
    return originWithin(origin, setId, held) ? [{ ...listed, origin, held }] : []
  })
}

export async function listBundles(root: string, store: BundleStore): Promise<ListedBundle[]> {
  const { dir, suffix } = layoutOf(store)
  const out: ListedBundle[] = []
  const walk = async (at: string): Promise<void> => {
    for (const e of await listEntries(at)) {
      if (e.kind !== 'dir') continue
      const abs = join(at, e.name)
      const record = e.name.endsWith(suffix) ? await readRecord(abs) : null
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
  await walk(join(root, dir))
  return out
}

/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. */
export interface OpenBundle {
  abs: string
  store: BundleStore
  record: RecordFile
  artifact: string | null
}

export async function openBundle(root: string, abs: string): Promise<Result<OpenBundle>> {
  const store = storeOf(root, abs)
  if (!store) return fault('Only a trash or archive record can be spent.')
  const record = await readRecord(abs)
  if (!record) return fault('That record is unreadable.')
  return ok({ abs, store, record, artifact: await bundleArtifact(abs) })
}

export async function contentPages(
  entity: RecordFile['entity'],
  artifactAbs: string,
): Promise<string[]> {
  switch (entity) {
    case 'page':
      return [artifactAbs]
    case 'collection':
    case 'set':
      return listMarkdownFiles(artifactAbs)
    default:
      return []
  }
}

/** The ids `pages` carry, read from the files themselves. */
export async function pageIdsOf(pages: string[]): Promise<string[]> {
  const ids = await Promise.all(pages.map(stampedIdOf))
  return ids.flatMap((id) => id ?? [])
}

/** Every stored page at the path it left, its `id` the bundle holding it, since parking needs the bundle alone and reads no file. */
export async function originPagesIn(root: string, store: BundleStore): Promise<ConnPage[]> {
  const out: ConnPage[] = []
  for (const { bundlePath, record, artifactName } of await listBundles(root, store)) {
    if (!artifactName) continue
    const bundle = join(root, bundlePath)
    for (const file of await contentPages(record.entity, join(bundle, artifactName)))
      out.push(connPage(bundle, originPathOf(root, store, file)))
  }
  return out
}

/** One bundle's pages at the paths they left, with the ids their files carry; an ID-less one answers to its file, which no index holds as an id. */
export async function originPagesOf(
  root: string,
  store: BundleStore,
  files: readonly string[],
): Promise<ConnPage[]> {
  const out: ConnPage[] = []
  for (const file of files)
    out.push(connPage((await stampedIdOf(file)) ?? file, originPathOf(root, store, file)))
  return out
}
