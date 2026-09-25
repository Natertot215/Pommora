import type { Depth } from '../../Files/jsonMerge'
import { isMetadataShardRel, NEXUS_DIR, NEXUS_CONFIG_FILES } from '../../Paths/nexusPaths'
import { basename } from '../../Paths/posix'

export function isMergedJson(rel: string): boolean {
  return rel.endsWith('.json') && (rel.startsWith(`${NEXUS_DIR}/`) || basename(rel).startsWith('_'))
}

export function mergeDepthFor(rel: string): Depth {
  if (isMetadataShardRel(rel)) return { pages: 2 }
  switch (rel) {
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.settings}`:
      return { personalization: 1 }
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.state}`:
      return { order: 1, navigation: 1 }
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.properties}`:
      return { defs: 1 }
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.crops}`:
      return { byImage: 1 }
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.matrix}`:
      return { group: 1, filter: 1, forces: 1, display: 1 }
    default:
      return {}
  }
}
