// The one containment test the asset protocol and the banner delete-guard both cross. They
// hard-coded the same constant for opposite reasons — one serves files, one deletes them — and
// two containment tests that disagree is a defect neither one's own tests can see.

import { parseConnectionText } from '@shared/connections'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import { liveAssetMap, resolveAssetName } from './assetMap'
import { readWatchScope } from './settings'

const startsUnder = (segs: string[], root: string): boolean => {
  const prefix = root.split('/').filter(Boolean)
  return segs.length > prefix.length && prefix.every((seg, i) => segs[i] === seg)
}

/** Whether a nexus-relative POSIX path names a file inside an asset root. Both roots answer:
 *  the configured one and `.nexus/assets`, which keeps serving thumbnails and anything a
 *  migration has not moved yet. Containment here is a string test — `resolveUnderRoot` still
 *  runs after it, and realpath is what actually holds the boundary. */
export function underAssetRoot(rel: string, assetDir: string): boolean {
  if (!rel || rel.includes('\\') || rel.startsWith('/')) return false
  const segs = rel.split('/')
  if (segs.some((s) => s === '..' || s === '.' || s === '')) return false
  return startsUnder(segs, ASSETS_DIR_REL) || startsUnder(segs, assetDir)
}

/** The real file one stored banner value names, or null where nothing may be deleted. A wikilink
 *  is constrained by the map rather than by its own spelling — every entry is under the asset
 *  root by construction — and a name several files answer to deletes nothing at all: rendering
 *  the wrong image is recoverable, deleting one is not. */
export async function assetFileToDelete(root: string, value: unknown): Promise<string | null> {
  if (typeof value !== 'string' || !value.trim()) return null
  const link = parseConnectionText(value)
  if (link) {
    const hit = resolveAssetName(await liveAssetMap(root), link.title)
    return typeof hit === 'string' ? hit : null
  }
  return underAssetRoot(value, (await readWatchScope(root)).assetDir) ? value : null
}
