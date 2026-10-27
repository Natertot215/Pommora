import {
  basename,
  dirname,
  isAtOrUnder,
  isMarkdownFile,
  join,
  relative,
  titleFromPath,
} from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { escapes } from '../Paths/pathSafety'
import { hiddenName, outsideContent, type WatchScope } from '../Paths/exclusion'
import { archiveStoreOf, holdsName } from '../Paths/names'
import { NEXUS_DIR, TRASH_DIR } from '../Paths/nexusPaths'
import { machine } from '../Platform/machine'
import { fail, fault, ok, type Result } from '../Contract/result'
import { isPlainObject } from '../Contract/validators'
import { buildPageIndex, type ConnPage, connPage } from '../Connections/pageIndex'
import { linkedPage } from '../Connections/linkValue'
import { stampedIdOf } from '../Files/pageFile'
import { sidecarId } from '../Files/sidecar'
import { isContentFile, listEntries, listMarkdownFiles } from '../Files/walk'
import { pathExists, readJsonObject, relocate, removeOwn } from '../Files/atomicWrite'
import { asStringArray } from '../Nexus/coerce'
import { resolveOrder } from '../Nexus/order'
import { isContainerKind } from '../Nexus/entities'
import { distinct, editNote, readNotes } from '../Nexus/owed'
import type { NexusTree } from '../Nexus/tree'
import {
  identityOf,
  originOf,
  originWithin,
  type RawRecord,
  patchRecord,
  type RecordFile,
  readRawRecord,
  readRecord,
  trailAbove,
  writeRecord,
} from './record'
import {
  type BundleStore,
  bundleAddressOf,
  fileStamp,
  layoutOf,
  originPathOf,
  stampedLeaf,
} from './layout'

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

/** `leaf` asks for one bundle name back, tried only when the source could have been minted under it: one name ending in the source's own; a fresh stamp answers anything else, and a leaf something holds. */
export async function mintBundle(
  root: string,
  store: BundleStore,
  absSource: string,
  leaf?: string,
): Promise<string> {
  const dir = await chainDir(root, store, absSource)
  const base = `${basename(absSource)}${layoutOf(store).suffix}`
  const own = leaf !== undefined && holdsName(leaf) && leaf.endsWith(`__${base}`)
  if (own && (await machine().mkdir(join(dir, leaf))) === 'created') return join(dir, leaf)
  const stamp = fileStamp()
  for (let n = 0; ; n++) {
    const bundle = join(dir, stampedLeaf(stamp, n, base))
    if ((await machine().mkdir(bundle)) === 'created') return bundle
  }
}

export async function bundleArtifact(bundleDir: string): Promise<string | null> {
  const found = (await listEntries(bundleDir)).filter((e) => !hiddenName(e.name))
  return found.length === 1 ? join(bundleDir, found[0].name) : null
}

/** Files `artifact` back at `at`, the address it held: into the folder it sat in while that folder still stands, in a store of `to`'s kind since `at` arrives from the interface, and holds nothing of its name, else into a bundle minted in `to` for `origin`, its record written ahead, asking back the bundle name `at` names when it names a whole bundle. A failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. Answers the address it now holds and where it landed. */
export async function fileInto(
  root: string,
  to: BundleStore,
  origin: string,
  artifact: string,
  record: RecordFile | RawRecord,
  at?: string,
): Promise<{ address: string; landed: string }> {
  const held = at === undefined ? null : bundleAddressOf(root, join(root, at))
  if (held?.item && held.store.kind === to.kind) {
    const landed = join(dirname(held.item), basename(artifact))
    if ((await pathExists(dirname(held.item))) && !(await pathExists(landed))) {
      await relocate(artifact, landed)
      return { address: relative(root, landed), landed }
    }
  }
  const bundle = await mintBundle(
    root,
    to,
    origin,
    held && !held.item ? basename(held.bundle) : undefined,
  )
  try {
    await writeRecord(bundle, record)
    await relocate(artifact, join(bundle, basename(artifact)))
  } catch (e) {
    await removeOwn(bundle)
    throw e
  }
  return { address: relative(root, bundle), landed: join(bundle, basename(artifact)) }
}

/** Moves a bundle's artifact into `to`, under the chain it left from, with its raw record spread with `extra`, and removes the emptied bundle, asking its name back where the store takes it. */
export async function moveIntoStore(
  root: string,
  fromBundle: string,
  to: BundleStore,
  extra: RawRecord,
): Promise<void> {
  const from = bundleAddressOf(root, fromBundle)?.store
  const artifact = await bundleArtifact(fromBundle)
  const raw = await readRawRecord(fromBundle)
  if (!from || !artifact || !raw) return
  const origin = join(root, originPathOf(root, from, artifact))
  await fileInto(root, to, origin, artifact, { ...raw, ...extra }, relative(root, fromBundle))
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

/** The Collections outside the tree: in a root folder it doesn't hold, hidden or excluded alike, or in the Trash. */
export async function collectionsElsewhere(root: string, tree: NexusTree): Promise<Set<string>> {
  const held = new Set(tree.collections.map((c) => c.path))
  const unheld = (await listEntries(root)).filter(
    ({ name, kind }) =>
      kind === 'dir' && name !== NEXUS_DIR && name !== TRASH_DIR && !held.has(name),
  )
  const ids = await Promise.all(unheld.map(({ name }) => sidecarId(join(root, name), 'collection')))
  const trashed = (await listBundles(root, { kind: 'trash' })).flatMap(({ record }) =>
    record.entity === 'collection' && record.id ? record.id : [],
  )
  return new Set([...ids.flatMap((id) => id ?? []), ...trashed])
}

/** Whether the Collection an Archive is filed under still answers for it: live, outside the tree, or possibly behind a root sidecar that reads unreadable, which could be any Collection. */
export async function archiveOwned(
  tree: NexusTree,
  id: string,
  elsewhere: () => Promise<Set<string>>,
): Promise<boolean> {
  return (
    tree.collections.some((c) => c.id === id) ||
    (tree.unreadable?.some((u) => u.kind === 'collection') ?? false) ||
    (await elsewhere()).has(id)
  )
}

/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. An inner item opens as `inner`: the record the bundle's own derives for it, and the item as the artifact. */
export type OpenBundle = { abs: string; store: BundleStore; record: RecordFile } & (
  | { inner: true; artifact: string }
  | { inner: false; artifact: string | null }
)

type ContainerRecord = Extract<RecordFile, { entity: 'collection' | 'set' }>

const isContainerRecord = (record: RecordFile): record is ContainerRecord =>
  isContainerKind(record.entity)

type InnerRecord = Extract<RecordFile, { entity: 'page' | 'set' }>

/** An address read once: its bundle, store, record, and artifact, and the inner item it names with the container record and artifact holding it, refused when nothing holds that item any more. */
async function readBundleAt(root: string, abs: string) {
  const at = bundleAddressOf(root, abs)
  if (!at) return fault('Only a trash or archive record can be spent.')
  const record = await readRecord(at.bundle)
  if (!record) return fault('That record is unreadable.')
  const artifact = await bundleArtifact(at.bundle)
  const { bundle, store, item } = at
  if (!item) return ok({ bundle, store, record, artifact, inner: null })
  if (
    !isContainerRecord(record) ||
    !artifact ||
    !isAtOrUnder(item, artifact) ||
    !(await pathExists(item))
  )
    return fail('not-found', 'That item is no longer there.')
  return ok({ bundle, store, record, artifact, inner: { item, held: record, artifact } })
}

/** The container ids above `folder` inside a container's bundle, outermost first: the bundle's own trail and parent, the bundled container, and each folder down to `folder`; null when one of them has no id. */
async function trailWithin(
  held: ContainerRecord,
  artifact: string,
  folder: string,
): Promise<string[] | null> {
  const steps = relative(artifact, folder).split('/').filter(Boolean)
  const inner = await Promise.all(
    steps.map((_, i) => sidecarId(join(artifact, ...steps.slice(0, i + 1)), 'set')),
  )
  const ids = [
    ...(held.trail ?? []),
    ...(held.parent.kind === 'container' ? [held.parent.id] : []),
    held.id,
    ...inner,
  ]
  return ids.every((id): id is string => id !== undefined) ? ids : null
}

/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable without one, the bundle's targets, and its partial mark, since what the bundle recorded partly it recorded partly for each item it holds; no place, since the siblings it left are gone with it. */
async function innerRecord(
  held: ContainerRecord,
  trail: readonly string[] | null,
  item: string,
): Promise<InnerRecord> {
  const entity = isMarkdownFile(item) ? 'page' : 'set'
  const { id, icon } = await identityOf(entity, item)
  return {
    entity,
    ...(id ? { id } : {}),
    ...(icon ? { icon } : {}),
    parent: trail ? { kind: 'container', id: trail[trail.length - 1] } : { kind: 'unaddressable' },
    ...(trail && trail.length > 1 ? { trail: trail.slice(0, -1) } : {}),
    ...(held.targets ? { targets: held.targets } : {}),
    ...(held.partial ? { partial: true as const } : {}),
  }
}

/** The Link values the bundle keeps whose page, resolved over the bundle's own pages where they lived, lies at or under `item`, read from the record as it stands at the op, so a value its delete's finish appends later stays with the bundle; a title two of its pages share stays with the bundle. */
async function keptLinksUnder(
  root: string,
  store: BundleStore,
  held: ContainerRecord,
  artifact: string,
  item: string,
) {
  if (!held.links?.length) return []
  const files = await listMarkdownFiles(artifact)
  const index = buildPageIndex(files.map((f) => connPage(f, originPathOf(root, store, f))))
  return held.links.filter((link) => {
    const page = linkedPage(link.value, index)
    return page !== undefined && isAtOrUnder(page.id, item)
  })
}

export async function openBundle(root: string, abs: string): Promise<Result<OpenBundle>> {
  const read = await readBundleAt(root, abs)
  if (!read.ok) return read
  const { bundle, store, record, artifact, inner } = read.value
  if (!inner) return ok({ abs: bundle, store, record, artifact, inner: false })
  const { item, held } = inner
  const own = await innerRecord(held, await trailWithin(held, inner.artifact, dirname(item)), item)
  const links = await keptLinksUnder(root, store, held, inner.artifact, item)
  return ok({
    abs: bundle,
    store,
    record: links.length ? { ...own, links } : own,
    artifact: item,
    inner: true,
  })
}

/** One level of a container address's inner items under the bundle they sit in, its record and store, and the folder they share. */
export interface InnerListing {
  bundle: string
  store: BundleStore
  record: ContainerRecord
  folder: string
  items: { address: string; record: InnerRecord }[]
}

/** One level of a container address's inner items, its Sets and then its pages, each in the order the folder's sidecar keeps, with the record it carries; the trail above them is read once for the level. */
export async function listInner(
  root: string,
  abs: string,
  scope: WatchScope,
): Promise<Result<InnerListing>> {
  const read = await readBundleAt(root, abs)
  if (!read.ok) return read
  const { bundle, store, record, artifact, inner } = read.value
  if (!isContainerRecord(record) || !artifact)
    return fail('not-found', 'That holds no inner items.')
  const folder = inner?.item ?? artifact
  const trail = await trailWithin(record, artifact, folder)
  const entries = (await listEntries(folder)).filter(
    (e) =>
      (e.kind === 'dir' || isContentFile(e)) &&
      !outsideContent(originPathOf(root, store, join(folder, e.name)), scope),
  )
  const items = await Promise.all(
    entries.map(async ({ name }) => {
      const at = join(folder, name)
      const own = await innerRecord(record, trail, at)
      return {
        address: relative(root, at),
        record: own,
        id: own.id ?? at,
        title: titleFromPath(name),
      }
    }),
  )
  const meta =
    (await readJsonObject(sidecarPath(folder, folder === artifact ? record.entity : 'set'))) ?? {}
  const ordered = [
    ...resolveOrder(
      items.filter((i) => i.record.entity === 'set'),
      asStringArray(meta.set_order),
    ),
    ...resolveOrder(
      items.filter((i) => i.record.entity === 'page'),
      asStringArray(meta.page_order),
    ),
  ]
  return ok({
    bundle: relative(root, bundle),
    store,
    record,
    folder: relative(root, folder),
    items: ordered.map(({ address, record }) => ({ address, record })),
  })
}

/** Spends what a restore, an empty, or an Archive delete took: the whole bundle, or from an inner item's bundle only the item's share — the Link values it carried away, and its pages on the strip the bundle's delete still owes — so the bundle's own restore never writes them twice and a later finish never strips a link to what came back. */
export async function spendBundle(root: string, opened: OpenBundle): Promise<void> {
  const { abs, store, record, artifact, inner } = opened
  if (!inner) return void (await removeOwn(abs))
  const gone = 'links' in record ? (record.links ?? []) : []
  const same = (l: unknown): boolean =>
    isPlainObject(l) &&
    gone.some((g) => g.page === l.page && g.property === l.property && g.value === l.value)
  if (gone.length)
    await patchRecord(abs, (raw) => {
      const links = (Array.isArray(raw.links) ? raw.links : []).filter((l) => !same(l))
      return { links: links.length ? links : undefined }
    })
  const bundle = relative(root, abs)
  const owing = Object.entries(await readNotes(root)).find(
    ([, e]) => e.kind === 'container' && e.bundle === bundle,
  )
  if (!owing) return
  const from = originPathOf(root, store, artifact)
  await editNote(root, owing[0], (e) =>
    e?.kind === 'container'
      ? { ...e, strip: distinct(e.strip?.filter((path) => !isAtOrUnder(path, from))) }
      : e,
  )
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
