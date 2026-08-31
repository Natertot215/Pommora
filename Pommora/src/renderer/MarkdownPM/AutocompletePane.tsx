import { useRef } from 'react'
import { EntityIcon } from '@renderer/Utilities/EntityIcon'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'
import { PICKER_MAX_HEIGHT } from '@renderer/DesignSystem/Pickers/picker-base.css'
import { MenuItem } from '@renderer/DesignSystem/Menus'
import { HoverRemove, hoverRemoveHost } from '@renderer/DesignSystem/Interactions/HoverRemove'
import { useKeepInView } from '@renderer/DesignSystem/Interactions/useKeepInView'
import { NavTrail, type TrailSegment } from '@renderer/DesignSystem/Elements/NavTrail'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import { ancestryOf } from '@renderer/treeIndex'
import { useSession } from '@renderer/store'
import type { AcRow } from './autocomplete'

const NO_TRAIL: TrailSegment[] = []

interface Props {
  open: boolean
  candidates: AcRow[]
  index: number
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
  caretX,
  caretTop,
  caretBottom,
  bounds,
  query,
  onPick,
}: Props): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const live = open && candidates.length > 0
  const last = useRef({ candidates, index, caretX, caretTop, caretBottom, bounds, query })
  if (live) last.current = { candidates, index, caretX, caretTop, caretBottom, bounds, query }

  const v = last.current
  const matchLen = v.query.length
  const keepInView = useKeepInView(v.index)

  // Where the page lives, drawn from the same ancestry every location trail reads — the row's own
  // title is the leaf, so the caption stops at its containers. An alias names no place of its own.
  const locationOf = (row: AcRow): TrailSegment[] => {
    if (!tree || !row.isPage || !row.pageId) return NO_TRAIL
    const chain = ancestryOf(tree, { kind: 'page', id: row.pageId })
    return chain ? chain.slice(0, -1).map((n) => ({ title: n.title })) : NO_TRAIL
  }
  return (
    // No `onDismiss` and no focus management, by contract: the editor's keymap owns arrows, Return
    // and Escape, and a row commits on mousedown with preventDefault so the caret never leaves the
    // alias. The × guards itself on POINTERDOWN, a different event, so the mousedown checks for it —
    // without that the press meant to forget a suggestion accepts it instead.
    <PickerMenu
      glass="pane"
      open={live}
      anchorX={v.caretX}
      anchorY={v.caretTop}
      anchorHeight={v.caretBottom - v.caretTop}
      bounds={v.bounds}
      origin="center"
      manageFocus={false}
      maxHeight={PICKER_MAX_HEIGHT}
      contentClassName="mdpm-ac"
    >
      {v.candidates.map((row, i) => (
        <MenuItem
          key={row.value}
          ref={i === v.index ? keepInView : undefined}
          className={hoverRemoveHost}
          selected={i === v.index}
          subLabel={
            <NavTrail
              segments={locationOf(row)}
              overScroll={false}
              iconSize="subline"
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
    </PickerMenu>
  )
}
