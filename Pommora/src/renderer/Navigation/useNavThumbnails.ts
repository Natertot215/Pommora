import { useEffect } from 'react'
import type { ThumbRect } from '@shared/types'
import { pageBody, shownPage, useSession } from '../store'
import { navKey } from './navRecents'
import { captured, scopeCaptured } from './thumbMarkers'

// The `.content-pane` fills the whole window; the sidebar, toolbar, and inspector are floating overlays
// on top of it. Carve off the sidebar (start right of it) and the inspector (end left of it), each skipped
// when parked off-screen. The toolbar is NOT carved — the banner is full-bleed and runs up under it — so the
// band stays in the shot and main overpaints just the chrome band (maskTop): over a banner it's back-filled
// from the banner just below (maskFill 'banner'); bannerless, that strip is empty (maskFill 'window'). Each
// overlay edge is clamped inside the pane.
function contentRect(pane: Element): ThumbRect {
  const p = pane.getBoundingClientRect()
  let { left, right } = p
  const sidebar = document.querySelector('.surface-glass')?.getBoundingClientRect()
  if (sidebar && sidebar.right > left && sidebar.right < right) left = sidebar.right
  const inspector = document.querySelector('.inspector-glass')?.getBoundingClientRect()
  if (inspector && inspector.left > left && inspector.left < right) right = inspector.left
  const toolbar = document.querySelector('.app-toolbar')?.getBoundingClientRect()
  const maskTop = toolbar ? Math.max(0, toolbar.bottom - p.top) : 0
  const maskFill = pane.querySelector('.banner-img') ? 'banner' : 'window'
  return { x: left, y: p.top, width: right - left, height: p.bottom - p.top, maskTop, maskFill }
}

/** Await every image in the pane finishing load (the banner especially) so the shot isn't captured
 *  pre-render. Already-complete images resolve instantly; a failed load is ignored, not awaited forever. */
async function imagesReady(pane: Element): Promise<void> {
  await Promise.all(
    [...pane.querySelectorAll('img')].map((img) =>
      img.complete ? Promise.resolve() : img.decode().catch(() => undefined),
    ),
  )
}

// Snapshot the detail view as a gallery thumbnail — captured ONLY while the NavWindow is closed, so the
// overlay never bakes into the (synced) shot. Runs on selection settle AND on the pane closing (navOpen
// is a dep), so a page opened while browsing with the pane open gets its cover the moment the pane
// closes. Waits for fonts + all images (the banner) so the banner has rendered first; a short delay
// clears the pane's close animation and debounces rapid navigation. Only the detail rect (contentRect
// carves off the sidebar/inspector overlays) is captured.
export function useNavThumbnails(): void {
  const selection = useSession((s) => s.selection)
  const shownStatus = useSession((s) => shownPage(s)?.status)
  const navOpen = useSession((s) => s.navOpen)
  const bumpThumb = useSession((s) => s.bumpThumb)

  useEffect(() => {
    if (navOpen || selection.kind === 'none') return
    if (selection.kind === 'page' && shownStatus !== 'ready') return
    let canceled = false
    const timer = setTimeout(() => {
      void (async () => {
        const pane = document.querySelector('.content-pane')
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
        const res = await window.nexus.capture.thumbnail(
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
  }, [selection, shownStatus, navOpen, bumpThumb])
}
