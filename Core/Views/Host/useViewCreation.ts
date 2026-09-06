// The page exists on disk as Untitled the moment the gesture fires — seeds and order riding the create — and the caller opens its own naming surface over the row already real.

import { useRef } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PageValues, ViewRow } from '@pommora/core/Views/viewRow'
import { UNGROUPED } from '@pommora/core/Views/viewRow'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { SetOverrides } from './useValuesEpoch'
import {
  applyValueAtRoot,
  isBlankValue,
  type PropertyValue,
} from '@pommora/core/Properties/propertyValue'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { DEFAULT_NEW_NAME } from '@pommora/core/Pages/mutateRequest'
import { parentOf } from '@pommora/core/Nexus/treePatch'
import { findScroller, SEEK_GLIDE, scrollGlide } from '@pommora/uix/Interactions/autoscroll'
import { useSession } from '../../Session/store'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { filterSeeds } from '../Pipeline/creationSeeds'
import { flattenContainer, frontmatterOf } from '../Pipeline/group'
import { orderWithSlot, tieOrderWith } from '../creationOrder'
import { groupKeyToValue } from '../reassign'

// Sort criteria whose value a new page can inherit from its anchor — single-value user properties; under anything else the row simply lands where the sort puts it.
const SEEDABLE_SORT_TYPES = new Set(['status', 'select', 'checkbox', 'number', 'datetime'])

interface ViewCreationConfig {
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  values: Record<string, PageValues>
  setValueOverride: SetOverrides
  effectiveValues: Record<string, PageValues>
  structuralOrder: boolean
  viewOrders: Record<string, string[]>
  persistViewOrder: (ids: string[]) => void
  setManualOverride: React.Dispatch<React.SetStateAction<string[] | null>>
  rowBand: Map<string, string>
  bandBucket: (key: string) => string | null
  canReassign: boolean
  groupPropId: string | undefined
  groupPropType: string | undefined
  setPaths: Map<string, string>
  collapsed: Set<string>
  toggleCollapse: (key: string) => void
  viewRootRef: { readonly current: HTMLElement | null }
  onCreated: (created: { id: string; path: string }) => void
}

interface ViewCreation {
  bandAdd: (setKey: string) => Promise<boolean>
  createAdjacent: (row: ViewRow, where: 'above' | 'below') => Promise<boolean>
  createAfter: (row: ViewRow) => Promise<boolean>
  containerPages: (path: string) => string[]
}

/** `getCfg` is read only when a gesture fires, so the hook can sit above any loading/empty return while its config closes over later render-scope consts. */
export function useViewCreation(getCfg: () => ViewCreationConfig): ViewCreation {
  const mutate = useSession((s) => s.mutate)
  const getRef = useRef(getCfg)
  getRef.current = getCfg
  const cfg = (): ViewCreationConfig => getRef.current()

  const impliedSeeds = (): Record<string, PropertyValue> => {
    const c = cfg()
    return filterSeeds(c.view.filter, c.view.filter_enabled !== false, c.schema)
  }
  // The created page's seeds reach the pipeline the way a band-drop's reassign does — the value cache never re-reads mid-session, so a disk-only stamp would resolve blank until next open.
  const patchSeedValues = (pageId: string, seeds: Record<string, PropertyValue>): void => {
    const c = cfg()
    const entries = Object.entries(seeds)
    if (entries.length === 0) return
    c.setValueOverride((prev) => {
      let patched = frontmatterOf(c.values, pageId) as Record<string, unknown>
      for (const [propId, value] of entries) {
        const def = c.schema.find((d) => d.id === propId)
        if (def) patched = applyValueAtRoot(patched, def, value)
      }
      return { ...prev, [pageId]: { fm: patched as PageFrontmatter, write: null } }
    })
  }
  // The full child list of the container a create targets — never the view's visible rows: an order built from a filtered view permanently re-ranks every row the filter was hiding.
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
  // Every live order settles in the create's own act — onCreated runs ahead of the optimistic tree apply, so the splice and the newborn's mount land in ONE commit.
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
      // A non-structural view has no page_order write to land the "end of the group" — absent any live array, the read-side title fallback would rank the newborn mid-band.
      const latest = cfg()
      latest.onCreated(created)
      if (latest.view.id === gestureViewId) settleOrders(latest, created.id, null, 'below')
      requestAnimationFrame(() => glideToRow(created.id))
    })
  }

  // New Page Above / Below: the anchor's group value and sort-criteria values tie the newborn beside it, and the order write breaks the tie at the gesture slot.
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
