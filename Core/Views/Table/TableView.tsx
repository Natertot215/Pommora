import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { UNGROUPED } from '@pommora/core/Views/viewRow'
import { patchOverride } from '../Host/useValuesEpoch'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@pommora/core/Views/viewRow'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import { confirmDelete } from '../../Interface/Confirm/confirmations'
import {
  type CellMenuContext,
  cellMenuContextFor,
  cellMenuModel,
} from '@pommora/core/Actions/cellMenu'
import { columnMenuItems, parseStyleAction } from '@pommora/core/Actions/columnMenu'
import type { ColumnAlign, SavedView } from '@pommora/core/Views/views'
import {
  applyValueAtRoot,
  isBlankValue,
  type PropertyValue,
} from '@pommora/core/Properties/propertyValue'
import { parentOf } from '@pommora/core/Nexus/treePatch'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { ContextOption } from '../../Contexts/contextOptions'
import { frontmatterOf, subtreeIds } from '../Pipeline/group'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { PropertyEditor } from '../../Properties/Pickers/PropertyEditor'
import { MassPropertyPicker } from '../../Properties/Pickers/MassPropertyPicker'
import { pushValueUndo } from '../valueUndo'
import {
  type PickTarget,
  PropertyPicker,
  syntheticContextDef,
} from '../../Properties/Pickers/PropertyPicker'
import { sharedValueClickAction } from '../../Properties/Pickers/valueClick'
import type { ViewHostApi } from '../Host/useViewHost'
import { fileChipIndex, pickFileInto, runFileMenuAction } from '../../Properties/Pickers/filePick'
import { useSession } from '../../Session/store'
import { pageMoveContext, runPageSendAction } from '../../Interface/Menus/pageMenuActions'
import { findCollectionForSet } from '../../Nexus/treeIndex'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import type { SetTreeNode } from '../Pipeline/group'
import type { ValueContext } from '../../Properties/valueContext'
import { BandDnd, type BandDrop } from '../Bands/BandDnd'
import { flattenBands, propertyOrderAfterDrop, reparentFsOrder } from '../Bands/bandDndModel'
import { bandReorderPatch } from '../Bands/useBandOrdering'
import { nextOrder } from '@pommora/uix/Interactions/reorderModel'
import { Cell } from '../../Properties/Cells/Cell'
import { EntityIcon } from '../../Assets/EntityIcon'
import { PropertyTypeIcon, propertyIcon } from '../../Properties/Cells/PropertyTypes'
import { ViewGroupBand } from '../Bands/ViewGroupBand'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { columnLabel, useCapitalizeMetadata } from '../../Properties/Cells/columnLabel'
import { clampWidth, widthFor } from './columnWidths'
import { alignFor } from '../columnAlign'
import { useStyleFor } from '../Host/useColumnStyles'
import { reorderColumns } from './columnReorder'
import { groupKeyToValue } from '../reassign'
import { cx } from '@pommora/uix/Utilities/cx'
import { text } from '@pommora/uix/Theme'
import { IconChoice } from '../../Assets/IconChoice'
import { Icon } from '@pommora/uix/Symbols'
import { TextPicker } from '@pommora/uix/Pickers/TextPicker/TextPicker'
import { numberDivisor } from '../../Properties/formatValue'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { ColumnHeader } from './ColumnHeader'
import './table-view.css'
import { announce } from '@pommora/uix/Interactions/a11y'
import { findScroller, startAutoScroll } from '@pommora/uix/Interactions/autoscroll'
import {
  GHOST_DWELL_MS,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@pommora/uix/Interactions/ghostCreate'
import { useCellSweep } from './cellSweep'
import { TableRowDnd, useTableRowDrag } from '@pommora/uix/Interactions/tableDnd'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { openWebLink } from '../../Web/openWebLink'
import {
  linkAlias,
  linkEditText,
  urlClickTarget,
  urlValueFromEdit,
  urlValueFromRename,
} from '@pommora/core/Connections/linkValue'
import { resolveTitle, validateLink } from '../../Properties/Cells/linkResolve'
import { linkValueMenuTarget, showConnectionMenu } from '../../Interface/Menus/connectionMenu'
import { popRowMenu } from '../../Actions/nativeMenus'

// TUNABLE — px past a column's edge the drag center must travel before the slot flips (sticky zone).
const COL_SHIFT_HYSTERESIS = 25

// KNOB — how long a left ghost survives before its collapse starts; 0 closes on leave immediately.
const GHOST_GRACE_MS = 0

export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
  const capitalize = useCapitalizeMetadata()
  const {
    source,
    schema,
    view,
    liveView,
    values,
    setValueOverride,
    columns,
    groups,
    setTree,
    ctx,
    contextIds,
    setNames,
    setIcons,
    setPaths,
    rowById,
    rowBand,
    bandLabel,
    collapsed,
    toggleCollapse,
    structuralGrouping,
    subGrouped,
    groupPropId,
    groupPropType,
    canReassign,
    canReorderWithin,
    canRelocate,
    reassignBySortRun,
    structuralOrder,
    dragDisabled,
    viewOrders,
    persistViewOrder,
    setManualOverride,
    setOrderOverride,
    setHiddenOverride,
    persistView,
    commitBand,
    setStylePatch,
    setProperty,
    commitValue,
    contextOptionsFor,
    creation,
    mutate,
    select,
  } = host
  const styleFor = useStyleFor()
  const selection = useSession((s) => s.selection)
  // Local column layers stay OUT of `liveView` — a resize must not re-run the pipeline.
  const [widthOverride, setWidthOverride] = useState<Record<string, number>>({})
  const [alignOverride, setAlignOverride] = useState<Record<string, ColumnAlign>>({})
  const [collapsing, setCollapsing] = useState<string | null>(null)
  const [sliding, setSliding] = useState<ReadonlySet<string>>(() => new Set())
  const prevLooks = useRef<Record<string, string | undefined>>({})
  const [colDrag, setColDrag] = useState<{ from: number; to: number; id: string } | null>(null)
  const beginGesture = usePointerGesture()
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconTarget, setIconTarget] = useState<{ path: string; icon?: string } | null>(null)
  const iconCellRef = useRef<HTMLElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)
  // The column sum, read from here rather than scrollWidth: scrollWidth floors at clientWidth, so an is-content-bigger comparison built on it latches.
  const reflowRef = useRef(0)
  const [editing, setEditing] = useState<{
    rowId: string
    colId: string
    mode: 'picker' | 'editor' | 'rename'
    nonce?: number
    fromCreate?: true
  } | null>(null)
  const [resizing, setResizing] = useState(false)
  const triggerElRef = useRef<HTMLElement | null>(null)
  const lastPicker = useRef<{ rowId: string; colId: string } | null>(null)
  if (editing?.mode === 'picker')
    lastPicker.current = { rowId: editing.rowId, colId: editing.colId }
  const renameNonce = useRef(0)
  const lastRename = useRef<{ rowId: string; colId: string; nonce: number } | null>(null)
  if (editing?.mode === 'rename') {
    lastRename.current = { rowId: editing.rowId, colId: editing.colId, nonce: editing.nonce ?? 0 }
  }
  useEffect(() => {
    setWidthOverride({})
    setAlignOverride({})
    setCollapsing(null)
    setColDrag(null)
  }, [view.id])
  useEffect(() => {
    const el = host.seam.viewRootRef.current
    if (!el) return
    const check = (): void => {
      const cs = getComputedStyle(el)
      const pads = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight)
      const gridEl = el.querySelector('.table-grid')
      const zoom = gridEl
        ? Number.parseFloat(getComputedStyle(gridEl).getPropertyValue('zoom')) || 1
        : 1
      setOverflowing(reflowRef.current * zoom > el.clientWidth - pads + 1)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const grid = el.querySelector('.table-grid')
    if (grid) ro.observe(grid)
    return () => ro.disconnect()
  }, [])

  const bands = useMemo(() => flattenBands(groups, collapsed), [groups, collapsed])
  const childIdsOf = (nodes: SetTreeNode[], id: string): string[] | null => {
    for (const n of nodes) {
      if (n.id === id) return n.children.map((c) => c.id)
      const hit = childIdsOf(n.children, id)
      if (hit) return hit
    }
    return null
  }
  const subGroupOrderPatch = (
    sub: NonNullable<SavedView['sub_group']>,
    draggedId: string,
    beforeId: string | null,
  ): Partial<SavedView> | null => {
    const bucketByKey = new Map(
      groups.flatMap((g) =>
        (g.children ?? []).flatMap((c) =>
          c.bucket !== undefined ? [[c.key, c.bucket] as const] : [],
        ),
      ),
    )
    const draggedBucket = bucketByKey.get(draggedId)
    if (draggedBucket === undefined) return null
    const beforeBucket = beforeId === null ? null : (bucketByKey.get(beforeId) ?? null)
    if (beforeBucket === draggedBucket) return null
    const present = [...new Set(bucketByKey.values())]
    return {
      sub_group: { ...sub, order: propertyOrderAfterDrop(present, draggedBucket, beforeBucket) },
    }
  }
  const onBandDrop = (draggedId: string, drop: BandDrop): void => {
    const dragged = bands.find((b) => b.id === draggedId)
    if (!dragged) return
    if (dragged.kind === 'property') {
      if (liveView.group?.kind === 'property') {
        if (drop.kind !== 'reorder') return
        const patch = bandReorderPatch({
          dragged,
          beforeId: drop.beforeId,
          view: liveView,
          structuralIds: [],
          propertyKeys: groups.filter((g) => g.kind === 'property').map((g) => g.key),
        })
        if (patch) commitBand(patch)
        return
      }
      if (!subGrouped || !liveView.sub_group || liveView.sub_group.order_mode !== 'manual') return
      const sub = subGroupOrderPatch(liveView.sub_group, draggedId, drop.beforeId)
      if (sub) commitBand(sub)
      return
    }
    // The id universe is the set tree, never the rendered groups — a filter prunes emptied bands out of `groups`, and merging against that drops their stored order.
    const structural = bandReorderPatch({
      dragged,
      beforeId: drop.beforeId,
      view: liveView,
      structuralIds: setTree.flatMap(subtreeIds),
      propertyKeys: [],
    })
    if (!structural) return
    if (drop.kind === 'reorder') {
      if (structuralGrouping && liveView.structural_order_mode === 'location') {
        const parentPath = dragged.parentId === null ? source.path : setPaths.get(dragged.parentId)
        const siblingIds =
          dragged.parentId === null
            ? setTree.map((n) => n.id)
            : (childIdsOf(setTree, dragged.parentId) ?? [])
        if (!parentPath) return
        void mutate({
          op: 'reorderChildren',
          parentPath,
          key: 'set_order',
          order: nextOrder(siblingIds, draggedId, drop.beforeId),
        })
        return
      }
      commitBand(structural)
      return
    }
    const path = setPaths.get(draggedId)
    const destPath = drop.targetParentId === null ? source.path : setPaths.get(drop.targetParentId)
    const destChildIds =
      drop.targetParentId === null
        ? setTree.map((n) => n.id)
        : childIdsOf(setTree, drop.targetParentId)
    if (!path || !destPath || !destChildIds) return
    // The fs move lands before the view write: views.save and set_order are both read-modify-writes on the container sidecar, so a failed move commits nothing.
    void (async () => {
      if (
        !(await mutate({
          op: 'moveSet',
          path,
          newParentPath: destPath,
          order: reparentFsOrder(destChildIds, draggedId),
        }))
      )
        return
      commitBand(structural)
    })()
  }

  const reorderColumn = (activeId: string, overId: string): void => {
    const next = reorderColumns(
      columns.map((c) => c.id),
      liveView.property_order,
      activeId,
      overId,
    )
    setOrderOverride(next)
    persistView({ property_order: next })
  }
  const resizeColumn = (id: string, width: number): number => {
    const clamped = clampWidth(
      Math.round(width),
      id,
      schema,
      colStyle(id).look,
      contextIds,
      iconsShown,
    )
    setWidthOverride((prev) => ({ ...prev, [id]: clamped }))
    return clamped
  }
  // Captured at resize start so an abort restores exactly — an entry absent before the drag is deleted, never written back as a width a later persist would carry to disk.
  const resizeBaseline = useRef<{ id: string; value: number | undefined } | null>(null)
  const startResize = (id: string): void => {
    resizeBaseline.current = { id, value: widthOverride[id] }
    setResizing(true)
  }
  // Cleared by whichever end fires, never by teardown — the skeleton runs teardown BEFORE onAbort.
  const abortResize = (): void => {
    const b = resizeBaseline.current
    if (!b) return
    resizeBaseline.current = null
    setWidthOverride((prev) => {
      const next = { ...prev }
      if (b.value === undefined) delete next[b.id]
      else next[b.id] = b.value
      return next
    })
  }
  const endResize = (): void => {
    setResizing(false)
  }
  const commitResize = (id: string, width: number): void => {
    resizeBaseline.current = null
    persistView({
      column_widths: {
        ...liveView.column_widths,
        ...widthOverride,
        [id]: clampWidth(width, id, schema, colStyle(id).look, contextIds, iconsShown),
      },
    })
  }
  const hideColumn = (id: string): void => {
    setCollapsing(id)
  }
  const commitHide = (): void => {
    if (!collapsing) return
    const hidden = [...(liveView.hidden_properties ?? []), collapsing]
    setCollapsing(null)
    setHiddenOverride(hidden)
    persistView({ hidden_properties: hidden })
  }
  const resolveAlign = (id: string): ColumnAlign =>
    alignOverride[id] ?? alignFor(id, schema, liveView, contextIds)
  const resolveStyle = (id: string): ColumnStyle => styleFor(id, schema, liveView)
  const { alignById, styleById } = useMemo(
    () => ({
      alignById: new Map<string, ColumnAlign>(columns.map((c) => [c.id, resolveAlign(c.id)])),
      styleById: new Map<string, ColumnStyle>(columns.map((c) => [c.id, resolveStyle(c.id)])),
    }),
    [columns, schema, liveView, alignOverride, contextIds],
  )
  const colAlign = (id: string): ColumnAlign => alignById.get(id) ?? resolveAlign(id)
  const iconsShown = !(liveView.hide_column_icons ?? true)
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
  const colStyle = (id: string): ColumnStyle => styleById.get(id) ?? resolveStyle(id)
  const setColumnAlign = (id: string, align: ColumnAlign): void => {
    setAlignOverride((prev) => ({ ...prev, [id]: align }))
    persistView({
      column_alignments: { ...liveView.column_alignments, ...alignOverride, [id]: align },
    })
  }
  const numberBarCapable = (colId: string, type: ReturnType<typeof declaredType>): boolean =>
    type === 'number' && numberDivisor(schema.find((d) => d.id === colId)) !== undefined
  const openHeaderMenu = async (
    id: string,
    isTitle: boolean,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.preventDefault()
    const t = declaredType(id, schema)
    const barCapable = numberBarCapable(id, t)
    const style =
      t !== undefined && t !== 'title' && t !== 'context'
        ? { type: t, current: colStyle(id), ...(barCapable ? { barCapable: true } : {}) }
        : undefined
    const action = await popRowMenu(
      columnMenuItems({
        align: colAlign(id),
        alignable: !isTitle,
        hideable: !isTitle,
        iconsShown,
        style,
      }),
    )
    if (action === 'column:hide') hideColumn(id)
    else if (action === 'column:toggle-icons') persistView({ hide_column_icons: iconsShown })
    else if (action?.startsWith('align:'))
      setColumnAlign(id, action.slice('align:'.length) as ColumnAlign)
    else if (action?.startsWith('style:')) {
      const parsed = parseStyleAction(action)
      if (parsed) setStylePatch(id, parsed.key, parsed.value)
    }
  }
  const onCellClick = (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent): void => {
    // Ctrl+Click is macOS's secondary-click: it fires `click` alongside `contextmenu`, so bail and let the right-click menu win.
    if (e.ctrlKey) return
    triggerElRef.current = e.currentTarget as HTMLElement
    if (col.kind === 'title') {
      e.stopPropagation()
      const owner =
        source.kind === 'collection'
          ? source
          : findCollectionForSet(useSession.getState().tree, source.id)
      if (owner?.openIn === 'page-preview') {
        if (e.metaKey) void select({ kind: 'page', id: row.id, path: row.path }, { newTab: true })
        else useSession.getState().openWindow({ id: row.id, path: row.path })
      } else void select({ kind: 'page', id: row.id, path: row.path })
      return
    }
    if (col.kind === 'context') {
      e.stopPropagation()
      setEditing({ rowId: row.id, colId: col.id, mode: 'picker' })
      return
    }
    if (col.kind !== 'property') return
    const t = declaredType(col.id, schema)
    const value = resolveFieldValue(row, col.id, schema)
    const def = schema.find((d) => d.id === col.id)
    const shared = sharedValueClickAction(t, value)
    if (shared) {
      e.stopPropagation()
      if (shared.kind === 'commit') setProperty(row, col.id, shared.value)
      else if (shared.kind === 'file') {
        if (def)
          pickFileInto(def, value, fileChipIndex(e.target), (n) => setProperty(row, col.id, n))
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
    const trimmed = raw.trim()
    if (col.kind === 'title') {
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
    const t = declaredType(col.id, schema)
    if (t === 'number') {
      if (trimmed === '') {
        setProperty(row, col.id, null)
        return
      }
      const n = Number.parseFloat(trimmed)
      if (!Number.isNaN(n)) setProperty(row, col.id, { kind: 'number', value: n })
    } else if (t === 'url') {
      const cur = resolveFieldValue(row, col.id, schema)
      const next = urlValueFromEdit(
        trimmed,
        cur.kind === 'url' ? cur.value : undefined,
        resolveTitle,
      )
      if (next !== undefined) setProperty(row, col.id, next)
    }
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

  const pickerDefOf = (
    col: ResolvedColumn,
  ): { def: PropertyDefinition; contextOptions: ContextOption[] | null } | null => {
    const contextOptions = contextOptionsFor(col)
    const def =
      schema.find((d) => d.id === col.id) ??
      (contextOptions ? syntheticContextDef(col.id) : undefined)
    return def ? { def, contextOptions } : null
  }
  const pickerCell = (): { row: ViewRow; col: ResolvedColumn } | null => {
    const cell = editing?.mode === 'picker' ? editing : lastPicker.current
    const row = cell && rowById.get(cell.rowId)
    const col = cell && columns.find((c) => c.id === cell.colId)
    return row && col ? { row, col } : null
  }
  const cellTarget = (): PickTarget | null => {
    const c = pickerCell()
    if (!c) return null
    const picked = pickerDefOf(c.col)
    if (!picked) return null
    const current = resolveFieldValue(c.row, c.col.id, schema)
    const style = colStyle(c.col.id)
    return c.col.kind === 'property' && declaredType(c.col.id, schema) === 'datetime'
      ? { kind: 'datetime', def: picked.def, current, dateFormat: style.date_format }
      : {
          kind: 'options',
          def: picked.def,
          current,
          look: style.look,
          contextOptions: picked.contextOptions ?? undefined,
        }
  }
  const cellPicker = (): React.ReactNode => (
    <PropertyPicker
      target={cellTarget()}
      open={editing?.mode === 'picker'}
      triggerRef={triggerElRef}
      onCommit={(v) => {
        const c = pickerCell()
        if (c) commitValue(c.row, c.col, v)
      }}
      onDismiss={() => setEditing(null)}
    />
  )
  const massPicker = (): React.ReactNode => {
    if (!mass) return null
    const col = columns.find((c) => c.id === mass.colId)
    if (!col) return null
    const rows = mass.rowIds.flatMap((id) => {
      const r = rowById.get(id)
      return r ? [r] : []
    })
    if (rows.length < 2) return null
    const picked = pickerDefOf(col)
    if (!picked) return null
    const { def, contextOptions } = picked
    const currents = rows.map((r) => resolveFieldValue(r, col.id, schema))
    return (
      <MassPropertyPicker
        key={`${mass.colId}:${mass.rowIds.join('.')}`}
        def={def}
        currents={currents}
        open={massOpen}
        triggerRef={massTriggerRef}
        look={colStyle(col.id).look}
        {...(contextOptions ? { contextOptions } : {})}
        onPick={(commits) => {
          if (commits.length === 0) return
          const prev = commits.map(({ index }) => ({
            id: rows[index].id,
            value: currents[index],
          }))
          const dispose = pushValueUndo(() => {
            const liveCol = cellApiRef.current.columns.find((c) => c.id === col.id)
            if (!liveCol) return
            for (const { id, value } of prev) {
              const row = cellApiRef.current.rowById.get(id)
              if (row) cellApiRef.current.commitValue(row, liveCol, value)
            }
          })
          undoDisposers.current.push(dispose)
          for (const { index, next } of commits) commitValue(rows[index], col, next)
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
            const trimmed = text.trim()
            if (trimmed === '') setProperty(row, col.id, null)
            else {
              const n = Number.parseFloat(trimmed)
              if (!Number.isNaN(n)) setProperty(row, col.id, { kind: 'number', value: n })
            }
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
          setProperty(row, col.id, urlValueFromRename(alias, raw))
          setEditing(null)
        }}
        onDismiss={() => setEditing(null)}
      />
    )
  }
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
        if (action === 'link:clear') return setProperty(row, col.id, null)
        if (action === 'editLink')
          return setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
        if (action !== 'rename') return
        triggerElRef.current = cellEl
        renameNonce.current += 1
        setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
      })
      if (target) {
        await holdGhost(async () => showConnectionMenu(target))
        return
      }
    }
    const barCapable = numberBarCapable(col.id, dt)
    const chip = fileChipIndex(e.target)
    const base = cellMenuContextFor(col, dt, colStyle(col.id), filled, {
      barCapable,
      onChip: chip !== null,
    })
    if (!base) return
    const { tabs, pinned, tree } = useSession.getState()
    const ctx: CellMenuContext =
      base.kind === 'title'
        ? {
            ...base,
            alreadyOpen: isOpenInTabs(tabs, pinned, { kind: 'page', id: row.id, path: row.path }),
            ...pageMoveContext(tree, row.path),
          }
        : base
    const action = await holdGhost(() => popRowMenu(cellMenuModel(ctx)))
    if (!action) return
    if (runPageSendAction(action, row)) return
    if (
      runFileMenuAction(
        action,
        schema.find((d) => d.id === col.id),
        resolveFieldValue(row, col.id, schema),
        chip,
        (n) => setProperty(row, col.id, n),
      )
    )
      return
    if (action === 'title:window') useSession.getState().openWindow({ id: row.id, path: row.path })
    else if (action === 'title:newtab')
      void useSession
        .getState()
        .select({ kind: 'page', id: row.id, path: row.path }, { newTab: true })
    else if (action === 'title:icon') {
      iconCellRef.current = cellEl
      setIconTarget({ path: row.path, icon: typeof row.icon === 'string' ? row.icon : undefined })
      setIconPickerOpen(true)
    } else if (action === 'title:newabove') void newPageAdjacent(row, 'above')
    else if (action === 'title:newbelow') void newPageAdjacent(row, 'below')
    else if (action === 'title:delete')
      void confirmDelete({ path: row.path, kind: 'page', title: row.title })
    else if (action === 'title:rename' || action === 'cell:edit')
      setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
    else if (action === 'cell:rename') {
      triggerElRef.current = cellEl
      renameNonce.current += 1
      setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
    } else if (action === 'cell:clear') {
      commitValue(row, col, null)
    } else if (action.startsWith('style:')) {
      const parsed = parseStyleAction(action)
      if (parsed) setStylePatch(col.id, parsed.key, parsed.value)
    }
  }

  const resolveWidth = (id: string): number =>
    clampWidth(
      widthOverride[id] ?? liveView.column_widths?.[id] ?? widthFor(id, schema, contextIds).default,
      id,
      schema,
      colStyle(id).look,
      contextIds,
      iconsShown,
    )
  const widthById = useMemo(
    () => new Map<string, number>(columns.map((c) => [c.id, resolveWidth(c.id)])),
    [columns, schema, liveView, widthOverride, contextIds, styleById],
  )
  const colWidth = (id: string): number =>
    collapsing === id ? 0 : (widthById.get(id) ?? resolveWidth(id))

  const { alignByCol, styleByCol } = useMemo(
    () => ({
      alignByCol: columns.map((c) => colAlign(c.id)),
      styleByCol: columns.map((c) => colStyle(c.id)),
    }),
    [columns, alignById, styleById],
  )
  const widened: string[] = []
  columns.forEach((c, i) => {
    const look = styleByCol[i].look
    const prev = prevLooks.current[c.id]
    prevLooks.current[c.id] = look
    if (prev === undefined || prev === look) return
    const basis =
      widthOverride[c.id] ??
      liveView.column_widths?.[c.id] ??
      widthFor(c.id, schema, contextIds).default
    if (
      clampWidth(basis, c.id, schema, look, contextIds, iconsShown) >
      clampWidth(basis, c.id, schema, prev, contextIds, iconsShown)
    )
      widened.push(c.id)
  })
  if (widened.some((id) => !sliding.has(id))) setSliding((s) => new Set([...s, ...widened]))
  const dragShift = useMemo(() => {
    if (!colDrag) return null
    // A watcher or pane write can reshape `columns` mid-drag — a vanished source column ends the shift rather than painting a neighbor.
    const src = columns[colDrag.from]
    return src && src.id === colDrag.id
      ? { from: colDrag.from, to: colDrag.to, width: colWidth(src.id) }
      : null
  }, [colDrag, columns])
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
    if (t !== 'status' && t !== 'select' && t !== 'multi_select' && t !== 'context') return false
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
  const undoDisposers = useRef<Array<() => void>>([])
  useEffect(
    () => () => {
      for (const dispose of undoDisposers.current) dispose()
      undoDisposers.current = []
    },
    [source.path],
  )
  const titleCol = columns.find((c) => c.kind === 'title')
  const cellApiRef = useRef({
    openCellMenu,
    onCellClick,
    cellEditor,
    commitValue,
    titleCol,
    startSweep,
    columns,
    rowById,
  })
  cellApiRef.current = {
    openCellMenu,
    onCellClick,
    cellEditor,
    commitValue,
    titleCol,
    startSweep,
    columns,
    rowById,
  }
  const editingRef = useRef(editing)
  editingRef.current = editing
  const ghostApi = useGhostAnchor({
    dwellMs: GHOST_DWELL_MS,
    graceMs: GHOST_GRACE_MS,
    suppressed: () => editingRef.current !== null,
  })
  const ghost = ghostApi.ghost
  const holdGhost = ghostApi.suppressWrap
  useClearStrandedGhost(ghostApi, rowById)
  const strandedEditId = editing !== null && !rowById.has(editing.rowId) ? editing.rowId : null
  useEffect(() => {
    if (strandedEditId !== null) setEditing((e) => (e?.rowId === strandedEditId ? null : e))
  }, [strandedEditId])
  const titleColId = titleCol?.id
  const openCreateRename = (created: { id: string }): void => {
    if (titleColId)
      setEditing({ rowId: created.id, colId: titleColId, mode: 'editor', fromCreate: true })
  }
  const { bandAdd, createAdjacent: newPageAdjacent, containerPages } = creation
  const cellApi = useMemo<RowCellApi>(
    () => ({
      menu: (row, col, e) => void cellApiRef.current.openCellMenu(row, col, e),
      click: (row, col, e) => cellApiRef.current.onCellClick(row, col, e),
      overlay: (row, col) => cellApiRef.current.cellEditor(row, col),
      remove: (row, col, next) => cellApiRef.current.commitValue(row, col, next),
      grip: (row, e) => {
        const col = cellApiRef.current.titleCol
        if (col) void cellApiRef.current.openCellMenu(row, col, e)
      },
      sweep: (row, col, e) => cellApiRef.current.startSweep(row, col, e),
      hover: (row, entering) => ghostApi.onHover(row.id, entering),
    }),
    [],
  )
  const overlayTarget = editing?.mode === 'editor' ? editing : null
  const renameTarget = editing?.mode === 'rename' ? editing : null
  const activeCell = editing ? { rowId: editing.rowId, colId: editing.colId } : null
  // Above the early returns — a hook after a conditional return crashes React the moment the condition flips.
  const { dataRows, rowPath } = useMemo(() => {
    const rows: { id: string; path: string; groupKey: string }[] = []
    const collect = (g: ResolvedGroup): void => {
      for (const r of g.items) rows.push({ id: r.id, path: r.path, groupKey: g.key })
      for (const c of g.children ?? []) collect(c)
    }
    groups.forEach(collect)
    return {
      dataRows: rows,
      rowPath: new Map(rows.map((r) => [r.id, r.path] as const)),
    }
  }, [groups])

  const subTargets = useMemo(() => {
    const m = new Map<string, { setId: string | null; bucket: string | null }>()
    for (const g of groups) {
      if (g.kind === 'structural-set') {
        for (const c of g.children ?? []) m.set(c.key, { setId: g.key, bucket: c.bucket ?? null })
      } else if (g.kind === 'ungrouped') m.set(g.key, { setId: null, bucket: null })
    }
    return m
  }, [groups])

  host.seam.foldOverrides.current = (v) => ({
    ...v,
    column_widths: { ...v.column_widths, ...widthOverride },
    column_alignments: { ...v.column_alignments, ...alignOverride },
  })
  host.seam.bandBucket.current = (key) => (subGrouped ? (subTargets.get(key)?.bucket ?? null) : key)
  host.seam.onCreated.current = openCreateRename

  const reflowWidth = columns.reduce((sum, c) => sum + colWidth(c.id), 0)
  reflowRef.current = reflowWidth
  const cols = `${columns.map((c) => `${colWidth(c.id)}px`).join(' ')} 1fr`
  const indent = (depth: number): string =>
    depth > 0 ? `calc(var(--loose-inset) + var(--row-indent) * ${depth})` : 'var(--loose-inset)'
  const groupIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`

  const startColumnDrag = (e: React.PointerEvent, from: number): void => {
    if (e.button !== 0) return
    e.preventDefault()
    const header = e.currentTarget as HTMLElement
    const grid = header.closest('.table-grid') as HTMLElement | null
    if (!grid) return
    // Snapshot in the activation, not the press: a per-move rect loop forces layout in the drag hot path, and a pending-phase scroll would strand a press-time origin.
    let zoom = 1
    let startCenter = 0
    let startX = 0
    let gridLeft = 0
    let widths: number[] = []
    let lefts: number[] = []
    const dragId = columns[from].id
    let current: { from: number; to: number; id: string } | null = null
    let lastX = e.clientX
    let lastY = e.clientY
    let stopScroll: (() => void) | null = null
    const resolve = (): void => {
      const projected = startCenter + (lastX - startX)
      const cur = current?.to ?? from
      const curLeft = gridLeft + lefts[cur]
      const curRight = curLeft + widths[cur]
      let to = cur
      if (
        projected < curLeft - COL_SHIFT_HYSTERESIS ||
        projected > curRight + COL_SHIFT_HYSTERESIS
      ) {
        to = columns.length - 1
        for (let i = 0; i < columns.length; i++) {
          if (projected < gridLeft + lefts[i] + widths[i]) {
            to = i
            break
          }
        }
      }
      grid.style.setProperty(
        '--col-drag-x',
        `${(projected - (gridLeft + lefts[from] + widths[from] / 2)) / zoom}px`,
      )
      if (!current || current.to !== to) {
        current = { from, to, id: dragId }
        setColDrag(current)
      }
    }
    beginGesture({
      el: header,
      event: e,
      onActivate: (ev) => {
        // Read computed so a scaled tile's drag maps 1:1 — not the --zoom token alone, and never back-solved from rendered width ÷ track width (that bakes in layout slack).
        zoom = Number.parseFloat(getComputedStyle(grid).getPropertyValue('zoom')) || 1
        const hr = header.getBoundingClientRect()
        startCenter = hr.left + hr.width / 2
        startX = ev.clientX
        lastX = ev.clientX
        gridLeft = grid.getBoundingClientRect().left
        widths = columns.map((c) => colWidth(c.id) * zoom)
        lefts = new Array(columns.length)
        let acc = 0
        for (let i = 0; i < columns.length; i++) {
          lefts[i] = acc
          acc += widths[i]
        }
        const sc = findScroller(grid, 'x')
        if (sc) {
          stopScroll = startAutoScroll({
            getPoint: () => ({ x: lastX, y: lastY }),
            scroller: sc,
            dragEl: grid,
            axis: 'x',
          })
        }
        announce('Picked up column.')
        return true
      },
      onDragMove: (ev) => {
        lastX = ev.clientX
        lastY = ev.clientY
        resolve()
      },
      scrollTarget: () => grid,
      onWindowScroll: () => {
        gridLeft = grid.getBoundingClientRect().left
        resolve()
      },
      onDrop: () => {
        if (current && current.to !== current.from) {
          reorderColumn(columns[current.from].id, columns[current.to].id)
          announce('Moved column.')
        }
      },
      teardown: () => {
        stopScroll?.()
        stopScroll = null
        grid.style.removeProperty('--col-drag-x')
        setColDrag(null)
      },
    })
  }
  const colTransform = (ci: number): string | undefined => gapShift(dragShift, ci)

  const patchBandValue = (pageId: string, value: PropertyValue | null): PageFrontmatter | null => {
    const def = schema.find((d) => d.id === groupPropId)
    if (!def) return null
    return applyValueAtRoot(
      frontmatterOf(values, pageId) as Record<string, unknown>,
      def,
      value,
    ) as PageFrontmatter
  }
  const reassignRow = (pageId: string, destGroupKey: string): void => {
    const path = rowPath.get(pageId)
    if (!groupPropId || !path) return
    if (subGrouped) {
      const dest = subTargets.get(destGroupKey)
      const cur = subTargets.get(rowBand.get(pageId) ?? '')
      if (!dest) return
      const destPath = dest.setId === null ? source.path : setPaths.get(dest.setId)
      if (!destPath) return
      const bucketChanged = dest.bucket !== (cur?.bucket ?? null)
      const setChanged = dest.setId !== (cur?.setId ?? null)
      const value = groupKeyToValue(dest.bucket ?? UNGROUPED, groupPropType)
      const write = (async () => {
        if (
          bucketChanged &&
          !(await mutate({ op: 'setProperty', path, propertyId: groupPropId, value }))
        )
          return
        if (setChanged) await mutate({ op: 'movePage', path, newParentPath: destPath })
      })()
      const patched = bucketChanged ? patchBandValue(pageId, value) : undefined
      if (patched) patchOverride(setValueOverride, pageId, patched, write)
      return
    }
    const value = groupKeyToValue(destGroupKey, groupPropType)
    const write = mutate({ op: 'setProperty', path, propertyId: groupPropId, value })
    const patched = patchBandValue(pageId, value)
    if (patched) patchOverride(setValueOverride, pageId, patched, write)
  }
  const relocateRow = (pageId: string, destGroupKey: string): void => {
    const path = rowPath.get(pageId)
    const destPath = destGroupKey === UNGROUPED ? source.path : setPaths.get(destGroupKey)
    if (!path || !destPath || destPath === parentOf(path)) return
    const order = [...containerPages(destPath), pageId]
    const spliceLive = (existing: string[]): string[] => [
      ...existing.filter((id) => id !== pageId),
      pageId,
    ]
    setManualOverride((m) => (m ? spliceLive(m) : m))
    if (viewOrders[view.id]) persistViewOrder(spliceLive(viewOrders[view.id]))
    void mutate({ op: 'movePage', path, newParentPath: destPath, order })
  }
  const reorderTo = (orderIds: string[], groupKey: string, activeId: string): void => {
    setManualOverride(orderIds)
    if (structuralOrder) {
      const groupPages = orderIds.filter((id) => rowBand.get(id) === groupKey)
      const firstPath = groupPages.length ? rowPath.get(groupPages[0]) : undefined
      if (firstPath) {
        const containerPath = parentOf(firstPath)
        void mutate({
          op: 'movePage',
          path: firstPath,
          newParentPath: containerPath,
          order: groupPages,
        })
      }
      return
    }
    persistViewOrder(orderIds)
    reassignBySortRun(orderIds, groupKey, activeId)
  }

  const ghostCreate = (): void => {
    const anchorId = ghostApi.take()
    const anchor = anchorId ? rowById.get(anchorId) : undefined
    if (anchor) void newPageAdjacent(anchor, 'below')
  }

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
              onClosed={ghostApi.closed}
              onEnter={ghostApi.onGhostEnter}
              onLeave={ghostApi.onGhostLeave}
              onCreate={ghostCreate}
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
          g.kind === 'structural-set' && setPaths.has(g.key) ? () => bandAdd(g.key) : undefined
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
      <IconChoice
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        triggerRef={iconCellRef}
        value={iconTarget?.icon}
        onSelect={(icon) => {
          if (iconTarget) void mutate({ op: 'setIcon', path: iconTarget.path, kind: 'page', icon })
        }}
      />
      <BandDnd bands={bands} labelFor={bandLabel} onDrop={onBandDrop}>
        <TableRowDnd
          rows={dataRows}
          disabled={dragDisabled}
          canReorderWithin={canReorderWithin}
          canReassign={canReassign}
          canRelocate={canRelocate}
          reorderTo={reorderTo}
          reassign={reassignRow}
          relocate={relocateRow}
        >
          <div
            className={cx(
              'table-grid',
              text.body.standard,
              liveView.hide_borders && 'no-borders',
              columns.length === 1 && 'single-column',
              collapsing != null && 'col-hiding',
              sliding.size > 0 && 'col-sliding',
              colDrag != null && 'col-dragging-active',
              resizing && 'col-resizing-active',
            )}
            style={{ minWidth: reflowWidth, '--cols': cols } as React.CSSProperties}
          >
            <div
              className="table-head"
              onTransitionEnd={(e) => {
                if (e.propertyName !== 'grid-template-columns') return
                commitHide()
                setSliding((s) => (s.size ? new Set() : s))
              }}
            >
              {columns.map((c, i) => (
                <ColumnHeader
                  key={c.id}
                  id={c.id}
                  label={columnLabel(c.id, schema, ctx.contexts, capitalize)}
                  icon={headerIcon(c.id)}
                  width={colWidth(c.id)}
                  align={colAlign(c.id)}
                  transform={colTransform(i)}
                  dragging={colDrag?.from === i}
                  onDragStart={(e) => startColumnDrag(e, i)}
                  onResize={resizeColumn}
                  onResizeStart={startResize}
                  onResizeAbort={abortResize}
                  onResizeEnd={endResize}
                  onResizeCommit={commitResize}
                  onContextMenu={(e) => void openHeaderMenu(c.id, c.kind === 'title', e)}
                />
              ))}
              {/* Empty but load-bearing: the :last-child anchor that keeps the last real column's right divider (Table.css). */}
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
  hover: (row: ViewRow, entering: boolean) => void
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
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useSemanticElements: a hover-born affordance that must wear the row grid's own chrome — a real <button> can't host a .data-row, and keyboard creation lives in the menus */}
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

type DragShift = { from: number; to: number; width: number }

function gapShift(d: DragShift | null, ci: number): string | undefined {
  if (!d) return undefined
  if (d.to < d.from && ci >= d.to && ci < d.from) return `translateX(${d.width}px)`
  if (d.to > d.from && ci > d.from && ci <= d.to) return `translateX(${-d.width}px)`
  return undefined
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
      onPointerEnter={() => api.hover(row, true)}
      onPointerLeave={() => api.hover(row, false)}
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
