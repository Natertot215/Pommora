import { join, dirname, basename } from '../Paths/posix'
import { ID_KEY, PAGE_MODELED_KEYS } from './identityMark'
import { bodyHash, mergeFrontmatter } from '../Files/pageFile'
import type { Json } from '../Files/stableJson'
import { machine } from '../Platform/machine'
import { ok, fail, type Result, fault } from '../Contract/result'
import { atomicWriteFile, pathExists, relocate, targetTaken } from '../Files/atomicWrite'
import { nameError } from '../Paths/names'

const MD = '.md'

export async function createPage(
  parentDir: string,
  name: string,
  opts: { id: string; body?: string; frontmatter?: Json },
): Promise<Result<{ path: string }>> {
  const why = nameError(name, 'page')
  if (why) return fail('invalid-name', why)
  const file = join(parentDir, name + MD)
  const seeded = opts.frontmatter ?? {}
  const modeled = { ...seeded, [ID_KEY]: opts.id }
  const keys = [...PAGE_MODELED_KEYS, ...Object.keys(seeded)]
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
