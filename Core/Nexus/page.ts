import { join, dirname, basename } from '../Paths/posix'
import { ID_KEY, PAGE_MODELED_KEYS } from './identityMark'
import { bodyHash, mergeFrontmatter } from '../Files/pageFile'
import { machine } from '../Platform/machine'
import {
  type Adoption,
  encodeValue,
  isBlankValue,
  type PropertyValue,
} from '../Properties/propertyValue'
import type { GovernedWorld } from '../Contexts/contextResolve'
import { ok, fail, type Result, fault } from '../Contract/result'
import { atomicWriteFile, pathExists, relocate, targetTaken } from '../Files/atomicWrite'
import { nameError } from '../Paths/names'
import { setGovernedRootKey } from '../Properties/governedWrite'
import type { PropertyDefinition } from '../Properties/properties'

const MD = '.md'

export const noShape = (name: string): Result<never> =>
  fail('invalid-property', `"${name}" was given a value it has no shape for.`)

export async function createPage(
  parentDir: string,
  name: string,
  opts: {
    id: string
    body?: string
    values?: { def: PropertyDefinition; value: PropertyValue }[]
  },
): Promise<Result<{ path: string }>> {
  const why = nameError(name, 'page')
  if (why) return fail('invalid-name', why)
  const file = join(parentDir, name + MD)
  const modeled: Record<string, unknown> = { [ID_KEY]: opts.id }
  const keys: string[] = [...PAGE_MODELED_KEYS]
  for (const { def, value } of opts.values ?? []) {
    if (isBlankValue(value)) continue
    const encoded = encodeValue(value)
    if (encoded === undefined) return noShape(def.name)
    modeled[def.name] = encoded
    keys.push(def.name)
  }
  return machine().lock(file, async () => {
    if (await pathExists(file)) return fail('exists', `"${name}" already exists.`)
    await atomicWriteFile(file, mergeFrontmatter('', modeled, keys, opts.body ?? ''))
    return ok({ path: file })
  })
}

export async function renamePage(
  absFile: string,
  newName: string,
): Promise<Result<{ path: string }>> {
  const why = nameError(newName, 'page')
  if (why) return fail('invalid-name', why)
  const target = join(dirname(absFile), newName + MD)
  if (target === absFile) return ok({ path: absFile })
  if (await targetTaken(absFile, target)) return fail('exists', `"${newName}" already exists.`)
  await relocate(absFile, target)
  return ok({ path: target })
}

interface PageWrite {
  previous: string
  written: string
}

export async function updatePageBody(
  absFile: string,
  body: string,
  baseHash?: string,
  bodyOnly = false,
): Promise<Result<PageWrite | { stale: true }>> {
  return machine().lock(absFile, async () => {
    try {
      const previous = await machine().readText(absFile)
      if (previous === null) return fail('not-found', 'Page not found.')
      if (baseHash !== undefined && bodyHash(previous) !== baseHash) return ok({ stale: true })
      const written = mergeFrontmatter(previous, {}, [], body)
      await atomicWriteFile(absFile, written, bodyOnly)
      return ok({ previous, written })
    } catch (e) {
      return fault(e)
    }
  })
}

export async function movePage(
  absFile: string,
  newParentDir: string,
): Promise<Result<{ path: string }>> {
  const target = join(newParentDir, basename(absFile))
  if (await pathExists(target))
    return fail('exists', `A page named "${basename(absFile)}" already exists there.`)
  await relocate(absFile, target)
  return ok({ path: target })
}

// Takes no lock of its own: callers hold the page's lock over a wider span, and a re-take would be refused.
export async function updatePageProperty(
  absFile: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
  world?: GovernedWorld,
): Promise<Result<Adoption[]>> {
  if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
  const clear = value === null || isBlankValue(value)
  const encoded = clear ? undefined : encodeValue(value)
  if (!clear && encoded === undefined) return noShape(def.name)
  return ok(await setGovernedRootKey(absFile, def.name, encoded, world))
}
