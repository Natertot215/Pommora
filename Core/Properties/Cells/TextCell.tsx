import { useRef } from 'react'
import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { AccessoryButton } from '@pommora/uix/Menus'
import type { ConnPage } from '../../Connections/pageIndex'
import { glanceHost } from '../../Interface/Glance/glanceAction'
import { type ConnectionsApi, openPage } from '../../MarkdownPM/Links/connectionsApi'
import { dwellTarget } from '../../MarkdownPM/Links/linkClicks'
import { cellLinkTarget, renderCellContent } from '../../MarkdownPM/Tables/cellStatic'
import { openWebLink } from '../../Web/openWebLink'

/** A link inside the value follows and glances as a body link does; a press on any link stops there, and a dead one does nothing. */
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
  const hostRef = useRef<HTMLSpanElement>(null)
  const linkAt = (e: React.SyntheticEvent) => cellLinkTarget(text, e.target, connections?.())
  const follow = (e: React.MouseEvent): void => {
    if (isSecondaryClick(e)) return
    if (!glanceHost.contains(e.currentTarget)) glanceHost.close()
    const api = connections?.()
    const found = api && linkAt(e)
    if (!found) return
    e.preventDefault()
    e.stopPropagation()
    const { target } = found
    if (target.kind === 'external') openWebLink(target.url)
    else if (target.kind === 'page') openPage(api, target.page, isCmd(e), target.heading)
    else if (target.kind === 'self' && holder) openPage(api, holder, isCmd(e), target.heading)
  }
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the value's keyboard route is its field; a link inside it is pointer-followed as a resting table cell's is
    <span
      ref={hostRef}
      className="cell-text-host"
      data-reveal-host=""
      onClick={follow}
      onPointerOver={(e) => {
        const found = linkAt(e)
        if (found) dwellTarget(found.target, glanceHost, found.el)?.()
      }}
      onPointerOut={() => glanceHost.cancel()}
    >
      <div className="cell-text">{renderCellContent(text, connections)}</div>
      {onPane && (
        <span>
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
    </span>
  )
}
