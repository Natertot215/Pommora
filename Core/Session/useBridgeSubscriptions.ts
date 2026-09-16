// Every push the host bridge makes into the running session. One place a non-Electron host re-implements, so no shell surface subscribes on its own.
import { useEffect } from 'react'
import { valueOr } from '@pommora/core/Contract/result'
import { setCmdModifier } from '@pommora/uix/Interactions/chords'
import { EMPTY_ASSET_MAP } from '@pommora/core/Nexus/tree'
import { pageIdIndex } from '@pommora/core/Nexus/valuesChanged'
import { dropDetailsWhere, notifyLanding, readBodyBase, readPageDetail } from './pageDetailCache'
import { setStaleSaveSink } from './saveScheduler'
import { useSession } from './store'
import { openWebLink } from '../Web/openWebLink'
import { host as dialer } from '../Platform/dialer'

export function useBridgeSubscriptions(): void {
  const load = useSession((s) => s.load)
  const applyTree = useSession((s) => s.applyTree)
  const applyNavChanged = useSession((s) => s.applyNavChanged)
  const applyAssetMap = useSession((s) => s.applyAssetMap)
  const nexusRoot = useSession((s) => s.tree?.nexus.rootPath)
  const choose = useSession((s) => s.choose)
  const toggleSidebar = useSession((s) => s.toggleSidebar)
  const newPage = useSession((s) => s.newPage)
  const openNewTab = useSession((s) => s.openNewTab)

  const setHostWindow = useSession((s) => s.setHostWindow)
  useEffect(() => {
    void dialer()
      .ask('host:platform')
      .then((r) => {
        const hostPlatform = valueOr(r, 'posix')
        setCmdModifier(hostPlatform === 'windows')
        setHostWindow({ hostPlatform })
      })
    const off = dialer().on('win:fullscreen', (fullscreen) => setHostWindow({ fullscreen }))
    dialer().tell('win:resendFullscreen')
    return off
  }, [setHostWindow])

  useEffect(() => dialer().on('nexus:changed', (next) => void applyTree(next)), [applyTree])

  const bumpContainerValues = useSession((s) => s.bumpContainerValues)
  useEffect(
    () =>
      dialer().on('values:changed', (changes) => {
        const changed = new Set(changes.flatMap((c) => c.pageIds))
        const byPath = pageIdIndex(useSession.getState().tree)
        dropDetailsWhere((path) => {
          const id = byPath.get(path)
          return id !== undefined && changed.has(id)
        })
        bumpContainerValues(changes)
      }),
    [bumpContainerValues],
  )

  const replaceBody = useSession((s) => s.replaceBody)
  useEffect(() => {
    const absorb = (path: string, unsaved = readPageDetail(path)?.body): void => {
      if (notifyLanding(path) || unsaved === undefined) return
      if (unsaved !== readBodyBase(path)?.text)
        void dialer().ask('sync:captureLocal', path, unsaved)
      void replaceBody(path)
    }
    setStaleSaveSink(absorb)
    const off = dialer().on('pages:changed', (paths) => {
      for (const path of paths) absorb(path)
      void useSession.getState().loadHeadings(paths)
    })
    return () => {
      off()
      setStaleSaveSink(null)
    }
  }, [replaceBody])

  useEffect(() => dialer().on('nav:changed', (nav) => applyNavChanged(nav)), [applyNavChanged])

  const applySyncStatus = useSession((s) => s.applySyncStatus)
  useEffect(() => dialer().on('sync:changed', applySyncStatus), [applySyncStatus])

  useEffect(() => {
    void dialer()
      .ask('assets:map')
      .then((r) => applyAssetMap(valueOr(r, EMPTY_ASSET_MAP)))
    return dialer().on('assets:changed', (map) => applyAssetMap(map))
  }, [applyAssetMap, nexusRoot])

  useEffect(() => dialer().on('web:popup', openWebLink), [])

  useEffect(() => {
    return dialer().on('menu:action', (action) => {
      switch (action) {
        case 'open':
          void choose()
          break
        case 'new-tab': {
          const s = useSession.getState()
          const p = s.pageWindow
          const active = p?.kind === 'page' ? p.tabs.find((t) => t.id === p.activeTabId) : undefined
          if (active && active.target.kind === 'page') {
            void s.select(
              { kind: 'page', id: active.target.id, path: active.target.path },
              { newTab: true },
            )
            s.closeWindowTab(active.id, 'engulf')
          } else openNewTab()
          break
        }
        case 'new-page':
          void newPage()
          break
        case 'toggle-sidebar':
          toggleSidebar()
          break
        case 'reload-state':
          void load()
          break
      }
    })
  }, [choose, newPage, openNewTab, toggleSidebar, load])
}
