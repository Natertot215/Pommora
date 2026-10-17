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
  itemEmphasized,
} from '@pommora/uix/Menus'
import { FrameSlide } from '@pommora/uix/Menus/FrameSlide'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { overScrollHost } from '@pommora/uix/Interactions/OverScroll'
import { removeButton } from '@pommora/uix/Interactions/hover-remove.css'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { side } from '@pommora/uix/Menus/menu-row.css'
import { useKeepInView } from '@pommora/uix/Interactions/paneCtl'
import { CaretPane, CLOSED_GEOMETRY } from '../Menus/caretPane'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { text } from '@pommora/uix/Theme/typography.css'
import { outlineTree, type OutlineNode } from '../Engine/outlineTree'
import type { AcRow, HeadingRow } from './autocomplete'
import type { AcState } from './useConnectionAutocomplete'
import { AliasList, type AliasHost } from './AliasList'

export interface AutocompletePaneProps {
  open: boolean
  ac: AcState | null
  candidates: AcRow[]
  index: number
  onPick: (row: AcRow) => void
  behind: AcRow[] | null
  headingRows: HeadingRow[]
  collapsed: ReadonlySet<string>
  onToggleHeading: (value: string) => void
  onAside: (row: AcRow) => void
  onBack: () => void
  geometry?: RememberedSize
  aliasHost: AliasHost | null
}

// KNOB — the pane fits its titles between the width floor and AC_FIT_MAX until it's first resized.
const AC_BOUNDS: PaneBounds = {
  min: { w: 180, h: 120 },
  max: { w: 480 },
  default: { h: PICKER_MAX_HEIGHT },
}
const AC_FIT_MAX = 320

const CLOSED: AcState = {
  syntax: 'wiki',
  part: 'title',
  start: 0,
  end: 0,
  from: 0,
  to: 0,
  query: '',
  closed: true,
  embed: false,
  ...CLOSED_GEOMETRY,
}

export function AutocompletePane({
  open,
  ac,
  candidates,
  index,
  onPick,
  behind,
  headingRows,
  collapsed,
  onToggleHeading,
  onAside,
  onBack,
  geometry,
  aliasHost,
}: AutocompletePaneProps): React.JSX.Element {
  const resize = usePaneResize(open, AC_BOUNDS, geometry)
  const { w, h } = resize.size
  const v = useHeld(
    { ac: ac ?? CLOSED, candidates, index, behind, headingRows, collapsed, aliasHost },
    open,
  )
  const keepInView = useKeepInView(v.index)

  const sliding = v.behind !== null

  const slot = (rows: AcRow[], active: boolean): React.JSX.Element => (
    <MenuScrollFrame maxHeight={h}>
      {rows.map((row, i) => (
        <MenuItem
          key={row.kind === 'page' ? row.page.id : row.value}
          ref={active && i === v.index ? keepInView : undefined}
          className={overScrollHost}
          active={active && i === v.index}
          subLabel={
            <NavTrail
              segments={row.kind === 'page' ? row.location : []}
              overScroll={false}
              iconSize="footnote"
              className={text.subline.standard}
            />
          }
          leading={<EntityIcon kind="page" size="body" />}
          trailing={
            v.ac.part === 'title' ? (
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
            if ((e.target as HTMLElement).closest?.('.mdpm-ac-aside')) return
            onPick(row)
          }}
        >
          {row.value}
        </MenuItem>
      ))}
    </MenuScrollFrame>
  )

  const headingRow = (row: AcRow, i: number, children?: React.ReactNode): React.JSX.Element => (
    <DisclosureRow
      key={row.value}
      title={row.value}
      icon={null}
      className={itemEmphasized}
      dropOutline={children ? 'chevron' : 'spacer'}
      open={!v.collapsed.has(row.value)}
      onToggle={() => onToggleHeading(row.value)}
      active={i === v.index}
      wrap={(node) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: commits on mousedown as a page row does
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
    const walk = (nodes: OutlineNode<HeadingRow>[]): React.JSX.Element[] =>
      nodes.flatMap((n) => {
        const i = at.get(n.value)
        if (i === undefined) return []
        return headingRow(v.candidates[i], i, n.children.length ? walk(n.children) : undefined)
      })
    return walk(outlineTree(v.headingRows))
  }

  const headingSlot = (): React.JSX.Element => (
    <MenuScrollFrame
      maxHeight={h}
      header={
        sliding ? <MenuTopRow label="Links" current={v.ac.title} onBack={onBack} /> : undefined
      }
    >
      {v.ac.query !== '' ? v.candidates.map((r, i) => headingRow(r, i)) : nested()}
    </MenuScrollFrame>
  )

  const shown =
    v.ac.part === 'heading' ? (
      headingSlot()
    ) : v.aliasHost ? (
      <AliasList
        key={v.ac.from}
        aliases={v.candidates.map((r) => r.value)}
        host={v.aliasHost}
        active={v.index}
        query={v.ac.query}
        maxHeight={h}
        onPick={(alias) => onPick({ kind: 'alias', value: alias })}
      />
    ) : (
      slot(v.candidates, true)
    )
  const behindSlot = (rows: AcRow[]): React.JSX.Element =>
    rows[0]?.kind === 'heading' ? (
      <MenuScrollFrame maxHeight={h}>{rows.map((r) => headingRow(r, -1))}</MenuScrollFrame>
    ) : (
      slot(rows, false)
    )

  return (
    <CaretPane open={open} at={v.ac} className="mdpm-ac" resize={resize}>
      <FrameSlide
        open={sliding}
        minWidth={w ?? AC_BOUNDS.min.w}
        maxWidth={w ?? AC_FIT_MAX}
        root={v.behind ? behindSlot(v.behind) : shown}
        detail={sliding ? shown : null}
      />
    </CaretPane>
  )
}
