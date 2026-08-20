// The on-disk names, nexus-relative and POSIX. Both processes build the same strings: main
// resolves them against the nexus root (`main/paths.ts` holds every absolute-path builder — this
// module has no node:path and no fs), and the renderer names the same folders in the tree paths
// it hands back over the bridge. A path a lock, a watcher rule, and a menu row all speak has to
// be one spelling, or the three disagree the moment a name changes.

/** The app's own folder inside a nexus — config, the Contexts registry, assets. */
export const NEXUS_DIR = '.nexus'

/** The deletion record's folder, mirroring the nexus. */
export const TRASH_DIR = '.trash'

/** The top-level folders that are not content: the walk skips them, the index refuses to key
 *  anything under them, and a mutation refuses to target them. The watcher is not among the
 *  readers — it watches `.nexus` on purpose, since Contexts and settings live there. */
export const NON_CORPUS_TOP: ReadonlySet<string> = new Set([NEXUS_DIR, TRASH_DIR])

/** The Contexts registry — the one identity source for every Context (id, title, singular, icon). */
export const CONTEXTS_REGISTRY_REL = `${NEXUS_DIR}/contexts.json`

/** Where Contexts live, and its bare name — the watcher matches path segments rather than
 *  prefixes. `.trash` mirrors the nexus, so a trashed Space's frozen chain wears this prefix and
 *  the trash browser strips it back off. */
export const CONTEXTS_DIRNAME = 'contexts'
export const CONTEXTS_DIR_REL = `${NEXUS_DIR}/${CONTEXTS_DIRNAME}`

/** Attachment storage, keyed per asset below it. */
export const ASSETS_DIR_REL = `${NEXUS_DIR}/assets`

/** A Context's own folder — its title names it, which is why a retitle is a folder rename. */
export const contextDirRel = (title: string): string => `${CONTEXTS_DIR_REL}/${title}`

/** A Space's folder inside its Context. */
export const spaceDirRel = (contextTitle: string, name: string): string =>
  `${contextDirRel(contextTitle)}/${name}`
