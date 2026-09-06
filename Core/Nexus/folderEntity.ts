import { join, dirname, basename } from '../Paths/posix'
import { machine } from '../Platform/machine'
import type { z } from 'zod'
import { newId } from './ids'
import { readSidecar, writeSidecar, withSidecarLock } from '../Files/sidecar'
import { recordWrite } from '../Files/writeEcho'
import { pathExists } from '../Files/atomicWrite'
import { invalidName } from './util'
import type { SidecarKind } from '../Paths/paths'
import { ok, fail, type Result } from '../Contract/result'

export async function createFolderEntity(
  parentDir: string,
  kind: SidecarKind,
  name: string,
  extra: Record<string, unknown> = {},
): Promise<Result<{ id: string; path: string }>> {
  if (invalidName(name)) return fail('invalid-name', `"${name}" is not a valid name.`)
  const folder = join(parentDir, name)
  if (await pathExists(folder)) return fail('exists', `"${name}" already exists.`)
  const id = newId()
  await machine().mkdir(folder)
  // Suppress addDir echo: mkdir doesn't self-suppress; un-suppressed swap mid-rename drops keystrokes.
  recordWrite(folder)
  await writeSidecar(folder, kind, { id, ...extra })
  return ok({ id, path: folder })
}

export async function renameFolderEntity(
  absFolder: string,
  newName: string,
): Promise<Result<{ path: string }>> {
  if (invalidName(newName)) return fail('invalid-name', `"${newName}" is not a valid name.`)
  const target = join(dirname(absFolder), newName)
  if (target === absFolder) return ok({ path: absFolder })
  if (await pathExists(target)) return fail('exists', `"${newName}" already exists.`)
  // Watcher's unlinkDir/addDir echo must not cost a full walk.
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

export function updateFolderSidecar<S extends z.ZodType>(
  absFolder: string,
  kind: SidecarKind,
  schema: S,
  patch: Partial<z.infer<S>>,
): Promise<Result<z.infer<S>>> {
  return withSidecarLock(absFolder, kind, async () => {
    const current = await readSidecar(absFolder, kind, schema)
    if (current === null) return fail('not-found', 'Sidecar not found or invalid.')
    const next = { ...current, ...patch }
    await writeSidecar(absFolder, kind, next)
    return ok(next)
  })
}
