import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import { NotchedPane } from '@renderer/design-system/components/NotchedPane'
import { dropdownOpen, dropdownClose } from '@renderer/design-system/animations.css'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import type { ConnPage } from './connections'

interface Props {
  /** Whether the autocomplete is active; false plays the retract before unmounting. */
  open: boolean
  candidates: ConnPage[]
  index: number
  left: number
  top: number
  query: string
  onPick: (page: ConnPage) => void
}

export function AutocompletePanel({
  open,
  candidates,
  index,
  left,
  top,
  query,
  onPick,
}: Props): React.JSX.Element | null {
  const live = open && candidates.length > 0
  const { mounted, closing } = useExitPresence(live)
  // Retain the last open state so the panel can retract in place after `ac` clears (position + rows gone).
  const last = useRef({ candidates, index, left, top, query })
  if (live) last.current = { candidates, index, left, top, query }
  if (!mounted) return null

  const v = last.current
  const matchLen = v.query.length
  // Body-level portal: the panel is position:fixed on viewport coords, and a
  // transformed ancestor (a SurfacePM tile rides translate()) re-anchors fixed
  // to ITSELF — misplacing and clipping the panel. Popups never render inside a
  // tile's subtree.
  return createPortal(
    // The shared beak-less pane surface (PickerMenu's own), beak height zero — the panel stays
    // caret-anchored fixed with no backdrop; only the chrome is shared.
    <NotchedPane
      notchHeight={0}
      className="mdpm-ac"
      animationClass={closing ? dropdownClose : dropdownOpen}
      style={
        {
          // position must be inline — NotchedPane's own root class sets relative, and only an
          // inline style reliably outranks it; the z rung stays .mdpm-ac's token.
          position: 'fixed',
          left: v.left,
          top: v.top,
          '--dropdown-origin': 'top left',
          ...(closing ? { pointerEvents: 'none' } : null),
        } as React.CSSProperties
      }
    >
      {v.candidates.map((p, i) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut for a panel the editor keymap already drives — arrows move the selection, Enter picks
        <div
          key={p.id}
          className={`mdpm-ac-row${i === v.index ? ' mdpm-ac-selected' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(p)
          }}
        >
          <EntityIcon kind="page" size={14} className="mdpm-ac-icon" />
          <span className="mdpm-ac-title">
            <span className="mdpm-ac-match">{p.title.slice(0, matchLen)}</span>
            {p.title.slice(matchLen)}
          </span>
        </div>
      ))}
    </NotchedPane>,
    document.body,
  )
}
