import { useEffect } from 'react'
import { DEFAULT_LINK_DISPLAY, isLinkDisplay, type PropertyDefinition } from '@shared/properties'
import type { ColumnLook } from '@shared/columnStyles'
import { isHttpLink } from '@shared/links'
import { useSession } from '../../store'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { OverScroll } from '@renderer/DesignSystem/Interactions/OverScroll'
import { linkDisplayText, readLink, type LinkTarget } from '@shared/linkValue'
import { resolveConnection } from '@renderer/treeIndex'
import { solidColorCss } from './solidColor'
import { openWebLink } from '@renderer/openWebLink'

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
  const target = readLink(raw)
  const url = target.kind === 'url' ? target.url : ''
  const display = isLinkDisplay(look) ? look : (def?.link_display ?? DEFAULT_LINK_DISPLAY)
  const wantsTitle = display === 'link-title' && !target.alias && isHttpLink(url)
  const title = useSession((s) => (wantsTitle ? s.linkTitles[url] : undefined))
  const resolveLinkTitle = useSession((s) => s.resolveLinkTitle)
  useEffect(() => {
    if (wantsTitle && !title) resolveLinkTitle(url)
  }, [wantsTitle, title, url, resolveLinkTitle])

  if (target.kind === 'page')
    return <ConnectionCell target={target} showTitle={showFullLink === true} />
  if (!url) return null
  return (
    <OverScroll className="cell-text-scroll">
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
          openWebLink(url)
        }}
      >
        {showFullLink ? url : linkDisplayText(raw, display, title)}
      </a>
    </OverScroll>
  )
}

/** A Link value naming a page reads as the connection it is — the connection color, and a click that
 *  opens the page rather than an address. The property's own link Format, Color and Underline are
 *  address concepts and don't apply: there is one way a connection reads, and it is the one the
 *  editor already draws. */
function ConnectionCell({
  target,
  showTitle,
}: {
  target: Extract<LinkTarget, { kind: 'page' }>
  /** While this cell's Rename popover is open, show the page it names rather than the alias being
   *  written over it — the same reading the address branch gives its own full URL. */
  showTitle: boolean
}): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const select = useSession((s) => s.select)
  const page = resolveConnection(tree, target.title)
  return (
    <OverScroll className="cell-text-scroll">
      <a
        className="cell-connection"
        href={page?.path}
        draggable={false}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (e.ctrlKey || !page) return // Ctrl+Click = macOS secondary-click; let the menu win
          void select({ kind: 'page', id: page.id, path: page.path }, { newTab: e.metaKey })
        }}
      >
        {showTitle ? target.title : (target.alias ?? target.title)}
      </a>
    </OverScroll>
  )
}
