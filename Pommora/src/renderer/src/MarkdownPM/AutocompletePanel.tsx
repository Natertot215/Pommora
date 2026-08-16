import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EntityIcon } from '@renderer/Components/EntityIcon'
import { Icon } from '@renderer/design-system/symbols'
import { GlassPane } from '@renderer/design-system/materials'
import { cx } from '@renderer/design-system/cx'
import { dropdownOpen, dropdownClose } from '@renderer/design-system/animations.css'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import { ChipRemoveButton } from '@renderer/Components/Chip'
import { acPanelLeft, type AcRow } from './autocomplete'

interface Props {
  /** Whether the autocomplete is active; false plays the retract before unmounting. */
  open: boolean
  candidates: AcRow[]
  index: number
  /** The caret's x — the panel centres on it and slides only as far as `bounds` requires. */
  caretX: number
  bounds: { left: number; right: number }
  top: number
  query: string
  onPick: (row: AcRow) => void
}

export function AutocompletePanel({
  open,
  candidates,
  index,
  caretX,
  bounds,
  top,
  query,
  onPick,
}: Props): React.JSX.Element | null {
  const live = open && candidates.length > 0
  const { mounted, closing } = useExitPresence(live)
  // Retain the last open state so the panel can retract in place after `ac` clears (position + rows gone).
  const last = useRef({ candidates, index, caretX, bounds, top, query })
  if (live) last.current = { candidates, index, caretX, bounds, top, query }
  // The panel sizes to its widest row between a floor and a cap, so where it lands is only knowable
  // once it has one. Held as state because the placement renders from it.
  const paneRef = useRef<HTMLDivElement>(null)
  const [paneW, setPaneW] = useState(0)
  useLayoutEffect(() => {
    const el = paneRef.current
    if (!el) return
    const measure = (): void => setPaneW((w) => (w === el.offsetWidth ? w : el.offsetWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted])
  if (!mounted) return null

  const v = last.current
  const matchLen = v.query.length
  const left = acPanelLeft(v.caretX, paneW, v.bounds.left, v.bounds.right)
  // Body-level portal: the panel is position:fixed on viewport coords, and a
  // transformed ancestor (a SurfacePM tile rides translate()) re-anchors fixed
  // to ITSELF — misplacing and clipping the panel. Popups never render inside a
  // tile's subtree.
  return createPortal(
    // The house pane material, mounted directly: the panel stays caret-anchored fixed with no
    // backdrop, so it needs the glass and nothing else a menu shell would bring.
    <GlassPane
      ref={paneRef}
      className={cx('mdpm-ac', closing ? dropdownClose : dropdownOpen)}
      style={
        {
          position: 'fixed',
          left,
          top: v.top,
          zIndex: 'var(--z-lifted)',
          // The Bloom starts at the caret wherever the slide put the panel, so the reveal still
          // points at what opened it rather than at whichever edge it stopped against.
          '--dropdown-origin': `${v.caretX - left}px 0px`,
          // Hidden until measured: a first frame at width 0 would place it half a panel too far right.
          ...(paneW === 0 ? { visibility: 'hidden' as const } : null),
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
    </GlassPane>,
    document.body,
  )
}
