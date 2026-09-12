// Every push the host bridge makes into the running session. One place a non-Electron host re-implements, so no shell surface subscribes on its own.
import { useEffect } from 'react'
import { valueOr } from '@pommora/core/Contract/result'
import { EMPTY_ASSET_MAP } from '@pommora/core/Nexus/tree'
import { pageIdIndex } from '@pommora/core/Nexus/valuesChanged'
import { dropDetailsWhere } from './pageDetailCache'
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
        useSession.getState().refreshSlotValues([...changed])
      }),
    [bumpContainerValues],
  )

  useEffect(() => dialer().on('nav:changed', (nav) => applyNavChanged(nav)), [applyNavChanged])

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
