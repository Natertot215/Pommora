import type { NexusConfig, NexusTree } from '../Nexus/tree'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import { DEFAULT_COMMANDS } from '../Actions/commands'

export function makeTree(config: Partial<NexusConfig> = {}): NexusTree {
  return {
    nexus: { id: 'nx', rootPath: '/x', name: 'TestNexus' },
    contexts: [
      {
        def: { id: 'g1', title: 'Realms', singular: 'Realm' },
        spaces: [
          {
            kind: 'space',
            id: 'a1',
            title: 'Work',
            path: '.nexus/contexts/Realms/Work',
            contextId: 'g1',
          },
          {
            kind: 'space',
            id: 't1',
            title: 'Reading',
            path: '.nexus/contexts/Realms/Reading',
            contextId: 'g1',
          },
          {
            kind: 'space',
            id: 'pr1',
            title: 'Pommora',
            path: '.nexus/contexts/Realms/Pommora',
            contextId: 'g1',
          },
        ],
      },
    ],
    collections: [
      {
        kind: 'collection',
        id: 'c1',
        title: 'Notes',
        path: 'Notes',
        pages: [{ kind: 'page', id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }],
        sets: [
          {
            kind: 'set',
            id: 's1',
            title: 'Ideas',
            path: 'Notes/Ideas',
            pages: [{ kind: 'page', id: 'p2', title: 'Nested Beta', path: 'Notes/Ideas/Beta.md' }],
            sets: [],
          },
        ],
      },
    ],
    config: {
      profileImage: null,
      homepage: { headingIconHidden: false },
      crops: {},
      pageMetadata: {},
      order: { spaces: {} },
      personalization: {},
      commands: DEFAULT_COMMANDS,
      excluded: [],
      assetDirectory: ASSETS_DIR_REL,
      registry: [],
      ...config,
    },
  }
}

export function linkedSpacesTree(options?: {
  aContextValues?: Record<string, string[]>
  aValues?: Record<string, unknown>
  bContextValues?: Record<string, string[]>
}): NexusTree {
  const base = makeTree()
  return {
    ...base,
    contexts: [
      {
        def: { id: 'g1', title: 'Realms', singular: 'Realm' },
        spaces: [
          {
            kind: 'space',
            id: 'a1',
            title: 'Work',
            path: '.nexus/contexts/Realms/Work',
            contextId: 'g1',
            ...(options?.aContextValues ? { contextValues: options.aContextValues } : {}),
            ...(options?.aValues ? { values: options.aValues } : {}),
          },
        ],
      },
      {
        def: { id: 'g2', title: 'Themes', singular: 'Theme' },
        spaces: [
          {
            kind: 'space',
            id: 'b1',
            title: 'Reading',
            path: '.nexus/contexts/Themes/Reading',
            contextId: 'g2',
            ...(options?.bContextValues ? { contextValues: options.bContextValues } : {}),
          },
        ],
      },
    ],
  }
}
