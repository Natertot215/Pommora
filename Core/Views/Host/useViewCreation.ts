// The page exists on disk as Untitled the moment the gesture fires — seeds and order riding the create — and the caller opens its own naming surface over the row already real.

import { type ViewRow, UNGROUPED } from '../viewRow'
import type { PageFrontmatter } from '../../Nexus/schemas'
import { settle } from '../../Properties/valueOverride'
import {
  applyValueAtRoot,
  isBlankValue,
  type PropertyValue,
  type ValueKind,
} from '../../Properties/propertyValue'
import { specOf } from '../../Properties/properties'
import { viewOption } from '../views'
import { DEFAULT_NEW_NAME, type MutateRequest } from '../../Nexus/mutateRequest'
import { relDirname } from '../../Paths/posix'
import { findScroller, SEEK_GLIDE, scrollGlide } from '@pommora/uix/Interactions/autoscroll'
import { useSession } from '../../Session/store'
import { settingOf } from '../../Settings/personalization'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { filterSeeds } from '../Pipeline/creationSeeds'
import { flattenContainer, frontmatterOf } from '../Pipeline/group'
import { placeAt, placementSlot, type Slot, tieOrderWith } from '../creationOrder'
import { pageIdsIn } from '../../Nexus/treePatch'
import { groupKeyToValue } from '../reassign'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { ViewHostApi } from './useViewHost'

// Sort criteria whose value a new page can inherit from its anchor — single-value user properties, a link aside; under anything else the row simply lands where the sort puts it.
const SEEDS_FROM_SORT: Record<ValueKind, boolean> = {
  select: true,
  checkbox: true,
  number: true,
  dateTime: true,
  multiSelect: false,
  context: false,
  link: false,
  file: false,
}

type CreatePage = Extract<MutateRequest, { op: 'createPage' }>

type ViewCreationConfig = Pick<
  ViewHostApi,
  | 'source'
  | 'view'
  | 'schema'
  | 'contextIds'
  | 'values'
  | 'setValueOverride'
  | 'effectiveValues'
  | 'sortKeys'
  | 'pageOrder'
  | 'persistView'
  | 'rowBand'
  | 'canReassign'
  | 'groupPropId'
  | 'groupPropType'
  | 'sets'
  | 'collapsed'
  | 'toggleCollapse'
  | 'viewRootRef'
> & {
  bandBucket: (key: string) => string | null
  onCreated: (created: { id: string; path: string }) => void
}

interface ViewCreation {
  bandAdd: (setKey: string) => Promise<boolean>
  createFirst: () => Promise<boolean>
  createAdjacent: (row: ViewRow, where: 'above' | 'below') => Promise<boolean>
  createAfter: (row: ViewRow) => Promise<boolean>
}

/** `getCfg` is read when a gesture fires, so a create reads the host as of the latest render. */
export function useViewCreation(getCfg: () => ViewCreationConfig): ViewCreation {
  const mutate = useSession((s) => s.mutate)
  const getRef = useLatest(getCfg)
  const cfg = (): ViewCreationConfig => getRef.current()

  const impliedSeeds = (): Record<string, PropertyValue> => {
    const c = cfg()
    return filterSeeds(c.view.filter, viewOption(c.view, 'filter_enabled'), c.schema, c.contextIds)
  }
  // The created page's seeds reach the pipeline the way a band-drop's reassign does.
  const patchSeedValues = (pageId: string, seeds: Record<string, PropertyValue>): void => {
    const c = cfg()
    const entries = Object.entries(seeds)
    if (entries.length === 0) return
    c.setValueOverride((prev) => {
      let patched = frontmatterOf(c.values, pageId) as Record<string, unknown>
      let contexts: Record<string, string[]> | undefined
      for (const [propId, value] of entries) {
        const def = c.schema.find((d) => d.id === propId)
        if (def) patched = applyValueAtRoot(patched, def, value)
        else if (value.kind === 'context') contexts = { ...contexts, [propId]: value.value }
      }
      return { ...prev, [pageId]: { fm: patched as PageFrontmatter, contexts, write: settle() } }
    })
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
    where: Slot,
  ): void => {
    const allIds = flattenContainer(latest.source, latest.effectiveValues, {}).rows.map((r) => r.id)
    // The live view already folds a staged order, so the next create composes on this one.
    const next = tieOrderWith(latest.view.manual_order, allIds, createdId, anchorId, where)
    if (
      latest.pageOrder === 'custom' &&
      (latest.groupPropId !== undefined || latest.sortKeys > 0 || latest.view.manual_order)
    )
      void latest.persistView({ manual_order: next }, { viewState: true })
  }
  const pageRequest = (parentPath: string, seeds: Record<string, PropertyValue>): CreatePage => ({
    op: 'createPage',
    parentPath,
    name: DEFAULT_NEW_NAME,
    ...(Object.keys(seeds).length ? { seeds } : {}),
  })
  const createPageIn = (
    req: CreatePage,
    then: (created: { id: string; path: string }) => void,
  ): Promise<boolean> =>
    mutate(req, (created) => {
      patchSeedValues(created.id, req.seeds ?? {})
      then(created)
    }).then((done) => done !== null)

  const addIn = (parentPath: string): Promise<boolean> => {
    const c = cfg()
    const gestureViewId = c.view.id
    const { tree, personalization } = useSession.getState()
    const slot = placementSlot(settingOf(personalization, 'newPagePlacement'))
    const req = placeAt(
      pageRequest(parentPath, impliedSeeds()),
      pageIdsIn(tree!, parentPath),
      null,
      slot,
    )
    return createPageIn(req, (created) => {
      // A non-structural view ranks by its own array — absent any live one, the read-side title fallback would rank the newborn mid-band.
      const latest = cfg()
      latest.onCreated(created)
      if (latest.view.id === gestureViewId) settleOrders(latest, created.id, null, slot)
      requestAnimationFrame(() => glideToRow(created.id))
    })
  }

  const bandAdd = (setKey: string): Promise<boolean> => {
    const c = cfg()
    const setPath = c.sets.node.get(setKey)?.path
    if (!setPath) return Promise.resolve(false)
    if (c.collapsed.has(setKey)) c.toggleCollapse(setKey)
    return addIn(setPath)
  }

  // New Page Above / Below: the anchor's group value and sort-criteria values tie the newborn beside it, and the order write breaks the tie at the gesture slot.
  const createAdjacent = (row: ViewRow, where: 'above' | 'below'): Promise<boolean> => {
    const c = cfg()
    const parentPath = relDirname(row.path)
    const seeds = impliedSeeds()
    const gestureViewId = c.view.id
    const gKey = c.rowBand.get(row.id)
    if (c.groupPropId && c.canReassign && gKey !== undefined) {
      const v = groupKeyToValue(c.bandBucket(gKey) ?? UNGROUPED, c.groupPropType)
      if (v !== null) seeds[c.groupPropId] = v
    }
    for (const criterion of c.view.sort ?? []) {
      const spec = specOf(declaredType(criterion.property_id, c.schema))
      if (spec?.origin !== 'user' || !SEEDS_FROM_SORT[spec.kind]) continue
      const v = resolveFieldValue(row, criterion.property_id, c.schema)
      if (!isBlankValue(v)) seeds[criterion.property_id] = v
    }
    const siblings = pageIdsIn(useSession.getState().tree!, parentPath)
    return createPageIn(
      placeAt(pageRequest(parentPath, seeds), siblings, row.id, where),
      (created) => {
        const latest = cfg()
        latest.onCreated(created)
        if (latest.view.id === gestureViewId) settleOrders(latest, created.id, row.id, where)
      },
    )
  }

  return {
    bandAdd,
    createFirst: () => addIn(cfg().source.path),
    createAdjacent,
    createAfter: (row) => createAdjacent(row, 'below'),
  }
}
