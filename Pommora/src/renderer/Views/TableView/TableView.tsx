import { memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { UNGROUPED } from '@shared/types'
import { patchOverride } from '../useValuesEpoch'
import type { ResolvedColumn, ResolvedGroup, ViewRow } from '@shared/types'
import type { PageFrontmatter } from '@shared/schemas'
import type { ColumnStyle } from '@shared/columnStyles'
import { confirmDelete } from '@renderer/Windows/confirmations'
import { type CellMenuContext, cellMenuContextFor } from '@shared/cellMenu'
import { parseStyleAction } from '@shared/columnMenu'
import type { ColumnAlign, SavedView } from '@shared/views'
import { applyValueAtRoot, isBlankValue, type PropertyValue } from '@shared/propertyValue'
import { parentOf } from '@shared/treePatch'
import type { PropertyDefinition } from '@shared/properties'
import type { ContextOption } from '@renderer/Properties/contextOptions'
import { frontmatterOf, subtreeIds } from '../Pipeline/group'
import { declaredType, resolveFieldValue } from '@renderer/Properties/value'
import { PropertyEditor } from '@renderer/Properties/Assignment/PropertyEditor'
import { MassPropertyPicker } from '@renderer/Properties/Assignment/MassPropertyPicker'
import { pushValueUndo } from '@renderer/Properties/Assignment/valueUndo'
import { PropertyPicker, syntheticContextDef } from '@renderer/Properties/Assignment/PropertyPicker'
import { DatetimeValuePicker } from '@renderer/Properties/Assignment/DatetimeValuePicker'
import { sharedValueClickAction } from '@renderer/Properties/Assignment/valueClick'
import type { ViewHostApi } from '../useViewHost'
import {
  fileChipIndex,
  pickFileInto,
  runFileMenuAction,
} from '@renderer/Properties/Assignment/filePick'
import { useSession } from '../../store'
import { pageMoveContext, runPageSendAction } from '@renderer/Actions/pageMenuActions'
import { findCollectionForSet } from '@renderer/Interface/scope'
import { isOpenInTabs } from '../../Tabs/tabsModel'
import type { SetTreeNode } from '../Pipeline/group'
import type { ResolveContext } from '@renderer/Properties/resolveContext'
import { BandDnd, type BandDrop } from '../BandDnd'
import { flattenBands, propertyOrderAfterDrop, reparentFsOrder } from '../bandDndModel'
import { bandReorderPatch } from '../useBandOrdering'
import { nextOrder } from '@renderer/Sidebar/sidebarDndModel'
import { Cell } from '@renderer/Properties/Assignment/Cell'
import { EntityIcon } from '@renderer/Utilities/EntityIcon'
import { PropertyTypeIcon, propertyIcon } from '@renderer/Properties/PropertyTypes'
import { ViewGroupBand } from '../ViewGroupBand'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import { columnLabel, useCapitalizeMetadata } from '@renderer/Properties/Assignment/columnLabel'
import { clampWidth, widthFor } from '@renderer/Tables/columnWidths'
import { alignFor } from '@renderer/Tables/columnAlign'
import { useStyleFor } from '@renderer/Tables/columnStyles'
import { reorderColumns } from '@renderer/Tables/columnReorder'
import { groupKeyToValue } from './reassign'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { text } from '@renderer/DesignSystem/Tokens'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'
import { TextPicker } from '@renderer/DesignSystem/Pickers/TextPicker'
import { numberDivisor } from '@renderer/Properties/Assignment/formatValue'
import { usePointerGesture } from '@renderer/DesignSystem/Interactions/gesture'
import { ColumnHeader } from '@renderer/Tables/ColumnHeader'
import './table-view.css'
import { announce } from '@renderer/DesignSystem/Interactions/a11y'
import { findScroller, startAutoScroll } from '@renderer/DesignSystem/Interactions/autoscroll'
import {
  GHOST_DWELL_MS,
  useClearStrandedGhost,
  useGhostAnchor,
} from '@renderer/DesignSystem/Interactions/ghostAnchor'
import { useCellSweep } from '@renderer/Tables/cellSweep'
import { TableRowDnd, useTableRowDrag } from '@renderer/Tables/tableDnd'
import { solidColorCss } from '@renderer/DesignSystem/Tokens/solidColor'
import { openWebLink } from '@renderer/Links/openWebLink'
import {
  linkAlias,
  linkEditText,
  urlClickTarget,
  urlValueFromEdit,
  urlValueFromRename,
} from '@shared/linkValue'
import { resolveTitle, validateLink } from '@renderer/Links/linkResolve'
import { linkValueMenuTarget, showConnectionMenu } from '@renderer/Links/connectionMenu'

// TUNABLE — px past a column's edge the drag center must travel before the slot flips (sticky zone).
const COL_SHIFT_HYSTERESIS = 25

// KNOB — how long a left ghost survives before its collapse starts; 0 closes on leave immediately.
const GHOST_GRACE_MS = 0

/** The datetime cell's picker shell: PickerMenu portals off the cell (escaping the table's overflow
 *  clip) and self-dismisses via its own backdrop. The calendar's [data-calmenu] sub-menus portal
 *  ABOVE that backdrop (z-index), so their option clicks fall through to the menu, never the dismiss. */
function DatetimeCellPicker({
  open,
  triggerRef,
  onDismiss,
  children,
}: {
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  onDismiss: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <PickerMenu solid open={open} onDismiss={onDismiss} triggerRef={triggerRef}>
      {children}
    </PickerMenu>
  )
}

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
  // Local column layers — resize + align apply instantly and stay OUT of `liveView` so a resize
  // doesn't re-run the pipeline; the fold ref carries them into every host persist.
  const [widthOverride, setWidthOverride] = useState<Record<string, number>>({})
  const [alignOverride, setAlignOverride] = useState<Record<string, ColumnAlign>>({})
  const [collapsing, setCollapsing] = useState<string | null>(null)
  // Columns whose tracks are sliding to a wider per-style min after a look change: enables the
  // same grid-template-columns transition as Hide for one beat, cleared on transitionend. Populated by
  // a render-phase detection (below) so it fires for EVERY look-write path — the column menu AND the
  // property pane — through one mechanism, not a per-call-site trigger.
  const [sliding, setSliding] = useState<ReadonlySet<string>>(() => new Set())
  const prevLooks = useRef<Record<string, string | undefined>>({})
  // Live column smooth-shift: the dragged column index + the slot it's over. Deliberately
  // NOT the cursor delta — that changes per pointermove and rides a grid-level CSS var instead
  // (--col-drag-x), so a drag frame never re-renders the unmemoized row/cell tree. Transient —
  // set on grab + slot flips, cleared on drop; column indices into the resolved `columns`.
  const [colDrag, setColDrag] = useState<{ from: number; to: number; id: string } | null>(null)
  const beginGesture = usePointerGesture()
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  // The page a title:icon menu targeted (captured before the menu await — the row is out of scope by
  // the time the picker commits). The cell element is what the picker anchors to.
  const [iconTarget, setIconTarget] = useState<{ path: string; icon?: string } | null>(null)
  const iconCellRef = useRef<HTMLElement | null>(null)
  // Columns fit → the rounded content-inset look; columns overflow → the right inset flattens and
  // the table h-scrolls to the glass edge (the left gutter holds). One read per pane resize /
  // track-set change — never per scroll or per pointermove.
  const [overflowing, setOverflowing] = useState(false)
  // The column sum (pre-zoom px), readable from the overflow check without a stale closure. The
  // check compares THIS against the box — a scrollWidth read floors at clientWidth, so any
  // is-content-bigger comparison built on it can latch.
  const reflowRef = useRef(0)
  // The one in-cell editing surface (picker · editor). Cleared on dismiss; the
  // exit presence keeps a PICKER mounted through its Bloom-out (reading the last target from the
  // ref while `editing` is already null) — the editor unmounts instantly.
  const [editing, setEditing] = useState<{
    rowId: string
    colId: string
    mode: 'picker' | 'editor' | 'rename'
    // Bumped on each rename OPEN so the popover's key changes — a reopened cell mounts a fresh
    // TextPicker + field instead of reviving the prior session's measured position and stale input.
    nonce?: number
    // A just-created page's naming session: the field opens EMPTY (the page is literally
    // "Untitled" on disk) and its commit rides the create — disambiguating, cascade-free.
    fromCreate?: true
  } | null>(null)
  // A column resize is in progress (set on grab, cleared on commit) — a grid-level flag so the borderless
  // table reveals its vertical dividers while you resize (its reorder twin is colDrag → col-dragging-active).
  const [resizing, setResizing] = useState(false)
  const triggerElRef = useRef<HTMLElement | null>(null)
  const lastPicker = useRef<{ rowId: string; colId: string } | null>(null)
  if (editing?.mode === 'picker')
    lastPicker.current = { rowId: editing.rowId, colId: editing.colId }
  // Its rename twin — the TextPicker alias field keeps its exiting cell through the Bloom-out the same way.
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
  // One mounted observer, two targets, one job (the overflowing flag): the view (pane resizes) and
  // the grid (min-width sizes its box only while the columns overflow the pane — in the fit regime
  // width:100% pins it, and nothing here needs to fire). Each fires one cheap read, never per-scroll.
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

  // The visible band list (headers only) — BandDnd's hit-test universe, snapshot at drag activation.
  const bands = useMemo(() => flattenBands(groups, collapsed), [groups, collapsed])
  const childIdsOf = (nodes: SetTreeNode[], id: string): string[] | null => {
    for (const n of nodes) {
      if (n.id === id) return n.children.map((c) => c.id)
      const hit = childIdsOf(n.children, id)
      if (hit) return hit
    }
    return null
  }
  // Global sub-order — dragging one set's bucket reorders that bucket across EVERY set. A cross-set
  // drag arrives as kind 'reparent' (bandDnd routes by impliedParentId) and is STILL a global
  // reorder: only the beforeId's bucket value matters, targetParentId is ignored. The key→bucket map
  // builds once per drop, never a walk per lookup.
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
  // The band drop router (already classified by BandDnd). The two orders every view writes go
  // through the shared patch; the table adds the two only it can render — a sub-group bucket's
  // global order, and a reparent as moveSet with the destination's CURRENT fs children plus the
  // moved id appended (the visual slot persists only in group_order).
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
    // The id universe is the SET TREE, never the rendered groups: a filter prunes emptied bands out
    // of `groups`, and merging against that would drop their stored order along with them.
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
        // Location mode — the same-parent reorder IS the filesystem write; group_order stays
        // untouched (preserved for the flip back to Custom). The reparent branch below is mode-blind
        // by design: its group_order write is the slot preservation.
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
    // One drop, two writers, possibly ONE sidecar (a de-nest to root): the fs move lands before the
    // view write — views.save and set_order are both read-modify-writes on the container sidecar.
    // A failed move (a name collision at the destination) commits NOTHING — no phantom order.
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
  // Resize applies live (a separate override, so the pipeline doesn't re-run) and returns the clamped
  // width so the header tracks the real edge; commit persists the merged widths.
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
  // The pre-drag override is captured at resize start so an abort restores it EXACTLY — an entry
  // absent before the drag is deleted, never written back as an explicit width that a later persist
  // would carry to disk.
  const resizeBaseline = useRef<{ id: string; value: number | undefined } | null>(null)
  const startResize = (id: string): void => {
    resizeBaseline.current = { id, value: widthOverride[id] }
    setResizing(true)
  }
  // The baseline is consumed by the abort and cleared by whichever end fires — never by teardown,
  // which the skeleton runs BEFORE onAbort.
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
  // Hide animates the column shut on the disclosure token: setCollapsing drives its grid track to
  // 0 (colWidth → 0, animated via .col-hiding); commitHide fires on the header's grid-template-columns
  // transitionend, dropping the column from the pipeline + persisting.
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
  // Per-column align/style resolved ONCE per change, not per call site per render (styleFor
  // allocates) — the id-keyed maps serve the header, track, reflow, and menu readers; the
  // positional arrays below serve the row path. Each reader's resolver fallback covers a column a
  // watcher push removed mid-gesture.
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
  // A column header's glyph, gated by the per-view Column Icons toggle (`hide_column_icons`), which
  // defaults ON (icons hidden). A Context column wears the Context's OWN icon — a shared type glyph
  // would render every Context identically — and a schema-less column (unknown type) gets none.
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
    // A def-less id can still be a reserved column, whose registry type only declaredType supplies.
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
  // Whether a number column can render a bar (percent, or fraction + a denominator) — the ONE gate the
  // cell render, the cell menu, and the header menu share so all three agree on when Bar is offered.
  const numberBarCapable = (colId: string, type: ReturnType<typeof declaredType>): boolean =>
    type === 'number' && numberDivisor(schema.find((d) => d.id === colId)) !== undefined
  // Right-click a header → native column menu: Align + Style + Hide. Title is the primary
  // column — fixed left, not hideable, no style — so it pops nothing. The style ctx rides only for a
  // schema-declared property type; the shared builder decides which types actually get items.
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
    const action = await window.nexus.columnMenu({
      align: colAlign(id),
      alignable: !isTitle,
      hideable: !isTitle,
      iconsShown,
      style,
    })
    if (action === 'column:hide') hideColumn(id)
    else if (action === 'column:toggle-icons') persistView({ hide_column_icons: iconsShown })
    else if (action?.startsWith('align:'))
      setColumnAlign(id, action.slice('align:'.length) as ColumnAlign)
    else if (action?.startsWith('style:')) {
      const parsed = parseStyleAction(action)
      if (parsed) setStylePatch(id, parsed.key, parsed.value)
    }
  }
  // Acting stops propagation so the row's select doesn't also fire; anything else bubbles.
  const onCellClick = (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent): void => {
    // Ctrl+Click is macOS's secondary-click: it fires `click` alongside `contextmenu`. Bail so the
    // right-click menu wins instead of the click acting under it (e.g. opening a link's browser tab).
    if (e.ctrlKey) return
    // Capture the clicked cell for the table-level picker's placement (harmless on non-picker clicks).
    triggerElRef.current = e.currentTarget as HTMLElement
    if (col.kind === 'title') {
      // The ONLY navigate: row-click narrowed to the title cell; row background is a no-op.
      // A page-preview Collection routes to the floating preview instead; ⌘-click is always
      // the explicit full-page bypass, to a new tab.
      e.stopPropagation()
      const owner =
        source.kind === 'collection'
          ? source
          : findCollectionForSet(useSession.getState().tree, source.id)
      if (owner?.openIn === 'page-preview') {
        if (e.metaKey) void select({ kind: 'page', id: row.id, path: row.path }, { newTab: true })
        else useSession.getState().openPreview({ id: row.id, path: row.path })
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
    // The shared click semantics (cycle/toggle/picker/datetime) live in one router; only the
    // surface-specific tails (number/url placement) stay here.
    const value = resolveFieldValue(row, col.id, schema)
    const def = schema.find((d) => d.id === col.id)
    const shared = sharedValueClickAction(t, value)
    if (shared) {
      e.stopPropagation()
      if (shared.kind === 'commit') setProperty(row, col.id, shared.value)
      // A file value is filled through the OS dialog: a chip replaces the file it names and opens
      // at that file's own folder, the value's own area adds and opens at the property's Directory.
      else if (shared.kind === 'file') {
        if (def)
          pickFileInto(def, value, fileChipIndex(e.target), (n) => setProperty(row, col.id, n))
      } else setEditing({ rowId: row.id, colId: col.id, mode: 'picker' })
    } else if (t === 'number') {
      e.stopPropagation()
      // A Bar-look cell has no text to replace in place, so it edits through the TextPicker dropdown (the
      // link's rename popover, reused); a Number-look cell keeps the inline text editor.
      if (colStyle(col.id).look === 'bar') {
        renameNonce.current += 1
        setEditing({ rowId: row.id, colId: col.id, mode: 'rename', nonce: renameNonce.current })
      } else {
        setEditing({ rowId: row.id, colId: col.id, mode: 'editor' })
      }
    } else if (t === 'url') {
      e.stopPropagation()
      // Filled → open the address (matching the rendered <a>); empty → the inline field to type one
      // in. A value naming a page is opened by that anchor alone — it navigates rather than browses,
      // and the cell around it must not fall through to the editor and lose the click.
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
  // A lone '-'/'.' fails to parse and reverts rather than clearing the value.
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
      // Edit rewrites the URL but rides the current alias along (urlValueFromEdit); empty clears.
      const cur = resolveFieldValue(row, col.id, schema)
      const next = urlValueFromEdit(
        trimmed,
        cur.kind === 'url' ? cur.value : undefined,
        resolveTitle,
      )
      if (next !== undefined) setProperty(row, col.id, next)
    }
  }
  // The inline text/number editor, mounted in the editing cell and REPLACING its content. The value
  // pickers (status/select/multi/context) + the datetime picker are the table-level `cellPicker` below
  // — they portal off the cell, so they never live inside it (and so never clip to the table's scroll).
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
    // A title rename keeps the page glyph seated beside the field — the icon isn't part of the text.
    if (col.kind !== 'title' || liveView.hide_page_icons) return editor
    return (
      <span className="cell-rename">
        <EntityIcon kind="page" icon={row.icon} size="body" />
        {editor}
      </span>
    )
  }

  // A reserved Context column has no schema def — a minimal synthetic one satisfies the picker,
  // whose options come from `contextOptions` anyway.
  const pickerDefOf = (
    col: ResolvedColumn,
  ): { def: PropertyDefinition; contextOptions: ContextOption[] | null } | null => {
    const contextOptions = contextOptionsFor(col)
    const def =
      schema.find((d) => d.id === col.id) ??
      (contextOptions ? syntheticContextDef(col.id) : undefined)
    return def ? { def, contextOptions } : null
  }
  // ONE self-managed picker/datetime pane for the whole table, hung off the editing cell and
  // portaled to a body top layer so it escapes the table's overflow clip. `open` blooms it in on a
  // picker cell, out when editing clears; lastPicker keeps the exiting cell's content through the
  // out; the per-cell key remeasures on a cell switch.
  const cellPicker = (): React.ReactNode => {
    const cell = editing?.mode === 'picker' ? editing : lastPicker.current
    const row = cell && rowById.get(cell.rowId)
    const col = cell && columns.find((c) => c.id === cell.colId)
    if (!cell || !row || !col) return null
    const open = editing?.mode === 'picker'
    const key = `${cell.rowId}:${cell.colId}`
    const dismiss = (): void => setEditing(null)
    if (col.kind === 'property' && declaredType(col.id, schema) === 'datetime') {
      const v = resolveFieldValue(row, col.id, schema)
      return (
        <DatetimeCellPicker key={key} open={open} triggerRef={triggerElRef} onDismiss={dismiss}>
          <DatetimeValuePicker
            value={v}
            dateFormat={colStyle(col.id).date_format}
            onCommit={(nv) => setProperty(row, col.id, nv)}
          />
        </DatetimeCellPicker>
      )
    }
    const picked = pickerDefOf(col)
    if (!picked) return null
    const { def, contextOptions } = picked
    return (
      <PropertyPicker
        key={key}
        def={def}
        current={resolveFieldValue(row, col.id, schema)}
        open={open}
        triggerRef={triggerElRef}
        look={colStyle(col.id).look}
        {...(contextOptions ? { contextOptions } : {})}
        onCommit={(v) => commitValue(row, col, v)}
        onDismiss={dismiss}
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
  // The rename popover — a TextPicker hung off the editing cell (like cellPicker), for a link's alias.
  // Its --accent is scoped to the link's own color, so the field's focus stroke wears it; committing an
  // empty alias drops it back to a bare URL. The alias always wins at render, so this is the only surface
  // that sets it (Edit rewrites the URL and preserves it).
  const renameField = (): React.ReactNode => {
    const cell = editing?.mode === 'rename' ? editing : lastRename.current
    const row = cell && rowById.get(cell.rowId)
    const col = cell && columns.find((c) => c.id === cell.colId)
    if (!cell || !row || !col) return null
    const v = resolveFieldValue(row, col.id, schema)
    const open = editing?.mode === 'rename'
    const key = `${cell.rowId}:${cell.colId}:${cell.nonce}`
    // A Bar-look number edits its value through this same dropdown (no color scope — the app accent), with
    // a label-tertiary "/ N" out-of hint to its right so the value reads as a numerator over the total.
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
  // Right-click a cell → its native menu (always a menu, never an action) — the shared builder
  // decides which items each type gets.
  const openCellMenu = async (
    row: ViewRow,
    col: ResolvedColumn,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    // Captured before the await — the synthetic event is recycled by the time the menu resolves, so
    // the rename popover can't read `e.currentTarget` then (it anchors the TextPicker off this cell).
    // Resolved through the cell so a grip-borne open anchors off the cell rather than the grip.
    const el = e.currentTarget as HTMLElement
    const cellEl = el.closest<HTMLElement>('.data-cell') ?? el
    const filled = !isBlankValue(resolveFieldValue(row, col.id, schema))
    const dt = declaredType(col.id, schema)
    // A cell holding a live link pops the LINK menu — the same one the editor pops on the same
    // link. Only a cell with no link in it (empty, or a title no page answers to) falls through to
    // the cell menu, which is all a value with nothing to open can offer.
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
    const action = await holdGhost(() => window.nexus.cellMenu(ctx))
    if (!action) return
    if (runPageSendAction(action, row.path)) return
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
    if (action === 'title:preview')
      useSession.getState().openPreview({ id: row.id, path: row.path })
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

  // Saved widths are clamped to the type's [min, max] — a stale/out-of-range saved value can't
  // squash a column below legibility or stretch it past its cap.
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

  // Every prop a DataRow receives must hold identity across unrelated re-renders (a tree push, an
  // editing toggle, a drag frame), so React.memo can bail per row.

  // The row path's positional arrays, derived from the same id-keyed resolution.
  const { alignByCol, styleByCol } = useMemo(
    () => ({
      alignByCol: columns.map((c) => colAlign(c.id)),
      styleByCol: columns.map((c) => colStyle(c.id)),
    }),
    [columns, alignById, styleById],
  )
  // Slide detection: mark any column whose look just changed to one whose rendered width grows,
  // so its track eases to the new per-style min. Render-phase + a prev-look ref, so it catches EVERY
  // look-write path — the column menu's live override AND the property pane's persisted view — through
  // this one point (the setState is guarded, so it settles in a single extra render, no loop).
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
  // The gap-shift geometry for a live column drag — identity changes on slot flips only (the
  // cursor-follow is the grid-level CSS var), which is exactly when rows must re-render.
  const dragShift = useMemo(() => {
    if (!colDrag) return null
    // A watcher or pane write can reshape `columns` mid-drag — a vanished or re-pointed source
    // column ends the shift rather than throwing or painting a neighbor.
    const src = columns[colDrag.from]
    return src && src.id === colDrag.id
      ? { from: colDrag.from, to: colDrag.to, width: colWidth(src.id) }
      : null
    // colWidth's inputs (widths, collapsing) are static during a drag; keying on colDrag + columns is the change surface.
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
  // A swept set can degrade under the open picker (a filter drops a picked row, an external
  // delete) — below two live rows the picker can't render, so it closes and the highlight clears
  // rather than stranding. Undo entries die with their container: a revert must never write
  // pages no surface is showing.
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
  // ONE stable handler identity for every row — calls read the freshest closures through the ref,
  // so memoized rows never re-render for handler churn (and never call a stale state writer).
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
  // The hover ghost row rides the shared mechanism. Hooks live here, above the loading/empty
  // returns; a cell editor suppresses the ghost, re-read at the dwell's fire time.
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
  // An editing target the pipeline no longer emits (a filtered-out newborn's create-rename, a
  // reload dropping the row) clears — a stranded `editing` would suppress the ghost for the
  // life of the mount.
  const strandedEditId = editing !== null && !rowById.has(editing.rowId) ? editing.rowId : null
  useEffect(() => {
    if (strandedEditId !== null) setEditing((e) => (e?.rowId === strandedEditId ? null : e))
  }, [strandedEditId])
  // In-view creation opens the title cell as an ordinary uncommitted rename whose field is
  // empty — the table's naming surface is its own cell editor.
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
      // The grip pops the title cell's own menu — one menu for the row, wherever it's asked for.
      grip: (row, e) => {
        const col = cellApiRef.current.titleCol
        if (col) void cellApiRef.current.openCellMenu(row, col, e)
      },
      sweep: (row, col, e) => cellApiRef.current.startSweep(row, col, e),
      // Identity-stable straight off the hook — no ref detour needed.
      hover: (row, entering) => ghostApi.onHover(row.id, entering),
    }),
    [],
  )
  // The inline editor's target cell (mode 'editor' only — the picker is the table-level cellPicker).
  // Flows to rows as a primitive so ONLY the editing row re-renders on open/close.
  const overlayTarget = editing?.mode === 'editor' ? editing : null
  // The rename popover leaves its cell in flow (unlike the editor overlay), but flips it to the full URL
  // while open so you see what you're aliasing. Threaded like overlayCol — only the renamed row re-renders.
  const renameTarget = editing?.mode === 'rename' ? editing : null
  // The cell being edited in ANY mode (picker/editor/rename) — flows to rows as a primitive for the faint
  // active-cell reveal under Hide Borders; only the editing row re-renders on open/close.
  const activeCell = editing ? { rowId: editing.rowId, colId: editing.colId } : null
  // Row drag: the flat data-row order + each row's group key + path, feeding the drop-line DnD
  // (tableDnd). Where you drop disambiguates — same group reorders, a different group reassigns.
  // Memoized so a selection / resize / drag-frame render doesn't re-walk every group and rebuild both
  // Maps. Lives ABOVE the empty/loading returns — a hook after a conditional return crashes React the
  // moment the condition flips (an empty collection gaining its first page).
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

  // The sub-group drop targets: composite band key -> its set + bucket dimensions. Above the
  // early returns like every hook in this component (see dataRows).
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

  // The Apple table model: EVERY column — title included —
  // holds its resolved width. While the sum fits the pane the trailing filler eats the slack (the capped,
  // content-inset look); the moment any resize/add pushes the sum past the pane, the grid extends beyond
  // the window and the whole view h-scrolls. No column is ever compressed to absorb growth.
  const reflowWidth = columns.reduce((sum, c) => sum + colWidth(c.id), 0)
  reflowRef.current = reflowWidth
  const cols = `${columns.map((c) => `${colWidth(c.id)}px`).join(' ')} 1fr`
  // Lead-cell left padding for ungrouped/loose rows: --loose-inset tucks the title a touch left of the
  // cell-padding-x column inset; each nesting layer adds one --row-indent step. The grip + chevron
  // live in the views gutter via absolute CSS, independent of this.
  const indent = (depth: number): string =>
    depth > 0 ? `calc(var(--loose-inset) + var(--row-indent) * ${depth})` : 'var(--loose-inset)'
  // A group header's chevron + folder glyph read as one cluster in the views gutter (with the row grips),
  // so the header is indented by nesting ALONE — no cell-padding-x base (that base is the data cells'
  // text inset). Its members keep the normal indent, one --row-indent step inside the header.
  const groupIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`

  // Column smooth-shift: grab a header → the whole column (header + every body cell + divider)
  // slides with the cursor, neighbors shifting by the dragged column's width to open the gap, the
  // track order committing on drop. The shared gesture skeleton drives it (the header re-renders
  // mid-drag, so a node-bound listener would drop). `zoom` divides the screen delta back into the
  // grid's pre-zoom track space. The target slot is edge-based: whichever column's span the dragged
  // column's center sits over, with a sticky hysteresis zone around the current slot. Edge-based
  // (not closest-center) so a far column can't shift while the dragged one is still mid-traverse
  // over a wide neighbor. A horizontal scroll re-bases the edges and re-resolves the slot.
  const startColumnDrag = (e: React.PointerEvent, from: number): void => {
    if (e.button !== 0) return // left-button drags; a right-press falls through to the column menu
    e.preventDefault()
    const header = e.currentTarget as HTMLElement
    const grid = header.closest('.table-grid') as HTMLElement | null
    if (!grid) return
    // Geometry snapshot lives in the ACTIVATION, not the press — widths can't change mid-drag, so
    // the cumulative offsets are computed once there (a per-move rect + width loop is a forced
    // layout in the drag hot path), and a pending-phase scroll (trackpad inertia settling under a
    // fresh press) can't strand a press-time origin the active-only scroll hook would never fix.
    let zoom = 1
    let startCenter = 0
    let startX = 0
    let gridLeft = 0
    let widths: number[] = []
    let lefts: number[] = []
    // null until activation — a sub-threshold press is a click, not a drag, so the highlight band
    // never flashes and a jittery click can't reorder.
    const dragId = columns[from].id
    let current: { from: number; to: number; id: string } | null = null
    let lastX = e.clientX
    let lastY = e.clientY
    let stopScroll: (() => void) | null = null
    const resolve = (): void => {
      const projected = startCenter + (lastX - startX)
      const cur = current?.to ?? from
      // Edge-based slot: which column's span the dragged column's center is actually over. Hold the
      // current slot until the center leaves its span by COL_SHIFT_HYSTERESIS (a sticky zone — no flicker
      // at a boundary). This is correct for wildly-varying widths where a closest-center rule would let a
      // far column shift while the dragged one is still mid-traverse over a wide neighbor (e.g. Title).
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
      // The cursor-follow is a grid-level var (one style write; the .col-dragging cells consume
      // it) — React state updates only on activation + slot flips, never per move. Anchored to the
      // column's FLOWED center, which scrolls with the grid, so an auto-scroll can't slide the
      // lifted column off the pointer.
      grid.style.setProperty(
        '--col-drag-x',
        `${(projected - (gridLeft + lefts[from] + widths[from] / 2)) / zoom}px`,
      )
      if (!current || current.to !== to) {
        current = { from, to, id: dragId }
        setColDrag(current)
      }
    }
    // A committed release reorders (move + clear batch into one render — reorderColumn is React
    // state — so the settle is a single frame, no snap-back flash); a no-op release and an abort
    // just clear without reordering. The commit is id-based end to end, so a stale slot resolves
    // to a no-op inside reorderColumn rather than needing an index guard here.
    beginGesture({
      el: header,
      event: e,
      onActivate: (ev) => {
        // The CSS density factor (screen px per pre-zoom track px) — the RESOLVED `zoom`, which
        // compounds the base density token (--zoom) with the per-block Scale (--block-zoom on a
        // SurfacePM tile). Read the computed property, not the --zoom token alone, so a scaled
        // tile's drag maps 1:1; NOT back-solved from the header's rendered width ÷ its track width
        // (that ratio bakes in the grid's layout slack).
        zoom = Number.parseFloat(getComputedStyle(grid).getPropertyValue('zoom')) || 1
        const hr = header.getBoundingClientRect()
        startCenter = hr.left + hr.width / 2 // the dragged column's center; it tracks the cursor 1:1
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
        // A wide table h-scrolls by construction — the edge loop reaches columns past the shell's
        // fold, and the window scroll hook re-bases + re-resolves off its scrollBy.
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
  // The gap-shift translateX for a header during the current drag — the same formula the body cells
  // use (gapShift over the memoized dragShift). The SUBJECT's cursor-follow is not here — it rides
  // the grid-level --col-drag-x var on the .col-dragging cells (per-move, no state).
  const colTransform = (ci: number): string | undefined => gapShift(dragShift, ci)

  // Cross-group drop: write the dragged page's grouped property to the destination group's value
  // (the no-value band clears it), patching the loaded values now so the row re-groups before the write
  // round-trips (loadValues never re-runs mid-session).
  // Under sub-grouping the destination key is COMPOSITE (set/bucket), so the drop carries two
  // dimensions: a bucket change writes the property; a set change is a REAL movePage into
  // that set — the property write lands first, while the page still has its current path.
  // Both band drops patch the same key the same way — the group property's own value on that row.
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
  // Cross-folder move (plain location grouping): a row dropped into a DIFFERENT location band relocates
  // the page into that band's Set (the root band → the container itself). movePage; the tree reload
  // reflects it (like the sidebar's reparent — no optimistic value patch, since a move isn't a value).
  const relocateRow = (pageId: string, destGroupKey: string): void => {
    const path = rowPath.get(pageId)
    const destPath = destGroupKey === UNGROUPED ? source.path : setPaths.get(destGroupKey)
    if (!path || !destPath || destPath === parentOf(path)) return
    // The band drop carries no index — the moved row joins the destination's end, but the order
    // still writes whole: absent, main's fallback re-ranks the destination by title. A stale
    // viewOrders entry (a formerly sorted config) would otherwise paint the row's old rank.
    const order = [...containerPages(destPath), pageId]
    const spliceLive = (existing: string[]): string[] => [
      ...existing.filter((id) => id !== pageId),
      pageId,
    ]
    setManualOverride((m) => (m ? spliceLive(m) : m))
    if (viewOrders[view.id]) persistViewOrder(spliceLive(viewOrders[view.id]))
    void mutate({ op: 'movePage', path, newParentPath: destPath, order })
  }
  // Within-group reorder commit — tableDnd hands the new flat order + the reordered group's key. An
  // unsorted structural/flat view is ordered by the canonical on-disk page_order, so it writes that
  // group's container page_order (movePage, same parent = a pure reorder — the whole point of a
  // filesystem-first table). A sorted / property-grouped view instead writes the per-view manual
  // tiebreaker (viewOrders). setManualOverride gives instant feedback either way: the pipeline reads it
  // as the sort tiebreaker, and it agrees with the page_order the fs reload brings back.
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

  // The hover ghost row — pure chrome on the shared mechanism (useGhostAnchor): pixels only, no
  // page until the click, which runs the same immediate-create act as New Page Below. Dismissal
  // exits on the same Reveal collapse the entrance rode — `closing` holds the row mounted through
  // it, and onCollapsed unmounts. A create skips the exit: the real row takes the seat.
  const ghostCreate = (): void => {
    const anchorId = ghostApi.take()
    const anchor = anchorId ? rowById.get(anchorId) : undefined
    if (anchor) void newPageAdjacent(anchor, 'below')
  }

  // A row drops its top divider (.row-lead) only when no VISIBLE data row sits directly above it — the
  // divider is a between-rows line. Headered groups: their first row follows the header, so it's always
  // lead. The ungrouped band has no header, so its first row is lead until a visible row precedes it.
  // `renderedAnyRow` counts only rows that actually render: a collapsed group's items build (the .map runs)
  // but never mount, so they mustn't mark it — else the band after a collapsed group keeps a stray divider
  // with nothing above it. `visible` carries each group's shown/hidden state down through nesting.
  let renderedAnyRow = false
  const renderRows = (g: ResolvedGroup, depth: number, visible: boolean): React.JSX.Element[] => {
    const isCollapsed = collapsed.has(g.key)
    const itemsVisible = visible && !isCollapsed
    // A headered group's members (+ any nested child group) sit one nesting step INSIDE it (a --row-indent
    // step, via indent()), so the disclosure hierarchy reads — you can see what's within a group vs the
    // base level. The ungrouped root band has no header, so its rows stay flush at the base indent.
    const itemDepth = g.kind === 'ungrouped' ? depth : depth + 1
    // A headered group's pages nest in the same gutter-anchored lane as its glyph (groupIndent, no
    // cell-pad base) — so they nudge left with the folder and sit one --row-indent step inside it; the
    // ungrouped root keeps the normal indent (its rows land under the Title column).
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
    // Ungrouped root band: no header, no disclosure — its rows sit flush in the grid.
    if (g.kind === 'ungrouped') return members
    // Headered group: the head stays put; its members live in a Reveal so collapse/expand animates the
    // rows (grid-rows 0fr↔1fr) on the same --disclosure motion as the chevron, and collapsed rows leave
    // the DOM. Each row keeps its own grid reading the inherited --cols, so wrapping never breaks the
    // column alignment.
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
        // Only a Collection's direct-child Sets open (the sidebar's selectable rule) — deeper sub-Sets
        // are expand-only organizing folders.
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
      <IconPicker
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
            {/* Header band — each header grabs to smooth-shift its whole column; the filler sits
              outside the columns, inert. The transitionend on the animated track set commits a column
              hide — transform transitions (the drag) carry a different propertyName, so they pass. */}
            <div
              className="table-head"
              onTransitionEnd={(e) => {
                if (e.propertyName !== 'grid-template-columns') return
                commitHide() // no-op unless a hide is in flight
                setSliding((s) => (s.size ? new Set() : s)) // the style-min slide(s) settled
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
              {/* Trailing filler in the 1fr track — also the :last-child anchor that keeps the last real
                column's right divider (Table.css). Empty but load-bearing; don't remove. */}
              <div className="cell-filler" aria-hidden="true" />
            </div>
            {/* Rows — the drop-line DnD (tableDnd) wraps the whole grid; band heads aren't row
              drag items. */}
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

/** One stable per-table handler set for the memoized rows — identities never change; calls read
 *  the freshest closures through a ref in TableView. */
type RowCellApi = {
  menu: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
  click: (row: ViewRow, col: ResolvedColumn, e: React.MouseEvent) => void
  overlay: (row: ViewRow, col: ResolvedColumn) => React.ReactNode
  remove: (row: ViewRow, col: ResolvedColumn, next: PropertyValue | null) => void
  grip: (row: ViewRow, e: React.MouseEvent) => void
  sweep: (row: ViewRow, col: ResolvedColumn, e: React.PointerEvent) => boolean
  hover: (row: ViewRow, entering: boolean) => void
}

/** The hover ghost row — pure chrome until its click creates. It enters on the shared disclosure
 *  Reveal (the same 0fr↔1fr motion group collapse rides), opening on its first painted frame. */
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
        {/* Lead chrome is positional (a real row's grip/indent live in cell 0), but the New Page
            glyph is the TITLE's — it sits wherever the title column sits in the track order. */}
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

/** The gap-shift translateX for a cell during a column drag (the dragged column itself rides the
 *  grid-level --col-drag-x var, not an inline transform). */
function gapShift(d: DragShift | null, ci: number): string | undefined {
  if (!d) return undefined
  if (d.to < d.from && ci >= d.to && ci < d.from) return `translateX(${d.width}px)`
  if (d.to > d.from && ci > d.from && ci <= d.to) return `translateX(${-d.width}px)`
  return undefined
}

// One data row + its hover-revealed drag grip. Memoized so a row re-renders only when ITS inputs
// change — every prop is identity-stable across unrelated renders (tree pushes, another row's editing,
// drag frames); `overlayCol` flips only for the row holding the inline editor. The grip sits in the
// lead cell's gutter lane, the same slot the group disclosure chevron occupies, so handles align with
// the chevrons and the row content lines up with the group headers. useTableRowDrag mutes the row
// while it's lifted.
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
  ctx: ResolveContext
  padLeft: string | undefined
  dragShift: DragShift | null
  alignByCol: ColumnAlign[]
  styleByCol: ColumnStyle[]
  api: RowCellApi
  overlayCol: string | null
  renameCol: string | null
  /** The cell being edited in this row (any mode) — its data-cell wears the faint accent active ring. */
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
      // The whole row is a drag surface, not just the gutter grip — grabbing ANY cell arms the reorder, so a
      // horizontal scroll that pushes the grip out of reach can't block it. A press-release (no move past
      // ACTIVATION) is each CELL's gesture (only the title navigates; the row background is a no-op);
      // only a real drag reorders. Gated with the grip when reorder is disabled.
      {...(dragDisabled ? {} : handle)}
    >
      {columns.map((c, i) => {
        const style: React.CSSProperties = {
          transform: gapShift(dragShift, i),
          textAlign: alignByCol[i],
        }
        // The lead cell's indent (loose-inset + group nesting) is a LEFT treatment — it tucks left-read
        // content like the Title. A centered first column (a checkbox/switch/chip moved before the Title)
        // must NOT get it: the indent eats the narrow cell and shoves the control off-center / past the
        // fold, so it clips left. Center-aligned lead → no padding, the control centers in the full cell.
        if (i === 0 && alignByCol[i] === 'left') style.paddingLeft = padLeft
        // Borderless reveal: the edited cell wears the faint accent ring (Table.css, no-borders only).
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
        return i === 0 ? (
          // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
          <div
            key={c.id}
            className={cx(
              'data-cell',
              'cell-lead',
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
            {/* The grip renders even with reorder retired (a multi-key sort) — it still owns the
                row's menu, whose New Page pair must stay reachable in every mode. */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a bubble guard, not a control */}
            <span
              className="row-grip"
              {...(dragDisabled ? {} : handle)}
              // A right-press is defaulted away exactly as the drag gestures default the left —
              // preventing only the context menu comes too late to stop a seated caret.
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
            {content}
          </div>
        ) : (
          // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a grid cell — per-cell tab stops are the wrong pattern; the grid wants roving tabindex, which is a feature rather than a lint fix
          <div
            key={c.id}
            className={cx(
              'data-cell',
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
            {content}
          </div>
        )
      })}
      {/* 1fr-track filler + last-column divider anchor (see table head). */}
      <div className="cell-filler" aria-hidden="true" />
    </div>
  )
})
