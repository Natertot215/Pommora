// The exclusion list as the set channel will store it, isolated from the handler so the rule the
// pane depends on — refuse, normalize, dedup — is testable without the electron-coupled handler.

import { fail, ok, type Result } from '@shared/result'
import { normalizeSeg, rootSegs } from './exclusion'
import { excludedFolderRefusal } from './readNexus'

/** Each entry normalized to the spelling the matcher compares, refused by the one folder rule, and
 *  deduped on the case-folded path so `archive` and `Archive` are one folder while the typed casing
 *  is what's stored. The first refusal stops the whole write — a partial list is never stored. */
export function sanitizeExclusions(folders: unknown): Result<string[]> {
  if (!Array.isArray(folders)) return fail('operation-failed', 'A folder list is required.')
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of folders) {
    if (typeof entry !== 'string') return fail('operation-failed', 'A folder path is required.')
    const raw = entry.trim()
    const refusal = excludedFolderRefusal(raw)
    if (refusal) return fail('invalid-path', refusal)
    const segs = rootSegs(raw)
    const rel = segs.join('/')
    const key = segs.map(normalizeSeg).join('/')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rel)
  }
  return ok(out)
}
