import { join, dirname, basename } from 'node:path'
import { rename, readFile } from 'node:fs/promises'
import { PAGE_ID_KEY } from '@shared/identity'
import { newId } from '../ids'
import { writePageFile, mergeFrontmatter, splitEnvelope } from '../IO/pageFile'
import { atomicWriteFile } from '../IO/atomicWrite'
import { recordWrite } from '../IO/writeEcho'
import { serializeOnFile } from '../IO/fileLock'
import { type Adoption, encodeValue, isBlankValue, type PropertyValue } from '@shared/propertyValue'
import type { GovernedWorld } from '@shared/contextResolve'
import { PAGE_MODELED_KEYS } from '@shared/identity'
import { ok, fail, type Result } from '@shared/result'
import { pathExists, invalidName, nowIso } from './util'
import { setGovernedRootKeys } from './governedWrite'
import type { PropertyDefinition } from '@shared/properties'

const MD = '.md'

/** No context keys — presence is value-driven. Icon, body, and property values stamp in the
 *  same birth write, so a seeded page is never observable unstamped. Blank values write no key. */
export async function createPage(
  parentDir: string,
  name: string,
  opts: {
    icon?: string
    body?: string
    values?: { def: PropertyDefinition; value: PropertyValue }[]
  } = {},
): Promise<Result<{ id: string; path: string }>> {
  if (invalidName(name)) return fail('invalid-name', `"${name}" is not a valid name.`)
  const file = join(parentDir, name + MD)
  if (await pathExists(file)) return fail('exists', `"${name}" already exists.`)
  const id = newId()
  const now = nowIso()
  const modeled: Record<string, unknown> = {
    [PAGE_ID_KEY]: id,
    created_at: now,
    modified_at: now,
  }
  if (opts.icon) modeled.icon = opts.icon
  const keys: string[] = [...PAGE_MODELED_KEYS]
  for (const { def, value } of opts.values ?? []) {
    if (isBlankValue(value)) continue
    const key = def.name
    modeled[key] = encodeValue(value)
    keys.push(key)
  }
  await writePageFile(file, modeled, keys, opts.body ?? '')
  return ok({ id, path: file })
}

/** A rename and a move are the same write to disk, so they share one primitive; governing only
 *  modified_at leaves every other frontmatter key untouched. */
async function relocatePage(absFile: string, target: string): Promise<void> {
  // Under the SOURCE path's lock, the same key every other write to this page takes: a write
  // queued behind the move fails not-found rather than recreating the vacated file as a ghost.
  await serializeOnFile(absFile, async () => {
    recordWrite(absFile)
    recordWrite(target)
    await rename(absFile, target)
    const existing = await readFile(target, 'utf8')
    const content = mergeFrontmatter(
      existing,
      { modified_at: nowIso() },
      ['modified_at'],
      splitEnvelope(existing).body,
    )
    await atomicWriteFile(target, content)
  })
}

/** Rename a page file (filename = title). No-op when unchanged. */
export async function renamePage(
  absFile: string,
  newName: string,
): Promise<Result<{ path: string }>> {
  if (invalidName(newName)) return fail('invalid-name', `"${newName}" is not a valid name.`)
  const target = join(dirname(absFile), newName + MD)
  if (target === absFile) return ok({ path: absFile })
  if (await pathExists(target)) return fail('exists', `"${newName}" already exists.`)
  await relocatePage(absFile, target)
  return ok({ path: target })
}

/** Governs only modified_at, so all other frontmatter is preserved. */
export async function updatePageBody(absFile: string, body: string): Promise<Result<null>> {
  // Locked here rather than at the caller: the existence check and the write must sit inside
  // the same slot as a relocate, or a rename landing between them re-creates the vacated file.
  return serializeOnFile(absFile, async () => {
    if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
    await writePageFile(absFile, { modified_at: nowIso() }, ['modified_at'], body)
    return ok(null)
  })
}

/** A Page's Collection membership is its folder location, so its name-keyed values re-join the
 *  destination schema on next read; no strip, no schema logic lives in the move. */
export async function movePage(
  absFile: string,
  newParentDir: string,
): Promise<Result<{ path: string }>> {
  const target = join(newParentDir, basename(absFile))
  if (target === absFile) return ok({ path: absFile })
  if (await pathExists(target))
    return fail('exists', `A page named "${basename(absFile)}" already exists there.`)
  await relocatePage(absFile, target)
  return ok({ path: target })
}

/**
 * Governs only that property's own key. A null or empty value removes the key entirely.
 *
 * CALL THIS UNDER THE PAGE'S OWN `serializeOnFile` LOCK. Unlike `updatePageBody` it does not take
 * one for itself: its callers need a WIDER span than the write, since the definition must resolve
 * inside the same slot or a rename sweep passing this page between read and write leaves the
 * value written under a key the sweep already moved past. Taking the lock here would deadlock
 * those callers — the chain is sequential, not reentrant.
 */
export async function updatePageProperty(
  absFile: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
  world?: GovernedWorld,
): Promise<Result<Adoption[]>> {
  if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
  const key = def.name
  const clear = value === null || isBlankValue(value)
  return ok(
    await setGovernedRootKeys(absFile, clear ? {} : { [key]: encodeValue(value) }, [key], world),
  )
}
