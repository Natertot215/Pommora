// The on-disk names, nexus-relative and POSIX. Both processes build the same strings: main
// resolves them against the nexus root (`main/paths.ts` holds every absolute-path builder — this
// module has no node:path and no fs), and the renderer names the same folders in the tree paths it
// hands back. A path a lock, a watcher rule, and a menu row all speak has to be one spelling.

/** The app's own folder inside a nexus — config, the Contexts registry, assets. */
export const NEXUS_DIR = '.nexus'

/** The deletion record's folder, mirroring the nexus. */
export const TRASH_DIR = '.trash'

/** The walk skips these, the index refuses to key anything under them, and a mutation refuses to
 *  target them. The watcher is not among the readers — it watches `.nexus` on purpose. */
export const NON_CORPUS_TOP: ReadonlySet<string> = new Set([NEXUS_DIR, TRASH_DIR])

/** The Contexts registry — the one identity source for every Context (id, title, singular, icon). */
export const CONTEXTS_REGISTRY_REL = `${NEXUS_DIR}/contexts.json`

/** Where Contexts live, and its bare name — the watcher matches path segments rather than
 *  prefixes. `.trash` mirrors the nexus, so a trashed Space's frozen chain wears this prefix and the
 *  trash browser strips it back off. */
export const CONTEXTS_DIRNAME = 'contexts'
export const CONTEXTS_DIR_REL = `${NEXUS_DIR}/${CONTEXTS_DIRNAME}`

/** The thumbnail root, and the default value of the user-configurable `asset_directory`. */
export const ASSETS_DIR_REL = `${NEXUS_DIR}/assets`

/** The asset root a file property's files land under — the configured root, or the subfolder its
 *  Directory names beneath it. An absent subfolder resolves to the root itself. Both processes
 *  compose it: main to aim the write, the renderer to aim the dialog it opens. It composes only —
 *  the destination is REFUSED at `adoptFile`, where the write happens. */
export function assetSubRoot(assetDir: string, subfolder: string | undefined): string {
  return [assetDir, subfolder].filter(Boolean).join('/')
}

/** A nav key names a thumbnail's file, with its colon flipped to a dash — a colon is legal in a key
 *  and hostile in a filename. Stated here because the writer and every reader must agree on it. */
export const thumbKey = (navKey: string): string => navKey.replace(':', '-')

/** A nexus's synced thumbnail folder, and one thumbnail inside it. Pinned to `ASSETS_DIR_REL`
 *  deliberately: these are Pommora's own derived files, so they stay where the app owns them
 *  rather than following `asset_directory` into a shared folder. */
export const THUMBNAILS_SEGMENT = 'thumbnails'
export const thumbsRel = (nexusId: string): string =>
  `${ASSETS_DIR_REL}/${nexusId}/${THUMBNAILS_SEGMENT}`
export const thumbRel = (nexusId: string, key: string): string => `${thumbsRel(nexusId)}/${key}.jpg`

export const WEB_ADDRESS = /^[a-z][a-z0-9+.-]*:/i

// A remote image a picker may adopt by reference. Only http(s) — a `file:`/`data:` source is not
// stored raw; it falls to `adoptFile`, which refuses anything that isn't an image it can name.
export const HTTP_URL = /^https?:\/\//i

// One spelling: main keys crops from `assetFilePath`, the renderer from `resolveAssetValue`.
export function cropKeyFor(rel: string | null, raw: string): string | null {
  const trimmed = raw.trim()
  return rel ?? (WEB_ADDRESS.test(trimmed) ? trimmed : null)
}

/** A Context's own folder — its title names it, which is why a retitle is a folder rename. */
export const contextDirRel = (title: string): string => `${CONTEXTS_DIR_REL}/${title}`

/** A Space's folder inside its Context. */
export const spaceDirRel = (contextTitle: string, name: string): string =>
  `${contextDirRel(contextTitle)}/${name}`
