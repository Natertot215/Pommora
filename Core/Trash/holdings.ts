// What the Trash holds — its bundles, the page titles they hold, and the pages and Spaces they hold by ID — and the Link values a restore hands to it.

import { basename, join, relative, titleFromPath } from '../Paths/posix'
import { SPACE_SIDECAR, TRASH_DIR } from '../Paths/nexusPaths'
import { heldValue, landValue, writeTarget } from '../Files/heldKeys'
import { parseConnectionText } from '../Connections/connections'
import { normalizeTitle } from '../Paths/caseFold'
import type { StrippedLink } from '../Nexus/cascade'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import { readTextOrNull, rmwJsonStrict } from '../Files/atomicWrite'
import { stampedId } from '../Files/pageFile'
import { listEntries, listMarkdownFiles } from '../Files/walk'
import { sweepGovernedRoots } from '../Properties/governedSweep'
import { isBlankRaw } from '../Properties/propertyValue'
import { BUNDLE_SUFFIX } from './bundle'
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
  const texts = await Promise.all(pages.map(readTextOrNull))
  return texts.flatMap((text) => stampedId(text ?? '') ?? [])
}

/** The newest bundle holding each page title in the Trash. */
async function trashedTitles(root: string): Promise<Map<string, string>> {
  const newest = new Map<string, string>()
  for (const { bundlePath, record, artifactName } of await listBundles(root)) {
    if (!artifactName) continue
    for (const page of await contentPages(record.entity, join(root, bundlePath, artifactName))) {
      const title = normalizeTitle(titleFromPath(page))
      const held = newest.get(title)
      if (!held || basename(bundlePath) > basename(held)) newest.set(title, join(root, bundlePath))
    }
  }
  return newest
}

/** A Link value dropped for naming a page the Trash holds joins that page's newest bundle, so the page's restore writes it back. */
export async function parkLinks(root: string, links: StrippedLink[]): Promise<void> {
  if (!links.length) return
  const newest = await trashedTitles(root)
  const parked = new Map<string, StrippedLink[]>()
  for (const link of links) {
    const page = parseConnectionText(link.value)
    const bundle = page && newest.get(normalizeTitle(page.title))
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
          const id = stampedId((await readTextOrNull(page)) ?? '')
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

/** A Link value whose page or Space sits in the Trash goes back into its trashed copy wherever that property reads blank, landing where `writeTarget` places it, so it returns with it; `names` maps each property's ID to its name. */
export async function refillTrashed(
  root: string,
  links: StrippedLink[],
  names: ReadonlyMap<string, string>,
  resolveCase: boolean,
): Promise<void> {
  if (!links.length) return
  const holders = await trashedHolders(root, new Set(links.map((l) => l.page)))
  const fill = (raw: Record<string, unknown>, id: unknown): Record<string, unknown> | null => {
    let next = raw
    for (const { page, property, value } of links) {
      const name = names.get(property)
      if (page === id && name && isBlankRaw(heldValue(next, name, false)))
        next = landValue(next, writeTarget(next, name, resolveCase), value)
    }
    return next === raw ? null : next
  }
  for (const [id, file] of holders)
    if (basename(file) === SPACE_SIDECAR) await rmwJsonStrict(file, (raw) => fill(raw, id))
    else await sweepGovernedRoots(root, [file], { raw: (raw) => fill(raw, id) })
}
