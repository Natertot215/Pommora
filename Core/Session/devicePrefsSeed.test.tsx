// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { fail, NO_NEXUS, ok } from '@pommora/core/Contract/result'
import { type DevicePrefs, packDevicePrefs } from '@pommora/core/Settings/devicePrefs'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { ASSETS_DIR_REL } from '@pommora/core/Paths/nexusPaths'
import { stubDialer } from '../vitest.setup'
import { DEFAULT_COMMANDS } from '../Actions/commands'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const treeAt = (rootPath: string): NexusTree => ({
  nexus: { id: rootPath, rootPath, name: 'x', profileImage: null, profileSubtitle: '' },
  homepage: { headingIconHidden: false },
  crops: {},
  pageMetadata: {},
  contexts: [],
  collections: [],
  accent: 'lavender',
  personalization: {},
  commands: DEFAULT_COMMANDS,
  assetDirectory: ASSETS_DIR_REL,
  excluded: [],
  registry: [],
})

type Session = typeof import('./store')['useSession']

// The pane widths are read at slice construction, so every case needs its own module registry rather than a shared store reset.
async function freshStore(
  answer: () => Promise<unknown>,
  choose: () => Promise<unknown> = async () => ok(true),
  state: () => Promise<unknown> = async () => ok({ status: 'open', tree: treeAt('/b') }),
): Promise<{
  useSession: Session
  prefsLoad: ReturnType<typeof vi.fn>
  prefsSave: ReturnType<typeof vi.fn>
  flushed: () => Promise<void>
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
    'windows:save': vi.fn(async () => ok(null)),
    'index:headings': vi.fn(async () => ok({})),
    'nexus:choose': vi.fn(choose),
    'nexus:state': vi.fn(state),
    'citations:get': vi.fn(async () => ok({})),
    'linkTitles:get': vi.fn(async () => ok({})),
    'nav:read': vi.fn(async () => ok(null)),
    'windows:load': vi.fn(async () => ok(null)),
    'tabs:load': vi.fn(async () => ok(null)),
  }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
  const { useSession } = await import('./store')
  const { flushAllSessionSaves } = await import('./saveScheduler')
  return { useSession, prefsLoad, prefsSave, flushed: flushAllSessionSaves }
}

const withPrefs = (prefs: DevicePrefs | null) => async (): Promise<unknown> => ok(prefs)

/** The widths as they stand in the commit that first sets `status: 'ready'` — a settle after the paint is what this whole move exists to avoid. */
async function widthsAtReady(
  useSession: Session,
  tree: NexusTree,
): Promise<{ sidebar: number; sidePane: number } | null> {
  let seen: { sidebar: number; sidePane: number } | null = null
  const stop = useSession.subscribe((s) => {
    if (seen === null && s.status === 'ready')
      seen = { sidebar: s.sidebarWidth, sidePane: s.sidePaneWidth }
  })
  await useSession.getState().applyTree(tree)
  stop()
  return seen
}

describe('the panes open at the widths this machine last left them', () => {
  it('carries both stored widths into the ready paint, not after it', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: { sidebar: 300, sidePane: 400 } }))
    expect(await widthsAtReady(useSession, treeAt('/a'))).toEqual({ sidebar: 300, sidePane: 400 })
  })

  it('clamps a stored width to the pane bounds', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: { sidebar: 999, sidePane: 10 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    const s = useSession.getState()
    expect([s.sidebarWidth, s.sidePaneWidth]).toEqual([380, 240])
  })

  it('seeds only the width the prefs hold', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: { sidebar: 300 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    const s = useSession.getState()
    expect(s.sidebarWidth).toBe(300)
    expect(s.sidePaneWidth).toBe(300)
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
    expect([s.sidebarWidth, s.sidePaneWidth]).toEqual([240, 300])
  })

  it('leaves the defaults standing when no nexus is bound', async () => {
    const { useSession } = await freshStore(async () => NO_NEXUS)
    await useSession.getState().applyTree(treeAt('/a'))
    const s = useSession.getState()
    expect(s.devicePrefs).toEqual({})
    expect([s.sidebarWidth, s.sidePaneWidth]).toEqual([240, 300])
  })
})

describe('the prefs are read once per nexus', () => {
  it('does not re-read on a push carrying the same root', async () => {
    const { useSession, prefsLoad } = await freshStore(withPrefs({ panes: { sidebar: 300 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    await useSession.getState().applyTree(treeAt('/a'))
    expect(prefsLoad).toHaveBeenCalledTimes(1)
  })

  it('re-reads after switching Nexus', async () => {
    const { useSession, prefsLoad } = await freshStore(withPrefs({ panes: { sidebar: 300 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    await useSession.getState().choose()
    expect(prefsLoad).toHaveBeenCalledTimes(2)
  })
})

describe('a pane drop writes back to the device store', () => {
  it('carries both widths in one panes preference', async () => {
    const { useSession, prefsSave } = await freshStore(withPrefs({}))
    await useSession.getState().applyTree(treeAt('/a'))
    useSession.getState().setSidebarWidth(300)
    useSession.getState().setSidePaneWidth(400)
    prefsSave.mockClear()
    useSession.getState().persistPaneWidths()
    expect(prefsSave).toHaveBeenCalledTimes(1)
    expect(prefsSave).toHaveBeenCalledWith({ panes: { sidebar: 300, sidePane: 400 } })
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
    await useSession.getState().choose()
    expect(useSession.getState().devicePrefs).toEqual({})
  })

  it('a refused open or re-fetch leaves no tree behind the error', async () => {
    const why = 'Couldn’t read “settings.json”.'
    const { useSession } = await freshStore(
      withPrefs({}),
      async () => fail('operation-failed', why),
      async () => fail('operation-failed', why),
    )
    await useSession.getState().applyTree(treeAt('/a'))
    useSession.getState().openWindowTab({ kind: 'page', id: 'x', path: 'x.md' })
    await useSession.getState().load()
    expect(useSession.getState()).toMatchObject({ status: 'error', tree: null, windowSlot: null })
    await useSession.getState().applyTree(treeAt('/a'))
    await useSession.getState().choose()
    expect(useSession.getState()).toMatchObject({ status: 'error', tree: null })
  })

  it('a switch closes every window and pinned glance before the switch is attempted, even when it is canceled', async () => {
    let atChoose: ReturnType<Session['getState']> | undefined
    const { useSession } = await freshStore(
      async () => ok({}),
      async () => {
        atChoose = useSession.getState()
        return ok(false)
      },
    )
    await useSession.getState().applyTree(treeAt('/a'))
    const page = { kind: 'page', id: 'x', path: 'x.md' } as const
    const s = useSession.getState()
    s.openWindowTab(page)
    s.openHistory(page)
    s.toggleSettings()
    s.openBrowser('https://example.com')
    s.toggleIteration()
    s.pinGlance({
      tabId: 't',
      target: page,
      anchorX: 0,
      anchorY: 0,
      anchorHeight: 0,
      size: { w: 100, h: 100 },
    })
    await useSession.getState().choose()
    expect(atChoose).toMatchObject({
      windowSlot: null,
      historyTarget: null,
      settingsOpen: false,
      browserSummon: null,
      iterationOpen: false,
      pinnedGlances: [],
    })
    const after = useSession.getState()
    expect(after.status).not.toBe('error')
    expect(after.windowsFile.sets.page?.tabs).toEqual([{ target: { kind: 'page', id: 'x' } }])
  })
})

describe('a device preference saves only into the Nexus whose record the window holds', () => {
  const fold = { disclosure: { 'context:areas': false } }

  it('keeps a fold made mid-switch out of the new Nexus until its record arrives', async () => {
    let arrive = (): void => {}
    let call = 0
    const { useSession, prefsSave } = await freshStore(() =>
      ++call === 1
        ? Promise.resolve(ok({}))
        : new Promise((resolve) => {
            arrive = () => resolve(ok({ panes: { sidebar: 300 } }))
          }),
    )
    await useSession.getState().applyTree(treeAt('/a'))
    const switching = useSession.getState().choose()
    await vi.waitFor(() => expect(call).toBe(2))
    useSession.getState().setDevicePref('disclosure', fold.disclosure)
    expect(prefsSave).not.toHaveBeenCalled()
    arrive()
    await switching
    useSession.getState().setDevicePref('disclosure', fold.disclosure)
    expect(prefsSave).toHaveBeenCalledWith({ panes: { sidebar: 300 }, ...fold })
  })

  it('saves nothing after the new record is refused', async () => {
    let call = 0
    const { useSession, prefsSave } = await freshStore(async () =>
      ++call === 1 ? ok({}) : NO_NEXUS,
    )
    await useSession.getState().applyTree(treeAt('/a'))
    await useSession.getState().choose()
    useSession.getState().setDevicePref('disclosure', fold.disclosure)
    expect(prefsSave).not.toHaveBeenCalled()
  })

  it('keeps saving into the open Nexus when the switch is canceled', async () => {
    const { useSession, prefsSave } = await freshStore(withPrefs({}), async () => ok(false))
    await useSession.getState().applyTree(treeAt('/a'))
    await useSession.getState().choose()
    useSession.getState().setDevicePref('disclosure', fold.disclosure)
    expect(prefsSave).toHaveBeenCalledWith(fold)
  })

  // Each `choose` waits on its own answer, so two switches can overlap the way a picker opened mid-adoption does.
  const overlapping = async () => {
    const answers: ((opened: boolean) => void)[] = []
    const store = await freshStore(
      withPrefs({ panes: { sidebar: 300 } }),
      () => new Promise((resolve) => answers.push((opened) => resolve(ok(opened)))),
    )
    await store.useSession.getState().applyTree(treeAt('/a'))
    const first = store.useSession.getState().choose()
    await vi.waitFor(() => expect(answers).toHaveLength(1))
    const second = store.useSession.getState().choose()
    await vi.waitFor(() => expect(answers).toHaveLength(2))
    return { ...store, answers, first, second }
  }

  it('lands a change made while the picker is open in the Nexus that stays open', async () => {
    const { useSession, prefsSave, flushed, answers, first, second } = await overlapping()
    useSession.getState().setDevicePref('disclosure', fold.disclosure)
    expect(prefsSave).not.toHaveBeenCalled()
    answers[0](false)
    answers[1](false)
    await Promise.all([first, second, flushed()])
    expect(prefsSave).toHaveBeenLastCalledWith({ panes: { sidebar: 300 }, ...fold })
  })

  it('keeps saving after a switch lands and an overlapping picker is canceled', async () => {
    const { useSession, prefsSave, flushed, answers, first, second } = await overlapping()
    answers[0](true)
    await first
    answers[1](false)
    await second
    useSession.getState().setDevicePref('disclosure', fold.disclosure)
    await flushed()
    expect(prefsSave).toHaveBeenLastCalledWith({ panes: { sidebar: 300 }, ...fold })
  })

  it('saves nothing into a Nexus that opens while a canceled picker was pending', async () => {
    const { useSession, prefsSave, flushed, answers, first, second } = await overlapping()
    answers[0](false)
    await first
    useSession.getState().setDevicePref('disclosure', fold.disclosure)
    answers[1](true)
    await Promise.all([second, flushed()])
    expect(prefsSave).not.toHaveBeenCalled()
  })
})

describe('a nexus switch returns the panes to their defaults', () => {
  it('resetLayout drops both widths back to def', async () => {
    const { useSession } = await freshStore(withPrefs({ panes: { sidebar: 300, sidePane: 400 } }))
    await useSession.getState().applyTree(treeAt('/a'))
    useSession.getState().resetLayout()
    const s = useSession.getState()
    expect([s.sidebarWidth, s.sidePaneWidth]).toEqual([240, 300])
  })
})

describe('the navigation layouts save as their non-default state', () => {
  it.each([
    'navWindowGallery',
    'navViewGallery',
  ] as const)('%s saves true and drops back to absent at false', async (key) => {
    const { useSession, prefsSave, flushed } = await freshStore(withPrefs({}))
    await useSession.getState().applyTree(treeAt('/a'))
    useSession.getState().setDevicePref(key, true)
    await flushed()
    expect(prefsSave).toHaveBeenLastCalledWith({ [key]: true })
    useSession.getState().setDevicePref(key, false)
    await flushed()
    expect(packDevicePrefs(prefsSave.mock.lastCall?.[0])).toEqual({})
  })
})

describe('each footer remembers its own fold on this machine', () => {
  type Fold = [boolean, (open: boolean) => void]
  const mountFolds = async (
    prefs: DevicePrefs,
  ): Promise<{ folds: Record<string, Fold>; session: Awaited<ReturnType<typeof freshStore>> }> => {
    const session = await freshStore(withPrefs(prefs))
    const { useFold } = await import('./store')
    await session.useSession.getState().applyTree(treeAt('/a'))
    const folds: Record<string, Fold> = {}
    function Probe(): null {
      folds.main = useFold('footer')
      folds.page = useFold('footer:page-window')
      folds.matrix = useFold('footer:matrix')
      return null
    }
    act(() => createRoot(document.createElement('div')).render(<Probe />))
    return { folds, session }
  }
  const openOf = (folds: Record<string, Fold>): boolean[] =>
    [folds.main, folds.page, folds.matrix].map(([open]) => open)

  it('saves a window footer folded under its own id, leaving the others open', async () => {
    const { folds, session } = await mountFolds({})
    act(() => folds.page[1](false))
    await session.flushed()
    expect(session.prefsSave).toHaveBeenLastCalledWith({
      disclosure: { 'footer:page-window': false },
    })
    expect(openOf(folds)).toEqual([true, false, true])
    act(() => folds.page[1](true))
    await session.flushed()
    expect(packDevicePrefs(session.prefsSave.mock.lastCall?.[0])).toEqual({ disclosure: {} })
  })

  it('reads a stored fold back for its own window only', async () => {
    const { folds } = await mountFolds({ disclosure: { 'footer:matrix': false } })
    expect(openOf(folds)).toEqual([true, true, false])
  })
})
