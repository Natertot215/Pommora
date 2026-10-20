import { basename, join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { pathExists } from '../Files/atomicWrite'
import { noteOwn, recordWrite } from '../Files/writeEcho'
import type { HostContext } from '../Contract/handlers'
import { readLiveSetting } from '../Settings/settings'
import { chainDir, fileStamp, stampedLeaf } from '../Bundles/bundle'
import type { TrashMode } from './trashMode'

export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
  recordWrite(absPath)
  const dir = await chainDir(nexusRoot, { kind: 'trash' }, absPath)
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
