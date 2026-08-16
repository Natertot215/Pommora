import { useEffect } from 'react'
import { isLinkDisplay, type PropertyDefinition } from '@shared/properties'
import type { ColumnLook } from '@shared/columnStyles'
import { isHttpLink } from '@shared/links'
import { useSession } from '../../../store'
import { cx } from '@renderer/design-system/cx'
import { OverflowScroll } from '@renderer/design-system/components/OverflowScroll'
import { parseLink, linkDisplayText } from '@shared/linkValue'
import { solidColorCss } from './solidColor'

/** The url-cell body, split out so ONLY url cells pay for the page-title store subscription + the
 *  on-demand fetch — Cell's other branches stay pure renders under the row memo. The alias always wins;
 *  a Page Title cell with no alias resolves the fetched title (subscribed narrowly to just this URL, so
 *  a title landing re-renders this one cell, never its siblings) and shows the domain until then. Only
 *  that one format fetches; the other two are derived from the URL itself.
 *  Opens through the sanctioned IPC — a raw <a> nav is denied by main's will-navigate hardening. */
export function LinkCell({
  raw,
  def,
  look,
  showFullLink,
}: {
  raw: string
  def: PropertyDefinition | undefined
  /** The column's resolved look — this view's override of how the link reads, already defaulted to
   *  the property's own Format. */
  look?: ColumnLook
  /** While this cell's Rename popover is open, show the full URL instead of the alias/title (see Cell). */
  showFullLink?: boolean
}): React.JSX.Element | null {
  const { url, alias } = parseLink(raw)
  const display = isLinkDisplay(look) ? look : (def?.link_display ?? 'link-full')
  const wantsTitle = display === 'link-title' && !alias && isHttpLink(url)
  const title = useSession((s) => (wantsTitle ? s.linkTitles[url] : undefined))
  const resolveLinkTitle = useSession((s) => s.resolveLinkTitle)
  useEffect(() => {
    if (wantsTitle && !title) resolveLinkTitle(url)
  }, [wantsTitle, title, url, resolveLinkTitle])

  if (!url) return null
  return (
    <OverflowScroll className="cell-text-scroll">
      <a
        className={cx('cell-link', def?.link_underline && 'cell-link-underline')}
        style={{ color: solidColorCss(def?.link_color) }}
        href={url}
        // A card is a whole-surface drag handle; without this an anchor's native link-drag hijacks the
        // gesture (spawns the OS link ghost + pointercancel) and the card drag dies.
        draggable={false}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (e.ctrlKey) return // Ctrl+Click = macOS secondary-click; let the contextmenu menu win
          void window.nexus.openExternal(url)
        }}
      >
        {showFullLink ? url : linkDisplayText(raw, display, title)}
      </a>
    </OverflowScroll>
  )
}
