// The webpage tile's payload: a live site while the tile is fully visible in its scrollport,
// static faces otherwise — the spike's law is that a guest clips correctly only at full
// visibility, so visibility management IS the rendering model, not an optimization. A guest
// scrolled out keeps its state by hiding rather than unmounting, under the retention cap. The
// component is editor-agnostic: visibility and the outside-click seam arrive as props and nothing
// here imports CodeMirror, so a future dashboard host mounts it unchanged.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import { linkDomain } from '@shared/links'
import { DEFAULT_LINK_DISPLAY } from '@shared/properties'
import { WEB_PARTITION } from '@shared/types'
import { webpageTileTitle } from '@shared/webpageEmbed'
import { TextPicker } from '@renderer/design-system/components/TextPicker'
import { useDismiss } from '@renderer/design-system/components/useDismiss'
import { useSession } from '../store'
import { openWebLink } from '../openWebLink'
import { webGuestRetention } from './webRetention'
import './embeds.css'

/** What the guest element answers with once attached — the parting frame's only surface. */
type CapturableGuest = HTMLElement & { capturePage?: () => Promise<{ toDataURL(): string }> }

// How long a capture may hang before the clip proceeds without a frame.
const CAPTURE_DEADLINE_MS = 200

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

export function WebpageEmbed({
  url,
  label = '',
  visible,
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
  // The guest exists: live while visible, retained hidden otherwise. Eviction and failure clear
  // it — the tile falls back to a face and mounts a fresh guest on its next visibility entry.
  const [guest, setGuest] = useState(visible)
  // The guest's last frame, painted on the face so a clipped tile reads as a paused page rather
  // than a blank. `parting` holds the guest on screen for the capture — the exit fires at a
  // near-imperceptible clip, and a hidden guest can no longer be captured.
  const [snap, setSnap] = useState<string | null>(null)
  const [parting, setParting] = useState(false)
  const ref = useRef<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const guestRef = useRef(guest)
  guestRef.current = guest
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  // Held in a ref so the visibility effect never re-runs on the host's render churn — a re-run
  // of the hidden branch would re-stamp this guest's retention recency for no reason.
  const refocusRef = useRef(refocusHost)
  refocusRef.current = refocusHost
  const id = useRef(Symbol('webguest')).current

  // A different site: the old guest's state, load, engagement, and frame all described another page.
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

  // Layout effect, not passive: `parting` must hold the guest painted BEFORE the retained class
  // reaches the compositor — a hidden guest captures an empty frame.
  useLayoutEffect(() => {
    if (visible) {
      // Entry clears any standing failure, so the retry always happens in front of the user —
      // never as an invisible load behind a hidden tile.
      webGuestRetention.show(id)
      setGuest(true)
      setFailed(false)
      return
    }
    // The clip transition: disengage, hand focus back if the guest held it, capture the parting
    // frame, and retain the hidden guest under the cap.
    setEngaged(false)
    const el = ref.current as CapturableGuest | null
    if (el && document.activeElement === el) {
      el.blur()
      refocusRef.current?.()
    }
    if (!guestRef.current) return
    const retain = (): void => {
      setParting(false)
      // A re-entry mid-capture means the guest never went hidden — nothing to retain.
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
    // The deadline arms first, and the call sits in a try: a pre-attach guest's capturePage
    // throws synchronously (the method exists on the prototype before the guest does), and the
    // clip must still complete without a frame.
    deadline = setTimeout(() => settle(null), CAPTURE_DEADLINE_MS)
    try {
      el.capturePage().then(
        (img) => settle(img.toDataURL()),
        () => settle(null),
      )
    } catch {
      settle(null)
    }
    // Unmount or re-entry cancels the pending capture — a settle landing after the drop would
    // re-insert this guest's freed id into retention as a dead slot.
    return () => {
      settled = true
      clearTimeout(deadline)
      setParting(false)
    }
  }, [visible, id])

  useEffect(() => () => webGuestRetention.drop(id), [id])

  // Click-out (and Escape) end engagement; the shared hook also shields the open Edit Link
  // picker, whose portal renders outside this tree. Guest-internal clicks never reach the host
  // document, so engagement can only end from the host's side — which is the point.
  useDismiss(rootRef, () => setEngaged(false), engaged)

  useEffect(() => {
    const wv = ref.current
    if (!wv) return
    // A failure tears the guest down whole: it holds no state worth retaining, so it never
    // occupies a retention slot, and the failed face stands until the next visibility entry
    // mounts a fresh guest to retry.
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
  // The guest is on screen rather than retained behind the face; a parting guest stays painted
  // until its frame is captured.
  const onScreen = visible || parting
  const shown = live && onScreen
  return (
    <div className="wpembed" ref={rootRef}>
      {live ? (
        <webview
          ref={(el) => {
            ref.current = el as HTMLElement | null
          }}
          src={url}
          partition={partition}
          // The empty-string form, cast past React's boolean typing: React only serializes
          // string values for attributes it doesn't know, so a bare boolean never reaches the
          // attach — and popups then die inside Blink.
          allowpopups={'' as unknown as boolean}
          className={cx(!onScreen && 'is-retained', !engaged && 'is-inert')}
        />
      ) : null}
      {!shown ? (
        <div className="wpembed-face">
          {failed ? (
            <span className={cx('wpembed-face-domain', text.footnote.standard)}>
              {linkDomain(url)}
            </span>
          ) : snap ? (
            <img className="wpembed-face-snap" src={snap} alt="" />
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
        onClick={() => openWebLink(url)}
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
