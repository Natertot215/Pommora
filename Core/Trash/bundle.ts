import { basename, dirname, join, relative } from '../Paths/posix'
import { escapes } from '../Paths/pathSafety'
import { machine } from '../Platform/machine'
import { TRASH_DIR } from '../Paths/nexusPaths'
import { pathExists } from '../Files/atomicWrite'
import { noteOwn, recordWrite } from '../Files/writeEcho'
import type { HostContext } from '../Contract/handlers'
import { readLiveSetting } from '../Settings/settings'
import type { TrashMode } from './trashRow'

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

export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
  recordWrite(absPath)
  const dir = await trashChainDir(nexusRoot, absPath)
  const stamp = fileStamp()
  const base = basename(absPath)
  let dest = join(dir, stampedLeaf(stamp, 0, base))
  for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
  recordWrite(dest)
  await machine().rename(absPath, dest)
  return dest
}

export interface TrashDeps {
  trashMode: TrashMode
  trashToSystem: (absPath: string) => Promise<void>
  permanentDelete?: boolean
}

export async function trashDeps(root: string, ctx: HostContext): Promise<TrashDeps> {
  return {
    trashMode: await ctx.trashMode(),
    trashToSystem: (p) =>
      machine().trashToSystem?.(p) ?? Promise.reject(new Error('This host has no system trash.')),
    permanentDelete: await readLiveSetting(root, 'permanentDelete'),
  }
}

/** A file the Trash can't list — a tile's text, an image sweep's leftover — still goes where Trash Mode sends deletions. */
export async function discardFile(
  nexusRoot: string,
  absPath: string,
  deps: TrashDeps,
): Promise<void> {
  if (deps.trashMode === 'nexus') await trashFileFlat(nexusRoot, absPath)
  else {
    recordWrite(absPath)
    await deps.trashToSystem(absPath)
  }
  await noteOwn({ event: 'unlink', absPath, origin: 'own' })
}
