// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { NO_NEXUS, ok } from '@pommora/core/Contract/result'
import type { DevicePrefs } from '@pommora/core/Settings/devicePrefs'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { ASSETS_DIR_REL } from '@pommora/core/Paths/nexusPaths'
import { stubDialer } from '../vitest.setup'

const treeAt = (rootPath: string): NexusTree => ({
  nexus: { id: rootPath, rootPath, name: 'x', profileImage: null, profileSubtitle: '' },
  homepage: { headingIconHidden: false },
  crops: {},
  contexts: [],
  collections: [],
  accent: 'lavender',
  personalization: {},
  commands: {},
  assetDirectory: ASSETS_DIR_REL,
  excluded: [],
  registry: [],
})

type Session = typeof import('./store')['useSession']

// devicePrefsLoaded is a module singleton and the pane widths are read at slice construction, so every case needs its own module registry rather than a shared store reset.
async function freshStore(answer: () => Promise<unknown>): Promise<{
  useSession: Session
  prefsLoad: ReturnType<typeof vi.fn>
  prefsSave: ReturnType<typeof vi.fn>
}> {
  vi.resetModules()
  const prefsLoad = vi.fn(answer)
  const prefsSave = vi.fn(async () => ok(null))
  const channels: Record<string, unknown> = {
    'theme:systemAccent': vi.fn(async () => ok('#000000')),
    'devicePrefs:load': prefsLoad,
    'devicePrefs:save': prefsSave,
    'nav:write': vi.fn(async () => ok(null)),
    'tabs:save': vi.fn(async () => ok(null)),
  }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
  const { useSession } = await import('./store')
  return { useSession, prefsLoad, prefsSave }
}

const withPrefs = (prefs: DevicePrefs | null) => async (): Promise<unknown> => ok(prefs)

/** The widths as they stand in the commit that first sets `status: 'ready'` — a settle after the paint is what this whole move exists to avoid. */
async function widthsAtReady(
  useSession: Session,
  tree: NexusTree,
): Promise<{ sidebar: number; inspector: number } | null> {
  let seen: { sidebar: number; inspector: number } | null = null
  const stop = useSession.subscribe((s) => {
    if (seen === null && s.status === 'ready')
      seen = { sidebar: s.sidebarWidth, inspector: s.inspectorWidth }
  })
  await useSession.getState().applyTree(tree)
  stop()
  return seen
}

describe('the panes open at the widths this machine last left them', () => {
  it('carries both stored widths into the ready paint, not after it', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: { sidebar: 300, inspector: 400 } }))
    expect(await widthsAtReady(useSession, treeAt('/a'))).toEqual({ sidebar: 300, inspector: 400 })
  })

  it('clamps a stored width to the pane bounds', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: { sidebar: 999, inspector: 10 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    const s = useSession.getState()
    expect([s.sidebarWidth, s.inspectorWidth]).toEqual([380, 240])
  })

  it('seeds only the width the prefs hold', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: { sidebar: 300 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    const s = useSession.getState()
    expect(s.sidebarWidth).toBe(300)
    expect(s.inspectorWidth).toBe(300)
  })

  // The other half of the same rule: an absent key leaves whatever the slice already holds rather than driving it back to its default.
  it('leaves a width the prefs do not name exactly as it stands', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: {} }))
    useSession.setState({ sidebarWidth: 320 })
    await useSession.getState().applyTree(treeAt('/a'))
    expect(useSession.getState().sidebarWidth).toBe(320)
  })

  it('leaves the defaults standing when the machine has stored nothing', async () => {
    const { useSession } = await freshStore(withPrefs(null))
    await useSession.getState().applyTree(treeAt('/a'))
    const s = useSession.getState()
    expect(s.devicePrefs).toEqual({})
    expect([s.sidebarWidth, s.inspectorWidth]).toEqual([240, 300])
  })

  it('leaves the defaults standing when no nexus is bound', async () => {
    const { useSession } = await freshStore(async () => NO_NEXUS)
    await useSession.getState().applyTree(treeAt('/a'))
    const s = useSession.getState()
    expect(s.devicePrefs).toEqual({})
    expect([s.sidebarWidth, s.inspectorWidth]).toEqual([240, 300])
  })
})

describe('the prefs are read once per nexus', () => {
  it('does not re-read on a push carrying the same root', async () => {
    const { useSession, prefsLoad } = await freshStore(withPrefs({ panes: { sidebar: 300 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    await useSession.getState().applyTree(treeAt('/a'))
    expect(prefsLoad).toHaveBeenCalledTimes(1)
  })

  it('re-reads when a push carries a foreign root', async () => {
    const { useSession, prefsLoad } = await freshStore(withPrefs({ panes: { sidebar: 300 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    await useSession.getState().applyTree(treeAt('/b'))
    expect(prefsLoad).toHaveBeenCalledTimes(2)
  })
})

describe('a pane drop writes back to the device store', () => {
  it('carries both widths in one panes preference', async () => {
    const { useSession, prefsSave } = await freshStore(withPrefs({}))
    await useSession.getState().applyTree(treeAt('/a'))
    useSession.getState().setSidebarWidth(300)
    useSession.getState().setInspectorWidth(400)
    prefsSave.mockClear()
    useSession.getState().persistPaneWidths()
    expect(prefsSave).toHaveBeenCalledTimes(1)
    expect(prefsSave).toHaveBeenCalledWith({ panes: { sidebar: 300, inspector: 400 } })
  })
})

describe('a nexus switch keeps none of the old nexus', () => {
  // Every key is per machine PER NEXUS, so a refused re-fetch must not leave the first one's values for the next write to carry into the second one's store.
  it('clears the prefs even when the re-fetch refuses', async () => {
    let call = 0
    const { useSession } = await freshStore(async () =>
      ++call === 1 ? ok({ disclosure: { 'context:areas': true } }) : NO_NEXUS,
    )
    await useSession.getState().applyTree(treeAt('/a'))
    expect(useSession.getState().devicePrefs).toEqual({ disclosure: { 'context:areas': true } })
    await useSession.getState().applyTree(treeAt('/b'))
    expect(useSession.getState().devicePrefs).toEqual({})
  })
})

describe('a nexus switch returns the panes to their defaults', () => {
  it('resetLayout drops both widths back to def', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: { sidebar: 300, inspector: 400 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    useSession.getState().resetLayout()
    const s = useSession.getState()
    expect([s.sidebarWidth, s.inspectorWidth]).toEqual([240, 300])
  })
})
