import { useEffect, useRef } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { EntityIcon } from '../../Assets/EntityIcon'
import { Icon } from '@pommora/uix/Symbols'
import type { RememberedSize } from '@pommora/uix/Interactions/useResizable'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { type PaneBounds, usePaneResize } from '@pommora/uix/Pickers/usePaneResize'
import {
  DisclosureRow,
  MenuItem,
  MenuScrollFrame,
  MenuTopRow,
  emphasizeMatch,
  itemEmphasized,
} from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { HoverRemove, hoverRemoveHost } from '@pommora/uix/Interactions/HoverRemove'
import { removeButton } from '@pommora/uix/Interactions/hover-remove.css'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { side } from '@pommora/uix/Menus/menu-row.css'
import { CaretPane, CLOSED_GEOMETRY, useKeepInView } from '../Menus/caretPane'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { text } from '@pommora/uix/Theme/typography.css'
import { outlineTree, type OutlineNode } from '../Engine/outlineTree'
import { type AcRow, type HeadingRow, listsHeadings } from './autocomplete'
import type { AcState } from './useConnectionAutocomplete'

export interface AutocompletePaneProps {
  open: boolean
  ac: AcState | null
  candidates: AcRow[]
  index: number
  onPick: (row: AcRow) => void
  viaChevron?: boolean
  loading?: boolean
  headingRows?: HeadingRow[]
  collapsed?: ReadonlySet<string>
  onToggleHeading?: (value: string) => void
  onAside?: (row: AcRow) => void
  onBack?: () => void
  geometry?: RememberedSize
}

const NONE: ReadonlySet<string> = new Set()

// KNOB — the pane fits its titles between the width floor and AC_FIT_MAX until it's first resized.
const AC_BOUNDS: PaneBounds = {
  min: { w: 180, h: 120 },
  max: { w: 480 },
  default: { h: PICKER_MAX_HEIGHT },
}
const AC_FIT_MAX = 320

const CLOSED: AcState = { query: '', from: 0, to: 0, form: 'link', ...CLOSED_GEOMETRY }

export function AutocompletePane({
  open,
  ac,
  candidates,
  index,
  onPick,
  viaChevron = false,
  loading = false,
  headingRows = [],
  collapsed = NONE,
  onToggleHeading = () => {},
  onAside = () => {},
  onBack = () => {},
  geometry,
}: AutocompletePaneProps): React.JSX.Element {
  const resize = usePaneResize(open, AC_BOUNDS, geometry)
  const { w, h } = resize.size
  const v = useHeld(
    { ac: ac ?? CLOSED, candidates, index, viaChevron, headingRows, collapsed },
    open,
  )
  const matchLen = v.ac.query.length
  const keepInView = useKeepInView(v.index)

  const cameFrom = useRef<AcRow[]>([])
  // Only a link's page rows open a heading slot, so only they carry the chevron and stay behind the slide.
  const linksPages = v.ac.form === 'link' || v.ac.form === 'target'
  if (open && linksPages) cameFrom.current = v.candidates
  useEffect(() => {
    if (ac === null) cameFrom.current = []
  }, [ac])
  const headingForm = listsHeadings(v.ac.form)
  const headingSlide = headingForm && v.viaChevron
  const sliding = (v.ac.form === 'alias' && cameFrom.current.length > 0) || headingSlide

  const slot = (rows: AcRow[], active: boolean): React.JSX.Element => (
    <MenuScrollFrame maxHeight={h}>
      {rows.map((row, i) => (
        <MenuItem
          key={row.kind === 'page' ? row.pageId : row.value}
          ref={active && i === v.index ? keepInView : undefined}
          className={hoverRemoveHost}
          active={active && i === v.index}
          subLabel={
            <NavTrail
              segments={row.kind === 'page' ? row.location : []}
              overScroll={false}
              iconSize="footnote"
              className={text.subline.standard}
            />
          }
          leading={
            row.kind === 'page' ? (
              <EntityIcon kind="page" size="body" />
            ) : (
              <Icon name="square-split-horizontal" size="body" />
            )
          }
          trailing={
            row.kind === 'alias' ? (
              <HoverRemove
                reveal="host"
                className="mdpm-ac-forget"
                label={`Forget ${row.value}`}
                onRemove={row.forget}
              />
            ) : row.kind === 'page' && linksPages ? (
              <button
                type="button"
                className={cx(removeButton, revealTarget, side, 'mdpm-ac-aside')}
                aria-label={`Headings of ${row.value}`}
                onMouseDown={() => onAside(row)}
              >
                <Icon name="chevron-right" />
              </button>
            ) : undefined
          }
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest?.('.mdpm-ac-forget, .mdpm-ac-aside')) return
            onPick(row)
          }}
        >
          {emphasizeMatch(row.value, 0, matchLen)}
        </MenuItem>
      ))}
    </MenuScrollFrame>
  )

  const headingRow = (row: AcRow, i: number, children?: React.ReactNode): React.JSX.Element => (
    <DisclosureRow
      key={row.value}
      title={emphasizeMatch(row.value, 0, matchLen)}
      icon={null}
      className={itemEmphasized}
      dropOutline={children ? 'chevron' : 'spacer'}
      open={!v.collapsed.has(row.value)}
      onToggle={() => onToggleHeading(row.value)}
      active={i === v.index}
      wrap={(node) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: commits on mousedown, the way every autocomplete row does
        <div
          ref={i === v.index ? keepInView : undefined}
          onMouseDown={(e) => {
            // The chevron toggles on click; a mousedown there must not commit the row.
            if ((e.target as HTMLElement).closest?.('[data-drop-outline]')) return
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

  // The tree is shaped by every heading; a row hidden under a collapsed one is absent from the candidates and draws nothing.
  const nested = (): React.JSX.Element[] => {
    const at = new Map(v.candidates.map((r, i) => [r.value, i]))
    const walk = (nodes: OutlineNode[]): React.JSX.Element[] =>
      nodes.flatMap((n) => {
        const i = at.get(n.text)
        if (i === undefined) return []
        return headingRow(v.candidates[i], i, n.children.length ? walk(n.children) : undefined)
      })
    return walk(
      outlineTree(
        v.headingRows.map((r) => ({ from: 0, key: r.value, text: r.value, level: r.level })),
      ),
    )
  }

  const headingSlot = (rows: AcRow[]): React.JSX.Element => (
    <MenuScrollFrame
      maxHeight={h}
      header={
        headingSlide ? <MenuTopRow label="Links" current={v.ac.title} onBack={onBack} /> : undefined
      }
    >
      {loading ? null : v.ac.query !== '' ? rows.map((r, i) => headingRow(r, i)) : nested()}
    </MenuScrollFrame>
  )

  const shown = slot(v.candidates, true)

  return (
    <CaretPane open={open} at={v.ac} className="mdpm-ac" resize={resize}>
      <FrameSlide
        open={sliding}
        minWidth={w ?? AC_BOUNDS.min.w}
        maxWidth={w ?? AC_FIT_MAX}
        root={
          sliding ? slot(cameFrom.current, false) : headingForm ? headingSlot(v.candidates) : shown
        }
        detail={sliding ? (headingSlide ? headingSlot(v.candidates) : shown) : null}
      />
    </CaretPane>
  )
}
