// What an item back from a store does once it lands, a restore's and a hand move's alike: its arrival re-spelled into the world it rejoins, and its own links and keys repaired where it landed.

import {
  type CascadeReport,
  joinCascades,
  linksNotUpdated,
  noteRelink,
  respell,
  type StrippedLink,
} from './cascade'
import { basename, join, relative, titleFromPath } from '../Paths/posix'
import type { Stored } from '../Paths/bundleLayout'
import { respellings, rewriteConnections } from '../Connections/rewrite'
import { buildPageIndex, type ConnPage, connPage, type PageIndex } from '../Connections/pageIndex'
import { listPathsUnder } from '../Files/walk'
import { joinValues, landValue } from '../Files/rootValues'
import type { Json } from '../Files/stableJson'
import {
  bundleArtifact,
  contentPages,
  listBundles,
  type OpenBundle,
  openBundle,
  originPagesOf,
  spendBundle,
} from '../Bundles/bundle'
import {
  type ArtifactRecord,
  collectionOf,
  currentOrigin,
  originOf,
  type RecordFile,
} from '../Bundles/record'
import { refileLanded } from '../Archive/refile'
import { contextKey } from '../Contexts/contexts'
import { contextWorldOf } from '../Contexts/contextResolve'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import { linkDefsOf } from '../Properties/propertiesRegistry'
import { readLiveSetting } from '../Settings/settings'
import { refillOf, sweepRootsById } from './governedSweep'
import { linkWorld, type NexusPages, nexusPages, shownTitle } from './heldPages'
import { liveTreeOf } from './liveTree'
import { restoreNote } from './owed'
import { pageIndexOf } from './record'
import type { NexusTree, SpaceNode } from './tree'
import { CONTEXTS_DIR_REL, hiddenFolder, SPACE_SIDECAR } from '../Paths/nexusPaths'

/** A returning or landed artifact's governed files: its pages, and the Space sidecars under it. */
async function artifactFiles(
  root: string,
  entity: RecordFile['entity'],
  abs: string,
): Promise<string[]> {
  const sidecars = await listPathsUnder(root, abs, (rel, kind) =>
    kind === 'dir' ? !hiddenFolder(basename(rel)) : basename(rel) === SPACE_SIDECAR,
  )
  return [...(await contentPages(entity, abs)), ...sidecars.map((rel) => join(root, rel))]
}

/** A returning artifact's own links and keys, repaired where it landed under the relink entry keyed by its path: each key in `own` re-spells, in the landed files alone, to how it names its returning page now, a Context restored under a new title re-keys its Spaces' sidecars by `landed.rekey`, and a file either misses is owed with Try Again. A repair whose note can't be written still runs, owing nothing. */
async function repairLanded(
  root: string,
  landed: { entity: RecordFile['entity']; abs: string; rekey?: [from: string, to: string] },
  label: string,
  own: ReadonlyMap<string, string>,
): Promise<CascadeReport | undefined> {
  if (!own.size && !landed.rekey) return undefined
  const files = (await artifactFiles(root, landed.entity, landed.abs)).map((f) => relative(root, f))
  return noteRelink(root, relative(root, landed.abs), () => ({
    kind: 'relink',
    names: Object.fromEntries(own),
    label,
    files,
    rekey: landed.rekey,
  }))
}

/** A restore's re-spell, two maps rather than one `relink`: the arrival's collisions read against the live world alone, since beside the returning pages a twin's bare link reads ambiguous and a returning `Notes/Alpha` would take `notes/alpha` from a live `X/Notes/Alpha`. `own` reads the returning pages' own keys against themselves and joins `names` only where the live world names nothing, so a title-only link that found a namesake meanwhile stays with it. */
function returningNames(
  live: PageIndex,
  after: PageIndex,
  back: readonly ConnPage[],
): { names: Map<string, string>; own: Map<string, string> } {
  const ids = back.map((p) => p.id)
  const own = respellings(buildPageIndex(back), after, ids, [])
  const names = respellings(live, after, [], ids)
  for (const [k, v] of own) if (live.resolve(k).status === 'phantom') names.set(k, v)
  return { names, own }
}

/** An arrival under `title` into `live`, the world before it: `after`, the index once it landed, re-spells the returning files' own links at `landed.abs`, then the live world's collisions, so live linkers that found a namesake meanwhile stay with it while the returning files keep their own targets; what either misses is owed with Try Again. Answers the notice that links weren't updated when the index couldn't settle, `after` null. */
export async function returningCascade(
  root: string,
  live: PageIndex,
  after: PageIndex | null,
  back: readonly ConnPage[],
  title: string,
  landed: { entity: RecordFile['entity']; abs: string; rekey?: [from: string, to: string] },
): Promise<{ own: Map<string, string>; cascade?: CascadeReport }> {
  if (!after) return { own: new Map(), cascade: linksNotUpdated(title) }
  const { names, own } = returningNames(live, after, back)
  const repaired = await repairLanded(root, landed, title, own)
  if (!names.size) return { own, cascade: repaired }
  return {
    own,
    cascade: joinCascades(
      repaired,
      await respell(
        root,
        back.map((p) => p.id),
        names,
        title,
      ),
    ),
  }
}

/** The tail every item back from a store runs, a restore's and a hand move's alike, `opened` the bundle or the share of one it left and `record` its record as placed: the bundle spent first, since everything after reads the record from memory; the arrival re-spelled from `live`, the world before it, to `after`, the index once it landed; a Context's membership or a Space's members tagged again, or the Link values its delete stripped put back under Restore Links On Deletion in one sweep across every Link definition, over the world read once it landed; and, unless it `filed` back into a store, a Set's archived records carried out of the Archive of the Collection its stored chain stands in now. Answers the titles of what didn't take its tag or value back, and the cascade. */
export async function arrive(
  root: string,
  a: {
    opened: OpenBundle
    record: ArtifactRecord
    title: string
    landed: { entity: RecordFile['entity']; abs: string; rekey?: [from: string, to: string] }
    filed?: boolean
    back: readonly ConnPage[]
    live: PageIndex
    after: PageIndex | null
  },
): Promise<{ unrestored: string[]; cascade?: CascadeReport }> {
  const { record, title } = a
  await spendBundle(root, a.opened)
  const { own, cascade } = await returningCascade(root, a.live, a.after, a.back, title, a.landed)
  const tree = await liveTreeOf(root)
  const { byId, archived } = await nexusPages(root, tree)
  const missed =
    record.entity === 'context' || record.entity === 'space'
      ? await retag(root, tree, byId, record, title, a.landed.abs)
      : record.links && (await readLiveSetting(root, 'restoreLinksOnDeletion'))
        ? await refill(root, tree, byId, linkWorld(tree, archived), record.links, own)
        : []
  const left = a.filed ? null : originOf(a.opened.record)
  const now = left && currentOrigin(tree, left)
  if (now) await refileLanded(root, record, collectionOf(now))
  const unrestored = missed.flatMap((id) => shownTitle(tree, byId, id) ?? [])
  return { unrestored, ...(cascade ? { cascade } : {}) }
}

export type Departed = { id: string; from: string; to: string; at: Stored }

export async function recognize(
  root: string,
  before: PageIndex,
  after: PageIndex,
  bundle: string,
  departed: readonly Departed[],
): Promise<CascadeReport | undefined> {
  const abs = join(root, bundle)
  const whole = (await bundleArtifact(abs)) === null
  const opened = whole
    ? [await openBundle(root, abs)]
    : await Promise.all(departed.map((p) => openBundle(root, join(root, p.from), p.id)))
  let cascade: CascadeReport | undefined
  for (const [i, at] of opened.entries()) {
    if (!at.ok || at.value.record.entity === 'property') continue
    const { entity } = at.value.record
    const { id, to, at: stored } = departed[whole ? 0 : i]
    const up = (path: string): string => {
      const segs = path.split('/')
      return segs.slice(0, segs.length - stored.inner.length + 1).join('/')
    }
    const landed = join(root, whole ? up(to) : to)
    const arrived = await arrive(root, {
      opened: at.value,
      record: at.value.record,
      title: titleFromPath(landed),
      landed: { entity, abs: landed },
      back: whole
        ? await originPagesOf(root, await contentPages(entity, landed), (f) =>
            join(up(stored.origin), relative(landed, f)),
          )
        : [connPage(id, stored.origin)],
      live: before,
      after,
    })
    cascade = joinCascades(cascade, arrived.cascade)
  }
  return cascade
}

export function arrivedSpaces(handed: NexusTree, tree: NexusTree): SpaceNode[] {
  if (handed.contexts === tree.contexts) return []
  const { spaceById } = contextWorldOf(handed.contexts)
  return [...contextWorldOf(tree.contexts).spaceById.values()].filter((s) => !spaceById.has(s.id))
}

export async function recognizeSpaces(
  root: string,
  spaces: readonly SpaceNode[],
): Promise<{ finished: boolean; cascade?: CascadeReport }> {
  let cascade: CascadeReport | undefined
  let finished = false
  const records = await listBundles(root, { kind: 'trash' }, CONTEXTS_DIR_REL, { recordOnly: true })
  for (const { bundlePath, record } of records) {
    if (record.entity !== 'space' || record.parent.kind !== 'context') continue
    const contextId = record.parent.id
    const space = spaces.find((s) => s.id === record.id && s.contextId === contextId)
    const opened = space && (await openBundle(root, join(root, bundlePath)))
    if (!space || !opened?.ok || !(await restoreNote(root, record.id)).ok) continue
    const index = pageIndexOf(await liveTreeOf(root))
    const arrived = await arrive(root, {
      opened: opened.value,
      record,
      title: space.title,
      landed: { entity: 'space', abs: join(root, space.path) },
      back: [],
      live: index,
      after: index,
    })
    cascade = joinCascades(cascade, arrived.cascade)
    finished = true
  }
  return { finished, ...(cascade ? { cascade } : {}) }
}

async function retag(
  root: string,
  tree: NexusTree,
  byId: NexusPages['byId'],
  record: Extract<ArtifactRecord, { entity: 'context' | 'space' }>,
  title: string,
  abs: string,
): Promise<string[]> {
  if (record.entity === 'context') {
    const titlesById = new Map([...(await spaceIdsIn(abs)).ids].map(([name, id]) => [id, name]))
    const additions: Record<string, string[]> = {}
    const above: Record<string, string | undefined> = {}
    for (const m of record.membership) {
      if (!m.root.id) continue
      const titles = m.spaces
        .map((s) => (s.id ? titlesById.get(s.id) : undefined))
        .filter((t): t is string => typeof t === 'string')
      if (titles.length) additions[m.root.id] = titles
      above[m.root.id] = m.root.above
    }
    return reapply(root, byId, contextKey(title), additions, above)
  }
  const group =
    record.parent.kind === 'context' &&
    contextWorldOf(tree.contexts).groupById.get(record.parent.id)
  if (!group) return []
  const members = record.members.filter(
    (m): m is typeof m & { id: string } => typeof m.id === 'string',
  )
  const additions = Object.fromEntries(members.map((m) => [m.id, [title]]))
  const above = Object.fromEntries(members.map((m) => [m.id, m.above]))
  return reapply(root, byId, contextKey(group.def.title), additions, above)
}

/** The ids of what's still here and didn't take its tag back, one of two files claiming its id among them; a root gone since has nothing to take it. A root that no longer holds the key takes it back above the key `above` names for it. */
async function reapply(
  root: string,
  roots: NexusPages['byId'],
  key: string,
  additions: Record<string, string[]>,
  above: Record<string, string | undefined>,
): Promise<string[]> {
  const { taken } = await sweepRootsById(
    root,
    roots,
    additions,
    (id) => above[id],
    (raw, titles) => landValue(raw, key, joinValues(raw[key], titles)),
  )
  return Object.keys(additions).filter((id) => roots.get(id) !== undefined && !taken.has(id))
}

async function refill(
  root: string,
  tree: NexusTree,
  byId: NexusPages['byId'],
  world: PageIndex,
  links: readonly StrippedLink[],
  own: Map<string, string>,
): Promise<string[]> {
  const defs = new Map(linkDefsOf(tree.config.registry).map((d) => [d.id, d]))
  const held: Record<string, StrippedLink[]> = {}
  for (const link of links) {
    if (!defs.has(link.property)) continue
    held[link.page] ??= []
    held[link.page].push({ ...link, value: rewriteConnections(link.value, own) })
  }
  const missed = new Set<string>()
  const { taken } = await sweepRootsById(
    root,
    byId,
    held,
    (id, key) => held[id]?.find((l) => defs.get(l.property)?.key === key)?.above,
    (raw, stripped) =>
      stripped.reduce<Json | null>((acc, l) => {
        const def = defs.get(l.property)
        const next = def ? refillOf(def, world)(acc ?? raw, l.value) : null
        if (next === null) missed.add(l.page)
        return next ?? acc
      }, null),
  )
  return Object.keys(held).filter(
    (id) => byId.get(id) !== undefined && (missed.has(id) || !taken.has(id)),
  )
}
