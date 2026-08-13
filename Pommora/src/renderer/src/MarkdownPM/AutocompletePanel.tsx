import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import { Icon } from '@renderer/design-system/symbols'
import { NotchedPane } from '@renderer/design-system/components/NotchedPane'
import { dropdownOpen, dropdownClose } from '@renderer/design-system/animations.css'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import { ChipRemoveButton } from '@renderer/Components/Chip'
import type { AcRow } from './autocomplete'

interface Props {
  /** Whether the autocomplete is active; false plays the retract before unmounting. */
  open: boolean
  candidates: AcRow[]
  index: number
  left: number
  top: number
  query: string
  onPick: (row: AcRow) => void
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
          position: 'fixed',
          left: v.left,
          top: v.top,
          zIndex: 'var(--z-lifted)',
          '--dropdown-origin': 'top left',
          ...(closing ? { pointerEvents: 'none' } : null),
        } as React.CSSProperties
      }
    >
      {v.candidates.map((row, i) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut for a panel the editor keymap already drives — arrows move the selection, Enter picks
        <div
          key={row.value}
          className={`mdpm-ac-row${i === v.index ? ' mdpm-ac-selected' : ''}`}
          onMouseDown={(e) => {
            // preventDefault regardless: the press must not move focus out of the editor, or the
            // caret leaves the alias and the panel closes before a click can land anywhere.
            e.preventDefault()
            // The × sits inside the row and guards itself on POINTERDOWN — a different event from
            // this one, which its stopPropagation therefore never reaches. Without this the press
            // meant to forget a suggestion accepts it instead, and the gesture has no working path.
            if ((e.target as HTMLElement).closest?.('.mdpm-ac-forget')) return
            onPick(row)
          }}
        >
          {row.isPage ? (
            <EntityIcon kind="page" size={14} className="mdpm-ac-icon" />
          ) : (
            <Icon name="square-split-horizontal" size={14} className="mdpm-ac-icon" />
          )}
          <span className="mdpm-ac-title">
            <span className="mdpm-ac-match">{row.label.slice(0, matchLen)}</span>
            {row.label.slice(matchLen)}
          </span>
          {row.forget && (
            <ChipRemoveButton
              className="mdpm-ac-forget"
              label={`Forget ${row.label}`}
              onRemove={row.forget}
            />
          )}
        </div>
      ))}
    </NotchedPane>,
    document.body,
  )
}
