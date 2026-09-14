import { basename, dirname, join, relative } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import { machine } from '../Platform/machine'
import { TRASH_DIR } from '../Paths/nexusPaths'
import { pathExists } from '../Files/atomicWrite'
import { recordWrite } from '../Files/writeEcho'

export const BUNDLE_SUFFIX = '.deleted'

/** `.trash` reads as a shadow of the nexus, so a deleted page shows where it lived. A path that isn't under the root has no chain to mirror, and following its `..` would write outside the trash entirely — it lands flat instead. */
async function trashChainDir(nexusRoot: string, absPath: string): Promise<string> {
  const rel = relative(nexusRoot, absPath)
  const chain = rel && !escapes(rel) ? dirname(rel) : '.'
  const dir = join(nexusRoot, TRASH_DIR, chain)
  await machine().mkdir(dir)
  return dir
}

export const fileStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')

const stampedLeaf = (stamp: string, n: number, base: string): string =>
  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`

export async function mintBundle(nexusRoot: string, absSource: string): Promise<string> {
  const dir = await trashChainDir(nexusRoot, absSource)
  const stamp = fileStamp()
  const base = `${basename(absSource)}${BUNDLE_SUFFIX}`
  for (let n = 0; ; n++) {
    const bundle = join(dir, stampedLeaf(stamp, n, base))
    if ((await machine().mkdir(bundle)) === 'created') return bundle
  }
}

export async function settleBundle(bundleDir: string, absPath: string): Promise<string> {
  const dest = join(bundleDir, basename(absPath))
  // The source's unlink echo is our own write (the .trash destination is unwatched).
  recordWrite(absPath)
  recordWrite(dest)
  await machine().rename(absPath, dest)
  return dest
}

export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
  recordWrite(absPath)
  const dir = await trashChainDir(nexusRoot, absPath)
  const stamp = fileStamp()
  const base = basename(absPath)
  let dest = join(dir, stampedLeaf(stamp, 0, base))
  for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
  await machine().rename(absPath, dest)
  return dest
}
