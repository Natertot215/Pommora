import { useEffect, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { cx } from '@pommora/uix/Utilities/cx'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { text } from '@pommora/uix/Theme'
import { WindowBase, type WindowBounds } from '@pommora/uix/Windows/WindowBase'
import { linkDomain } from '../../Paths/urlPath'
import { WebGuest, type WebGuestHandle, type WebNavigation } from '../../Web/WebGuest'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { useSession } from '../../Session/store'
import { dialer } from '../../Platform/dialer'
import { useWindowGeometry } from './useWindowGeometry'
import './web-window.css'

const BOUNDS: WindowBounds = { min: { w: 480, h: 360 }, default: { w: 1000, h: 700 } }

export function WebWindow(): React.JSX.Element | null {
  const summon = useSession((s) => s.browserSummon)
  const shown = useHeldPresence(summon, 'fast')
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
  const geometry = useWindowGeometry('web-browser')
  const ref = useRef<WebGuestHandle | null>(null)
  const [title, setTitle] = useState('')
  const [nav, setNav] = useState<WebNavigation>({ url, back: false, forward: false })
  // `landed` is where the summoned address first committed, so a redirect or canonical form still counts as unmoved.
  const aim = useRef({ seq, url, landed: '' })
  useEffect(() => {
    const prev = aim.current
    if (prev.seq === seq) return
    const stayed = prev.url === url && ref.current?.url() === prev.landed
    aim.current = { seq, url, landed: stayed ? prev.landed : '' }
    if (stayed) return
    setTitle('')
    setNav((n) => ({ ...n, url }))
    // A changed address re-aims through src; the same one is loaded here, since src reads it as unchanged.
    if (prev.url === url) ref.current?.load(url)
  }, [url, seq])

  return (
    <WindowBase
      {...geometry}
      className="wbrowser"
      closing={closing}
      onClose={closeBrowser}
      raiseOn={seq}
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
            onClick={() => ref.current?.back()}
          />
          <Button
            size="button-inline"
            icon="chevron-right"
            iconSize="body"
            title="Forward"
            disabled={!nav.forward}
            onClick={() => ref.current?.forward()}
          />
        </>
      }
      title={
        <button
          type="button"
          className={cx('window-toolbar-title', 'wbrowser-title', text.footnote.standard)}
          title="Open in system browser"
          onClick={() => void dialer().ask('link:open', nav.url)}
        >
          <span className="wbrowser-title-domain">{linkDomain(nav.url)}</span>
          {title ? (
            <span className={cx('wbrowser-title-page', overScrollEllipsis)}>{title}</span>
          ) : null}
        </button>
      }
    >
      <div className="wbrowser-body">
        <WebGuest
          ref={ref}
          src={url}
          popups
          onTitle={setTitle}
          onNavigate={(next) => {
            aim.current.landed ||= next.url
            setNav(next)
          }}
        />
      </div>
    </WindowBase>
  )
}
