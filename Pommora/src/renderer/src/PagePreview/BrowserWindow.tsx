// The in-app browser — the floating window's browser flavor: back/forward lead the toolbar, the
// centered title is the link itself (click escalates the CURRENT page to the system browser), and
// one webview owns the whole body on the shared partition. A summon while open retakes the window
// in place; the singleton the page preview also is.
import { useEffect, useRef, useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import { Icon } from '@renderer/design-system/symbols'
import { PreviewPane } from '@renderer/design-system/components/PreviewPane/PreviewPane'
import type { FloatingBounds } from '@renderer/design-system/interactions/FloatingWindow'
import { linkDomain } from '@shared/links'
import { WEB_PARTITION } from '@shared/types'
import { useExitPresence } from '../design-system/useExitPresence'
import { useSession } from '../store'
import './browserWindow.css'

const BOUNDS: FloatingBounds = { minW: 480, minH: 360, defW: 1000, defH: 700 }

/** The knob-independent summon — `openWebLink` is one caller, Add Account another. */
export function openInAppBrowser(url: string): void {
  useSession.getState().openBrowser(url)
}

const LIGHT_LUMA = 150

/** Whether a reported theme color reads light — the chrome's labels flip dark over it. Only the
 *  hex forms are judged; an exotic value keeps the light-label default. */
function lightColor(color: string): boolean {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!match) return false
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1]
  const n = Number.parseInt(hex, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > LIGHT_LUMA
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

export function BrowserWindow(): React.JSX.Element | null {
  const summon = useSession((s) => s.browserSummon)
  const { mounted, closing } = useExitPresence(summon !== null)
  // Held through the exit animation (the store nulls the summon at close). An overtake swaps the
  // guest's destination in place; the window never remounts.
  const held = useRef(summon)
  if (summon) held.current = summon
  if (!mounted || !held.current) return null
  return <BrowserWindowBody summon={held.current} closing={closing} />
}

function BrowserWindowBody({
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
  // The site's reported theme color judges the clear strip's label contrast — null (no meta
  // theme-color, or a navigation away) keeps the light-label default.
  const [theme, setTheme] = useState<string | null>(null)

  // A retake aims the standing guest at the address — imperatively, because the guest may have
  // navigated away from the very url being re-summoned, which the src attribute reads as
  // unchanged. The mount run stands down; src carries the first aim.
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
    const onTheme = (e: Event): void =>
      setTheme((e as Event & { themeColor?: string | null }).themeColor ?? null)
    // Event-driven, never polled: every commit (page loads, pushState hops, back/forward) lands
    // one of these, and the toolbar re-reads the guest's truth there.
    const onNavigate = (): void => {
      setCurrent(wv.getURL())
      setNav({ back: wv.canGoBack(), forward: wv.canGoForward() })
    }
    wv.addEventListener('page-title-updated', onTitle)
    wv.addEventListener('did-change-theme-color', onTheme)
    wv.addEventListener('did-navigate', onNavigate)
    wv.addEventListener('did-navigate-in-page', onNavigate)
    return () => {
      wv.removeEventListener('page-title-updated', onTitle)
      wv.removeEventListener('did-change-theme-color', onTheme)
      wv.removeEventListener('did-navigate', onNavigate)
      wv.removeEventListener('did-navigate-in-page', onNavigate)
    }
  }, [])

  return (
    <PreviewPane
      id="web-browser"
      className={cx('wbrowser', theme !== null && lightColor(theme) && 'is-light-chrome')}
      closing={closing}
      onClose={closeBrowser}
      bounds={BOUNDS}
      ariaLabel="Browser"
      lead={
        <>
          <button
            type="button"
            className="ppane-action"
            title="Back"
            disabled={!nav.back}
            onClick={() => ref.current?.goBack()}
          >
            <Icon name="chevron-left" size={14} />
          </button>
          <button
            type="button"
            className="ppane-action"
            title="Forward"
            disabled={!nav.forward}
            onClick={() => ref.current?.goForward()}
          >
            <Icon name="chevron-right" size={14} />
          </button>
        </>
      }
      title={
        <button
          type="button"
          className={cx('wbrowser-title', text.footnote.standard)}
          title="Open in system browser"
          onClick={() => void window.nexus.openExternal(current)}
        >
          <span className="wbrowser-title-domain">{linkDomain(current)}</span>
          {title ? <span className="wbrowser-title-page">{title}</span> : null}
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
          // The empty-string form, cast past React's boolean typing — see WebpageEmbed.
          allowpopups={'' as unknown as boolean}
        />
      </div>
    </PreviewPane>
  )
}
