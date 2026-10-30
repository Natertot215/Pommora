import { basename, join } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { pathExists } from '../Files/atomicWrite'
import { noteOwn, recordWrite } from '../Files/writeEcho'
import { chainDir } from '../Bundles/bundle'
import { fileStamp, stampedLeaf } from '../Paths/bundleLayout'

/** A file the Trash can't list, a tile's text or an image sweep's leftover, moves into `.trash` under the chain it left from, stamped, with no record. */
export async function discardFile(nexusRoot: string, absPath: string): Promise<void> {
  recordWrite(absPath)
  const dir = await chainDir(nexusRoot, { kind: 'trash' }, absPath)
  const stamp = fileStamp()
  const base = basename(absPath)
  let dest = join(dir, stampedLeaf(stamp, 0, base))
  for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
  recordWrite(dest)
  await machine().rename(absPath, dest)
  await noteOwn({ event: 'unlink', absPath, origin: 'own' })
}
