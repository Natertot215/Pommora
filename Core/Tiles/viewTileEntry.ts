// A view tile's embedded views, read and edited over the entry as stored: the tile's counterpart to viewsFile.ts.

import { isPlainObject } from '../Contract/validators'
import { index } from '../Files/decoders'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import {
  applyViewPatch,
  canDeleteView,
  insertDuplicate,
  mergeViewEdit,
  mintDefaultView,
  mintNewView,
  mintViewId,
  ownsViewId,
  savedView,
  type SavedView,
  viewIdsOf,
  type ViewPatch,
} from '../Views/views'
import type { EntryOp } from './tiles'

const configIdOf = (el: unknown): unknown =>
  (el as { config?: { id?: unknown } } | null)?.config?.id

function coerceEmbeddedView(raw: unknown, id: string): SavedView {
  const r = savedView.safeParse(raw ?? {})
  return { ...(r.success ? r.data : mintDefaultView()), id }
}

const embedViewIds = (els: readonly unknown[], entryId: string): string[] =>
  viewIdsOf(els.map(configIdOf), (n) => `embed:${entryId}:${n}`)

export function embeddedViews(els: readonly unknown[], entryId: string): SavedView[] {
  const ids = embedViewIds(els, entryId)
  return els.map((el, i) => coerceEmbeddedView((el as { config?: unknown } | null)?.config, ids[i]))
}

const rawViews = (raw: Record<string, unknown>): unknown[] =>
  Array.isArray(raw.views) ? [...(raw.views as unknown[])] : []

const rawActive = (raw: Record<string, unknown>, count: number): number =>
  Math.min(index.safeParse(raw.active).data ?? 0, count - 1)

export const writeView =
  (entryId: string, id: string, patch: ViewPatch): EntryOp =>
  (raw) => {
    const arr = rawViews(raw)
    const i = embedViewIds(arr, entryId).indexOf(id)
    const el = arr[i]
    if (!isPlainObject(el)) return null
    // A view answering to a derived id takes a minted one when first written, so only minted ids reach the file.
    const own = ownsViewId(configIdOf(el), id)
    const stored = coerceEmbeddedView(el.config, own ? id : mintViewId())
    arr[i] = { ...el, config: mergeViewEdit(el.config, applyViewPatch(stored, patch)) }
    return { views: arr }
  }

export const addView =
  (sourceId: string): EntryOp =>
  (raw) => {
    const arr = rawViews(raw)
    arr.push({ source_id: sourceId, config: mintNewView('Untitled') })
    return { views: arr, active: arr.length - 1 }
  }

export const duplicateView =
  (entryId: string, id: string): EntryOp =>
  (raw) => {
    const arr = rawViews(raw)
    const views = embeddedViews(arr, entryId)
    const i = views.findIndex((v) => v.id === id)
    const el = arr[i]
    if (!isPlainObject(el)) return null
    const stored = isPlainObject(el.config) ? el.config : views[i]
    const names = views.map((v) => v.name)
    const at = insertDuplicate(arr, i, names, (fresh) => ({
      ...el,
      config: { ...stored, ...fresh },
    }))
    return { views: arr, active: at }
  }

const restoreView =
  (i: number, el: unknown, wasActive: boolean): EntryOp =>
  (raw) => {
    const arr = rawViews(raw)
    const cur = rawActive(raw, arr.length)
    const at = Math.min(i, arr.length)
    arr.splice(at, 0, el)
    return { views: arr, active: wasActive ? at : cur >= at ? cur + 1 : cur }
  }

export const deleteView =
  (entryId: string, id: string, removed: (restore: EntryOp) => void): EntryOp =>
  (raw) => {
    const arr = rawViews(raw)
    const at = embedViewIds(arr, entryId).indexOf(id)
    if (at < 0 || !canDeleteView(arr.length)) return null
    const cur = rawActive(raw, arr.length)
    removed(restoreView(at, arr.splice(at, 1)[0], cur === at))
    return { views: arr, active: Math.min(cur > at ? cur - 1 : cur, arr.length - 1) }
  }

export const moveView =
  (entryId: string, id: string, beforeId: string | null): EntryOp =>
  (raw) => {
    const arr = rawViews(raw)
    const indexed = embedViewIds(arr, entryId).map((v, i) => ({ v, i }))
    const seq = moveBefore(indexed, (x) => x.v, id, beforeId)
    if (!seq) return null
    const cur = rawActive(raw, arr.length)
    const newActive = seq.findIndex((x) => x.i === cur)
    return { views: seq.map((x) => arr[x.i]), active: newActive >= 0 ? newActive : 0 }
  }
