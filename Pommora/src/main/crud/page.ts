// Page (.md) CRUD. Pages live as files inside container folders (Type/Collection/Set).
// filename = title (rename = file rename). Every write goes through the foreign-
// preserving page engine; partial updates govern only the keys they name, so they
// never disturb other frontmatter.

import { join, dirname, basename } from 'node:path'
import { rename, readFile } from 'node:fs/promises'
import { PAGE_ID_KEY } from '@shared/identity'
import { newId } from '../ids'
import { writePageFile, mergeFrontmatter, splitEnvelope } from '../io/pageFile'
import { atomicWriteFile } from '../io/atomicWrite'
import { recordWrite } from '../io/writeEcho'
import { encodeValue, isBlankValue, propertyKey, type PropertyValue } from '@shared/propertyValue'
import { PAGE_MODELED_KEYS } from '@shared/schemas'
import { ok, fail, type Result } from '@shared/result'
import { pathExists, invalidName, nowIso } from './util'
import { setGovernedRootKeys } from './governedWrite'
import type { PropertyDefinition } from '@shared/properties'

const MD = '.md'

/** Create a `.md` page in `parentDir` with a fresh ULID and
 *  created/modified timestamps (no context keys — presence is value-driven). Optional
 *  icon + initial body. */
export async function createPage(
  parentDir: string,
  name: string,
  opts: { icon?: string; body?: string } = {},
): Promise<Result<{ id: string; path: string }>> {
  if (invalidName(name)) return fail('invalid-name', `"${name}" is not a valid name.`, 'page')
  const file = join(parentDir, name + MD)
  if (await pathExists(file)) return fail('exists', `"${name}" already exists.`, 'page')
  const id = newId()
  const now = nowIso()
  const modeled: Record<string, unknown> = {
    [PAGE_ID_KEY]: id,
    created_at: now,
    modified_at: now,
  }
  if (opts.icon) modeled.icon = opts.icon
  await writePageFile(file, modeled, PAGE_MODELED_KEYS, opts.body ?? '')
  return ok({ id, path: file })
}

/** Relocate a page file and stamp the edit. A rename and a move are the same write to disk and
 *  both change the page, so they share one primitive; governing only modified_at leaves every
 *  other frontmatter key untouched. */
async function relocatePage(absFile: string, target: string): Promise<void> {
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
}

/** Rename a page file (filename = title). No-op when unchanged; bumps modified_at
 *  on a real rename — the title changed, which counts as an edit. */
export async function renamePage(
  absFile: string,
  newName: string,
): Promise<Result<{ path: string }>> {
  if (invalidName(newName)) return fail('invalid-name', `"${newName}" is not a valid name.`, 'page')
  const target = join(dirname(absFile), newName + MD)
  if (target === absFile) return ok({ path: absFile })
  if (await pathExists(target)) return fail('exists', `"${newName}" already exists.`, 'page')
  await relocatePage(absFile, target)
  return ok({ path: target })
}

/** Replace the body, bumping modified_at. Governs only modified_at, so all other
 *  frontmatter (id, Contexts, properties, foreign keys, comments) is preserved. */
export async function updatePageBody(absFile: string, body: string): Promise<Result<null>> {
  if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.', 'page')
  await writePageFile(absFile, { modified_at: nowIso() }, ['modified_at'], body)
  return ok(null)
}

/** Move a page to a different container folder (same filename), bumping modified_at — a location
 *  change is an edit. A Page's Collection membership is its folder location, so its wrapped
 *  name-keyed values re-join the destination schema on next read (unrecognized keys stay as
 *  preserved foreign frontmatter); no strip, no schema logic lives in the move. */
export async function movePage(
  absFile: string,
  newParentDir: string,
): Promise<Result<{ path: string }>> {
  const target = join(newParentDir, basename(absFile))
  if (target === absFile) return ok({ path: absFile })
  if (await pathExists(target))
    return fail('exists', `A page named "${basename(absFile)}" already exists there.`, 'page')
  await relocatePage(absFile, target)
  return ok({ path: target })
}

/**
 * Set or clear one property value on a page. Governs only that property's own key, so every other
 * key — id, Contexts, sibling properties, foreign frontmatter, comments — is preserved. A null
 * value (or the `null` kind) or an empty one removes the key entirely; a page without a value
 * carries no key at all. The definition arrives resolved: main builds the key inside the file
 * lock, and no key is ever built renderer-side except for the optimistic patch.
 */
export async function updatePageProperty(
  absFile: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Promise<Result<null>> {
  if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.', 'page')
  const key = propertyKey(def)
  const clear = value === null || isBlankValue(value)
  await setGovernedRootKeys(absFile, clear ? {} : { [key]: encodeValue(value) }, [key])
  return ok(null)
}
