// The page exists on disk as Untitled the moment the gesture fires — seeds and order riding the create — and the caller's rename opens its naming surface over the row once it lands.

import { type ViewRow, UNGROUPED } from '../viewRow'
import type { PageFrontmatter } from '../../Nexus/schemas'
import { patchOverride } from '../../Properties/valueOverride'
import {
  applyValueAtRoot,
  isBlankValue,
  type PropertyValue,
  type ValueKind,
} from '../../Properties/propertyValue'
import { specOf } from '../../Properties/properties'
import { type ViewPatch, viewOption } from '../views'
import { type CreatePageRequest, DEFAULT_NEW_NAME, minted } from '../../Nexus/mutateRequest'
import { relDirname } from '../../Paths/posix'
import { findScroller, SEEK_GLIDE, scrollGlide } from '@pommora/uix/Interactions/autoscroll'
import { useSession } from '../../Session/store'
import { resolvesCase, settingOf } from '../../Settings/personalization'
import { declaredType, resolveFieldValue } from '../../Properties/value'
import { filterSeeds } from '../Pipeline/creationSeeds'
import { flattenContainer, frontmatterOf } from '../Pipeline/group'
import { placeAt, placementSlot, type Slot, tieOrderWith } from '../creationOrder'
import { pageIdsIn } from '../../Nexus/treePatch'
import { groupKeyToValue } from '../reassign'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import type { ViewHostApi } from './useViewHost'
import { personalizationOf } from '../../Session/configSlice'
import { stageView, unstageView } from './pendingView'

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

export interface CreateFlight {
  id: string
  path: Promise<string | null>
}

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
  rename: (target: { id: string; path: string }) => void
}

interface ViewCreation {
  bandAdd: (setKey: string) => void
  createFirst: () => CreateFlight
  createAdjacent: (row: ViewRow, where: 'above' | 'below') => CreateFlight
  createAfter: (row: ViewRow) => CreateFlight
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
  const patchSeedValues = (
    pageId: string,
    seeds: Record<string, PropertyValue>,
    landed: Promise<boolean>,
  ): void => {
    const c = cfg()
    const entries = Object.entries(seeds)
    if (entries.length === 0) return
    let patched = frontmatterOf(c.values, pageId) as Record<string, unknown>
    let contexts: Record<string, string[]> | undefined
    const resolveCase = resolvesCase(personalizationOf(useSession.getState()))
    for (const [propId, value] of entries) {
      const def = c.schema.find((d) => d.id === propId)
      if (def) patched = applyValueAtRoot(patched, def, value, resolveCase)
      else if (value.kind === 'context') contexts = { ...contexts, [propId]: value.value }
    }
    patchOverride(c.setValueOverride, pageId, patched as PageFrontmatter, landed, contexts)
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
  // A non-structural view ranks by its own array — absent any live one, the read-side title fallback would rank the newborn mid-band.
  const orderPatch = (
    c: ViewCreationConfig,
    createdId: string,
    anchorId: string | null,
    where: Slot,
  ): ViewPatch | null => {
    if (
      c.pageOrder !== 'custom' ||
      (c.groupPropId === undefined && c.sortKeys === 0 && !c.view.manual_order)
    )
      return null
    const allIds = flattenContainer(c.source, c.effectiveValues, {}).rows.map((r) => r.id)
    // The live view already folds a staged order, so the next create composes on this one.
    return { manual_order: tieOrderWith(c.view.manual_order, allIds, createdId, anchorId, where) }
  }
  const pageRequest = (
    parentPath: string,
    seeds: Record<string, PropertyValue>,
  ): CreatePageRequest =>
    minted({
      op: 'createPage',
      parentPath,
      name: DEFAULT_NEW_NAME,
      ...(Object.keys(seeds).length ? { seeds } : {}),
    })
  // Seeds and slot are staged with the ask, so the push that mounts the newborn paints it in its band at its slot; the order is written once the page exists, and a refusal takes back both.
  const createPageIn = (
    req: CreatePageRequest,
    anchorId: string | null,
    where: Slot,
  ): CreateFlight => {
    const c = cfg()
    const staged = orderPatch(c, req.id, anchorId, where)
    if (staged) stageView(c.source.id, c.view, staged)
    const flight = mutate(req)
    patchSeedValues(
      req.id,
      req.seeds ?? {},
      flight.then((done) => done !== null),
    )
    const path = flight.then((done) => {
      const landed = done?.created?.path ?? null
      const latest = cfg()
      const order =
        landed !== null && latest.view.id === c.view.id
          ? orderPatch(latest, req.id, anchorId, where)
          : null
      if (order) void latest.persistView(order, { viewState: true })
      else if (staged) unstageView(c.source.id, c.view.id, staged)
      if (landed !== null) latest.rename({ id: req.id, path: landed })
      return landed
    })
    return { id: req.id, path }
  }

  const addIn = (parentPath: string): CreateFlight => {
    const s = useSession.getState()
    const slot = placementSlot(settingOf(personalizationOf(s), 'newPagePlacement'))
    const req = placeAt(
      pageRequest(parentPath, impliedSeeds()),
      pageIdsIn(s.tree!, parentPath),
      null,
      slot,
    )
    const flight = createPageIn(req, null, slot)
    void flight.path.then((path) => {
      if (path !== null) requestAnimationFrame(() => glideToRow(req.id))
    })
    return flight
  }

  const bandAdd = (setKey: string): void => {
    const c = cfg()
    const setPath = c.sets.node.get(setKey)?.path
    if (!setPath) return
    if (c.collapsed.has(setKey)) c.toggleCollapse(setKey)
    addIn(setPath)
  }

  // New Page Above / Below: the anchor's group value and sort-criteria values tie the newborn beside it, and the order write breaks the tie at the gesture slot.
  const createAdjacent = (row: ViewRow, where: 'above' | 'below'): CreateFlight => {
    const c = cfg()
    const parentPath = relDirname(row.path)
    const seeds = impliedSeeds()
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
      row.id,
      where,
    )
  }

  return {
    bandAdd,
    createFirst: () => addIn(cfg().source.path),
    createAdjacent,
    createAfter: (row) => createAdjacent(row, 'below'),
  }
}
