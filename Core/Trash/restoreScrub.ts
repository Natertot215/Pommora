// A restored artifact's own links and keys, re-spelled where it landed.

import { type CascadeReport, noteRelink } from '../Nexus/cascade'
import { basename, join, relative } from '../Paths/posix'
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
export async function repairLanded(
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
