// Every push the host bridge makes lands here, and the Dialer's `on` is the one seam a non-Electron host implements; a surface that needs a push of its own subscribes through the same `on`.
import { persist } from '../Interface/Notifications/notifications'
import { useEffect } from 'react'
import { valueOr } from '../Contract/result'
import { setCmdModifier } from '@pommora/uix/Interactions/chords'
import { applySystemAccent } from '@pommora/uix/Theme/ramp'
import { EMPTY_ASSET_MAP } from '../Nexus/tree'
import { pagesByIdOf } from '../Nexus/treeIndex'
import { bodyHead, dropCacheDetail, readBodyBase, readPageDetail } from './pageDetailCache'
import { absorbLanding } from '../Pages/bodyMount'
import { flushAllSaves } from './nexusSlice'
import { flushPageSave, setStaleSaveSink } from './saveScheduler'
import { useSession } from './store'
import { openWebLink } from '../Web/openWebLink'
import { dialer } from '../Platform/dialer'
import { runCommand } from '../Actions/commandRouter'

export function useBridgeSubscriptions(): void {
  const applyChange = useSession((s) => s.applyChange)
  const applyNavChanged = useSession((s) => s.applyNavChanged)
  const applyAssetMap = useSession((s) => s.applyAssetMap)
  const nexusRoot = useSession((s) => s.tree?.nexus.rootPath)
  const choose = useSession((s) => s.choose)
  const openPath = useSession((s) => s.openPath)

  const setHostWindow = useSession((s) => s.setHostWindow)
  useEffect(() => {
    void dialer()
      .ask('host:platform')
      .then((r) => {
        const hostPlatform = valueOr(r, 'posix')
        setCmdModifier(hostPlatform === 'windows')
        setHostWindow({ hostPlatform })
      })
    const offFullscreen = dialer().on('win:fullscreen', (fullscreen) =>
      setHostWindow({ fullscreen }),
    )
    const offAccent = dialer().on('theme:systemAccent', applySystemAccent)
    dialer().tell('win:resend')
    return () => {
      offFullscreen()
      offAccent()
    }
  }, [setHostWindow])

  useEffect(() => dialer().on('nexus:changed', applyChange), [applyChange])

  const bumpContainerValues = useSession((s) => s.bumpContainerValues)
  useEffect(
    () =>
      dialer().on('values:changed', (changes) => {
        const changed = new Set(changes.flatMap((c) => c.pageIds))
        // A page's own body save is already in the window's copy; dropping it would stop the write-through and the landing merge.
        const held = new Set(changes.flatMap((c) => c.bodyOnly ?? []))
        const tree = useSession.getState().tree
        for (const id of changed) {
          const path = tree && !held.has(id) && pagesByIdOf(tree).get(id)?.path
          if (path) dropCacheDetail(path)
        }
        bumpContainerValues(changes)
        useSession.getState().refetchMatrixPages(changed)
      }),
    [bumpContainerValues],
  )

  const replaceBody = useSession((s) => s.replaceBody)
  useEffect(() => {
    const absorb = (path: string, unsaved = readPageDetail(path)?.body): void => {
      if (bodyHead(path)) return void absorbLanding(path)
      if (unsaved === undefined) {
        // A page no slot shows fetches from disk on its next open.
        const shown = Object.values(useSession.getState().pages).some(
          (s) => s.status === 'ready' && s.detail.path === path,
        )
        if (shown) void flushPageSave(path).then(() => replaceBody(path))
        return
      }
      if (unsaved !== readBodyBase(path)?.text)
        void persist('the conflicting version', dialer().ask('sync:captureLocal', path, unsaved))
      void replaceBody(path)
    }
    setStaleSaveSink(absorb)
    const off = dialer().on('pages:changed', (paths) => {
      for (const path of paths) absorb(path)
      void useSession.getState().loadHeadings(paths)
      useSession.getState().refetchMatrixPaths(paths)
    })
    return () => {
      off()
      setStaleSaveSink(null)
    }
  }, [replaceBody])

  useEffect(() => dialer().on('nav:changed', (nav) => applyNavChanged(nav)), [applyNavChanged])

  const applyMatrixChanged = useSession((s) => s.applyMatrixChanged)
  useEffect(
    () => dialer().on('matrix:changed', (config) => applyMatrixChanged(config)),
    [applyMatrixChanged],
  )

  const applySyncStatus = useSession((s) => s.applySyncStatus)
  useEffect(() => dialer().on('sync:changed', applySyncStatus), [applySyncStatus])

  useEffect(() => {
    void dialer()
      .ask('assets:map')
      .then((r) => applyAssetMap(valueOr(r, EMPTY_ASSET_MAP)))
    return dialer().on('assets:changed', (map) => applyAssetMap(map))
  }, [applyAssetMap, nexusRoot])

  useEffect(() => dialer().on('web:popup', openWebLink), [])

  useEffect(
    () =>
      dialer().on('web:key', (press) =>
        (document.activeElement ?? document).dispatchEvent(
          new KeyboardEvent('keydown', { ...press, bubbles: true, cancelable: true }),
        ),
      ),
    [],
  )

  useEffect(
    () =>
      dialer().on('menu:action', (action) => {
        if (action === 'open') void choose()
        else runCommand(action, document.activeElement)
      }),
    [choose],
  )

  useEffect(() => dialer().on('nexus:openRecent', (path) => void openPath(path)), [openPath])

  useEffect(
    () =>
      dialer().on(
        'app:flush',
        () => void flushAllSaves().finally(() => dialer().tell('app:flushed')),
      ),
    [],
  )
}
