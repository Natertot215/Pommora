// In-view creation, one home for both renderers. One act on every trigger: the page exists on
// disk as Untitled the moment the gesture fires — seeds and order riding the create — and the
// caller opens its own naming surface over the row already real. The pipeline owns placement.

import { useRef } from 'react'
import type { CollectionNode, SetNode, ViewRow } from '@shared/types'
import { UNGROUPED } from '@shared/types'
import type { PageFrontmatter } from '@shared/schemas'
import { applyValueAtRoot, isBlankValue, type PropertyValue } from '@shared/propertyValue'
import type { PropertyDefinition } from '@shared/properties'
import type { SavedView } from '@shared/views'
import { DEFAULT_NEW_NAME } from '@shared/mutate'
import { parentOf } from '@shared/treePatch'
import {
  findScroller,
  SEEK_GLIDE,
  scrollGlide,
} from '@renderer/DesignSystem/Interactions/autoscroll'
import { useSession } from '../store'
import { declaredType, resolveFieldValue } from '@renderer/Properties/value'
import { filterSeeds } from './Pipeline/creationSeeds'
import { flattenContainer } from './Pipeline/group'
import { orderWithSlot, tieOrderWith } from './creationOrder'
import { groupKeyToValue } from './TableView/reassign'

// Sort criteria whose value a new page can inherit from its anchor — single-value user properties.
// Title and Modified aren't property ids and multi-value types don't copy; under those the row
// simply lands where the sort puts it.
const SEEDABLE_SORT_TYPES = new Set(['status', 'select', 'checkbox', 'number', 'datetime'])

export interface ViewCreationConfig {
  source: CollectionNode | SetNode
  /** The LIVE view — the caller resolves any local overrides before handing it over. */
  view: SavedView
  schema: PropertyDefinition[]
  values: Record<string, PageFrontmatter>
  setValueOverride: React.Dispatch<React.SetStateAction<Record<string, PageFrontmatter> | null>>
  effectiveValues: Record<string, PageFrontmatter>
  /** Whether creates write the canonical page_order channel — the table's law, stated by both
   *  renderers: no property grouping and no sort, where the pipeline paints tree order. */
  structuralOrder: boolean
  viewOrders: Record<string, string[]>
  persistViewOrder: (ids: string[]) => void
  setManualOverride: React.Dispatch<React.SetStateAction<string[] | null>>
  /** row id → its band key, for the group-value seed. */
  rowBand: Map<string, string>
  /** band key → the group-value bucket it stamps (sub-grouped bands resolve their bucket). */
  bandBucket: (key: string) => string | null
  canReassign: boolean
  groupPropId: string | undefined
  groupPropType: string | undefined
  setPaths: Map<string, string>
  collapsed: Set<string>
  toggleCollapse: (key: string) => void
  /** The view's scroll root — created rows glide into it by `[data-rid]`. */
  viewRootRef: { readonly current: HTMLElement | null }
  /** Opens the caller's naming surface over the created page. */
  onCreated: (created: { id: string; path: string }) => void
}

export interface ViewCreation {
  /** Each create resolves with the write's outcome — a caller holding UI open for the newborn
   *  (Cards' seat-holding skeleton) releases it on a false. */
  bandAdd: (setKey: string) => Promise<boolean>
  createAdjacent: (row: ViewRow, where: 'above' | 'below') => Promise<boolean>
  createAfter: (row: ViewRow) => Promise<boolean>
  /** The container's full child list — order writes never build from a filtered view. */
  containerPages: (path: string) => string[]
}

/** `getCfg` is read only when a gesture fires — so the hook can sit with a component's early
 *  hooks (above any loading/empty return) while its config closes over later render-scope
 *  consts, which are initialized long before any pointer can reach a trigger. */
export function useViewCreation(getCfg: () => ViewCreationConfig): ViewCreation {
  const mutate = useSession((s) => s.mutate)
  const getRef = useRef(getCfg)
  getRef.current = getCfg
  const cfg = (): ViewCreationConfig => getRef.current()

  // A page a filter cleanly implies values for gets them stamped; gesture-context seeds spread
  // AFTER these, so where they disagree the gesture wins.
  const impliedSeeds = (): Record<string, PropertyValue> => {
    const c = cfg()
    return filterSeeds(c.view.filter, c.view.filter_enabled !== false, c.schema)
  }
  // The created page's seeds reach the pipeline the way a band-drop's reassign does — the value
  // cache never re-reads mid-session, so a disk-only stamp would resolve blank until next open.
  const patchSeedValues = (pageId: string, seeds: Record<string, PropertyValue>): void => {
    const c = cfg()
    const entries = Object.entries(seeds)
    if (entries.length === 0) return
    c.setValueOverride((prev) => {
      let patched = (c.values[pageId] ?? { id: pageId }) as Record<string, unknown>
      for (const [propId, value] of entries) {
        const def = c.schema.find((d) => d.id === propId)
        if (def) patched = applyValueAtRoot(patched, def, value)
      }
      return { ...prev, [pageId]: patched as PageFrontmatter }
    })
  }
  // The full child list of the container a create targets — never the view's visible rows: an
  // order built from a filtered view permanently re-ranks every row the filter was hiding.
  const containerPagesOf = (path: string): string[] => {
    const walk = (node: CollectionNode | SetNode): string[] | null => {
      if (node.path === path) return node.pages.map((p) => p.id)
      for (const s of node.sets ?? []) {
        const hit = walk(s)
        if (hit) return hit
      }
      return null
    }
    return walk(cfg().source) ?? []
  }
  const glideToRow = (pageId: string): void => {
    const viewEl = cfg().viewRootRef.current
    if (!viewEl) return
    const scroller = findScroller(viewEl, 'y')
    if (!scroller) return
    scrollGlide(
      scroller,
      // Re-read per frame: the row's seat sharpens as the band it lives in finishes disclosing.
      () => {
        const el = viewEl.querySelector<HTMLElement>(`[data-rid="${CSS.escape(pageId)}"]`)
        if (!el) return scroller.scrollTop
        const rowTop = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top
        return scroller.scrollTop + rowTop - (scroller.clientHeight - el.offsetHeight) / 2
      },
      SEEK_GLIDE,
    )
  }
  // Every live order settles in the create's own act — the store runs the caller's onCreated
  // ahead of the optimistic tree apply, so the splice and the newborn's mount land in ONE commit
  // (a newborn left out of a live array would rank last; nothing re-emits viewOrders). A null
  // anchor ranks it last: the band-add's "end of the group", since banding partitions before the
  // manual order ranks.
  const settleOrders = (
    latest: ViewCreationConfig,
    createdId: string,
    anchorId: string | null,
    where: 'above' | 'below',
  ): void => {
    const allIds = flattenContainer(latest.source, latest.effectiveValues).rows.map((r) => r.id)
    const splice = (existing: string[] | undefined): string[] =>
      tieOrderWith(existing, allIds, createdId, anchorId, where)
    latest.setManualOverride((m) => (m ? splice(m) : m))
    if (!latest.structuralOrder || latest.viewOrders[latest.view.id])
      latest.persistViewOrder(splice(latest.viewOrders[latest.view.id]))
  }
  const createPageIn = (
    parentPath: string,
    seeds: Record<string, PropertyValue>,
    order: string[] | undefined,
    then: (created: { id: string; path: string }) => void,
  ): Promise<boolean> =>
    mutate(
      {
        op: 'createPage',
        parentPath,
        name: DEFAULT_NEW_NAME,
        ...(Object.keys(seeds).length ? { seeds } : {}),
        ...(order ? { order } : {}),
      },
      (created) => {
        patchSeedValues(created.id, seeds)
        then(created)
      },
    )

  const bandAdd = (setKey: string): Promise<boolean> => {
    const c = cfg()
    const setPath = c.setPaths.get(setKey)
    if (!setPath) return Promise.resolve(false)
    if (c.collapsed.has(setKey)) c.toggleCollapse(setKey)
    const seeds = impliedSeeds()
    const gestureViewId = c.view.id
    const order = c.structuralOrder
      ? orderWithSlot(containerPagesOf(setPath), null, 'last')
      : undefined
    return createPageIn(setPath, seeds, order, (created) => {
      // A non-structural view has no page_order write to land the "end of the group" — absent
      // any live array, the read-side title fallback would rank the newborn mid-band. A view
      // switch across the round trip forfeits the settle: an order write keyed to the stranger
      // view would mint a manual order it never gestured.
      const latest = cfg()
      latest.onCreated(created)
      if (latest.view.id === gestureViewId) settleOrders(latest, created.id, null, 'below')
      // A frame later — this callback runs ahead of the optimistic tree apply (the one-commit
      // law), so the row reaches the DOM only when that commit paints.
      requestAnimationFrame(() => glideToRow(created.id))
    })
  }

  // New Page Above / Below: born beside its anchor — the anchor's group value and sort-criteria
  // values tie it there, and the order write breaks the tie at the gesture slot.
  const createAdjacent = (row: ViewRow, where: 'above' | 'below'): Promise<boolean> => {
    const c = cfg()
    const parentPath = parentOf(row.path)
    const seeds = impliedSeeds()
    const gestureViewId = c.view.id
    const gKey = c.rowBand.get(row.id)
    if (c.groupPropId && c.canReassign && gKey !== undefined) {
      const v = groupKeyToValue(c.bandBucket(gKey) ?? UNGROUPED, c.groupPropType)
      if (v !== null) seeds[c.groupPropId] = v
    }
    for (const criterion of c.view.sort ?? []) {
      const t = declaredType(criterion.property_id, c.schema)
      if (!t || !SEEDABLE_SORT_TYPES.has(t)) continue
      const v = resolveFieldValue(row, criterion.property_id, c.schema)
      if (v.kind !== 'null' && !isBlankValue(v)) seeds[criterion.property_id] = v
    }
    const order = c.structuralOrder
      ? orderWithSlot(containerPagesOf(parentPath), row.id, where)
      : undefined
    return createPageIn(parentPath, seeds, order, (created) => {
      // A view switch across the round trip forfeits the settle — an order write keyed to the
      // stranger view would mint a manual order it never gestured.
      const latest = cfg()
      latest.onCreated(created)
      if (latest.view.id === gestureViewId) settleOrders(latest, created.id, row.id, where)
    })
  }

  return {
    bandAdd,
    createAdjacent,
    createAfter: (row) => createAdjacent(row, 'below'),
    containerPages: containerPagesOf,
  }
}
