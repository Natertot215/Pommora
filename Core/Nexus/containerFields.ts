// The walk and the watch patch pass DIFFERENT children — the walk its freshly-read ones, the watch the live node's — so the children arrive as arguments rather than being derived here.

import type { PageNode, SetNode } from './tree'
import { containerViewIds, savedView, type SavedView } from '../Views/views'
import { coerceViewButton } from './schemas'
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

export function cachedIds(meta: Record<string, unknown>): string[] | undefined {
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
    views: parseViews(meta.views),
    viewButton: coerceViewButton(meta.view_button),
    disclosureLocked: meta.disclosure_locked === true,
    activeView: asString(meta.active_view),
  }
}
