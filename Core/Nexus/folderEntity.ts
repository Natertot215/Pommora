import { join, dirname, basename, relative } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { newId } from './ids'
import { recordWrite, reportRename } from '../Files/writeEcho'
import { pathExists, targetTaken, writeJson } from '../Files/atomicWrite'
import { nameError } from '../Paths/names'
import { sidecarPath } from '../Paths/paths'
import type { SidecarKind } from '../Paths/nexusPaths'
import { ok, fail, type Result } from '../Contract/result'
import { outsideContent } from '../Paths/exclusion'
import { followExcludedFolders, readWatchScope } from '../Settings/settings'
import { moveIndexPaths } from '../Index/indexSeed'

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

/** What follows a Collection or Set landing at a new path: the index moves its rows, excluded entries follow before sync hears of the rename so it pushes under the new scope, and true means the landing moved what the scope keeps out. */
export async function landedFolder(root: string, fromAbs: string, toAbs: string): Promise<boolean> {
  await moveIndexPaths(root, fromAbs, toAbs)
  const rescope = await followExcludedFolders(root, relative(root, fromAbs), relative(root, toAbs))
  reportRename(fromAbs, toAbs)
  return rescope
}

export async function createFolderEntity(
  parentDir: string,
  kind: SidecarKind,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<Result<{ id: string; path: string }>> {
  const why = nameError(name, 'directory')
  if (why) return fail('invalid-name', why)
  const folder = join(parentDir, name)
  if ((await machine().mkdir(folder)) === 'exists')
    return fail('exists', `"${name}" already exists.`)
  const id = newId()
  // Suppress the new folder's addDir echo (the mkdir doesn't self-suppress like the sidecar write does) — an un-suppressed watcher swap mid-rename remounts the fresh row and drops the inline-rename keystrokes.
  recordWrite(folder)
  await writeJson(sidecarPath(folder, kind), { id, ...extra })
  return ok({ id, path: folder })
}

export async function renameFolderEntity(
  absFolder: string,
  newName: string,
): Promise<Result<{ path: string }>> {
  const why = nameError(newName, 'directory')
  if (why) return fail('invalid-name', why)
  const target = join(dirname(absFolder), newName)
  if (target === absFolder) return ok({ path: absFolder })
  if (await targetTaken(absFolder, target)) return fail('exists', `"${newName}" already exists.`)
  // The watcher's unlinkDir/addDir echo (and every child event under a folder) must not buy a second full walk.
  recordWrite(absFolder)
  recordWrite(target)
  await machine().rename(absFolder, target)
  return ok({ path: target })
}

export async function moveFolderEntity(
  absFolder: string,
  newParentDir: string,
): Promise<Result<{ path: string }>> {
  const target = join(newParentDir, basename(absFolder))
  if (await pathExists(target))
    return fail('exists', `"${basename(absFolder)}" already exists there.`)
  recordWrite(absFolder)
  recordWrite(target)
  await machine().rename(absFolder, target)
  return ok({ path: target })
}
