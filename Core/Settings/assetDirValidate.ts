import { join } from '../Locations/posix'
import { machine } from '../Platform/machine'
import { fail, ok, type Result } from '../Contract/result'
import { isMarkdownFile, listEntries } from '../IO/walk'
import { resolveUnderRoot } from '../Locations/pathSafety'
import { assetDirRefusal } from './codec'
import { SIDECARS, relPosix } from '../Locations/paths'

export async function validateAssetDir(root: string, abs: string): Promise<Result<string>> {
  const rel = relPosix(root, abs)
  if (!rel) return fail('invalid-path', 'The nexus root itself cannot hold assets.')
  const resolved = await resolveUnderRoot(root, rel)
  if (!resolved.ok) return resolved
  const refusal = assetDirRefusal(rel)
  if (refusal) return fail('invalid-path', refusal)
  const stats = await machine()
    .stat(resolved.value)
    .catch(() => null)
  if (!stats) return fail('not-found', 'Path not found.')
  // `realpath` succeeds on a file and a directory listing of one reads as empty, so without this a picked image would be accepted and every asset would quietly stop resolving.
  if (!stats.isDirectory) return fail('invalid-path', 'That is a file, not a folder.')
  // The WHOLE subtree, not the folder's own entries — the asset root is pruned by segment prefix, so a Collection nested three levels down would vanish along with it.
  return (await holdsContent(resolved.value))
    ? fail('invalid-path', 'That folder holds pages.')
    : ok(rel)
}

async function holdsContent(abs: string): Promise<boolean> {
  const entries = await listEntries(abs)
  if (entries.some((e) => e.kind === 'file' && (isMarkdownFile(e.name) || SIDECARS.has(e.name))))
    return true
  for (const e of entries) {
    if (e.kind === 'dir' && (await holdsContent(join(abs, e.name)))) return true
  }
  return false
}
