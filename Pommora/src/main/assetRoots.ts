// The one containment test the asset protocol and the banner delete-guard both cross. They
// hard-coded the same constant for opposite reasons — one serves files, one deletes them — and
// two containment tests that disagree is a defect neither one's own tests can see.

import { parseConnectionText } from '@shared/connections'
import { ASSETS_DIR_REL, assetSubRoot } from '@shared/nexusPaths'
import { normalizeSeg, rootSegs } from './exclusion'
import { indexable, liveAssetMap, resolveAssetName } from './assetMap'

import { readWatchScope } from './settings'

const startsUnder = (segs: string[], root: string): boolean => {
  const prefix = rootSegs(root).map(normalizeSeg)
  // Case-folded like every other root test in the app: a stored path whose casing differs from
  // the configured root is inside it for the walk and the watcher, and serving it 403 while they
  // agree it exists is the divergence this module exists to prevent. `resolveUnderRoot` still
  // realpaths afterward, which is what actually holds the boundary.
  return segs.length > prefix.length && prefix.every((seg, i) => normalizeSeg(segs[i]) === seg)
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

/** The one real file a stored image value names, wherever it sits. A name several files answer
 *  to names none of them — rendering the wrong image is recoverable, acting on one is not. */
export async function assetFilePath(root: string, value: unknown): Promise<string | null> {
  if (typeof value !== 'string' || !value.trim()) return null
  const link = parseConnectionText(value)
  const rel = link
    ? resolveAssetName(await liveAssetMap(root), link.title)
    : underAssetRoot(value, (await readWatchScope(root)).assetDir)
      ? value
      : null
  return typeof rel === 'string' ? rel : null
}

/** The real file a replaced banner value may delete — which is only ever one Pommora minted
 *  itself, under `.nexus/assets`. The configured asset root is the user's own folder, shared with
 *  whatever else reads it: a file there may be referenced from an Obsidian note this app cannot
 *  see, and replacing a banner is not consent to destroy it. Nothing is trashed on this path, so
 *  the deletion would be unrecoverable. */
export async function assetFileToDelete(root: string, value: unknown): Promise<string | null> {
  const rel = await assetFilePath(root, value)
  return rel?.startsWith(`${ASSETS_DIR_REL}/`) ? rel : null
}

/** What a refused Directory says. One sentence, read by the channel that sets one and by the
 *  adoption that writes under one. */
export const NOT_A_PROPERTY_DIR_MESSAGE = 'That folder can’t hold this property’s files.'

/** Whether a file property's Directory names a folder its files can actually be found in.
 *
 *  TWO predicates, because containment alone is not enough: `.private` is contained, mkdirs, writes,
 *  and returns a valid-looking `[[Name.ext]]` — while `indexable` drops it from the map forever,
 *  leaving an unresolved label and no error anywhere. Both run at set time against the real asset
 *  root, so the rule is stated once rather than split across a set-side check and a write-side one.
 *
 *  A symlinked segment is the one hole a lexical check can't see; adoption closes it where the
 *  write happens. */
export function validPropertyDir(subfolder: string, assetDir: string): boolean {
  // No subfolder IS the asset root, which is always where files may land. `underAssetRoot` reads
  // strictly below its root, so the root itself would otherwise refuse.
  if (!subfolder) return true
  const rel = assetSubRoot(assetDir, subfolder)
  return underAssetRoot(rel, assetDir) && indexable(rel, assetDir)
}

/** The part of a nexus-relative path sitting BELOW the asset root — `''` for the root itself,
 *  null for anything outside it. This is what a property's Directory stores: a position under
 *  whatever root is configured, so re-pointing the root carries every property's folder with it. */
export function assetSubfolder(rel: string, assetDir: string): string | null {
  const prefix = rootSegs(assetDir)
  const segs = rootSegs(rel)
  if (segs.length < prefix.length) return null
  if (!prefix.every((seg, i) => normalizeSeg(segs[i]) === normalizeSeg(seg))) return null
  return segs.slice(prefix.length).join('/')
}
