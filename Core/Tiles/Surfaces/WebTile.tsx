// A guest clips correctly only at full visibility, so it stays live while fully visible and hidden (not unmounted) under the retention cap otherwise.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { text } from '@pommora/uix/Theme'
import { linkDomain } from '../../Paths/urlPath'
import { linkDisplayText } from '../../Connections/linkValue'
import { WebGuest, type WebGuestHandle } from '../../Web/WebGuest'
import { useDismissal } from '@pommora/uix/Interactions/dismissalStack'
import { useSession, useSetting } from '../../Session/store'
import { openWebLink } from '../../Web/openWebLink'
import { webGuestRetention } from './webRetention'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import '../tile-base.css'
import '../tile-title.css'

const CAPTURE_DEADLINE_MS = 200

function useWebpageTitle(label: string, url: string): string {
  const display = useSetting('defaultLinkFormat')
  const title = useSession((s) => s.linkTitles[url])
  const resolveLinkTitle = useSession((s) => s.resolveLinkTitle)
  const wantsTitle = label === '' && display === 'link-title'
  useEffect(() => {
    if (wantsTitle && !title) resolveLinkTitle(url)
  }, [wantsTitle, title, url, resolveLinkTitle])
  return label !== '' ? label : linkDisplayText(url, display, title)
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
  const pauseOnTabSwitch = useSetting('pauseMediaOnTabSwitch')
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [engaged, setEngaged] = useState(false)
  const [guest, setGuest] = useState(visible)
  const [snap, setSnap] = useState<string | null>(null)
  const [parting, setParting] = useState(false)
  const siteRef = useRef<WebGuestHandle | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const guestRef = useLatest(guest)
  const visibleRef = useLatest(visible)
  const refocusRef = useLatest(refocusHost)
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

  // Layout effect, not passive: `parting` must hold the guest painted before the retained class reaches the compositor, or a hidden guest captures an empty frame.
  useLayoutEffect(() => {
    if (visible) {
      webGuestRetention.show(id)
      setGuest(true)
      setFailed(false)
      return
    }
    setEngaged(false)
    const site = siteRef.current
    if (site?.blur()) refocusRef.current?.()
    if (!guestRef.current) return
    const retain = (): void => {
      setParting(false)
      if (!visibleRef.current && guestRef.current) webGuestRetention.hide(id, () => setGuest(false))
    }
    if (!site) {
      retain()
      return
    }
    setParting(true)
    let settled = false
    const settle = (dataUrl: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      if (dataUrl) setSnap(dataUrl)
      retain()
    }
    const deadline = setTimeout(() => settle(null), CAPTURE_DEADLINE_MS)
    void site.capture().then(settle)
    // A settle landing after unmount/re-entry would re-insert this guest's freed id as a dead slot.
    return () => {
      settled = true
      clearTimeout(deadline)
      setParting(false)
    }
  }, [visible, id])

  useEffect(() => () => webGuestRetention.show(id), [id])

  // Only ever pauses, never plays — returning to the tab leaves media where the pause left it.
  useEffect(() => {
    if (tabInactive && pauseOnTabSwitch && loaded) siteRef.current?.pauseMedia()
  }, [tabInactive, pauseOnTabSwitch, loaded])

  useDismissal(engaged, false, {
    layer: () => rootRef.current,
    dismiss: () => setEngaged(false),
  })

  const live = guest && !failed
  const onScreen = visible || parting
  const shown = live && onScreen
  return (
    <div className="web-tile" ref={rootRef}>
      {live ? (
        <WebGuest
          ref={siteRef}
          src={url}
          popups
          zoom={zoom}
          className={cx(!onScreen && 'is-retained', !engaged && 'is-inert')}
          onLoad={() => {
            setFailed(false)
            setLoaded(true)
          }}
          onFail={() => {
            setFailed(true)
            setGuest(false)
            webGuestRetention.show(id)
          }}
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
        className={cx('web-tile-title', revealTarget, text.footnote.standard, overScrollEllipsis)}
        onClick={() => openWebLink(url)}
      >
        {title}
      </button>
    </div>
  )
}
