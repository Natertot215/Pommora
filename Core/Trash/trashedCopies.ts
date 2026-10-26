// The Link values the Trash keeps for what it holds: a stripped value parked with the trashed page it names, so that page's restore writes it back, and a returning value refilled into a trashed copy it can't reach live.

import { join, relative } from '../Paths/posix'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { linkedPage } from '../Connections/linkValue'
import { buildPageIndex, type PageIndex, pageKey } from '../Connections/pageIndex'
import type { StrippedLink } from '../Nexus/cascade'
import type { Frozen } from '../Nexus/governedRoot'
import type { Json } from '../Files/stableJson'
import { type Worked, workedOut } from '../Nexus/owed'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import { stampedIdOf } from '../Files/pageFile'
import { refillOf, rootId, sweepGovernedRoots } from '../Nexus/governedSweep'
import type { PropertyDefinition } from '../Properties/properties'
import { contentPages, listBundles, originPagesIn } from '../Bundles/bundle'
import { collectionOf, originOf, patchRecord } from '../Bundles/record'

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
    const bundle = linkedPage(link.value, index)?.id
    if (bundle) parked.set(bundle, [...(parked.get(bundle) ?? []), link])
  }
  for (const [bundle, rows] of parked) await appendLinks(bundle, rows)
}

/** Where the Trash holds each page or Space `ids` names: the file its values live in; with `from`, only the pages trashed from that Collection. */
export async function trashedHolders(
  root: string,
  ids: ReadonlySet<string>,
  from?: string,
): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  for (const { bundlePath, record, artifactName } of await listBundles(root, { kind: 'trash' })) {
    if (!artifactName) continue
    const origin = from === undefined ? null : originOf(record)
    if (from !== undefined && (!origin || collectionOf(origin) !== from)) continue
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

/** A Link value whose page or Space sits in the Trash goes back into its trashed copy as a live refill would land it, so it returns with it. Answers what it worked out for each copy it couldn't write, by the copy's path: what the copy read and what it would become, or for a copy it couldn't read, every value its page is owed, landing where the copy still reads blank. */
export async function refillTrashed(
  root: string,
  links: StrippedLink[],
  defs: readonly PropertyDefinition[],
  frozen: Frozen,
): Promise<Worked> {
  if (!links.length) return {}
  const holders = await trashedHolders(root, new Set(links.map((l) => l.page)))
  const refills = new Map(defs.map((d) => [d.id, refillOf(d, frozen)]))
  const refilled = (raw: Json, id: string | undefined): Json => {
    let next = raw
    for (const { page, property, value } of links)
      if (page === id) next = refills.get(property)?.(next, value) ?? next
    return next
  }
  const keyOf = new Map(defs.map((d) => [d.id, d.key]))
  const seen = new Map<string, [Json, Json]>()
  const swept = await sweepGovernedRoots([...holders.values()], {
    raw: (raw, file) => {
      const next = refilled(raw, rootId(file, raw))
      if (next === raw) return null
      seen.set(file, [raw, next])
      return next
    },
    above: (raw, file) => (key) =>
      links.find((l) => l.page === rootId(file, raw) && keyOf.get(l.property) === key)?.above,
  })
  // A copy read and not written is owed what its read became, as the scrub's are; one it couldn't read is owed what lands where it reads blank.
  const owed = [...holders].flatMap(([id, file]) => {
    const worked = workedOut(...(seen.get(file) ?? [{}, refilled({}, id)]))
    return swept.skipped.includes(file) && Object.keys(worked).length
      ? [[relative(root, file), worked] as const]
      : []
  })
  return Object.fromEntries(owed)
}
