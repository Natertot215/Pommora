// The trash's bundle primitives: minting the folder a deletion fills, settling the artifact into
// it, and the flat trashing a non-entity file takes instead.

import { mkdir, rename } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative } from 'node:path'
import { TRASH_DIR } from '../Locations/nexusPaths'
import { pathExists } from '../IO/atomicWrite'
import { recordWrite } from '../IO/writeEcho'

export const BUNDLE_SUFFIX = '.deleted'

/** The `.trash` directory mirroring the chain a path was deleted from. `.trash` reads as a
 *  shadow of the nexus, so a deleted page shows where it lived. A path that isn't under the
 *  root has no chain to mirror, and following its `..` would write outside the trash entirely —
 *  it lands flat instead. */
async function trashChainDir(nexusRoot: string, absPath: string): Promise<string> {
  const rel = relative(nexusRoot, absPath)
  const chain = rel && !rel.startsWith('..') && !isAbsolute(rel) ? dirname(rel) : '.'
  const dir = join(nexusRoot, TRASH_DIR, chain)
  await mkdir(dir, { recursive: true })
  return dir
}

/** An ISO instant with `:` and `.` flattened to `-` — a filename-safe stamp. */
export const fileStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')

/** The trash's leaf naming, stated once: the stamp, then a de-collision counter once one is
 *  needed, then the name the entity had. Both trash paths de-collide differently — a bundle
 *  claims its folder atomically, a bare file probes — but what they produce reads identically. */
const stampedLeaf = (stamp: string, n: number, base: string): string =>
  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`

/**
 * Create the empty bundle folder a deletion will fill: `<stamp>__<base>.deleted/` under the
 * mirrored chain. Nothing is destroyed — minting is the first half of a delete, and the record
 * lands inside before the artifact moves.
 *
 * The `mkdir` is deliberately NON-recursive so `EEXIST` actually fires: recursive mkdir accepts
 * an existing directory, and two same-instant deletes would then share one bundle.
 */
export async function mintBundle(nexusRoot: string, absSource: string): Promise<string> {
  const dir = await trashChainDir(nexusRoot, absSource)
  const stamp = fileStamp()
  const base = `${basename(absSource)}${BUNDLE_SUFFIX}`
  for (let n = 0; ; n++) {
    const bundle = join(dir, stampedLeaf(stamp, n, base))
    try {
      await mkdir(bundle)
      return bundle
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
    }
  }
}

/** Move the artifact into its minted bundle under its ORIGINAL basename — the last step of a
 *  delete, and the settle marker: a content bundle holding no artifact is an incomplete one. */
export async function settleBundle(bundleDir: string, absPath: string): Promise<string> {
  const dest = join(bundleDir, basename(absPath))
  // The source's unlink echo is our own write (the .trash destination is unwatched).
  recordWrite(absPath)
  recordWrite(dest)
  await rename(absPath, dest)
  return dest
}

/** Trash a bare file with no record and no bundle, under a stamped leaf. A markdown tile
 *  is not an entity — it has no identity to record and no restore semantics — so it takes this
 *  rather than a bundle. Returns the destination path. */
export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
  recordWrite(absPath)
  const dir = await trashChainDir(nexusRoot, absPath)
  const stamp = fileStamp()
  const base = basename(absPath)
  let dest = join(dir, stampedLeaf(stamp, 0, base))
  for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
  await rename(absPath, dest)
  return dest
}
