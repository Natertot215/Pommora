import type { NexusTree } from '@pommora/core/Nexus/tree'
import { ASSETS_DIR_REL } from '@pommora/core/Paths/nexusPaths'
import { DEFAULT_COMMANDS } from '../Actions/commands'

export function makeTree(): NexusTree {
  return {
    nexus: { id: 'nx', rootPath: '/x', name: 'TestNexus', profileImage: null, profileSubtitle: '' },
    homepage: { headingIconHidden: false },
    crops: {},
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
    accent: 'lavender',
    personalization: {},
    commands: DEFAULT_COMMANDS,
    assetDirectory: ASSETS_DIR_REL,
    excluded: [],
    registry: [],
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
