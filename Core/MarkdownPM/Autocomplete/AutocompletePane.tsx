import { useEffect, useRef } from 'react'
import { EntityIcon } from '../../Assets/EntityIcon'
import { Icon } from '@pommora/uix/Symbols'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { MenuItem, MenuScrollFrame } from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
import { useKeepInView } from './useKeepInView'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { text } from '@pommora/uix/Theme/typography.css'
import type { AcRow } from './autocomplete'
import { CLOSED_GEOMETRY, type AcState } from './useConnectionAutocomplete'

interface Props {
  ac: AcState | null
  candidates: AcRow[]
  index: number
  onPick: (row: AcRow) => void
}

const CLOSED: AcState = { query: '', from: 0, to: 0, form: 'link', ...CLOSED_GEOMETRY }

export function AutocompletePane({ ac, candidates, index, onPick }: Props): React.JSX.Element {
  const live = ac !== null && candidates.length > 0
  // The last live geometry stays through the closing animation.
  const last = useRef({ ac: CLOSED, candidates, index })
  if (live) last.current = { ac, candidates, index }

  const v = last.current
  const matchLen = v.ac.query.length
  const keepInView = useKeepInView(v.index)

  const cameFrom = useRef<AcRow[]>([])
  if (live && v.ac.form !== 'alias') cameFrom.current = v.candidates
  useEffect(() => {
    if (ac === null) cameFrom.current = []
  }, [ac])
  const sliding = v.ac.form === 'alias' && cameFrom.current.length > 0

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
          <span className="mdpm-autocomplete-match">{row.label.slice(0, matchLen)}</span>
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
        root={sliding ? slot(cameFrom.current, false) : shown}
        detail={sliding ? shown : null}
      />
    </PickerMenu>
  )
}
