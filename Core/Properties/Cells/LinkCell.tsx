import { DEFAULT_LINK_DISPLAY, isLinkDisplay, type PropertyDefinition } from '../properties'
import type { ColumnLook } from '../columnStyles'
import { isHttpLink } from '../../Paths/urlPath'
import { cx } from '@pommora/uix/Utilities/cx'
import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { OverScroll } from '@pommora/uix/Interactions/OverScroll'
import { pageLinkText } from '../../Connections/connections'
import { linkDisplayText, readLinkText, resolveLink } from '../../Connections/linkValue'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { glanceHost } from '../../Interface/Glance/glanceAction'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { dwellTarget, resolveFollow } from '../../MarkdownPM/Links/linkClicks'
import { openWebLink } from '../../Web/openWebLink'
import { useLinkTitle } from '../../Web/useLinkTitle'
import type { ConnPage } from '../../Connections/pageIndex'
import { TextCell } from './TextCell'

/** A Link value is a link like every other. A page in either syntax, a held heading, and an unresolved title draw and act through the shared resting stack; an address keeps the property's own look, and follows and glances through the shared gestures. Only the Page Title format fetches. */
export function LinkCell({
  raw,
  def,
  look,
  showFullLink,
  holder,
  connections,
}: {
  raw: string
  def: PropertyDefinition | undefined
  look?: ColumnLook
  showFullLink?: boolean
  /** The page the value sits on, which a bare `[[#Heading]]` names; a Space has none to name. */
  holder?: ConnPage
  connections?: () => ConnectionsApi | undefined
}): React.JSX.Element | null {
  const api = connections?.()
  const written = readLinkText(raw)
  const target = resolveLink(written, api?.index, holder)
  const url = target.kind === 'url' ? target.url : raw.trim()
  const display = isLinkDisplay(look) ? look : (def?.link_display ?? DEFAULT_LINK_DISPLAY)
  const title = useLinkTitle(url, display === 'link-title' && !written?.alias && isHttpLink(url))
  if (written && target.kind !== 'url')
    return (
      <TextCell
        text={
          showFullLink && target.kind === 'page'
            ? pageLinkText({ title: target.page.title, heading: target.heading }, 'wiki')
            : raw
        }
        connections={connections}
        holder={holder}
        menu={false}
      />
    )
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
          if (isSecondaryClick(e)) return
          if (!glanceHost.contains(e.currentTarget)) glanceHost.close()
          const go = resolveFollow(target, null, api, e, openWebLink)
          if (!go) return
          e.stopPropagation()
          go()
        }}
        onPointerOver={(e) => dwellTarget(target, glanceHost, e.currentTarget)?.()}
        onPointerOut={() => glanceHost.cancel()}
      >
        {showFullLink ? url : linkDisplayText(raw, display, title)}
      </a>
    </OverScroll>
  )
}
