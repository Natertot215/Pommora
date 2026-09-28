// What the Trash holds — its bundles, the page titles they hold, and the pages and Spaces they hold by ID — and the Link values a restore hands to it.

import { basename, join, relative, titleFromPath } from '../Paths/posix'
import { SPACE_SIDECAR, TRASH_DIR } from '../Paths/nexusPaths'
import { normalizeTitle, parseConnectionText } from '../Connections/connections'
import type { StrippedLink } from '../Nexus/cascade'
import { spaceSidecarsIn } from '../Contexts/spaceSidecar'
import { readJsonObject, readTextOrNull, rmwJsonStrict } from '../Files/atomicWrite'
import { stampedId } from '../Files/pageFile'
import { listEntries, listMarkdownFiles } from '../Files/walk'
import { sweepGovernedRoots } from '../Properties/governedSweep'
import { isBlankRaw } from '../Properties/propertyValue'
import { BUNDLE_SUFFIX } from './bundle'
import { readLiveSetting } from '../Settings/settings'
import { titlesOf } from '../Nexus/valuesChanged'
import type { NexusTree } from '../Nexus/tree'
import type { Frozen } from '../Properties/propertyValue'
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

/** A restore's world: the pages the tree holds, and those landing with it. */
function frozenWorld(tree: NexusTree, landing: readonly string[]): Frozen {
  const held = titlesOf(tree)
  const arriving = new Set(landing.map(normalizeTitle))
  return {
    holds: (title) => {
      const key = normalizeTitle(title)
      return held.has(key) || arriving.has(key)
    },
  }
}

/** What a restore may still name: the pages the tree holds and those landing with it, and, while Restore Links On Deletion is off and nothing parked would come back, the pages the Trash holds. */
export async function restoreWorld(
  root: string,
  tree: NexusTree,
  landing: readonly string[] = [],
): Promise<Frozen> {
  if (await readLiveSetting(root, 'restoreLinksOnDeletion')) return frozenWorld(tree, landing)
  return frozenWorld(tree, [...landing, ...(await trashedTitles(root)).keys()])
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
        for (const { file } of await spaceSidecarsIn(artifact)) {
          const id = (await readJsonObject(file))?.id
          if (typeof id === 'string' && ids.has(id)) found.set(id, file)
        }
        break
    }
  }
  return found
}

/** A Link value whose page or Space sits in the Trash goes back into its trashed copy wherever that key is blank, so it returns with it; `names` maps each property's ID to its key. */
export async function refillTrashed(
  root: string,
  links: StrippedLink[],
  names: ReadonlyMap<string, string>,
): Promise<void> {
  if (!links.length) return
  const holders = await trashedHolders(root, new Set(links.map((l) => l.page)))
  const fill = (raw: Record<string, unknown>, id: unknown): Record<string, unknown> | null => {
    const added = links.flatMap((l) => {
      const key = names.get(l.property)
      return l.page === id && key && isBlankRaw(raw[key]) ? [[key, l.value] as const] : []
    })
    return added.length ? { ...raw, ...Object.fromEntries(added) } : null
  }
  for (const [id, file] of holders)
    if (basename(file) === SPACE_SIDECAR) await rmwJsonStrict(file, (raw) => fill(raw, id))
    else await sweepGovernedRoots(root, [file], { raw: (raw) => fill(raw, id) })
}
