// The one refusal the asset directory answers to. It lives in main because main owns the
// filesystem, and because a renderer-side check would only be advisory: this must be the same
// refusal a hand-edited `settings.json` meets, not a second opinion about it.

import { relative, sep } from 'node:path'
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
  const entries = await listEntries(resolved.value)
  // ANY Markdown, not only what the tree shows: an `_`-prefixed page is hidden from the tree but
  // still swept and rewritten by the cascade, so a folder holding one is corpus either way.
  if (entries.some((e) => e.isFile() && isMarkdownFile(e.name)))
    return fail('invalid-path', 'That folder holds pages.')
  if (entries.some((e) => e.isFile() && SIDECARS.has(e.name)))
    return fail('invalid-path', 'That folder is a collection.')
  return ok(rel)
}
