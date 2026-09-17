import { useEffect, useRef } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { EntityIcon } from '../../Assets/EntityIcon'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import {
  DisclosureRow,
  MenuItem,
  MenuScrollFrame,
  MenuTopRow,
  itemEmphasized,
} from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
import { removeButton, revealFromHost } from '@pommora/uix/Interactions/hover-remove.css'
import { useKeepInView } from './useKeepInView'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { text } from '@pommora/uix/Theme/typography.css'
import { outlineTree, type OutlineNode } from '../Engine/outlineTree'
import type { AcRow } from './autocomplete'
import { CLOSED_GEOMETRY, type AcState } from './useConnectionAutocomplete'

interface Props {
  ac: AcState | null
  candidates: AcRow[]
  index: number
  onPick: (row: AcRow) => void
  viaChevron?: boolean
  loading?: boolean
  onAside?: (row: AcRow) => void
  onBack?: () => void
}

const CLOSED: AcState = { query: '', from: 0, to: 0, form: 'link', ...CLOSED_GEOMETRY }

export function AutocompletePane({
  ac,
  candidates,
  index,
  onPick,
  viaChevron = false,
  loading = false,
  onAside = () => {},
  onBack = () => {},
}: Props): React.JSX.Element {
  const live = ac !== null && (candidates.length > 0 || loading)
  // The last live geometry stays through the closing animation.
  const last = useRef({ ac: CLOSED, candidates, index, viaChevron: false })
  if (live) last.current = { ac, candidates, index, viaChevron }

  const v = last.current
  const matchLen = v.ac.query.length
  const keepInView = useKeepInView(v.index)

  const cameFrom = useRef<AcRow[]>([])
  if (live && v.ac.form === 'link') cameFrom.current = v.candidates
  useEffect(() => {
    if (ac === null) cameFrom.current = []
  }, [ac])
  const headingSlide = v.ac.form === 'heading' && v.viaChevron
  const sliding = (v.ac.form === 'alias' && cameFrom.current.length > 0) || headingSlide

  const slot = (rows: AcRow[], active: boolean): React.JSX.Element => (
    <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} className="mdpm-autocomplete-slot">
      {rows.map((row, i) => (
        <MenuItem
          key={row.value}
          ref={active && i === v.index ? keepInView : undefined}
          className={hoverRemoveHost}
          selected={active && i === v.index}
          subLabel={
            <NavTrail
              segments={row.location}
              overScroll={false}
              iconSize="footnote"
              className={text.subline.standard}
            />
          }
          leading={
            row.isPage ? (
              <EntityIcon kind="page" size="body" />
            ) : (
              <Icon name="square-split-horizontal" size="body" />
            )
          }
          trailing={
            row.forget ? (
              <HoverRemove
                reveal="host"
                className="mdpm-ac-forget"
                label={`Forget ${row.label}`}
                onRemove={row.forget}
              />
            ) : row.isPage ? (
              <button
                type="button"
                className={cx(removeButton, revealFromHost, 'mdpm-ac-aside')}
                aria-label={`Headings of ${row.label}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onAside(row)
                }}
              >
                <Icon name="chevron-right" size="footnote" />
              </button>
            ) : undefined
          }
          onMouseDown={(e) => {
            e.preventDefault()
            if ((e.target as HTMLElement).closest?.('.mdpm-ac-forget, .mdpm-ac-aside')) return
            onPick(row)
          }}
        >
          <span className="mdpm-autocomplete-match">{row.label.slice(0, matchLen)}</span>
          {row.label.slice(matchLen)}
        </MenuItem>
      ))}
    </MenuScrollFrame>
  )

  const headingRow = (row: AcRow, i: number, children?: React.ReactNode): React.JSX.Element => (
    <DisclosureRow
      key={row.value}
      title={row.label}
      icon={null}
      className={itemEmphasized}
      dropOutline={children ? 'chevron' : 'spacer'}
      open
      onToggle={() => {}}
      selected={i === v.index}
      wrap={(node) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: commits on mousedown so the caret never leaves the editor, the way every autocomplete row does
        <div
          ref={i === v.index ? keepInView : undefined}
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(row)
          }}
        >
          {node}
        </div>
      )}
    >
      {children}
    </DisclosureRow>
  )

  const nested = (rows: AcRow[]): React.JSX.Element[] => {
    const at = new Map(rows.map((r, i) => [r.value, i]))
    const walk = (nodes: OutlineNode[]): React.JSX.Element[] =>
      nodes.map((n) => {
        const i = at.get(n.text) ?? 0
        return headingRow(rows[i], i, n.children.length ? walk(n.children) : undefined)
      })
    return walk(
      outlineTree(rows.map((r) => ({ from: 0, key: r.value, text: r.label, level: r.level ?? 1 }))),
    )
  }

  const headingSlot = (rows: AcRow[]): React.JSX.Element => (
    <MenuScrollFrame
      maxHeight={PICKER_MAX_HEIGHT}
      className="mdpm-autocomplete-slot"
      header={
        headingSlide ? <MenuTopRow label="Links" current={v.ac.title} onBack={onBack} /> : undefined
      }
    >
      {loading ? null : v.ac.query !== '' ? rows.map((r, i) => headingRow(r, i)) : nested(rows)}
    </MenuScrollFrame>
  )

  const shown = slot(v.candidates, true)

  return (
    // No `onDismiss` and no focus management, by contract: the editor's keymap owns arrows, Return and Escape, and a row commits on mousedown with preventDefault so the caret never leaves the alias.
    <PickerMenu
      glass="window"
      open={live}
      anchorX={v.ac.caretX}
      anchorY={v.ac.caretTop}
      anchorHeight={v.ac.caretBottom - v.ac.caretTop}
      bounds={v.ac.bounds}
      origin="center"
      manageFocus={false}
      contentClassName="mdpm-ac"
    >
      <FrameSlide
        open={sliding}
        root={
          sliding
            ? slot(cameFrom.current, false)
            : v.ac.form === 'heading'
              ? headingSlot(v.candidates)
              : shown
        }
        detail={sliding ? (headingSlide ? headingSlot(v.candidates) : shown) : null}
      />
    </PickerMenu>
  )
}
