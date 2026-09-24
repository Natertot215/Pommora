import { useEffect } from 'react'
import type { ThumbRect } from '@pommora/core/Interface/chrome'
import { pageBody, shownPage, shownViewSearch, useSession } from '../Session/store'
import { navKey } from './navRecents'
import { captured, scopeCaptured } from './thumbMarkers'
import { host } from '../Platform/dialer'
import { chromePartEl, chromePartRect } from '../Interface/chromeParts'

// The sidebar and side pane are floating overlays carved off the pane's edges; the toolbar is NOT carved (the banner is full-bleed under it), so main overpaints just that chrome band.
function contentRect(pane: Element): ThumbRect {
  const p = pane.getBoundingClientRect()
  let { left, right } = p
  const sidebar = chromePartRect('sidebar')
  if (sidebar && sidebar.right > left && sidebar.right < right) left = sidebar.right
  const sidePane = chromePartRect('sidePane')
  if (sidePane && sidePane.left > left && sidePane.left < right) right = sidePane.left
  const toolbar = chromePartRect('toolbar')
  const maskTop = toolbar ? Math.max(0, toolbar.bottom - p.top) : 0
  const maskFill = pane.querySelector('.detail-host:not(.is-parked) .banner-img')
    ? 'banner'
    : 'window'
  return { x: left, y: p.top, width: right - left, height: p.bottom - p.top, maskTop, maskFill }
}

/** Awaits every image in the pane so the shot isn't captured pre-render; a failed load is ignored, not awaited forever. */
async function imagesReady(pane: Element): Promise<void> {
  await Promise.all(
    [...pane.querySelectorAll('img')].map((img) =>
      img.complete ? Promise.resolve() : img.decode().catch(() => undefined),
    ),
  )
}

// Captured only while the NavWindow is closed, so the overlay never bakes into the shot; the delay clears the close animation and debounces rapid navigation.
export function useNavThumbnails(): void {
  const selection = useSession((s) => s.selection)
  const shownStatus = useSession((s) => shownPage(s)?.status)
  const navOpen = useSession((s) => s.navOpen)
  const searching = useSession((s) => shownViewSearch(s) !== undefined)
  const bumpThumb = useSession((s) => s.bumpThumb)

  useEffect(() => {
    if (navOpen || searching || selection.kind === 'none') return
    if (selection.kind === 'page' && shownStatus !== 'ready') return
    let canceled = false
    const timer = setTimeout(() => {
      void (async () => {
        const pane = chromePartEl('contentPane')
        if (!pane || canceled) return
        await document.fonts?.ready
        await imagesReady(pane)
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        )
        if (canceled || useSession.getState().navOpen) return
        const key = navKey(selection)
        // The gate — read at capture time so the marker reflects what the shot will show.
        const s = useSession.getState()
        scopeCaptured(s.tree?.nexus.id ?? null)
        const marker = selection.kind === 'page' ? pageBody(shownPage(s)) : s.tree
        if (captured.get(key) === marker) return
        const res = await host().ask(
          'capture:thumbnail',
          key,
          contentRect(pane),
          window.devicePixelRatio,
        )
        if (!canceled && res.ok) {
          captured.set(key, marker)
          bumpThumb(key)
        }
      })()
    }, 300)
    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [selection, shownStatus, navOpen, searching, bumpThumb])
}
