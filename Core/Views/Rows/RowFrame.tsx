import type { ReactNode } from 'react'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { fillInput } from '@pommora/uix/Fields/fields.css'
import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { LineRow } from '@pommora/uix/Interactions/drag'
import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
import { Icon } from '@pommora/uix/Symbols'
import { rowIndent } from '@pommora/uix/Table/rowIndent'
import { cx } from '@pommora/uix/Utilities/cx'
import { EntityIcon } from '../../Assets/EntityIcon'
import { RenamableName } from '../../Interface/RenamableTitle'
import { GroupBand } from '../Bands/GroupBand'
import { memberDepth, memberIndent } from '../Bands/bandModel'
import type { ViewHostApi } from '../Host/useViewHost'
import { type ItemApi, rowHover, type ViewInteractions } from '../Host/useViewInteractions'
import type { ResolvedGroup, ViewRow } from '../viewRow'

// ── The band walk ───────────────────────────────────────────────────────────

export function BandRows({
  host,
  interactions,
  fill,
  row,
  ghost,
}: {
  host: ViewHostApi
  interactions: Pick<
    ViewInteractions,
    'bandView' | 'ghostAt' | 'ghostClosing' | 'ghostStanding' | 'onGhostClosed' | 'ghostRootProps'
  >
  fill?: boolean
  row: (row: ViewRow, place: { padLeft: string; lead: boolean }) => React.JSX.Element
  ghost: (padLeft: string) => ReactNode
}): React.JSX.Element {
  const { groups, bands, disclosure } = host
  const ghostRow = (padLeft: string, closing: boolean, key?: string): React.JSX.Element => (
    <Reveal
      key={key}
      open={!closing}
      fill={fill}
      enterOnMount
      onCollapsed={interactions.onGhostClosed}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a hover-born affordance that must use the row grid's own chrome — a real <button> can't host a .data-row, and keyboard creation lives in the menus */}
      <div
        {...interactions.ghostRootProps}
        className="data-row ghost-row"
        role="button"
        tabIndex={-1}
        aria-label="New Page"
      >
        {ghost(padLeft)}
      </div>
    </Reveal>
  )
  let renderedAnyRow = false
  const endsOnRow = (g: ResolvedGroup): boolean => {
    const last = g.children?.at(-1)
    return disclosure.isOpen(g.key) && (last ? endsOnRow(last) : g.items.length > 0)
  }
  const walk = (g: ResolvedGroup, depth: number, visible: boolean): React.JSX.Element => {
    const itemsVisible = visible && disclosure.isOpen(g.key)
    const padLeft = memberIndent(g.kind, depth)
    const members = [
      ...g.items.flatMap((r, i) => {
        const lead = i === 0 && (g.kind !== 'tail' || !renderedAnyRow)
        if (itemsVisible) renderedAnyRow = true
        const drawn = [row(r, { padLeft, lead })]
        if (itemsVisible && interactions.ghostAt === r.id)
          drawn.push(ghostRow(padLeft, interactions.ghostClosing, `ghost-${r.id}`))
        return drawn
      }),
      ...(g.children ?? []).map((child) => walk(child, memberDepth(g.kind, depth), itemsVisible)),
    ]
    return (
      <GroupBand
        key={`gb-${g.key}`}
        node={bands.byKey.get(g.key)}
        bands={interactions.bandView}
        indent={rowIndent(depth)}
        fill={fill}
        endsOnRow={endsOnRow(g)}
      >
        {members}
      </GroupBand>
    )
  }
  return (
    <>
      {groups.map((g) => walk(g, 0, true))}
      {interactions.ghostStanding && ghostRow(memberIndent('tail', 0), false)}
    </>
  )
}

export function GhostTitle({ hideIcon }: { hideIcon: boolean }): React.JSX.Element {
  return (
    <span className="cell-title">
      {hideIcon ? null : <EntityIcon kind="page" size="body" />}
      <span className="cell-title-text">New Page</span>
    </span>
  )
}

// ── The row ─────────────────────────────────────────────────────────────────

export function PageRow({
  row,
  api,
  lead,
  dragDisabled,
  className,
  children,
}: {
  row: ViewRow
  api: ItemApi
  lead: boolean
  dragDisabled: boolean
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <LineRow
      id={row.id}
      open={() => api.open(row, false)}
      immovable={dragDisabled}
      data-rid={row.id}
      data-view-lead="row"
      data-reveal-host=""
      className={cx('data-row', className, lead && 'row-lead')}
      {...rowHover(row, api.hover)}
    >
      {children}
    </LineRow>
  )
}

const titleGlyph = (el: HTMLElement): HTMLElement => {
  const cell = el.closest<HTMLElement>('.data-cell') ?? el
  return cell.querySelector<HTMLElement>('.cell-title > :first-child') ?? cell
}

export const rowMenu =
  (api: ItemApi, row: ViewRow) =>
  (e: React.MouseEvent): void =>
    void api.pageMenu(row, e, titleGlyph(e.currentTarget as HTMLElement))

export const rowOpen =
  (api: ItemApi, row: ViewRow) =>
  (e: React.MouseEvent): void => {
    // A secondary-click fires `click` alongside `contextmenu`, so bail and let the right-click menu win.
    if (isSecondaryClick(e)) return
    e.stopPropagation()
    api.open(row, isCmd(e))
  }

export function RowGrip({
  onMenu,
  dragDisabled,
}: {
  onMenu: (e: React.MouseEvent) => void
  dragDisabled: boolean
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a bubble guard, not a control
    <span
      className={cx('row-grip', revealTarget)}
      // A right-press is defaulted away here — preventing only the context menu comes too late to stop a seated caret.
      onPointerDown={(e) => {
        if (e.button === 2) e.preventDefault()
      }}
      onContextMenu={onMenu}
      onClick={(e) => e.stopPropagation()}
      title={dragDisabled ? undefined : 'Drag to reorder'}
    >
      <Icon name="grip-vertical" size="body" />
    </span>
  )
}

export function PageTitle({
  row,
  naming,
  hideIcon,
  api,
  className,
}: {
  row: ViewRow
  naming: ViewHostApi['naming']
  hideIcon: boolean
  api: ItemApi
  className?: string
}): React.JSX.Element {
  return (
    <span className={naming ? 'cell-rename' : cx('cell-title', className)}>
      {hideIcon ? null : <EntityIcon kind="page" icon={row.icon} size="body" />}
      <RenamableName
        title={row.title}
        kind="page"
        rename={{ path: row.path, editing: naming !== null, onEnd: api.endNaming }}
        create={naming?.create}
        className={fillInput}
        renames="title"
      >
        {(shown) => <span className="cell-title-text">{shown}</span>}
      </RenamableName>
    </span>
  )
}
