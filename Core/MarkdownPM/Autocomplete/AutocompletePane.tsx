import { useEffect, useRef } from 'react'
import { EntityIcon } from '../../Assets/EntityIcon'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { MenuItem, MenuScrollFrame } from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Labels/HoverRemove'
import { useKeepInView } from './useKeepInView'
import { NavTrail, NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail/NavTrail'
import { text } from '@pommora/uix/Theme/typography.css'
import { ancestryOf } from '../../Session/treeIndex'
import { useSession } from '../../Session/store'
import type { AcRow, ConnectionForm } from './autocomplete'

interface Props {
  open: boolean
  candidates: AcRow[]
  index: number
  form: ConnectionForm
  caretX: number
  caretTop: number
  caretBottom: number
  bounds?: { left: number; right: number }
  query: string
  onPick: (row: AcRow) => void
}

export function AutocompletePane({
  open,
  candidates,
  index,
  form,
  caretX,
  caretTop,
  caretBottom,
  bounds,
  query,
  onPick,
}: Props): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const live = open && candidates.length > 0
  const last = useRef({ candidates, index, form, caretX, caretTop, caretBottom, bounds, query })
  if (live) last.current = { candidates, index, form, caretX, caretTop, caretBottom, bounds, query }

  const v = last.current
  const matchLen = v.query.length
  const keepInView = useKeepInView(v.index)

  const cameFrom = useRef<AcRow[]>([])
  if (live && v.form !== 'alias') cameFrom.current = v.candidates
  useEffect(() => {
    if (!open) cameFrom.current = []
  }, [open])
  const sliding = v.form === 'alias' && cameFrom.current.length > 0

  const locationOf = (row: AcRow): TrailSegment[] => {
    if (!tree || !row.isPage || !row.pageId) return NO_TRAIL
    const chain = ancestryOf(tree, { kind: 'page', id: row.pageId })
    return chain ? chain.slice(0, -1).map((n) => ({ title: n.title })) : NO_TRAIL
  }

  const slot = (rows: AcRow[], active: boolean): React.JSX.Element => (
    <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT} className="mdpm-ac-slot">
      {rows.map((row, i) => (
        <MenuItem
          key={row.value}
          ref={active && i === v.index ? keepInView : undefined}
          className={hoverRemoveHost}
          selected={active && i === v.index}
          subLabel={
            <NavTrail
              segments={locationOf(row)}
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
            row.forget && (
              <HoverRemove
                reveal="host"
                className="mdpm-ac-forget"
                label={`Forget ${row.label}`}
                onRemove={row.forget}
              />
            )
          }
          onMouseDown={(e) => {
            e.preventDefault()
            if ((e.target as HTMLElement).closest?.('.mdpm-ac-forget')) return
            onPick(row)
          }}
        >
          <span className="mdpm-ac-match">{row.label.slice(0, matchLen)}</span>
          {row.label.slice(matchLen)}
        </MenuItem>
      ))}
    </MenuScrollFrame>
  )

  const shown = slot(v.candidates, true)

  return (
    // No `onDismiss` and no focus management, by contract: the editor's keymap owns arrows, Return and Escape, and a row commits on mousedown with preventDefault so the caret never leaves the alias.
    <PickerMenu
      glass="window"
      open={live}
      anchorX={v.caretX}
      anchorY={v.caretTop}
      anchorHeight={v.caretBottom - v.caretTop}
      bounds={v.bounds}
      origin="center"
      manageFocus={false}
      contentClassName="mdpm-ac"
    >
      <FrameSlide
        open={sliding}
        root={sliding ? slot(cameFrom.current, false) : shown}
        detail={sliding ? shown : null}
      />
    </PickerMenu>
  )
}
