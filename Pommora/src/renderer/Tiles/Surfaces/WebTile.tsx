// A guest clips correctly only at full visibility, so it stays live while fully visible and
// hidden (not unmounted) under the retention cap otherwise.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { overScrollEllipsis } from '@renderer/Interactions/OverScroll'
import { text } from '@renderer/DesignSystem/Tokens'
import { linkDomain } from '@shared/links'
import { DEFAULT_LINK_DISPLAY } from '@shared/properties'
import { WEB_PARTITION } from '@shared/types'
import { webpageTileTitle } from '@shared/webpageEmbed'
import { useDismissal } from '@renderer/Interactions/dismissalStack'
import { useSession } from '@renderer/store'
import { openWebLink } from '@renderer/Actions/openWebLink'
import { webGuestRetention } from './webRetention'
import '../tile-base.css'
import '../tile-title.css'

type Guest = HTMLElement & {
  capturePage?: () => Promise<{ toDataURL(): string }>
  getWebContentsId?: () => number
}

const CAPTURE_DEADLINE_MS = 200

function useWebpageTitle(label: string, url: string): string {
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
  tabInactive = false,
  zoom = 1,
  refocusHost,
}: {
  url: string
  label?: string
  visible: boolean
  tabInactive?: boolean
  zoom?: number
  refocusHost?: () => void
}): React.JSX.Element {
  const title = useWebpageTitle(label, url)
  const pauseOnTabSwitch = useSession((s) => s.personalization.pauseMediaOnTabSwitch !== false)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [engaged, setEngaged] = useState(false)
  const [guest, setGuest] = useState(visible)
  const [snap, setSnap] = useState<string | null>(null)
  const [parting, setParting] = useState(false)
  const ref = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const guestRef = useRef(guest)
  guestRef.current = guest
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const refocusRef = useRef(refocusHost)
  refocusRef.current = refocusHost
  const id = useRef(Symbol('webguest')).current

  useEffect(() => {
    setFailed(false)
    setLoaded(false)
    setEngaged(false)
    setSnap(null)
  }, [url])

  useEffect(() => {
    if (!guest) setLoaded(false)
  }, [guest])

  // Layout effect, not passive: `parting` must hold the guest painted before the retained class
  // reaches the compositor, or a hidden guest captures an empty frame.
  useLayoutEffect(() => {
    if (visible) {
      webGuestRetention.show(id)
      setGuest(true)
      setFailed(false)
      return
    }
    setEngaged(false)
    const el = ref.current as Guest | null
    if (el && document.activeElement === el) {
      el.blur()
      refocusRef.current?.()
    }
    if (!guestRef.current) return
    const retain = (): void => {
      setParting(false)
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
    const wv = ref.current as Guest | null
    if (!wv?.getWebContentsId || !loaded) return
    try {
      void window.nexus.webGuestZoom.set(wv.getWebContentsId(), zoom)
    } catch {}
  }, [zoom, loaded])

  // Only ever pauses, never plays — returning to the tab leaves media where the pause left it.
  useEffect(() => {
    if (!tabInactive || !pauseOnTabSwitch) return
    const wv = ref.current as Guest | null
    if (!wv?.getWebContentsId || !loaded) return
    try {
      void window.nexus.webGuestMedia.pause(wv.getWebContentsId())
    } catch {}
  }, [tabInactive, pauseOnTabSwitch, loaded])

  useDismissal(engaged, false, {
    layer: () => rootRef.current,
    dismiss: () => setEngaged(false),
  })

  useEffect(() => {
    const wv = ref.current
    if (!wv) return
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
