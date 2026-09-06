import { join, dirname, basename } from '../Locations/posix'
import { ID_KEY } from './identityMark'
import { newContentId } from '../Locations/ids'
import { type PageWrite, writePageFile } from '../IO/pageFile'
import { recordWrite } from '../IO/writeEcho'
import { machine } from '../Platform/machine'
import {
  type Adoption,
  encodeValue,
  isBlankValue,
  type PropertyValue,
} from '../Properties/propertyValue'
import type { GovernedWorld } from '../Properties/contextResolve'
import { PAGE_MODELED_KEYS } from './identityMark'
import { errText, ok, fail, type Result } from '../Contract/result'
import { pathExists } from '../IO/atomicWrite'
import { invalidName } from './util'
import { setGovernedRootKeys } from '../Properties/governedWrite'
import type { PropertyDefinition } from '../Properties/properties'

const MD = '.md'

const noShape = (name: string): Result<never> =>
  fail('invalid-property', `"${name}" was given a value it has no shape for.`)

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
  const id = newContentId('page')
  const modeled: Record<string, unknown> = { [ID_KEY]: id }
  if (opts.icon) modeled.icon = opts.icon
  const keys: string[] = [...PAGE_MODELED_KEYS]
  for (const { def, value } of opts.values ?? []) {
    if (isBlankValue(value)) continue
    const encoded = encodeValue(value)
    if (encoded === undefined) return noShape(def.name)
    modeled[def.name] = encoded
    keys.push(def.name)
  }
  await writePageFile(file, modeled, keys, opts.body ?? '')
  return ok({ id, path: file })
}

async function relocatePage(absFile: string, target: string): Promise<void> {
  // Under the SOURCE path's lock, the same key every other write to this page takes: a write queued behind the move fails not-found rather than recreating the vacated file as a ghost.
  await machine().lock(absFile, async () => {
    recordWrite(absFile)
    recordWrite(target)
    await machine().rename(absFile, target)
  })
}

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

export async function updatePageBody(absFile: string, body: string): Promise<Result<PageWrite>> {
  return machine().lock(absFile, async () => {
    if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
    try {
      return ok(await writePageFile(absFile, {}, [], body))
    } catch (e) {
      return fail('operation-failed', errText(e))
    }
  })
}

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

// Takes no lock of its own: callers hold the page's lock over a wider span, and a re-take would be refused.
export async function updatePageProperty(
  root: string,
  absFile: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
  world?: GovernedWorld,
): Promise<Result<Adoption[]>> {
  if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
  const key = def.name
  const clear = value === null || isBlankValue(value)
  const encoded = clear ? undefined : encodeValue(value)
  if (!clear && encoded === undefined) return noShape(key)
  return ok(await setGovernedRootKeys(root, absFile, clear ? {} : { [key]: encoded }, [key], world))
}
