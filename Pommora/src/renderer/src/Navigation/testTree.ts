// Shared NexusTree fixture for the Navigation unit tests (search + resolve). One of each entity kind,
// with a nested Set so location-chain resolution is exercised. Not shipped — imported only by *.test.
import type { NexusTree } from '@shared/types'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import { DEFAULT_LABELS } from '@shared/types'

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
    labels: DEFAULT_LABELS,
    accent: 'lavender',
    personalization: {},
    commands: {},
    assetDirectory: ASSETS_DIR_REL,
    excluded: [],
    registry: [],
  }
}
