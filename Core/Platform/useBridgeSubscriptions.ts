// Every push the host bridge makes into the running session — renames, menu actions, tree and asset
// changes. One place a non-Electron host re-implements, so no shell surface subscribes on its own.
import { useEffect } from 'react'
import { useSession } from '../Session/store'
import { confirmDelete } from '../Interface/confirmations'
import { contextTargetToSelect } from '../Navigation/tabsModel'
import { openWebLink } from './openWebLink'

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
  const beginRename = useSession((s) => s.beginRename)
  const beginIcon = useSession((s) => s.beginIcon)
  const newPageAdjacent = useSession((s) => s.newPageAdjacent)
  const select = useSession((s) => s.select)

  useEffect(() => {
    return window.nexus.onBeginRename(({ path, create, host }) => beginRename(path, create, host))
  }, [beginRename])

  useEffect(() => {
    return window.nexus.onBeginIcon(({ path }) => beginIcon(path))
  }, [beginIcon])

  useEffect(() => {
    return window.nexus.onNewPageAdjacent(
      ({ path, where, host }) => void newPageAdjacent(path, where, host),
    )
  }, [newPageAdjacent])

  useEffect(() => {
    return window.nexus.onOpenInNewTab((target) => {
      if (!target.id) return
      void select(contextTargetToSelect({ kind: target.kind, id: target.id, path: target.path }), {
        newTab: true,
      })
    })
  }, [select])

  useEffect(() => window.nexus.onConfirmDelete((target) => void confirmDelete(target)), [])

  const openWindow = useSession((s) => s.openWindow)
  useEffect(() => {
    return window.nexus.onOpenInWindow((target) => {
      if (target.id) openWindow({ id: target.id, path: target.path })
    })
  }, [openWindow])

  const openHistory = useSession((s) => s.openHistory)
  useEffect(() => {
    return window.nexus.onOpenHistory((target) => {
      if (target.id) openHistory({ id: target.id, path: target.path })
    })
  }, [openHistory])

  useEffect(() => {
    return window.nexus.onNexusChanged((next) => void applyTree(next))
  }, [applyTree])

  const bumpContainerValues = useSession((s) => s.bumpContainerValues)
  useEffect(() => window.nexus.onValuesChanged(bumpContainerValues), [bumpContainerValues])

  useEffect(() => {
    return window.nexus.onNavChanged((nav) => applyNavChanged(nav))
  }, [applyNavChanged])

  useEffect(() => {
    void window.nexus.assetMap().then(applyAssetMap)
    return window.nexus.onAssetsChanged((map) => applyAssetMap(map))
  }, [applyAssetMap, nexusRoot])

  useEffect(() => {
    return window.nexus.onWebPopup((url) => openWebLink(url))
  }, [])

  useEffect(() => {
    return window.nexus.onMenuAction((action) => {
      switch (action) {
        case 'open':
          void choose()
          break
        case 'new-tab': {
          const s = useSession.getState()
          const p = s.pageWindow
          const active =
            p?.flavor === 'page' ? p.tabs.find((t) => t.id === p.activeTabId) : undefined
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
