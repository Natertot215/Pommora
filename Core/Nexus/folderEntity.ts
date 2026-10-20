import { join, dirname, basename, relative } from '../Paths/posix'
import { machine } from '../Platform/machine'
import { recordWrite } from '../Files/writeEcho'
import { heldName, pathExists, relocate, targetTaken, writeJson } from '../Files/atomicWrite'
import { listEntries } from '../Files/walk'
import { freeName, nameError } from '../Paths/names'
import { sidecarPath } from '../Paths/paths'
import type { SidecarKind } from '../Paths/nexusPaths'
import { ok, fail, type Result } from '../Contract/result'
import { entryWithin, outsideContent } from '../Paths/exclusion'
import { carrySetAside, readWatchScope } from '../Settings/settings'

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

/** A Collection or Set landing at a new path carries its excluded entries and the asset directory: the carry's write refuses the move before anything moves, and its drop runs as `landed`, so sync hears of the rename once, under the scope it settled; a move that throws before landing writes back what the carry read. */
async function relocateFolder(
  root: string,
  from: string,
  to: string,
): Promise<Result<{ path: string }>> {
  const carried = await carrySetAside(root, relative(root, from), relative(root, to))
  if (!carried.ok) return carried
  let landed = false
  try {
    await relocate(from, to, () => {
      landed = true
      return carried.value.drop()
    })
  } catch (e) {
    if (!landed) await carried.value.undo()
    throw e
  }
  return ok({ path: to })
}

/** A Collection or Set leaving the tree leaves every excluded folder and the asset directory inside it in its parent, the outermost of a nesting, under its own name or the next one free there, each one's entry carried ahead of it. */
export async function liftSetAside(root: string, containerAbs: string): Promise<Result<null>> {
  const { excluded, assetDir } = await readWatchScope(root)
  const inside = [...excluded, assetDir].flatMap((entry) => {
    const rest = entryWithin(entry, relative(root, containerAbs))
    return rest ? [rest.join('/')] : []
  })
  const parent = dirname(containerAbs)
  for (const rest of inside) {
    if (inside.some((outer) => (entryWithin(rest, outer)?.length ?? 0) > 0)) continue
    const abs = join(containerAbs, rest)
    // An entry can outlive its folder, whose spelling is read from its parent's listing.
    const name = await heldName(abs)
    if (name === null) continue
    const taken = (await listEntries(parent)).map((e) => e.name)
    const lifted = await relocateFolder(root, abs, join(parent, freeName(name, taken)))
    if (!lifted.ok) return lifted
  }
  return ok(null)
}

export async function createFolderEntity(
  parentDir: string,
  kind: SidecarKind,
  name: string,
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Result<{ path: string }>> {
  const why = nameError(name, 'directory')
  if (why) return fail('invalid-name', why)
  const folder = join(parentDir, name)
  if ((await machine().mkdir(folder)) === 'exists')
    return fail('exists', `"${name}" already exists.`)
  // The mkdir doesn't suppress its own addDir echo as the sidecar write does; recorded here, the folder is never read before its sidecar lands.
  recordWrite(folder)
  await writeJson(sidecarPath(folder, kind), { id, ...extra })
  return ok({ path: folder })
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
  return relocateFolder(root, absFolder, target)
}

export async function moveFolderEntity(
  root: string,
  absFolder: string,
  newParentDir: string,
): Promise<Result<{ path: string }>> {
  const target = join(newParentDir, basename(absFolder))
  if (await pathExists(target))
    return fail('exists', `"${basename(absFolder)}" already exists there.`)
  return relocateFolder(root, absFolder, target)
}
