import { memo, useEffect, useRef, useState } from 'react'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@pommora/core/Views/viewRow'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import {
  type CellMenuContext,
  cellMenuContextFor,
  cellMenuModel,
} from '@pommora/core/Actions/cellMenu'
import type { ColumnAlign } from '@pommora/core/Views/views'
import { isBlankValue, type PropertyValue } from '@pommora/core/Properties/propertyValue'
import { isOptionsKind } from '@pommora/core/Properties/properties'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { PropertyEditor } from '../../Properties/Pickers/PropertyEditor'
import { parseEditorValue } from '../../Properties/parseEditorValue'
import { MassPropertyPicker } from '../../Properties/Pickers/MassPropertyPicker'
import { groupValueUndo } from '../../Properties/valueUndo'
import { PropertyPicker } from '../../Properties/Pickers/PropertyPicker'
import { sharedValueClickAction } from '../../Properties/Pickers/valueClick'
import type { ViewHostApi } from '../Host/useViewHost'
import { rowHover, useViewInteractions } from '../Host/useViewInteractions'
import { fileChipIndex, pickFileInto, runFileMenuAction } from '../../Properties/Pickers/filePick'
import { useSession } from '../../Session/store'
import { glanceShown } from '../../Interface/Glance/glanceAction'
import type { ValueContext } from '../../Properties/valueContext'
import { BandDnd } from '../Bands/BandDnd'
import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
import { Cell } from '../../Properties/Cells/Cell'
import { EntityIcon } from '../../Assets/EntityIcon'
import { PropertyTypeIcon, propertyIcon } from '../../Properties/Cells/PropertyTypes'
import { ViewGroupBand } from '../Bands/ViewGroupBand'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnLabel, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { type DragShift, gapShift, numberBarCapable, useColumns } from './useColumns'
import { cx } from '@pommora/uix/Utilities/cx'
import { useStableApi } from '@pommora/uix/Utilities/stableApi'
import { text } from '@pommora/uix/Theme'
import { Icon } from '@pommora/uix/Symbols'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker'
import { numberDivisor } from '../../Properties/formatValue'
import { ColumnHeader } from './ColumnHeader'
import './table-view.css'
import type { GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import { useCellSweep } from './cellSweep'
import { TableRowDnd, useTableRowDrag } from '@pommora/uix/Interactions/tableDnd'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { openWebLink } from '../../Web/openWebLink'
import {
  linkAlias,
  linkEditText,
  urlClickTarget,
  urlValueFromRename,
} from '@pommora/core/Connections/linkValue'
import { validateLink } from '../../Properties/Cells/linkResolve'
import {
  linkValueMenuTarget,
  showConnectionMenu,
} from '../../Interface/Menus/connectionMenuActions'
import { popMenu } from '../../Actions/menuActions'

export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
  const {
    source,
    schema,
    liveView,
    columns,
    groups,
    ctx,
    setNames,
    setIcons,
    setPaths,
    rowById,
    paintOrder,
    bandLabel,
    collapsed,
    toggleCollapse,
    flat,
    canReassign,
    canReorderWithin,
    canRelocate,
    dragDisabled,
    commitValue,
    pickTarget,
    creation,
    mutate,
    select,
  } = host
  const selection = useSession((s) => s.selection)
  const {
    foldOverrides,
    iconsShown,
    alignByCol,
    styleByCol,
    widthByCol,
    colStyle,
    dragShift,
    cols,
    reflowWidth,
    overflowing,
    hiding,
    sliding,
    resizing,
    resizeColumn,
    startResize,
    abortResize,
    endResize,
    commitResize,
    openHeaderMenu,
    runStyleAction,
    startColumnDrag,
    onTrackTransitionEnd,
  } = useColumns(host)

  // ── Editing ───────────────────────────────────────────────────────────────

  const [editing, setEditing] = useState<{
    rowId: string
    colId: string
    mode: 'picker' | 'editor' | 'rename'
    nonce?: number
    fromCreate?: true
  } | null>(null)
  const triggerElRef = useRef<HTMLElement | null>(null)
  const lastPicker = useRef<{ rowId: string; colId: string } | null>(null)
  if (editing?.mode === 'picker')
    lastPicker.current = { rowId: editing.rowId, colId: editing.colId }
  const renameNonce = useRef(0)
  const lastRename = useRef<{ rowId: string; colId: string; nonce: number } | null>(null)
  if (editing?.mode === 'rename') {
    lastRename.current = { rowId: editing.rowId, colId: editing.colId, nonce: editing.nonce ?? 0 }
  }
  const editingRef = useRef(editing)
  editingRef.current = editing
  const strandedEditId = editing !== null && !rowById.has(editing.rowId) ? editing.rowId : null
  useEffect(() => {
    if (strandedEditId !== null) setEditing((e) => (e?.rowId === strandedEditId ? null : e))
  }, [strandedEditId])
  const titleCol = columns.find((c) => c.kind === 'title')
  const titleColId = titleCol?.id

  const interactions = useViewInteractions(host, {
    ghost: { graceMs: 0, suppressed: () => editingRef.current !== null || glanceShown() },
    foldOverrides,
    rename: (target, fromCreate) => {
      if (titleColId)
        setEditing({
          rowId: target.id,
          colId: titleColId,
          mode: 'editor',
          ...(fromCreate ? { fromCreate: true } : {}),
        })
    },
  })

  // ── Cell click ────────────────────────────────────────────────────────────

  const onCellClick = (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent): void => {
    // A secondary-click fires `click` alongside `contextmenu`, so bail and let the right-click menu win.
    if (isSecondaryClick(e)) return
    triggerElRef.current = e.currentTarget as HTMLElement
    if (col.kind === 'title') {
      e.stopPropagation()
      interactions.openPage(row, isCmd(e))
      return
    }
    if (col.kind !== 'property' && col.kind !== 'context') return
    const t = col.kind === 'context' ? 'context' : declaredType(col.id, schema)
    const value = resolveFieldValue(row, col.id, schema)
    const def = schema.find((d) => d.id === col.id)
    const shared = sharedValueClickAction(t, value)
    if (shared) {
      e.stopPropagation()
      if (shared.kind === 'commit') commitValue(row, col, shared.value)
      else if (shared.kind === 'file') {
        if (def) pickFileInto(def, value, fileChipIndex(e.target), (n) => commitValue(row, col, n))
      } else setEditing({ rowId: row.id, colId: col.id, mode: 'picker' })
    } else if (t === 'number') {
      e.stopPropagation()
      if (colStyle(col.id).look === 'bar') {
        renameNonce.current += 1
        setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
      } else {
        setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
      }
    } else if (t === 'url') {
      e.stopPropagation()
      const v = resolveFieldValue(row, col.id, schema)
      const raw = v.kind === 'url' ? v.value : undefined
      const url = urlClickTarget(raw)
      if (url) openWebLink(url)
      else if (!raw) setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
    }
  }

  // ── The inline editor and the pickers ─────────────────────────────────────

  const editorInitial = (row: ViewRow, col: ResolvedColumn): string => {
    if (col.kind === 'title') return editing?.fromCreate ? '' : row.title
    const v = resolveFieldValue(row, col.id, schema)
    if (v.kind === 'number') return String(v.value)
    if (v.kind === 'url') return linkEditText(v.value)
    return ''
  }
  const commitEditorText = (row: ViewRow, col: ResolvedColumn, raw: string): void => {
    const fromCreate = editing?.fromCreate
    setEditing(null)
    if (col.kind === 'title') {
      const trimmed = raw.trim()
      if (trimmed && trimmed !== row.title)
        void mutate({
          op: 'rename',
          path: row.path,
          kind: 'page',
          newName: trimmed,
          ...(fromCreate ? { fromCreate } : {}),
        })
      return
    }
    const next = parseEditorValue(
      declaredType(col.id, schema),
      raw,
      resolveFieldValue(row, col.id, schema),
    )
    if (next !== undefined) commitValue(row, col, next)
  }
  const cellEditor = (row: ViewRow, col: ResolvedColumn): React.ReactNode => {
    if (editing?.mode !== 'editor' || editing.rowId !== row.id || editing.colId !== col.id)
      return null
    const t = declaredType(col.id, schema)
    const editor = (
      <PropertyEditor
        initial={editorInitial(row, col)}
        numeric={t === 'number'}
        validate={t === 'url' ? validateLink : undefined}
        color={
          t === 'url' ? solidColorCss(schema.find((d) => d.id === col.id)?.link_color) : undefined
        }
        onCommit={(raw) => commitEditorText(row, col, raw)}
        onCancel={() => setEditing(null)}
      />
    )
    if (col.kind !== 'title' || liveView.hide_page_icons) return editor
    return (
      <span className="cell-rename">
        <EntityIcon kind="page" icon={row.icon} size="body" />
        {editor}
      </span>
    )
  }

  const pickerCell = (): { row: ViewRow; col: ResolvedColumn } | null => {
    const cell = editing?.mode === 'picker' ? editing : lastPicker.current
    const row = cell && rowById.get(cell.rowId)
    const col = cell && columns.find((c) => c.id === cell.colId)
    return row && col ? { row, col } : null
  }
  const cellPicker = (): React.ReactNode => {
    const c = pickerCell()
    return (
      <PropertyPicker
        key={c ? `${c.row.id}:${c.col.id}` : 'none'}
        target={c ? pickTarget(c.row, c.col) : null}
        open={editing?.mode === 'picker'}
        triggerRef={triggerElRef}
        onCommit={(v) => {
          if (c) commitValue(c.row, c.col, v)
        }}
        onDismiss={() => setEditing(null)}
      />
    )
  }
  const massPicker = (): React.ReactNode => {
    if (!mass) return null
    const col = columns.find((c) => c.id === mass.colId)
    if (!col) return null
    const rows = mass.rowIds.flatMap((id) => {
      const r = rowById.get(id)
      return r ? [r] : []
    })
    if (rows.length < 2) return null
    const target = pickTarget(rows[0], col)
    const contextOptions = target.kind === 'options' ? target.contextOptions : undefined
    const currents = rows.map((r) => resolveFieldValue(r, col.id, schema))
    return (
      <MassPropertyPicker
        key={`${mass.colId}:${mass.rowIds.join('.')}`}
        def={target.def}
        currents={currents}
        open={massOpen}
        triggerRef={massTriggerRef}
        look={colStyle(col.id).look}
        {...(contextOptions ? { contextOptions } : {})}
        onPick={(commits) => {
          if (commits.length)
            groupValueUndo(() => {
              for (const { index, next } of commits) commitValue(rows[index], col, next)
            })
        }}
        onDismiss={() => {
          setMassOpen(false)
          cellSweep.clear()
        }}
      />
    )
  }
  const renameField = (): React.ReactNode => {
    const cell = editing?.mode === 'rename' ? editing : lastRename.current
    const row = cell && rowById.get(cell.rowId)
    const col = cell && columns.find((c) => c.id === cell.colId)
    if (!cell || !row || !col) return null
    const v = resolveFieldValue(row, col.id, schema)
    const open = editing?.mode === 'rename'
    const key = `${cell.rowId}:${cell.colId}:${cell.nonce}`
    if (declaredType(col.id, schema) === 'number') {
      const divisor = numberDivisor(schema.find((d) => d.id === col.id))
      return (
        <TextPicker
          key={key}
          open={open}
          triggerRef={triggerElRef}
          value={v.kind === 'number' ? String(v.value) : ''}
          trailing={divisor !== undefined ? `/ ${divisor}` : undefined}
          onCommit={(text) => {
            const next = parseEditorValue('number', text)
            if (next !== undefined) commitValue(row, col, next)
            setEditing(null)
          }}
          onDismiss={() => setEditing(null)}
        />
      )
    }
    const raw = v.kind === 'url' ? v.value : ''
    const linkDef = schema.find((d) => d.id === col.id)
    return (
      <TextPicker
        key={key}
        open={open}
        triggerRef={triggerElRef}
        value={linkAlias(raw) ?? ''}
        accent={solidColorCss(linkDef?.link_color)}
        onCommit={(alias) => {
          commitValue(row, col, urlValueFromRename(alias, raw))
          setEditing(null)
        }}
        onDismiss={() => setEditing(null)}
      />
    )
  }

  // ── The cell menu ─────────────────────────────────────────────────────────

  const openCellMenu = async (
    row: ViewRow,
    col: ResolvedColumn,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    // Captured before the await — React recycles the synthetic event, so the popover can't read `e.currentTarget` once the menu resolves.
    const el = e.currentTarget as HTMLElement
    const cellEl = el.closest<HTMLElement>('.data-cell') ?? el
    const filled = !isBlankValue(resolveFieldValue(row, col.id, schema))
    const dt = declaredType(col.id, schema)
    if (dt === 'url') {
      const v = resolveFieldValue(row, col.id, schema)
      const target = linkValueMenuTarget(v.kind === 'url' ? v.value : '', (action) => {
        if (action === 'link:clear') return commitValue(row, col, null)
        if (action === 'editLink')
          return setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
        if (action !== 'rename') return
        triggerElRef.current = cellEl
        renameNonce.current += 1
        setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
      })
      if (target) {
        await interactions.holdGhost(async () => showConnectionMenu(target))
        return
      }
    }
    const chip = fileChipIndex(e.target)
    const base = cellMenuContextFor(col, dt, colStyle(col.id), filled, {
      barCapable: numberBarCapable(schema, col.id),
      onChip: chip !== null,
    })
    if (!base) return
    const ctx: CellMenuContext =
      base.kind === 'title' ? { ...base, ...interactions.titleMenuContext(row) } : base
    const action = await interactions.holdGhost(() => popMenu(cellMenuModel(ctx)))
    if (!action) return
    const glyph = cellEl.querySelector<HTMLElement>('.cell-title > :first-child') ?? cellEl
    if (interactions.runTitleAction(action, row, glyph)) return
    if (
      runFileMenuAction(
        action,
        schema.find((d) => d.id === col.id),
        resolveFieldValue(row, col.id, schema),
        chip,
        (n) => commitValue(row, col, n),
      )
    )
      return
    if (action === 'cell:edit') setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
    else if (action === 'cell:rename') {
      triggerElRef.current = cellEl
      renameNonce.current += 1
      setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
    } else if (action === 'cell:clear') {
      commitValue(row, col, null)
    } else runStyleAction(col.id, action)
  }

  // ── The sweep ─────────────────────────────────────────────────────────────

  const [mass, setMass] = useState<{ colId: string; rowIds: string[] } | null>(null)
  const [massOpen, setMassOpen] = useState(false)
  const massTriggerRef = useRef<HTMLElement | null>(null)
  const cellSweep = useCellSweep({
    gridEl: () => host.seam.viewRootRef.current,
    onSettle: (colId, rowIds, settleRowId) => {
      const at = columns.findIndex((c) => c.id === colId)
      const cell = host.seam.viewRootRef.current
        ?.querySelector(`[data-rid="${CSS.escape(settleRowId)}"]`)
        ?.children.item(at)
      if (!(cell instanceof HTMLElement)) return cellSweep.clear()
      massTriggerRef.current = cell
      setMass({ colId, rowIds })
      setMassOpen(true)
    },
  })
  const startSweep = (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent): boolean => {
    const t = col.kind === 'context' ? 'context' : declaredType(col.id, schema)
    if (!isOptionsKind(t)) return false
    if (e.button !== 0) return false
    cellSweep.begin(row.id, col.id, e)
    return true
  }
  const massDegraded =
    mass !== null &&
    massOpen &&
    (columns.every((c) => c.id !== mass.colId) ||
      mass.rowIds.filter((id) => rowById.has(id)).length < 2)
  useEffect(() => {
    if (!massDegraded) return
    setMassOpen(false)
    cellSweep.clear()
  })

  // ── The row api ───────────────────────────────────────────────────────────

  const cellApi = useStableApi<RowCellApi>({
    menu: (row, col, e) => void openCellMenu(row, col, e),
    click: onCellClick,
    overlay: cellEditor,
    remove: commitValue,
    grip: (row, e) => {
      if (titleCol) void openCellMenu(row, titleCol, e)
    },
    sweep: startSweep,
    hover: interactions.ghost.onHover,
  })
  const overlayTarget = editing?.mode === 'editor' ? editing : null
  const renameTarget = editing?.mode === 'rename' ? editing : null
  const activeCell = editing ? { rowId: editing.rowId, colId: editing.colId } : null

  // ── The render ────────────────────────────────────────────────────────────

  const headerIcon = (id: string): React.ReactNode => {
    if (!iconsShown) return null
    const contextIcon = ctx?.contexts.get(id)?.icon
    if (contextIcon) {
      return (
        <span className="col-header-icon">
          <Icon name={contextIcon} size="body" />
        </span>
      )
    }
    const def = schema.find((d) => d.id === id)
    if (def) {
      return (
        <span className="col-header-icon">
          <Icon name={propertyIcon(def)} size="body" />
        </span>
      )
    }
    const t = declaredType(id, schema)
    if (t === undefined) return null
    return (
      <span className="col-header-icon">
        <PropertyTypeIcon type={t} size="body" />
      </span>
    )
  }
  const indent = (depth: number): string =>
    depth > 0 ? `calc(var(--loose-inset) + var(--row-indent) * ${depth})` : 'var(--loose-inset)'
  const groupIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`

  const ghost = interactions.ghost.ghost
  let renderedAnyRow = false
  const renderRows = (g: ResolvedGroup, depth: number, visible: boolean): React.JSX.Element[] => {
    const isCollapsed = collapsed.has(g.key)
    const itemsVisible = visible && !isCollapsed
    const itemDepth = g.kind === 'ungrouped' ? depth : depth + 1
    const memberIndent = g.kind === 'ungrouped' ? indent : groupIndent
    const members: React.JSX.Element[] = [
      ...g.items.flatMap((row, i) => {
        const lead = i === 0 && (g.kind !== 'ungrouped' || !renderedAnyRow)
        if (itemsVisible) renderedAnyRow = true
        const rendered = [
          <DataRow
            key={row.id}
            row={row}
            columns={columns}
            ctx={ctx}
            padLeft={memberIndent(itemDepth)}
            dragShift={dragShift}
            alignByCol={alignByCol}
            styleByCol={styleByCol}
            api={cellApi}
            overlayCol={overlayTarget?.rowId === row.id ? overlayTarget.colId : null}
            renameCol={renameTarget?.rowId === row.id ? renameTarget.colId : null}
            activeCol={activeCell?.rowId === row.id ? activeCell.colId : null}
            hideIcon={liveView.hide_page_icons ?? false}
            selected={selection.kind === 'page' && selection.id === row.id}
            dragDisabled={dragDisabled}
            sweepCol={cellSweep.sweep?.rows.has(row.id) ? cellSweep.sweep.colId : null}
            lead={lead}
          />,
        ]
        if (itemsVisible && ghost?.anchorId === row.id && !editing)
          rendered.push(
            <GhostRow
              key={`ghost-${row.id}`}
              padLeft={memberIndent(itemDepth)}
              columns={columns}
              hideIcon={liveView.hide_page_icons ?? false}
              closing={ghost.closing}
              onClosed={interactions.ghost.closed}
              onEnter={interactions.ghost.onGhostEnter}
              onLeave={interactions.ghost.onGhostLeave}
              onCreate={() => void interactions.ghostCreate()}
            />,
          )
        return rendered
      }),
      ...(g.children ?? []).flatMap((child) => renderRows(child, itemDepth, itemsVisible)),
    ]
    if (g.kind === 'ungrouped') return members
    return [
      <ViewGroupBand
        key={`gb-${g.key}`}
        group={g}
        view={liveView}
        ctx={ctx}
        setNames={setNames}
        setIcons={setIcons}
        source={source}
        setPath={g.kind === 'structural-set' ? setPaths.get(g.key) : undefined}
        onAdd={
          g.kind === 'structural-set' && setPaths.has(g.key)
            ? () => creation.bandAdd(g.key)
            : undefined
        }
        onOpen={
          g.kind === 'structural-set' &&
          source.kind === 'collection' &&
          depth === 0 &&
          setPaths.has(g.key)
            ? () => void select({ kind: 'set', id: g.key, path: setPaths.get(g.key) as string })
            : undefined
        }
        collapsed={isCollapsed}
        onToggle={() => toggleCollapse(g.key)}
        indent={groupIndent(depth)}
      >
        {members}
      </ViewGroupBand>,
    ]
  }

  return (
    <div
      ref={(el) => {
        host.seam.viewRootRef.current = el
      }}
      className={cx('table table-view', overflowing && 'overflowing')}
    >
      {interactions.iconPicker}
      <BandDnd
        bands={interactions.bands}
        labelFor={bandLabel}
        onDrop={interactions.onBandDrop}
        nestable={!flat}
      >
        <TableRowDnd
          rows={paintOrder}
          disabled={dragDisabled}
          canReorderWithin={canReorderWithin}
          canReassign={canReassign}
          canRelocate={canRelocate}
          onDrop={(activeId, toGroup, beforeId) =>
            interactions.onDrop({ activeId, toZone: toGroup, beforeId })
          }
        >
          <div
            className={cx(
              'table-grid',
              text.body.standard,
              liveView.hide_borders && 'no-borders',
              columns.length === 1 && 'single-column',
              hiding && 'col-hiding',
              sliding && 'col-sliding',
              dragShift !== null && 'col-dragging-active',
              resizing && 'col-resizing-active',
            )}
            style={{ minWidth: reflowWidth, '--cols': cols } as React.CSSProperties}
          >
            <div className="table-head" onTransitionEnd={onTrackTransitionEnd}>
              {columns.map((c, i) => (
                <ColumnHeader
                  key={c.id}
                  id={c.id}
                  label={columnLabel(c.id, schema, ctx.contexts, capitalize)}
                  icon={headerIcon(c.id)}
                  width={widthByCol[i]}
                  align={alignByCol[i]}
                  transform={gapShift(dragShift, i)}
                  dragging={dragShift?.from === i}
                  onDragStart={(e) => startColumnDrag(e, i)}
                  onResize={resizeColumn}
                  onResizeStart={startResize}
                  onResizeAbort={abortResize}
                  onResizeEnd={endResize}
                  onResizeCommit={commitResize}
                  onContextMenu={(e) => void openHeaderMenu(c.id, c.kind === 'title', e)}
                />
              ))}
              {/* The :last-child anchor that keeps the last real column's right divider (table.css). */}
              <div className="cell-filler" aria-hidden="true" />
            </div>
            {groups.flatMap((g) => renderRows(g, 0, true))}
          </div>
        </TableRowDnd>
      </BandDnd>
      {cellPicker()}
      {massPicker()}
      {renameField()}
    </div>
  )
}

type RowCellApi = {
  menu: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
  click: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
  overlay: (row: ViewRow, col: ResolvedColumn) => React.ReactNode
  remove: (row: ViewRow, col: ResolvedColumn, next: PropertyValue | null) => void
  grip: (row: ViewRow, e: React.MouseEvent) => void
  sweep: (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent) => boolean
  hover: GhostAnchor['onHover']
}

function GhostRow({
  padLeft,
  columns,
  hideIcon,
  closing,
  onClosed,
  onEnter,
  onLeave,
  onCreate,
}: {
  padLeft: string | undefined
  columns: ResolvedColumn[]
  hideIcon: boolean
  closing: boolean
  onClosed: () => void
  onEnter: () => void
  onLeave: () => void
  onCreate: () => void
}): React.JSX.Element {
  return (
    <Reveal open={!closing} enterOnMount onCollapsed={onClosed}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useSemanticElements: a hover-born affordance that must use the row grid's own chrome — a real <button> can't host a .data-row, and keyboard creation lives in the menus */}
      <div
        data-ghost-root
        className="data-row ghost-row"
        role="button"
        tabIndex={-1}
        aria-label="New Page"
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onClick={onCreate}
      >
        {columns.map((c, i) => (
          <div
            key={c.id}
            className={cx('data-cell', 'ghost-worn', i === 0 && 'cell-lead')}
            style={i === 0 ? { paddingLeft: padLeft } : undefined}
          >
            {c.kind === 'title' && (
              <span className="cell-title">
                {hideIcon ? null : <EntityIcon kind="page" size="body" />}
                <span className="cell-title-text">New Page</span>
              </span>
            )}
          </div>
        ))}
        <div className="cell-filler" aria-hidden="true" />
      </div>
    </Reveal>
  )
}

const DataRow = memo(function DataRow({
  row,
  columns,
  ctx,
  padLeft,
  dragShift,
  alignByCol,
  styleByCol,
  api,
  overlayCol,
  renameCol,
  activeCol,
  hideIcon,
  selected,
  dragDisabled,
  sweepCol,
  lead,
}: {
  row: ViewRow
  columns: ResolvedColumn[]
  ctx: ValueContext
  padLeft: string | undefined
  dragShift: DragShift | null
  alignByCol: ColumnAlign[]
  styleByCol: ColumnStyle[]
  api: RowCellApi
  overlayCol: string | null
  renameCol: string | null
  activeCol: string | null
  hideIcon: boolean
  selected: boolean
  dragDisabled: boolean
  sweepCol: string | null
  lead: boolean
}): React.JSX.Element {
  const { ref, handle, isDragging } = useTableRowDrag(row.id)
  return (
    <div
      ref={ref}
      data-rid={row.id}
      className={cx(
        'data-row',
        selected && 'selected',
        isDragging && 'row-dragging',
        lead && 'row-lead',
      )}
      {...rowHover(row, api.hover)}
      {...(dragDisabled ? {} : handle)}
    >
      {columns.map((c, i) => {
        const style: React.CSSProperties = {
          transform: gapShift(dragShift, i),
          textAlign: alignByCol[i],
        }
        if (i === 0 && alignByCol[i] === 'left') style.paddingLeft = padLeft
        const stateCx = activeCol === c.id && 'cell-active'
        const editor = overlayCol === c.id ? api.overlay(row, c) : null
        const content = editor ?? (
          <Cell
            row={row}
            column={c}
            ctx={ctx}
            hideIcon={hideIcon}
            style={styleByCol[i]}
            showFullLink={renameCol === c.id}
            remove={(next) => api.remove(row, c, next)}
          />
        )
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
          <div
            key={c.id}
            className={cx(
              'data-cell',
              i === 0 && 'cell-lead',
              dragShift?.from === i && 'col-dragging',
              sweepCol === c.id && 'cell-sweep',
              stateCx,
            )}
            style={style}
            onContextMenu={(e) => api.menu(row, c, e)}
            onPointerDown={(e) => {
              if (api.sweep(row, c, e)) e.stopPropagation()
            }}
            onClick={(e) => {
              if (!isDragging) api.click(row, c, e)
            }}
          >
            {i === 0 && (
              // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a bubble guard, not a control
              <span
                className="row-grip"
                {...(dragDisabled ? {} : handle)}
                // A right-press is defaulted away here — preventing only the context menu comes too late to stop a seated caret.
                onPointerDown={(e) => {
                  if (e.button === 2) {
                    e.preventDefault()
                    return
                  }
                  if (!dragDisabled) handle.onPointerDown?.(e)
                }}
                onContextMenu={(e) => api.grip(row, e)}
                onClick={(e) => e.stopPropagation()}
                title={dragDisabled ? undefined : 'Drag to reorder'}
              >
                <Icon name="grip-vertical" size="body" />
              </span>
            )}
            {content}
          </div>
        )
      })}
      <div className="cell-filler" aria-hidden="true" />
    </div>
  )
})
