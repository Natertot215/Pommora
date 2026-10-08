import { useEffect } from 'react'
import { DEFAULT_LINK_DISPLAY, isLinkDisplay, type PropertyDefinition } from '../properties'
import type { ColumnLook } from '../columnStyles'
import { isHttpLink } from '../../Paths/urlPath'
import { useSession } from '../../Session/store'
import { cx } from '@pommora/uix/Utilities/cx'
import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { OverScroll } from '@pommora/uix/Interactions/OverScroll'
import { linkDisplayText, readLink, type LinkTarget } from '../../Connections/linkValue'
import { resolveConnection } from '../../Nexus/treeIndex'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { openWebLink } from '../../Web/openWebLink'
import type { ConnPage } from '../../Connections/pageIndex'

/** Opens through the sanctioned IPC — a raw <a> nav is denied by main's will-navigate hardening. Only the Page Title format fetches; the other two derive from the URL itself. */
export function LinkCell({
  raw,
  def,
  look,
  showFullLink,
  holder,
}: {
  raw: string
  def: PropertyDefinition | undefined
  look?: ColumnLook
  showFullLink?: boolean
  /** The page the value sits on, which a bare `[[#Heading]]` names; a Space has none to name. */
  holder?: ConnPage
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
    return <ConnectionCell target={target} showTitle={showFullLink === true} holder={holder} />
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
          if (isSecondaryClick(e)) return
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
  holder,
}: {
  target: Extract<LinkTarget, { kind: 'page' }>
  showTitle: boolean
  holder?: ConnPage
}): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const select = useSession((s) => s.select)
  const page = target.title ? resolveConnection(tree, target.title) : (holder ?? null)
  const name = target.title || `#${target.heading}`
  return (
    <OverScroll className="cell-text-scroll">
      <a
        className="cell-connection"
        href={page?.path}
        draggable={false}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (isSecondaryClick(e) || !page) return
          void select(
            { kind: 'page', id: page.id, path: page.path },
            { newTab: isCmd(e), heading: target.heading },
          )
        }}
      >
        {showTitle ? name : (target.alias ?? name)}
      </a>
    </OverScroll>
  )
}
