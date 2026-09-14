import { afterEach, describe, expect, it } from 'vitest'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import type { WatchScope } from '../Paths/exclusion'
import { recordWrite, setWriteTap } from '../Files/writeEcho'
import type { WatchEvent } from './watchPatch'
import { ignoredUnder, setWatchTap, syncIgnoredUnder, watchTap } from './watchSettle'

const root = '/nexus'
const scope: WatchScope = { excluded: [], assetDir: ASSETS_DIR_REL }

afterEach(() => {
  setWatchTap(null)
  setWriteTap(null)
})

describe('syncIgnoredUnder', () => {
  it('admits a tile body the tree ignores', () => {
    const tree = ignoredUnder(root, scope)
    const sync = syncIgnoredUnder(root, scope)
    for (const rel of ['.nexus/homepage/t1.md', '.nexus/contexts/Areas/Home/t1.md']) {
      expect(tree(`${root}/${rel}`)).toBe(true)
      expect(sync(`${root}/${rel}`)).toBe(false)
    }
  })

  it('still refuses .trash', () => {
    expect(syncIgnoredUnder(root, scope)(`${root}/.trash/Notes/gone.md`)).toBe(true)
  })
})

describe('the watch tap', () => {
  it('is handed an event the echo check would drop', () => {
    const seen: WatchEvent[] = []
    setWatchTap((ev) => seen.push(ev))
    const absPath = `${root}/Notes/Page.md`
    recordWrite(absPath)
    watchTap()?.({ event: 'change', absPath })
    expect(seen).toEqual([{ event: 'change', absPath }])
  })
})
