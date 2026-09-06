import { useEffect } from 'react'
import {
  DEFAULT_LINK_DISPLAY,
  isLinkDisplay,
  type PropertyDefinition,
} from '@pommora/core/Properties/properties'
import type { ColumnLook } from '@pommora/core/Properties/columnStyles'
import { isHttpLink } from '@pommora/core/Connections/links'
import { useSession } from '../../Session/store'
import { cx } from '@pommora/uix/Utilities/cx'
import { OverScroll } from '@pommora/uix/Elements/OverScroll'
import { linkDisplayText, readLink, type LinkTarget } from '@pommora/core/Connections/linkValue'
import { resolveConnection } from '../../Session/treeIndex'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { openWebLink } from '../../Platform/openWebLink'

/** Opens through the sanctioned IPC — a raw <a> nav is denied by main's will-navigate hardening. Only the Page Title format fetches; the other two derive from the URL itself. */
export function LinkCell({
  raw,
  def,
  look,
  showFullLink,
}: {
  raw: string
  def: PropertyDefinition | undefined
  look?: ColumnLook
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
        // A card is a whole-surface drag handle; without this an anchor's native link-drag hijacks the gesture and the card drag dies.
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

function ConnectionCell({
  target,
  showTitle,
}: {
  target: Extract<LinkTarget, { kind: 'page' }>
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
