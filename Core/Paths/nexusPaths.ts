import { HAS_SCHEME } from './urlPath'

export const NEXUS_DIR = '.nexus'

export const TRASH_DIR = '.trash'

/** The walk, the index, and every mutation refuse these. Not the watcher — it watches `.nexus`. */
export const NON_CORPUS_TOP: ReadonlySet<string> = new Set([NEXUS_DIR, TRASH_DIR])

/** The bare name exists because the watcher matches path segments rather than prefixes. */
export const CONTEXTS_DIRNAME = 'contexts'
const CONTEXTS_REGISTRY_FILENAME = 'contexts.json'
export const CONTEXTS_REGISTRY_REL = `${NEXUS_DIR}/${CONTEXTS_DIRNAME}/${CONTEXTS_REGISTRY_FILENAME}`
export const CONTEXTS_DIR_REL = `${NEXUS_DIR}/${CONTEXTS_DIRNAME}`

export const PROPERTY_JOURNAL_FILENAME = 'property-cascade.json'
export const CONTEXT_JOURNAL_FILENAME = 'context-rename.json'
export const PROPERTY_JOURNAL_REL = `${NEXUS_DIR}/${PROPERTY_JOURNAL_FILENAME}`
export const CONTEXT_JOURNAL_REL = `${NEXUS_DIR}/${CONTEXT_JOURNAL_FILENAME}`

export const METADATA_DIR_REL = `${NEXUS_DIR}/metadata`
export const SHARD_FILE_RE = /^(0[1-9]|1[0-2])-\d{4}\.json$/

export const isMetadataShardRel = (rel: string): boolean =>
  rel.startsWith(`${METADATA_DIR_REL}/`) &&
  SHARD_FILE_RE.test(rel.slice(METADATA_DIR_REL.length + 1))

export const ASSETS_DIRNAME = 'assets'
export const ASSETS_DIR_REL = `${NEXUS_DIR}/${ASSETS_DIRNAME}`

/** The asset root a file property's files land under; an absent subfolder means the root itself. */
export function assetSubRoot(assetDir: string, subfolder: string | undefined): string {
  return [assetDir, subfolder].filter(Boolean).join('/')
}

const AGENDA_KINDS = ['task', 'event'] as const

export type AgendaKind = (typeof AGENDA_KINDS)[number]

export type AgendaFolder = `${AgendaKind}s`

export const AGENDA_FOLDERS: readonly AgendaFolder[] = AGENDA_KINDS.map(
  (k): AgendaFolder => `${k}s`,
)

export const agendaKind = (folder: AgendaFolder): AgendaKind => folder.slice(0, -1) as AgendaKind

export type SidecarKind = 'space' | 'collection' | 'set' | AgendaFolder

export const SIDECAR_FILENAME: Record<SidecarKind, string> = {
  space: '_space.json',
  collection: '_pagecollection.json',
  set: '_pageset.json',
  tasks: '_taskconfig.json',
  events: '_eventconfig.json',
}

export const SIDECARS = new Set<string>(Object.values(SIDECAR_FILENAME))

export const SPACE_SIDECAR = SIDECAR_FILENAME.space

const INTERFACE_DIRNAME = 'interface'
const HOMEPAGE_DIR = `${INTERFACE_DIRNAME}/homepage`
export const HOMEPAGE_DIR_REL = `${NEXUS_DIR}/${HOMEPAGE_DIR}`

export const TILE_DOC_FILENAME = '_tiles.json'

export const NEXUS_CONFIG_FILES = {
  identity: 'nexus.json',
  settings: 'settings.json',
  state: 'state.json',
  matrix: `${INTERFACE_DIRNAME}/matrix.json`,
  homepage: `${HOMEPAGE_DIR}/homepage.json`,
  properties: 'properties.json',
  crops: `${ASSETS_DIRNAME}/crops.json`,
} as const

export type NexusConfigFile = keyof typeof NEXUS_CONFIG_FILES

export const nexusConfigRel = (file: NexusConfigFile): string =>
  `${NEXUS_DIR}/${NEXUS_CONFIG_FILES[file]}`

/** A colon is legal in a nav key and hostile in a filename. */
export const thumbKey = (navKey: string): string => navKey.replace(':', '-')

/** Pinned to `ASSETS_DIR_REL` deliberately: these are Pommora's own derived files, so they stay where the app owns them rather than following `asset_directory` into a shared folder. */
export const THUMBNAILS_SEGMENT = 'thumbnails'
export const thumbsRel = (nexusId: string): string =>
  `${ASSETS_DIR_REL}/${nexusId}/${THUMBNAILS_SEGMENT}`
export const thumbRel = (nexusId: string, key: string): string => `${thumbsRel(nexusId)}/${key}.jpg`

export const CROPS_REL = nexusConfigRel('crops')

// One spelling: the write side keys crops from `assetFilePath`, the read side `resolveAssetValue`.
export function cropKeyFor(rel: string | null, raw: string): string | null {
  const trimmed = raw.trim()
  return rel ?? (HAS_SCHEME.test(trimmed) ? trimmed : null)
}

/** Its title names it, which is why a retitle is a folder rename. */
export const contextDirRel = (title: string): string => `${CONTEXTS_DIR_REL}/${title}`

export const spaceDirRel = (contextTitle: string, name: string): string =>
  `${contextDirRel(contextTitle)}/${name}`
