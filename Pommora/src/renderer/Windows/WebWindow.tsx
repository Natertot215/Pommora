// The in-app browser — back/forward lead the toolbar, the centered title is the link itself (click
// escalates the current page to the system browser), and one webview owns the whole body on the
// shared partition. A summon while open retakes the window in place.
import { useEffect, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { overScrollEllipsis } from '@renderer/Interactions/OverScroll'
import { text } from '@renderer/DesignSystem/Tokens'
import { WindowBase } from './window-base'
import type { WindowBounds } from './window-base'
import { linkDomain } from '@shared/links'
import { WEB_PARTITION } from '@shared/types'
import { useHeldPresence } from '@renderer/Animation/useExitPresence'
import { useSession } from '../store'
import './web-window.css'

const BOUNDS: WindowBounds = { min: { w: 480, h: 360 }, def: { w: 1000, h: 700 } }

/** The direct summon of the floating browser, knob-independent by contract. */
export function openInAppBrowser(url: string): void {
  useSession.getState().openBrowser(url)
}

/** What the guest element answers with once attached — the navigation surface the toolbar drives. */
interface BrowserGuest extends HTMLElement {
  goBack(): void
  goForward(): void
  canGoBack(): boolean
  canGoForward(): boolean
  getURL(): string
  loadURL(url: string): Promise<void>
}

export function WebWindow(): React.JSX.Element | null {
  const summon = useSession((s) => s.browserSummon)
  // An overtake swaps the guest's destination in place; the window never remounts.
  const shown = useHeldPresence(summon)
  if (!shown) return null
  return <WebWindowBody summon={shown.held} closing={shown.closing} />
}

function WebWindowBody({
  summon,
  closing,
}: {
  summon: { url: string; seq: number }
  closing: boolean
}): React.JSX.Element {
  const { url, seq } = summon
  const closeBrowser = useSession((s) => s.closeBrowser)
  const ref = useRef<BrowserGuest | null>(null)
  const [title, setTitle] = useState('')
  const [current, setCurrent] = useState(url)
  const [nav, setNav] = useState({ back: false, forward: false })
  // A retake aims the standing guest at the address — imperatively, because the guest may have
  // navigated away from the very url being re-summoned, which the src attribute reads as
  // unchanged.
  const applied = useRef(seq)
  useEffect(() => {
    setTitle('')
    setCurrent(url)
    if (applied.current === seq) return
    applied.current = seq
    const wv = ref.current
    try {
      if (wv && wv.getURL() !== url) void wv.loadURL(url)
    } catch {
      // A pre-attach guest answers no navigation calls; src still owns its first aim.
    }
  }, [url, seq])

  useEffect(() => {
    const wv = ref.current
    if (!wv) return
    const onTitle = (e: Event): void => setTitle((e as Event & { title?: string }).title ?? '')
    // Event-driven, never polled: every commit (page loads, pushState hops, back/forward) lands
    // one of these, and the toolbar re-reads the guest's truth there.
    const onNavigate = (): void => {
      setCurrent(wv.getURL())
      setNav({ back: wv.canGoBack(), forward: wv.canGoForward() })
    }
    wv.addEventListener('page-title-updated', onTitle)
    wv.addEventListener('did-navigate', onNavigate)
    wv.addEventListener('did-navigate-in-page', onNavigate)
    return () => {
      wv.removeEventListener('page-title-updated', onTitle)
      wv.removeEventListener('did-navigate', onNavigate)
      wv.removeEventListener('did-navigate-in-page', onNavigate)
    }
  }, [])

  return (
    <WindowBase
      id="web-browser"
      className="wbrowser"
      closing={closing}
      onClose={closeBrowser}
      bounds={BOUNDS}
      ariaLabel="Browser"
      lead={
        <>
          <Button
            size="button-inline"
            icon="chevron-left"
            iconSize="body"
            title="Back"
            disabled={!nav.back}
            onClick={() => ref.current?.goBack()}
          />
          <Button
            size="button-inline"
            icon="chevron-right"
            iconSize="body"
            title="Forward"
            disabled={!nav.forward}
            onClick={() => ref.current?.goForward()}
          />
        </>
      }
      title={
        <button
          type="button"
          className={cx('window-toolbar-title', 'wbrowser-title', text.footnote.standard)}
          title="Open in system browser"
          onClick={() => void window.nexus.openExternal(current)}
        >
          <span className="wbrowser-title-domain">{linkDomain(current)}</span>
          {title ? (
            <span className={cx('wbrowser-title-page', overScrollEllipsis)}>{title}</span>
          ) : null}
        </button>
      }
    >
      <div className="wbrowser-body">
        <webview
          ref={(el) => {
            ref.current = el as BrowserGuest | null
          }}
          src={url}
          partition={WEB_PARTITION}
          // The empty-string form, cast past React's boolean typing — see WebTile.
          allowpopups={'' as unknown as boolean}
        />
      </div>
    </WindowBase>
  )
}
