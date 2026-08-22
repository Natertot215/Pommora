// The one refusal the asset directory answers to. It lives in main because main owns the
// filesystem, and because a renderer-side check would only be advisory: this must be the same
// refusal a hand-edited `settings.json` meets, not a second opinion about it.

import { stat } from 'node:fs/promises'
import type { Stats } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fail, ok, type Result } from '@shared/result'
import { NON_CORPUS_TOP } from '@shared/nexusPaths'
import { normalizeSeg } from './exclusion'
import { isMarkdownFile, listEntries } from './io/walk'
import { resolveUnderRoot } from './pathSafety'
import { SIDECAR_FILENAME } from './paths'

const SIDECARS = new Set<string>(Object.values(SIDECAR_FILENAME))

/** The nexus-relative POSIX path of a folder fit to hold assets, or the reason it is not. Selection
 *  is validated, never restricted: any folder inside the nexus qualifies unless it already holds
 *  content, which is what would make the same folder both corpus and not. */
export async function validateAssetDir(root: string, abs: string): Promise<Result<string>> {
  const rel = relative(root, abs).split(sep).join('/')
  if (!rel) return fail('invalid-path', 'The nexus root itself cannot hold assets.')
  const resolved = await resolveUnderRoot(root, rel)
  if (!resolved.ok) return resolved
  if (NON_CORPUS_TOP.has(normalizeSeg(rel.split('/')[0])))
    return fail('invalid-path', 'That folder belongs to the app.')
  let stats: Stats
  try {
    stats = await stat(resolved.value)
  } catch {
    return fail('not-found', 'Path not found.')
  }
  // `realpath` succeeds on a file and a directory listing of one reads as empty, so without this
  // a picked image would be accepted and every asset would quietly stop resolving.
  if (!stats.isDirectory()) return fail('invalid-path', 'That is a file, not a folder.')
  // The WHOLE subtree, not the folder's own entries: the asset root is pruned by segment prefix,
  // so a Collection nested three levels down would vanish from the tree and the index alongside
  // it. Short-circuits on the first page or sidecar it meets.
  return (await holdsContent(resolved.value))
    ? fail('invalid-path', 'That folder holds pages.')
    : ok(rel)
}

/** Whether anything under `abs` is content: a Markdown file at any depth — including an
 *  `_`-prefixed one, hidden from the tree but still swept and rewritten by the cascade — or a
 *  container's sidecar. */
async function holdsContent(abs: string): Promise<boolean> {
  const entries = await listEntries(abs)
  if (entries.some((e) => e.isFile() && (isMarkdownFile(e.name) || SIDECARS.has(e.name))))
    return true
  for (const e of entries) {
    if (e.isDirectory() && (await holdsContent(join(abs, e.name)))) return true
  }
  return false
}
