// What the Trash holds — its bundles, the pages they hold at the paths they left, and the pages and Spaces they hold by ID — and the Link values a restore hands to it.

import { basename, join, relative } from '../Paths/posix'
import { SPACE_SIDECAR, TRASH_DIR } from '../Paths/nexusPaths'
import { landValue } from '../Files/rootValues'
import { readLinkText } from '../Connections/linkValue'
import { buildPageIndex, type ConnPage, connPage } from '../Connections/pageIndex'
import type { StrippedLink } from '../Nexus/cascade'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import { rmwJsonStrict } from '../Files/atomicWrite'
import { stampedIdOf } from '../Files/pageFile'
import { listEntries, listMarkdownFiles } from '../Files/walk'
import { sweepGovernedRoots } from '../Properties/governedSweep'
import { isBlankRaw } from '../Properties/propertyValue'
import { BUNDLE_SUFFIX, deletedPathOf } from './bundle'
import { type RecordFile, appendLinks, bundleArtifact, readRecord } from './record'

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

const trashedPage = (root: string, bundleAbs: string, file: string, id: string): ConnPage =>
  connPage(id, deletedPathOf(root, bundleAbs, file))

/** Every trashed page at the path it left, its `id` the bundle holding it, since parking needs the bundle alone and reads no file. */
async function trashedPages(root: string): Promise<ConnPage[]> {
  const out: ConnPage[] = []
  for (const { bundlePath, record, artifactName } of await listBundles(root)) {
    if (!artifactName) continue
    const bundle = join(root, bundlePath)
    for (const file of await contentPages(record.entity, join(bundle, artifactName)))
      out.push(trashedPage(root, bundle, file, bundle))
  }
  return out
}

/** One bundle's pages at the paths they left, with the ids their files carry; an ID-less one answers to its file, which no index holds as an id. */
export async function trashedPagesOf(
  root: string,
  bundleAbs: string,
  files: readonly string[],
): Promise<ConnPage[]> {
  const out: ConnPage[] = []
  for (const file of files) {
    const id = await stampedIdOf(file)
    out.push(trashedPage(root, bundleAbs, file, id ?? file))
  }
  return out
}

/** A Link value dropped for naming a page the Trash holds joins that page's bundle, so its restore writes it back; a key two trashed pages answer names neither. */
export async function parkLinks(root: string, links: StrippedLink[]): Promise<void> {
  if (!links.length) return
  const index = buildPageIndex(await trashedPages(root))
  const parked = new Map<string, StrippedLink[]>()
  for (const link of links) {
    const page = readLinkText(link.value)
    const bundle = page?.kind === 'page' ? index.resolve(page.title).page?.id : undefined
    if (bundle) parked.set(bundle, [...(parked.get(bundle) ?? []), link])
  }
  for (const [bundle, rows] of parked) await appendLinks(bundle, rows)
}

/** Where the Trash holds each page or Space `ids` names: the file its values live in. */
async function trashedHolders(
  root: string,
  ids: ReadonlySet<string>,
): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  for (const { bundlePath, record, artifactName } of await listBundles(root)) {
    if (!artifactName) continue
    const artifact = join(root, bundlePath, artifactName)
    switch (record.entity) {
      case 'page':
        if (record.id && ids.has(record.id)) found.set(record.id, artifact)
        break
      case 'set':
      case 'collection':
        for (const page of await contentPages(record.entity, artifact)) {
          const id = await stampedIdOf(page)
          if (id && ids.has(id)) found.set(id, page)
        }
        break
      case 'space':
        if (ids.has(record.id)) found.set(record.id, join(artifact, SPACE_SIDECAR))
        break
      case 'context':
        for (const [name, id] of (await spaceIdsIn(artifact)).ids)
          if (ids.has(id)) found.set(id, join(artifact, name, SPACE_SIDECAR))
        break
    }
  }
  return found
}

/** A Link value whose page or Space sits in the Trash goes back into its trashed copy wherever that property reads blank, so it returns with it; `keys` maps each property's ID to its key. */
export async function refillTrashed(
  root: string,
  links: StrippedLink[],
  keys: ReadonlyMap<string, string>,
): Promise<void> {
  if (!links.length) return
  const holders = await trashedHolders(root, new Set(links.map((l) => l.page)))
  const fill = (raw: Record<string, unknown>, id: unknown): Record<string, unknown> | null => {
    let next = raw
    for (const { page, property, value } of links) {
      const key = keys.get(property)
      if (page === id && key && isBlankRaw(next[key])) next = landValue(next, key, value)
    }
    return next === raw ? null : next
  }
  for (const [id, file] of holders)
    if (basename(file) === SPACE_SIDECAR) await rmwJsonStrict(file, (raw) => fill(raw, id))
    else await sweepGovernedRoots(root, [file], { raw: (raw) => fill(raw, id) })
}
