import { isAbsolute, join, relative } from './posix'
import { machine } from '../Platform/machine'
import { NON_CORPUS_TOP, TRASH_DIR } from './nexusPaths'
import { fail, ok, type Result } from '../Contract/result'

function escapes(rel: string): boolean {
  return rel === '..' || rel.startsWith('../') || isAbsolute(rel)
}

export async function resolveUnderRoot(root: string, relPath: unknown): Promise<Result<string>> {
  if (typeof relPath !== 'string' || relPath.length === 0) {
    return fail('invalid-path', 'A path is required.')
  }
  if (isAbsolute(relPath)) {
    return fail('invalid-path', 'Absolute paths are not allowed.')
  }
  // Fast lexical reject (no fs touch) for an obvious `..` climb.
  if (escapes(relative(root, join(root, relPath)))) {
    return fail('invalid-path', 'Path escapes the nexus root.')
  }
  // Canonicalize both sides so an in-nexus symlink can't smuggle the target out.
  let realRoot: string
  let realTarget: string
  try {
    realRoot = await machine().realpath(root)
    realTarget = await machine().realpath(join(root, relPath))
  } catch {
    return fail('not-found', 'Path not found.')
  }
  const rel = relative(realRoot, realTarget)
  if (rel !== '' && escapes(rel)) {
    return fail('invalid-path', 'Path escapes the nexus root.')
  }
  return ok(realTarget)
}

/** The root itself, the folders the nexus owns, and everything already in the trash — addressable
 *  by a resolve, but never a target a mutation may rename, delete, or decorate. */
export async function isReserved(root: string, abs: string): Promise<boolean> {
  const rel = relative(await machine().realpath(root), abs)
  return rel === '' || NON_CORPUS_TOP.has(rel) || rel.startsWith(`${TRASH_DIR}/`)
}
