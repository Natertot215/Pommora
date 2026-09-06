// The on-disk names, nexus-relative and POSIX; `paths.ts` beside it holds the absolute-path
// builders. A path a lock, a watcher rule, and a menu row all speak has to be one spelling.

import { HAS_SCHEME } from './url'

/** The app's own folder inside a nexus — config, the Contexts registry, assets. */
export const NEXUS_DIR = '.nexus'

/** The deletion record's folder, mirroring the nexus. */
export const TRASH_DIR = '.trash'

/** The walk, the index, and every mutation refuse these. Not the watcher — it watches `.nexus`. */
export const NON_CORPUS_TOP: ReadonlySet<string> = new Set([NEXUS_DIR, TRASH_DIR])

/** The one identity source for every Context (id, title, singular, icon). */
export const CONTEXTS_REGISTRY_REL = `${NEXUS_DIR}/contexts.json`

/** The bare name exists because the watcher matches path segments rather than prefixes. */
export const CONTEXTS_DIRNAME = 'contexts'
export const CONTEXTS_DIR_REL = `${NEXUS_DIR}/${CONTEXTS_DIRNAME}`

/** The thumbnail root, and the default value of the user-configurable `asset_directory`. */
export const ASSETS_DIR_REL = `${NEXUS_DIR}/assets`

/** The asset root a file property's files land under; an absent subfolder means the root itself. */
export function assetSubRoot(assetDir: string, subfolder: string | undefined): string {
  return [assetDir, subfolder].filter(Boolean).join('/')
}

/** A colon is legal in a nav key and hostile in a filename. */
export const thumbKey = (navKey: string): string => navKey.replace(':', '-')

/** Pinned to `ASSETS_DIR_REL` deliberately: these are Pommora's own derived files, so they stay
 *  where the app owns them rather than following `asset_directory` into a shared folder. */
export const THUMBNAILS_SEGMENT = 'thumbnails'
export const thumbsRel = (nexusId: string): string =>
  `${ASSETS_DIR_REL}/${nexusId}/${THUMBNAILS_SEGMENT}`
export const thumbRel = (nexusId: string, key: string): string => `${thumbsRel(nexusId)}/${key}.jpg`

// One spelling: the write side keys crops from `assetFilePath`, the read side `resolveAssetValue`.
export function cropKeyFor(rel: string | null, raw: string): string | null {
  const trimmed = raw.trim()
  return rel ?? (HAS_SCHEME.test(trimmed) ? trimmed : null)
}

/** Its title names it, which is why a retitle is a folder rename. */
export const contextDirRel = (title: string): string => `${CONTEXTS_DIR_REL}/${title}`

export const spaceDirRel = (contextTitle: string, name: string): string =>
  `${contextDirRel(contextTitle)}/${name}`
