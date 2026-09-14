import { afterEach, describe, expect, it } from 'vitest'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import type { WatchScope } from '../Paths/exclusion'
import type { WatchEvent } from './watchPatch'
import { emitWatch, ignoredUnder, setWatchTap, syncIgnoredUnder, tileBodyOf } from './watchSettle'

const root = '/nexus'
const scope: WatchScope = { excluded: [], assetDir: ASSETS_DIR_REL }
const TILE_BODIES = ['.nexus/homepage/t1.md', '.nexus/contexts/Areas/Home/t1.md']

afterEach(() => {
  setWatchTap(null)
})

describe('syncIgnoredUnder', () => {
  it('admits a tile body the tree ignores', () => {
    const tree = ignoredUnder(root, scope)
    const sync = syncIgnoredUnder(root, scope)
    for (const rel of TILE_BODIES) {
      expect(tree(`${root}/${rel}`)).toBe(true)
      expect(sync(`${root}/${rel}`)).toBe(false)
    }
  })

  it('still refuses .trash', () => {
    expect(syncIgnoredUnder(root, scope)(`${root}/.trash/Notes/gone.md`)).toBe(true)
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
