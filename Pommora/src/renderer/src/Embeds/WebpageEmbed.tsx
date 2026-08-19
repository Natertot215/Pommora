// The webpage tile's payload: a live site while the tile is fully visible in its scrollport,
// static faces otherwise — the spike's law is that a guest clips correctly only at full
// visibility, so visibility management IS the rendering model, not an optimization. The component
// is editor-agnostic: visibility arrives as a prop and nothing here imports CodeMirror, so a
// future dashboard host mounts it unchanged.
import { useEffect, useRef, useState } from 'react'
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import { linkDomain } from '@shared/links'
import { DEFAULT_LINK_DISPLAY } from '@shared/properties'
import { WEB_PARTITION } from '@shared/types'
import { webpageTileTitle } from '@shared/webpageEmbed'
import { useSession } from '../store'
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

export function WebpageEmbed({
  url,
  visible,
  partition = WEB_PARTITION,
}: {
  url: string
  /** Fully visible in the owning scrollport — the host's observer decides; the guest exists only
   *  while this holds. */
  visible: boolean
  partition?: string
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLElement | null>(null)

  // A url change or a visibility exit clears the failure, so the next entry mounts a fresh guest —
  // the webview only exists while live, so nothing else can ever reset a failed tile.
  useEffect(() => setFailed(false), [url])
  useEffect(() => {
    if (!visible) setFailed(false)
  }, [visible])

  useEffect(() => {
    const wv = ref.current
    if (!wv) return
    const onFail = (e: Event): void => {
      // Subframe failures are the site's own business; -3 is the abort every redirect fires.
      const d = e as Event & { isMainFrame?: boolean; errorCode?: number }
      if (d.isMainFrame !== false && d.errorCode !== -3) setFailed(true)
    }
    const onGone = (): void => setFailed(true)
    const onLoad = (): void => setFailed(false)
    wv.addEventListener('did-fail-load', onFail)
    wv.addEventListener('render-process-gone', onGone)
    wv.addEventListener('did-finish-load', onLoad)
    return () => {
      wv.removeEventListener('did-fail-load', onFail)
      wv.removeEventListener('render-process-gone', onGone)
      wv.removeEventListener('did-finish-load', onLoad)
    }
  })

  const live = visible && !failed
  return (
    <div className="wpembed">
      {live ? (
        <webview
          ref={(el) => {
            ref.current = el as HTMLElement | null
          }}
          src={url}
          partition={partition}
          allowpopups
        />
      ) : (
        <div className="wpembed-face">
          {failed ? (
            <span className={cx('wpembed-face-domain', text.footnote.standard)}>
              {linkDomain(url)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}
