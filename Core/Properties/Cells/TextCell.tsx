import { useRef } from 'react'
import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { AccessoryButton } from '@pommora/uix/Menus'
import { cx } from '@pommora/uix/Utilities/cx'
import type { ConnPage } from '../../Connections/pageIndex'
import { glanceHost } from '../../Interface/Glance/glanceAction'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { resolveFollow } from '../../MarkdownPM/Links/linkClicks'
import { linkGestures, renderCellContent } from '../../MarkdownPM/Tables/cellStatic'
import { openWebLink } from '../../Web/openWebLink'

/** A link inside the value follows, glances, and opens its menu as a body link does; a press on any link stops there, and a dead one does nothing. */
export function TextCell({
  text,
  connections,
  holder,
  onPane,
}: {
  text: string
  connections?: () => ConnectionsApi | undefined
  holder?: ConnPage
  onPane?: (anchor: HTMLElement) => void
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const own = holder ? ({ kind: 'held', page: holder } as const) : null
  const { linkAt, dismiss, onContextMenu, onPointerOver, onPointerOut } = linkGestures(
    text,
    connections,
    glanceHost,
    own,
  )
  const follow = (e: React.MouseEvent): void => {
    if (isSecondaryClick(e)) return
    dismiss(e)
    const found = linkAt(e)
    if (!found) return
    e.preventDefault()
    e.stopPropagation()
    resolveFollow(found.target, own, connections?.(), e, openWebLink)?.()
  }
  let offset = 0
  const lines = text.split('\n').map((line) => {
    const from = offset
    offset += line.length + 1
    return { line, from }
  })
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the value's keyboard route is its field; a link inside it is pointer-followed as a resting table cell's is
    <div
      ref={hostRef}
      className="cell-text-host"
      data-reveal-host=""
      onClick={follow}
      onContextMenu={onContextMenu}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <div className={cx('cell-text', overScrollEllipsis)}>
        {lines.map(({ line, from }) => (
          <span key={from} className="cell-text-line">
            {renderCellContent(line, connections, undefined, undefined, from)}
          </span>
        ))}
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
