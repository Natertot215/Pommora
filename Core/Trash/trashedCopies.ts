// The Link values the Trash keeps for what it holds: a stripped value parked with the trashed page it names, so that page's restore writes it back, and a returning value refilled into a trashed copy it can't reach live.

import { basename, join } from '../Paths/posix'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { isBlankRaw, landValue } from '../Files/rootValues'
import { readLinkText } from '../Connections/linkValue'
import { buildPageIndex, type PageIndex, pageKey } from '../Connections/pageIndex'
import type { StrippedLink } from '../Nexus/cascade'
import type { Frozen } from '../Nexus/governedRoot'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import { rmwJsonStrict } from '../Files/atomicWrite'
import { stampedIdOf } from '../Files/pageFile'
import { sweepGovernedRoots } from '../Nexus/governedSweep'
import { contentPages, listBundles, originPagesIn } from '../Bundles/bundle'
import { patchRecord } from '../Bundles/record'

const appendLinks = (bundleDir: string, links: StrippedLink[]): Promise<void> =>
  patchRecord(bundleDir, (raw) => ({
    links: [...(Array.isArray(raw.links) ? raw.links : []), ...links],
  }))
/** A world a value is read against: a key `targets` recorded at the delete answers by whether the page it named is there under any name, any other key by the name. */
export function frozenWorld(
  index: PageIndex,
  targets: ReadonlyMap<string, { id: string }> = new Map(),
): Frozen {
  return {
    holds: (title) => {
      const id = targets.get(pageKey(title))?.id
      return id === undefined ? index.holders(title).length > 0 : index.byId.has(id)
    },
  }
}

/** A Link value dropped for naming a page the Trash holds joins that page's bundle, so its restore writes it back; a key two trashed pages answer names neither. */
export async function parkLinks(root: string, links: StrippedLink[]): Promise<void> {
  if (!links.length) return
  const index = buildPageIndex(await originPagesIn(root, { kind: 'trash' }))
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
  for (const { bundlePath, record, artifactName } of await listBundles(root, { kind: 'trash' })) {
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
    else await sweepGovernedRoots([file], { raw: (raw) => fill(raw, id) })
}
