// The one element every web surface renders a site through, and the only Core file that touches Electron's guest element.
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { dialer } from '../Platform/dialer'
import { WEB_GUEST_CLASS, WEB_PARTITION } from './guest'
import './web-guest.css'

interface ElectronGuest extends HTMLElement {
  getWebContentsId(): number
  getURL(): string
  loadURL(url: string): Promise<void>
  goBack(): void
  goForward(): void
  canGoBack(): boolean
  canGoForward(): boolean
  capturePage(): Promise<{ toDataURL(): string }>
}

export interface WebNavigation {
  url: string
  back: boolean
  forward: boolean
}

export interface WebGuestHandle {
  load(url: string): void
  /** Empty before the guest attaches. */
  url(): string
  back(): void
  forward(): void
  /** The guest's current frame as a data URL, or null when it has none to give. */
  capture(): Promise<string | null>
  pauseMedia(): void
  /** DOM wheel deltas at a point in the guest's own box. */
  wheel(x: number, y: number, deltaX: number, deltaY: number): void
  /** Releases focus the guest holds, answering whether it held it. */
  blur(): boolean
}

interface WebGuestProps {
  src: string
  popups?: boolean
  /** The guest's own factor atop the host's, applied from attach on; 1 clears a previous one. */
  zoom?: number
  className?: string
  ref?: Ref<WebGuestHandle>
  onLoad?: () => void
  /** A main-frame load failure other than a redirect's abort, or the page's process ending. */
  onFail?: () => void
  onNavigate?: (nav: WebNavigation) => void
  onTitle?: (title: string) => void
}

// Subframe failures are the site's own business; this is the abort every redirect fires.
const REDIRECT_ABORT = -3

// A pre-attach guest answers no calls: its methods sit on the prototype, and throw, until it attaches.
function attached<T>(g: ElectronGuest | null, fn: (g: ElectronGuest) => T, orElse: T): T {
  if (!g) return orElse
  try {
    return fn(g)
  } catch {
    return orElse
  }
}

export function WebGuest({
  src,
  popups = false,
  zoom,
  className,
  ref,
  ...events
}: WebGuestProps): React.JSX.Element {
  const el = useRef<ElectronGuest | null>(null)
  const on = useLatest(events)
  const zoomNow = useLatest(zoom)

  const stampZoom = (): void => {
    const factor = zoomNow.current
    if (factor === undefined) return
    attached(
      el.current,
      (g) => void dialer().ask('webGuestZoom:set', g.getWebContentsId(), factor),
      undefined,
    )
  }

  useEffect(stampZoom, [zoom])

  useImperativeHandle(ref, () => {
    const call = <T,>(fn: (g: ElectronGuest) => T, orElse: T): T => attached(el.current, fn, orElse)
    return {
      load: (url) => call((g) => void g.loadURL(url).catch(() => {}), undefined),
      url: () => call((g) => g.getURL(), ''),
      back: () => call((g) => g.goBack(), undefined),
      forward: () => call((g) => g.goForward(), undefined),
      capture: () =>
        call(
          (g) =>
            g.capturePage().then(
              (img) => img.toDataURL(),
              () => null,
            ),
          Promise.resolve(null),
        ),
      pauseMedia: () =>
        call((g) => void dialer().ask('webGuestMedia:pause', g.getWebContentsId()), undefined),
      // The input event's sign is inverted from the DOM's: a DOM delta counts the content's travel, the input event the wheel's.
      wheel: (x, y, deltaX, deltaY) =>
        call(
          (g) =>
            dialer().tell(
              'web:wheel',
              g.getWebContentsId(),
              Math.round(x),
              Math.round(y),
              -deltaX,
              -deltaY,
            ),
          undefined,
        ),
      blur: () =>
        call((g) => {
          if (document.activeElement !== g) return false
          g.blur()
          return true
        }, false),
    }
  }, [])

  useEffect(() => {
    const g = el.current
    if (!g) return
    const load = (): void => on.current.onLoad?.()
    const fail = (): void => on.current.onFail?.()
    const failLoad = (e: Event): void => {
      const d = e as Event & { isMainFrame?: boolean; errorCode?: number }
      if (d.isMainFrame !== false && d.errorCode !== REDIRECT_ABORT) fail()
    }
    // Event-driven, never polled: every commit (page loads, pushState hops, back/forward) lands one of these.
    const navigate = (): void =>
      on.current.onNavigate?.({ url: g.getURL(), back: g.canGoBack(), forward: g.canGoForward() })
    const title = (e: Event): void =>
      on.current.onTitle?.((e as Event & { title?: string }).title ?? '')
    const listeners: [string, (e: Event) => void][] = [
      ['did-attach', stampZoom],
      ['did-finish-load', load],
      ['did-fail-load', failLoad],
      ['render-process-gone', fail],
      ['did-navigate', navigate],
      ['did-navigate-in-page', navigate],
      ['page-title-updated', title],
    ]
    for (const [type, fn] of listeners) g.addEventListener(type, fn)
    return () => {
      for (const [type, fn] of listeners) g.removeEventListener(type, fn)
    }
  }, [])

  return (
    <webview
      ref={(node) => {
        el.current = node as ElectronGuest | null
      }}
      src={src}
      partition={WEB_PARTITION}
      // React only serializes string values for attributes it doesn't know, so a bare boolean never reaches the attach, and popups then die inside Blink.
      allowpopups={popups ? ('' as unknown as boolean) : undefined}
      className={cx(WEB_GUEST_CLASS, className)}
    />
  )
}
