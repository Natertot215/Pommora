// ONE generic CRUD for every folder-shaped entity — Spaces, Page Collections, Page Sets and the
// agenda configs. Invariants: filename = title; a fresh entity gets a real ULID; foreign
// sidecar keys are preserved on update.

import { mkdir, rename } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import type { z } from 'zod'
import { newId } from '../ids'
import { readSidecar, writeSidecar, withSidecarLock } from '../sidecarIO'
import { recordWrite } from '../IO/writeEcho'
import { pathExists, invalidName } from './util'
import type { SidecarKind } from '../paths'
import { ok, fail, type Result } from '@shared/result'

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
  // Suppress the new folder's addDir echo (the mkdir doesn't self-suppress like the sidecar
  // write does) — an un-suppressed watcher swap mid-rename remounts the fresh row and drops
  // the inline-rename keystrokes.
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
  // The watcher's unlinkDir/addDir echo (and every child event under a folder) must not
  // buy a second full walk.
  recordWrite(absFolder)
  recordWrite(target)
  await rename(absFolder, target)
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
  await rename(absFolder, target)
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
