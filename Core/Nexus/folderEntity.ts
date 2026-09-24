import { join, dirname, basename } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { newId } from './ids'
import { recordWrite } from '../Files/writeEcho'
import { pathExists, targetTaken, writeJson } from '../Files/atomicWrite'
import { nameError } from '../Paths/names'
import { sidecarPath, type SidecarKind } from '../Paths/paths'
import { ok, fail, type Result } from '../Contract/result'

export async function createFolderEntity(
  parentDir: string,
  kind: SidecarKind,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<Result<{ id: string; path: string }>> {
  const why = nameError(name, 'directory')
  if (why) return fail('invalid-name', why)
  const folder = join(parentDir, name)
  if (await pathExists(folder)) return fail('exists', `"${name}" already exists.`)
  const id = newId()
  await machine().mkdir(folder)
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
  if (target === absFolder) return ok({ path: absFolder })
  if (await pathExists(target))
    return fail('exists', `"${basename(absFolder)}" already exists there.`)
  recordWrite(absFolder)
  recordWrite(target)
  await machine().rename(absFolder, target)
  return ok({ path: target })
}
