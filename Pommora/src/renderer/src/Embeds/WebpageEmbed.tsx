// The webpage tile's payload: a live site while the tile is fully visible in its scrollport,
// static faces otherwise — the spike's law is that a guest clips correctly only at full
// visibility, so visibility management IS the rendering model, not an optimization. A guest
// scrolled out keeps its state by hiding rather than unmounting, under the retention cap. The
// component is editor-agnostic: visibility and the outside-click seam arrive as props and nothing
// here imports CodeMirror, so a future dashboard host mounts it unchanged.
import { useEffect, useRef, useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import { linkDomain } from '@shared/links'
import { DEFAULT_LINK_DISPLAY } from '@shared/properties'
import { WEB_PARTITION } from '@shared/types'
import { webpageTileTitle } from '@shared/webpageEmbed'
import { TextPicker } from '@renderer/design-system/components/TextPicker'
import { useSession } from '../store'
import { webGuestRetention } from './webRetention'
import './embeds.css'

/** The live half of the resolution: the store's format and cache, arming the shared fetch in Page
 *  Title mode exactly as a cell does (in-flight dedupe and the never-store-empty rule are the
 *  cache's own). */
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

/** A host's outside-pointerdown seam: subscribes a listener to the surface's pointerdowns and
 *  returns the unsubscribe. Injected so the component owns engagement while the host owns where
 *  outside events come from — a dashboard host passes its own. Guest-internal clicks never reach
 *  the host document, so engagement can only end from the host's side, which is the point. */
export type PointerSeam = (onDown: (target: EventTarget | null) => void) => () => void

export function WebpageEmbed({
  url,
  label = '',
  visible,
  engageSeam,
  refocusHost,
  linkEdit = false,
  onLinkCommit,
  onLinkDismiss,
  partition = WEB_PARTITION,
}: {
  url: string
  /** The on-disk hand label; empty resolves through the display format. */
  label?: string
  /** Fully visible in the owning scrollport — the host's observer decides; the guest is live
   *  only while this holds, and retained hidden (under the cap) while it doesn't. */
  visible: boolean
  /** Outside pointerdowns, for click-out disengagement. */
  engageSeam?: PointerSeam
  /** Where focus returns when a clip transition disengages a guest that held it. */
  refocusHost?: () => void
  /** The Edit Link picker is open on this tile — anchored here, seeded with the URL. */
  linkEdit?: boolean
  onLinkCommit?: (next: string) => void
  onLinkDismiss?: () => void
  partition?: string
}): React.JSX.Element {
  const title = useWebpageTitle(label, url)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [engaged, setEngaged] = useState(false)
  // The guest exists: live while visible, retained hidden otherwise. Eviction clears it — the
  // tile falls back to the loading face and reloads fresh on re-visibility.
  const [guest, setGuest] = useState(visible)
  const ref = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const guestRef = useRef(guest)
  guestRef.current = guest
  const idRef = useRef<symbol | null>(null)
  if (idRef.current === null) idRef.current = Symbol('webguest')
  const id = idRef.current

  // A different site: the old guest's state, load, and engagement all described another page.
  useEffect(() => {
    setFailed(false)
    setLoaded(false)
    setEngaged(false)
  }, [url])

  // An evicted or torn-down guest must load again before the catcher hands it interaction.
  useEffect(() => {
    if (!guest) setLoaded(false)
  }, [guest])

  useEffect(() => {
    if (visible) {
      webGuestRetention.show(id)
      setGuest(true)
      return
    }
    // The clip transition: disengage, hand focus back if the guest held it, clear any failure so
    // re-entry retries, and retain the hidden guest under the cap.
    setEngaged(false)
    const el = ref.current
    if (el && document.activeElement === el) {
      el.blur()
      refocusHost?.()
    }
    setFailed(false)
    if (guestRef.current) webGuestRetention.hide(id, () => setGuest(false))
  }, [visible, id, refocusHost])

  useEffect(() => () => webGuestRetention.drop(id), [id])

  useEffect(() => {
    if (!engaged || !engageSeam) return
    return engageSeam((target) => {
      if (target instanceof Node && rootRef.current?.contains(target)) return
      setEngaged(false)
    })
  }, [engaged, engageSeam])

  useEffect(() => {
    const wv = ref.current
    if (!wv) return
    const onFail = (e: Event): void => {
      // Subframe failures are the site's own business; -3 is the abort every redirect fires.
      const d = e as Event & { isMainFrame?: boolean; errorCode?: number }
      if (d.isMainFrame !== false && d.errorCode !== -3) setFailed(true)
    }
    const onGone = (): void => setFailed(true)
    const onLoad = (): void => {
      setFailed(false)
      setLoaded(true)
    }
    wv.addEventListener('did-fail-load', onFail)
    wv.addEventListener('render-process-gone', onGone)
    wv.addEventListener('did-finish-load', onLoad)
    return () => {
      wv.removeEventListener('did-fail-load', onFail)
      wv.removeEventListener('render-process-gone', onGone)
      wv.removeEventListener('did-finish-load', onLoad)
    }
  })

  const live = guest && !failed
  // The guest is on screen rather than retained behind the face.
  const shown = live && visible
  return (
    <div className="wpembed" ref={rootRef}>
      {live ? (
        <webview
          ref={(el) => {
            ref.current = el as HTMLElement | null
          }}
          src={url}
          partition={partition}
          allowpopups
          className={cx(!visible && 'is-retained', !engaged && 'is-inert')}
        />
      ) : null}
      {!shown ? (
        <div className="wpembed-face">
          {failed ? (
            <span className={cx('wpembed-face-domain', text.footnote.standard)}>
              {linkDomain(url)}
            </span>
          ) : null}
        </div>
      ) : null}
      {shown && !engaged ? (
        // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a click-to-engage shield over the guest, not a control — the site behind it carries its own semantics
        <div
          className="wpembed-catcher"
          onClick={() => {
            // Mid-load, the catcher stays: interaction is handed over only to a settled guest.
            if (loaded) setEngaged(true)
          }}
        />
      ) : null}
      <button
        type="button"
        className={cx('wpembed-title', text.footnote.standard)}
        // The system browser is the resting route; the open-in preference takes this over when it
        // lands, through the shared adjudicator.
        onClick={() => void window.nexus.openExternal(url)}
      >
        {title}
      </button>
      {onLinkCommit && onLinkDismiss ? (
        <TextPicker
          open={linkEdit}
          onDismiss={onLinkDismiss}
          triggerRef={rootRef}
          value={url}
          onCommit={onLinkCommit}
        />
      ) : null}
    </div>
  )
}
