import { afterEach, describe, expect, it, vi } from 'vitest'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import type { WatchScope } from '../Paths/exclusion'
import type { NexusTree } from './tree'
import { dropLiveTree, seedLiveTree } from './liveTree'
import * as watchPatch from './watchPatch'
import type { WatchEvent } from './watchPatch'
import {
  classifyBatch,
  emitWatch,
  isConfigPath,
  pagesChangedIn,
  setWatchTap,
  syncIgnoredUnder,
  tileBodyOf,
  tilesChangedIn,
  valueChangesOf,
} from './watchSettle'

const root = '/nexus'
const scope: WatchScope = { excluded: [], assetDir: ASSETS_DIR_REL }
const TILE_BODIES = ['.nexus/homepage/t1.md', '.nexus/contexts/Areas/Home/t1.md']

const tree = {
  nexus: { rootPath: root },
  contexts: [],
  collections: [
    { kind: 'collection', path: 'Notes', pages: [{ id: 'pA', path: 'Notes/A.md' }], sets: [] },
  ],
} as unknown as NexusTree

const at = (rel: string): WatchEvent => ({ event: 'change', absPath: `${root}/${rel}` })

afterEach(() => {
  setWatchTap(null)
  dropLiveTree()
  vi.restoreAllMocks()
})

describe('syncIgnoredUnder', () => {
  it('reports a tile body, which tileBodyOf then names', () => {
    const sync = syncIgnoredUnder(root, scope)
    const isTileBody = tileBodyOf(root)
    for (const rel of TILE_BODIES) {
      expect(sync(`${root}/${rel}`)).toBe(false)
      expect(isTileBody(`${root}/${rel}`)).toBe(true)
    }
  })

  it('still refuses .trash', () => {
    expect(syncIgnoredUnder(root, scope)(`${root}/.trash/Notes/gone.md`)).toBe(true)
  })
})

describe('isConfigPath', () => {
  it('names each config file apart from the other', () => {
    expect(isConfigPath(root, `${root}/.nexus/state.json`, 'state')).toBe(true)
    expect(isConfigPath(root, `${root}/.nexus/matrix.json`, 'matrix')).toBe(true)
    expect(isConfigPath(root, `${root}/.nexus/matrix.json`, 'state')).toBe(false)
    expect(isConfigPath(root, `${root}/.nexus/state.json`, 'matrix')).toBe(false)
    expect(isConfigPath(root, `${root}/Notes/matrix.json`, 'matrix')).toBe(false)
  })
})

describe('tileBodyOf', () => {
  it('names what the tree drops among the events the watcher reports', () => {
    const isTileBody = tileBodyOf(root)
    for (const rel of TILE_BODIES) expect(isTileBody(`${root}/${rel}`)).toBe(true)
    expect(isTileBody(`${root}/.nexus/homepage/homepage.json`)).toBe(false)
    expect(isTileBody(`${root}/Notes/Page.md`)).toBe(false)
    expect(isTileBody(root)).toBe(false)
  })
})

describe('emitWatch', () => {
  it('reaches an installed sink and builds nothing without one', () => {
    const seen: WatchEvent[] = []
    emitWatch('change', `${root}/Notes/Page.md`)
    setWatchTap((ev) => seen.push(ev))
    emitWatch('change', `${root}/Notes/Page.md`)
    setWatchTap(null)
    emitWatch('unlink', `${root}/Notes/Page.md`)
    expect(seen).toEqual([{ event: 'change', absPath: `${root}/Notes/Page.md` }])
  })
})

describe('classifyBatch', () => {
  it('names a written page in pages:changed and its container in values:changed', () => {
    seedLiveTree(tree)
    const classified = classifyBatch([at('Notes/A.md'), at('Notes/A.md')], root, scope)
    expect(pagesChangedIn(classified)).toEqual(['Notes/A.md'])
    expect(valueChangesOf(classified, tree)).toEqual([{ rel: 'Notes', pageIds: ['pA'] }])
  })

  it('classifies each event once', () => {
    seedLiveTree(tree)
    const spy = vi.spyOn(watchPatch, 'classifyEvent')
    const events = [at('Notes/A.md'), at('.nexus/homepage/_tiles.json')]
    const classified = classifyBatch(events, root, scope)
    pagesChangedIn(classified)
    valueChangesOf(classified, tree)
    tilesChangedIn(classified)
    expect(spy).toHaveBeenCalledTimes(events.length)
    expect(tilesChangedIn(classified)).toEqual([{ kind: 'homepage' }])
  })

  it('classifies nothing with no live tree', () => {
    expect(classifyBatch([at('Notes/A.md')], root, scope)).toEqual([])
  })
})
