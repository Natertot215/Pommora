import { useEffect, useMemo, useState } from 'react'
import type { SavedView } from '@pommora/core/Views/views'
import { same } from '@pommora/core/Files/jsonMerge'

export type ViewPatch = Partial<SavedView>

const ENTRY_KEYS = [
  'column_widths',
  'column_alignments',
  'column_styles',
] as const satisfies readonly (keyof SavedView)[]
type EntryKey = (typeof ENTRY_KEYS)[number]
const isEntryKey = (k: string): k is EntryKey => (ENTRY_KEYS as readonly string[]).includes(k)

// `seen[0]` is the stored value at the first stage; each later entry is a value this host staged since.
interface Slot {
  value: unknown
  seen: unknown[]
}
type Staged = Record<string, Slot>

export const slotsOf = (patch: ViewPatch): [key: string, value: unknown][] =>
  Object.entries(patch).flatMap(([k, v]) =>
    isEntryKey(k) && v !== undefined
      ? Object.entries(v as Record<string, unknown>).map(([id, e]): [string, unknown] => [
          `${k}/${id}`,
          e,
        ])
      : [[k, v]],
  )

const stored = (view: SavedView, key: string): unknown => {
  const at = key.indexOf('/')
  return at < 0
    ? view[key as keyof SavedView]
    : (view[key.slice(0, at) as EntryKey] as Record<string, unknown> | undefined)?.[
        key.slice(at + 1)
      ]
}

/** The view with each slot's value over it; an entry slot lands inside its record, so a patch of one column never drops its siblings. */
export function foldView(
  view: SavedView,
  slots: readonly [key: string, value: unknown][],
): SavedView {
  const next: Record<string, unknown> = { ...view }
  for (const [key, value] of slots) {
    const at = key.indexOf('/')
    if (at < 0) next[key] = value
    else {
      const field = key.slice(0, at)
      next[field] = { ...(next[field] as object | undefined), [key.slice(at + 1)]: value }
    }
  }
  return next as SavedView
}

/** A slot stays until the stored value reaches its latest staged value or leaves the run it was staged over; a stored value at an earlier staged value is this host's own earliest unlanded save, so a run that revisits a value settles in order. */
function settle(staged: Staged, view: SavedView): Staged {
  let next: Staged | null = null
  for (const [key, slot] of Object.entries(staged)) {
    const now = stored(view, key)
    const at = slot.seen.findIndex((s, i) => i > 0 && same(s, now))
    if (at < 0 && same(slot.seen[0], now)) continue
    next ??= { ...staged }
    if (at < 0 || at === slot.seen.length - 1) delete next[key]
    else next[key] = { value: slot.value, seen: slot.seen.slice(at) }
  }
  return next ?? staged
}

function stageOver(staged: Staged, view: SavedView, patch: ViewPatch): Staged {
  const next = { ...staged }
  for (const [key, value] of slotsOf(patch)) {
    if (value === undefined) {
      for (const k of Object.keys(next)) if (k === key || k.startsWith(`${key}/`)) delete next[k]
      continue
    }
    next[key] = { value, seen: [...(staged[key]?.seen ?? [stored(view, key)]), value] }
  }
  return next
}

const NOTHING: Staged = {}

/** `resetKey` is the identity the host paints; a change drops every slot, since nothing staged over another view can settle against this one. */
export function usePendingView(view: SavedView, resetKey: string) {
  const [staged, setStaged] = useState<Staged>(NOTHING)
  useEffect(() => setStaged(NOTHING), [resetKey])
  useEffect(() => setStaged((s) => settle(s, view)), [view])
  const liveView = useMemo(
    () =>
      foldView(
        view,
        Object.entries(staged).map(([k, s]) => [k, s.value]),
      ),
    [view, staged],
  )
  const stage = (patch: ViewPatch): void => setStaged((s) => stageOver(s, view, patch))
  return { liveView, stage }
}
