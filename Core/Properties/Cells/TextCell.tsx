import { useRef } from 'react'
import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { AccessoryButton } from '@pommora/uix/Menus'
import { cx } from '@pommora/uix/Utilities/cx'
import type { ConnPage } from '../../Connections/pageIndex'
import { glanceHost } from '../../Interface/Glance/glanceAction'
import { resolveFollow } from '../../MarkdownPM/Links/linkClicks'
import { lineOffsetsOf } from '../../MarkdownPM/Engine/markdownCode'
import { type CellPage, linkGestures, renderCellContent } from '../../MarkdownPM/Tables/cellStatic'
import { mayNameOwnHeading } from '../../Connections/connections'
import { useSession } from '../../Session/store'
import { openWebLink } from '../../Web/openWebLink'
import type { ValueContext } from '../valueContext'

/** A link inside the value follows, glances, and opens its menu as a body link does; a press on a link that follows stops there, and one that follows nothing is left to the value. */
export function TextCell({
  text,
  ctx,
  holder,
  onPane,
  menu = true,
}: {
  text: string
  ctx: ValueContext
  holder?: ConnPage
  onPane?: (anchor: HTMLElement) => void
  menu?: boolean
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const { connections, headingLinkStyle } = ctx
  const automatic = ctx.inPageHeadingResolution === 'automatic'
  const ownPath = holder && mayNameOwnHeading(text) ? holder.path : null
  const headings = useSession((s) => (ownPath ? s.headings[ownPath] : undefined))
  const around: CellPage | undefined = headings && {
    ordinalOf: () => null,
    keys: headings.keys,
    texts: automatic ? headings.texts : [],
  }
  const { linkAt, dismiss, onContextMenu, onPointerOver, onPointerOut } = linkGestures(
    text,
    connections,
    glanceHost,
    holder,
  )
  const follow = (e: React.MouseEvent): void => {
    if (isSecondaryClick(e)) return
    dismiss(e)
    const found = linkAt(e)
    const go = found && resolveFollow(found.target, null, connections?.(), e, openWebLink)
    if (!go) return
    e.preventDefault()
    e.stopPropagation()
    go()
  }
  const lines = text.split('\n')
  const starts = lineOffsetsOf(lines)
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the value's keyboard route is its field; a link inside it is pointer-followed as a resting table cell's is
    <div
      ref={hostRef}
      className="cell-text-host"
      data-reveal-host=""
      onClick={follow}
      onContextMenu={menu ? onContextMenu : undefined}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onPointerEnter={(e) => {
        const line = e.currentTarget.querySelector('.cell-text')
        if (line)
          e.currentTarget.toggleAttribute('data-overflowing', line.scrollWidth > line.clientWidth)
      }}
    >
      <div className="cell-text-clip">
        <div className={cx('cell-text', overScrollEllipsis)}>
          {lines.map((line, i) => (
            <span key={starts[i]} className="cell-text-line">
              {renderCellContent(line, connections, { base: starts[i], around, headingLinkStyle })}
              {line === '' && '\u200b'}
            </span>
          ))}
        </div>
      </div>
      {onPane && (
        <span className="cell-pen">
          <AccessoryButton
            icon="square-pen"
            size="body"
            ariaLabel="Open in TextPane"
            reveal
            onClick={() => {
              glanceHost.close()
              if (hostRef.current) onPane(hostRef.current)
            }}
          />
        </span>
      )}
    </div>
  )
}
