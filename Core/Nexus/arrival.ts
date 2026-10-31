// What an item back from a store does once it lands, a restore's and a hand move's alike: its arrival re-spelled into the world it rejoins, and its own links and keys repaired where it landed.

import { type CascadeReport, joinCascades, linksNotUpdated, noteRelink, respell } from './cascade'
import { basename, join, relative } from '../Paths/posix'
import { respellings } from '../Connections/rewrite'
import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
import { listPathsUnder } from '../Files/walk'
import { contentPages } from '../Bundles/bundle'
import type { RecordFile } from '../Bundles/record'
import { hiddenFolder, SPACE_SIDECAR } from '../Paths/nexusPaths'

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
