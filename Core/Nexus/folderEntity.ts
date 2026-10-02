import { join, dirname, basename, relative } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { recordWrite } from '../Files/writeEcho'
import { pathExists, relocate, targetTaken, writeJson } from '../Files/atomicWrite'
import { nameError } from '../Paths/names'
import { sidecarPath } from '../Paths/paths'
import type { SidecarKind } from '../Paths/nexusPaths'
import { ok, fail, type Result } from '../Contract/result'
import { outsideContent } from '../Paths/exclusion'
import { followExcludedFolders, readWatchScope } from '../Settings/settings'

const SET_ASIDE = {
  excluded:
    'is currently listed as an excluded directory in settings; please choose a different name or remove it from the exclusion list.',
  asset:
    'is currently listed as the default asset folder; please choose a different name or pick a different asset folder.',
}

// A Collection or Set landing on a folder Settings keeps out of the Nexus would leave the tree the moment it lands. A name the primitive refuses is left to it.
export async function landingRefusal(
  root: string,
  parentDir: string,
  name: string,
): Promise<Result<never> | null> {
  if (nameError(name, 'directory')) return null
  const why = outsideContent(relative(root, join(parentDir, name)), await readWatchScope(root))
  return why && why !== 'hidden' ? fail('invalid-path', `"${name}" ${SET_ASIDE[why]}`) : null
}

/** A Collection or Set landing at a new path: excluded entries follow before sync hears of the rename, so it pushes under the new scope. */
const relocateFolder = (root: string, from: string, to: string): Promise<void> =>
  relocate(from, to, () => followExcludedFolders(root, relative(root, from), relative(root, to)))

export async function createFolderEntity(
  parentDir: string,
  kind: SidecarKind,
  name: string,
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Result<{ id: string; path: string }>> {
  const why = nameError(name, 'directory')
  if (why) return fail('invalid-name', why)
  const folder = join(parentDir, name)
  if ((await machine().mkdir(folder)) === 'exists')
    return fail('exists', `"${name}" already exists.`)
  // The mkdir doesn't suppress its own addDir echo as the sidecar write does; recorded here, the folder is never read before its sidecar lands.
  recordWrite(folder)
  await writeJson(sidecarPath(folder, kind), { id, ...extra })
  return ok({ id, path: folder })
}

export async function renameFolderEntity(
  root: string,
  absFolder: string,
  newName: string,
): Promise<Result<{ path: string }>> {
  const why = nameError(newName, 'directory')
  if (why) return fail('invalid-name', why)
  const target = join(dirname(absFolder), newName)
  if (target === absFolder) return ok({ path: absFolder })
  if (await targetTaken(absFolder, target)) return fail('exists', `"${newName}" already exists.`)
  await relocateFolder(root, absFolder, target)
  return ok({ path: target })
}

export async function moveFolderEntity(
  root: string,
  absFolder: string,
  newParentDir: string,
): Promise<Result<{ path: string }>> {
  const target = join(newParentDir, basename(absFolder))
  if (await pathExists(target))
    return fail('exists', `"${basename(absFolder)}" already exists there.`)
  await relocateFolder(root, absFolder, target)
  return ok({ path: target })
}
