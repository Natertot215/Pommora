import { parseConnectionText } from '../Connections/connections'
import { ASSETS_DIR_REL, assetSubRoot } from '../Paths/nexusPaths'
import { foldKey } from '../Paths/caseFold'
import { hiddenFolder, remainderUnder, rootSegs } from '../Paths/exclusion'
import { indexable, liveAssetMap, resolveAssetName } from './assetMap'

import { readWatchScope } from '../Settings/settings'

const startsUnder = (segs: string[], root: string): boolean =>
  !!remainderUnder(segs, rootSegs(root).map(foldKey))?.length

export function underAssetRoot(rel: string, assetDir: string): boolean {
  if (!rel || rel.includes('\\') || rel.startsWith('/')) return false
  const segs = rel.split('/')
  if (segs.some((s) => s === '..' || s === '.' || s === '')) return false
  return startsUnder(segs, ASSETS_DIR_REL) || startsUnder(segs, assetDir)
}

/** A name several files answer to names none of them — rendering the wrong image is recoverable, acting on one is not. */
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

export const NOT_A_PROPERTY_DIR_MESSAGE = 'That folder can’t hold this property’s files.'

export function validPropertyDir(subfolder: string, assetDir: string): boolean {
  if (!subfolder) return true
  const rel = assetSubRoot(assetDir, subfolder)
  return (
    underAssetRoot(rel, assetDir) &&
    indexable(rel, assetDir) &&
    !rootSegs(subfolder).some(hiddenFolder)
  )
}

export function assetSubfolder(rel: string, assetDir: string): string | null {
  return remainderUnder(rootSegs(rel), rootSegs(assetDir).map(foldKey))?.join('/') ?? null
}
