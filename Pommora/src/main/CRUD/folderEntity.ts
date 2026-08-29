// ONE generic CRUD for every folder-shaped entity — Spaces, Page Collections, Page Sets and the
// agenda configs.
// Invariants: filename = title (rename = folder rename); a fresh entity gets a real ULID;
// foreign sidecar keys are preserved on update.

import { mkdir, rename } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import type { z } from 'zod'
import { newId } from '../ids'
import { readSidecar, writeSidecar, withSidecarLock } from '../sidecarIO'
import { recordWrite } from '../IO/writeEcho'
import { pathExists, invalidName } from './util'
import type { SidecarKind } from '../paths'
import { ok, fail, type Result } from '@shared/result'

/** Create a folder entity: make the folder + write its sidecar with a fresh ULID and
 *  `extra` fields (e.g. `{ color }` for a Space). */
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
  await mkdir(folder, { recursive: true })
  // Suppress the new folder's addDir echo (the sidecar write self-suppresses via atomicWrite, the mkdir
  // doesn't): the create already refetches explicitly, and an un-suppressed watcher swap mid-rename
  // remounts the fresh row and drops the inline-rename keystrokes.
  recordWrite(folder)
  await writeSidecar(folder, kind, { id, ...extra })
  return ok({ id, path: folder })
}

/** Rename a folder entity (filename = title). No-op if the name is unchanged. */
export async function renameFolderEntity(
  absFolder: string,
  newName: string,
): Promise<Result<{ path: string }>> {
  if (invalidName(newName)) return fail('invalid-name', `"${newName}" is not a valid name.`)
  const target = join(dirname(absFolder), newName)
  if (target === absFolder) return ok({ path: absFolder })
  if (await pathExists(target)) return fail('exists', `"${newName}" already exists.`)
  // Both endpoints recorded BEFORE the rename: the caller refetches explicitly, so the
  // watcher's unlinkDir/addDir echo (and every child event under a folder) must not
  // buy a second full walk.
  recordWrite(absFolder)
  recordWrite(target)
  await rename(absFolder, target)
  return ok({ path: target })
}

/** Move a folder entity into a different parent folder (same name). No-op when it's already
 *  there. The whole subtree (its pages + sidecar) moves with it. movePage, folder-level. */
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
  await rename(absFolder, target)
  return ok({ path: target })
}

/** Read-modify-write a folder entity's sidecar, merging `patch` over the current
 *  (foreign keys retained). Returns the written sidecar. */
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
