// A guest clips correctly only at full visibility, so visibility management IS the rendering
// model, not an optimization: live while fully visible, hidden (not unmounted) under the
// retention cap otherwise. Editor-agnostic — nothing here imports CodeMirror.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { overScrollEllipsis } from '@renderer/DesignSystem/Interactions/OverScroll'
import { text } from '@renderer/DesignSystem/Tokens'
import { linkDomain } from '@shared/links'
import { DEFAULT_LINK_DISPLAY } from '@shared/properties'
import { WEB_PARTITION } from '@shared/types'
import { webpageTileTitle } from '@shared/webpageEmbed'
import { useDismiss } from '@renderer/DesignSystem/Interactions/useDismiss'
import { useSession } from '../store'
import { openWebLink } from '../Links/openWebLink'
import { webGuestRetention } from './WebRetention'
import './block-tile-base.css'
import '@renderer/SurfacePM/block-title.css'

/** What the guest element answers with once attached — the parting frame's only surface. */
type CapturableGuest = HTMLElement & { capturePage?: () => Promise<{ toDataURL(): string }> }

// How long a capture may hang before the clip proceeds without a frame.
const CAPTURE_DEADLINE_MS = 200

/** Resolves through the store's format and cache, arming the shared fetch in Page Title mode
 *  exactly as a cell does. */
export function useWebpageTitle(label: string, url: string): string {
  const display = useSession((s) => s.personalization.defaultLinkFormat ?? DEFAULT_LINK_DISPLAY)
  const title = useSession((s) => s.linkTitles[url])
  const resolveLinkTitle = useSession((s) => s.resolveLinkTitle)
  const wantsTitle = label === '' && display === 'link-title'
  useEffect(() => {
    if (wantsTitle && !title) resolveLinkTitle(url)
  }, [wantsTitle, title, url, resolveLinkTitle])
  return webpageTileTitle(label, url, display, title)
}

export function WebTile({
  url,
  label = '',
  visible,
  zoom = 1,
  refocusHost,
}: {
  url: string
  /** The on-disk hand label; empty resolves through the display format. */
  label?: string
  /** Fully visible in the owning scrollport, per the host's observer. */
  visible: boolean
  /** The tile's Scale factor, joining the host-zoom × Webpage Zoom derivation main stamps. */
  zoom?: number
  /** Where focus returns when a clip transition disengages a guest that held it. */
  refocusHost?: () => void
}): React.JSX.Element {
  const title = useWebpageTitle(label, url)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [engaged, setEngaged] = useState(false)
  // Eviction and failure clear the guest — the tile falls back to a face and mounts a fresh
  // guest on its next visibility entry.
  const [guest, setGuest] = useState(visible)
  // The guest's last frame, painted on the face so a clipped tile reads as a paused page rather
  // than a blank; `parting` holds the guest on screen long enough to capture it.
  const [snap, setSnap] = useState<string | null>(null)
  const [parting, setParting] = useState(false)
  const ref = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const guestRef = useRef(guest)
  guestRef.current = guest
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  // A ref so the visibility effect never re-runs on the host's render churn.
  const refocusRef = useRef(refocusHost)
  refocusRef.current = refocusHost
  const id = useRef(Symbol('webguest')).current

  // A different site invalidates the old guest's state, load, engagement, and frame.
  useEffect(() => {
    setFailed(false)
    setLoaded(false)
    setEngaged(false)
    setSnap(null)
  }, [url])

  // An evicted or torn-down guest must load again before the catcher hands it interaction.
  useEffect(() => {
    if (!guest) setLoaded(false)
  }, [guest])

  // Layout effect, not passive: `parting` must hold the guest painted before the retained class
  // reaches the compositor, or a hidden guest captures an empty frame.
  useLayoutEffect(() => {
    if (visible) {
      // A retry always happens in front of the user, never as an invisible load behind a hidden tile.
      webGuestRetention.show(id)
      setGuest(true)
      setFailed(false)
      return
    }
    setEngaged(false)
    const el = ref.current as CapturableGuest | null
    if (el && document.activeElement === el) {
      el.blur()
      refocusRef.current?.()
    }
    if (!guestRef.current) return
    const retain = (): void => {
      setParting(false)
      // A re-entry mid-capture leaves nothing to retain.
      if (!visibleRef.current && guestRef.current) webGuestRetention.hide(id, () => setGuest(false))
    }
    if (!el?.capturePage) {
      retain()
      return
    }
    setParting(true)
    let settled = false
    let deadline: ReturnType<typeof setTimeout> | undefined
    const settle = (dataUrl: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      if (dataUrl) setSnap(dataUrl)
      retain()
    }
    // The call sits in a try: a pre-attach guest's capturePage throws synchronously (the method
    // exists on the prototype before the guest does), and the clip must still complete without a frame.
    deadline = setTimeout(() => settle(null), CAPTURE_DEADLINE_MS)
    try {
      el.capturePage().then(
        (img) => settle(img.toDataURL()),
        () => settle(null),
      )
    } catch {
      settle(null)
    }
    // A settle landing after unmount/re-entry would re-insert this guest's freed id as a dead slot.
    return () => {
      settled = true
      clearTimeout(deadline)
      setParting(false)
    }
  }, [visible, id])

  useEffect(() => () => webGuestRetention.drop(id), [id])

  // Sent once the guest is attached (the id read throws before that), and re-sent on Scale change
  // or remount; 1.0 must still be sent — it clears a previous factor's map entry.
  useEffect(() => {
    const wv = ref.current as (HTMLElement & { getWebContentsId?: () => number }) | null
    if (!wv?.getWebContentsId || !loaded) return
    try {
      void window.nexus.webGuestZoom.set(wv.getWebContentsId(), zoom)
    } catch {
      // A guest torn down between render and effect has no id to stamp — the next mount re-sends.
    }
  }, [zoom, loaded])

  // The shared hook also shields the open Edit Link picker, whose portal renders outside this tree.
  useDismiss(rootRef, () => setEngaged(false), engaged)

  useEffect(() => {
    const wv = ref.current
    if (!wv) return
    // A failure tears the guest down whole — it never occupies a retention slot, and the failed
    // face stands until the next visibility entry retries.
    const fail = (): void => {
      setFailed(true)
      setGuest(false)
      webGuestRetention.drop(id)
    }
    const onFail = (e: Event): void => {
      // Subframe failures are the site's own business; -3 is the abort every redirect fires.
      const d = e as Event & { isMainFrame?: boolean; errorCode?: number }
      if (d.isMainFrame !== false && d.errorCode !== -3) fail()
    }
    const onLoad = (): void => {
      setFailed(false)
      setLoaded(true)
    }
    wv.addEventListener('did-fail-load', onFail)
    wv.addEventListener('render-process-gone', fail)
    wv.addEventListener('did-finish-load', onLoad)
    return () => {
      wv.removeEventListener('did-fail-load', onFail)
      wv.removeEventListener('render-process-gone', fail)
      wv.removeEventListener('did-finish-load', onLoad)
    }
  })

  const live = guest && !failed
  const onScreen = visible || parting
  const shown = live && onScreen
  return (
    <div className="web-tile" ref={rootRef}>
      {live ? (
        <webview
          ref={(el) => {
            ref.current = el as HTMLElement | null
          }}
          src={url}
          partition={WEB_PARTITION}
          // The empty-string form, cast past React's boolean typing: React only serializes
          // string values for attributes it doesn't know, so a bare boolean never reaches the
          // attach — and popups then die inside Blink.
          allowpopups={'' as unknown as boolean}
          className={cx(!onScreen && 'is-retained', !engaged && 'is-inert')}
        />
      ) : null}
      {!shown ? (
        <div className="web-tile-face">
          {failed ? (
            <span className={cx('web-tile-face-domain', text.footnote.standard)}>
              {linkDomain(url)}
            </span>
          ) : snap ? (
            <img className="web-tile-face-snap" src={snap} alt="" />
          ) : null}
        </div>
      ) : null}
      {shown && !engaged ? (
        // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a click-to-engage shield over the guest, not a control — the site behind it carries its own semantics
        <div
          className="web-tile-catcher"
          onClick={() => {
            // Mid-load, the catcher stays: interaction is handed over only to a settled guest.
            if (loaded) setEngaged(true)
          }}
        />
      ) : null}
      <button
        type="button"
        className={cx('web-tile-title', text.footnote.standard, overScrollEllipsis)}
        onClick={() => openWebLink(url)}
      >
        {title}
      </button>
    </div>
  )
}
