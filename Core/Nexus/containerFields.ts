// The walk and a container sidecar's event pass DIFFERENT children — the walk its freshly-read ones, the event the held node's — so the children arrive as arguments rather than being derived here.

import type { CollectionNode, PageNode, SetNode } from './tree'
import type { ContainerKind } from './entities'
import { containerViewIds, savedView, type SavedView } from '../Views/views'
import { coerceOpenIn, coerceViewButton } from './schemas'
import type { PropertyDefinition } from '../Properties/properties'
import type { PropertyRegistry } from '../Properties/propertiesRegistry'
import { asString, asStringArray } from './coerce'
import { resolveOrder } from './order'
import { isPlainObject } from '../Contract/validators'

function parseViews(raw: unknown): SavedView[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = containerViewIds(raw)
  const out: SavedView[] = []
  raw.forEach((v, i) => {
    const r = savedView.safeParse(v)
    if (r.success) out.push({ ...r.data, id: ids[i] })
  })
  return out.length > 0 ? out : undefined
}

function cachedIds(meta: Record<string, unknown>): string[] | undefined {
  const ids = isPlainObject(meta.property_cache) ? Object.keys(meta.property_cache) : []
  return ids.length ? ids : undefined
}

// An `active_view` naming no view in `views` is carried verbatim; pickView already falls back.
export function containerFieldsFrom(
  meta: Record<string, unknown>,
  sets: SetNode[],
  pages: PageNode[],
): Omit<SetNode, 'kind' | 'id' | 'title' | 'path'> &
  Required<Pick<SetNode, 'sets' | 'headingIconHidden' | 'disclosureLocked'>> {
  return {
    icon: asString(meta.icon),
    banner: asString(meta.banner),
    headingIconHidden: meta.heading_icon_hidden === true,
    sets: resolveOrder(sets, asStringArray(meta.set_order)),
    pages: resolveOrder(pages, asStringArray(meta.page_order)),
    setOrder: asStringArray(meta.set_order),
    pageOrder: asStringArray(meta.page_order),
    views: parseViews(meta.views),
    viewButton: coerceViewButton(meta.view_button),
    disclosureLocked: meta.disclosure_locked === true,
    activeView: asString(meta.active_view),
  }
}

function resolveAssignedSchema(
  ids: unknown,
  registry: PropertyRegistry,
): PropertyDefinition[] | undefined {
  if (!Array.isArray(ids)) return undefined
  const defs = ids
    .filter((id): id is string => typeof id === 'string')
    .map((id) => registry[id])
    .filter((d): d is PropertyDefinition => Boolean(d))
  return defs.length ? defs : undefined
}

export function containerNodeFrom(
  kind: ContainerKind,
  at: { title: string; path: string },
  meta: Record<string, unknown>,
  sets: SetNode[],
  pages: PageNode[],
  registry: PropertyRegistry,
): CollectionNode | SetNode | null {
  const id = asString(meta.id)
  if (!id) return null
  const shared = { id, ...at, ...containerFieldsFrom(meta, sets, pages) }
  if (kind === 'set') return { kind, ...shared }
  return {
    kind,
    ...shared,
    properties: resolveAssignedSchema(meta.properties, registry),
    openIn: coerceOpenIn(meta.open_in),
    cached: cachedIds(meta),
  }
}
