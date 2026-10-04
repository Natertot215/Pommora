import type { Depth } from '../../Files/jsonMerge'
import {
  CONTEXTS_REGISTRY_REL,
  isMetadataShardRel,
  NEXUS_CONFIG_FILES,
  type NexusConfigFile,
  nexusConfigRel,
  SIDECARS,
  TILE_DOC_FILENAME,
} from '../../Paths/nexusPaths'
import { basename } from '../../Paths/posix'

const CONFIG_RELS = new Set([
  ...(Object.keys(NEXUS_CONFIG_FILES) as NexusConfigFile[]).map(nexusConfigRel),
  CONTEXTS_REGISTRY_REL,
])
const OWN_NAMES = new Set([...SIDECARS, TILE_DOC_FILENAME])

// Pommora's own JSON files; any other JSON, an attachment among them, is the user's and lands whole.
export const isMergedJson = (rel: string): boolean =>
  CONFIG_RELS.has(rel) || isMetadataShardRel(rel) || OWN_NAMES.has(basename(rel))

export const MATRIX_MERGE_DEPTH: Depth = { group: 1, filter: 1, forces: 2, display: 1 }

export function mergeDepthFor(rel: string): Depth {
  if (isMetadataShardRel(rel)) return { pages: 2 }
  switch (rel) {
    case nexusConfigRel('settings'):
      return { personalization: 1 }
    case nexusConfigRel('state'):
      return { order: 1, navigation: 1 }
    case nexusConfigRel('properties'):
      return { defs: 2 }
    case nexusConfigRel('crops'):
      return { byImage: 1 }
    case nexusConfigRel('matrix'):
      return MATRIX_MERGE_DEPTH
    default:
      return {}
  }
}
