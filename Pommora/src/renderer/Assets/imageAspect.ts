import { useEffect, useReducer } from 'react'

// One natural aspect (height ÷ width) per resolved URL, filled behind a synchronous read: the paint
// path may not await, so a miss answers undefined and repaints once for however many URLs land in
// the same frame. null is the sentinel for an image that won't load.
const aspects = new Map<string, number | null>()
const loading = new Set<string>()
const listeners = new Set<() => void>()
let queued = false

function notify(): void {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    for (const fn of listeners) fn()
  })
}

function begin(url: string): void {
  if (loading.has(url)) return
  loading.add(url)
  const img = new Image()
  img.onload = () => {
    aspects.set(url, img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : null)
    notify()
  }
  img.onerror = () => {
    aspects.set(url, null)
    notify()
  }
  img.src = url
}

export function aspectFor(url: string): number | null | undefined {
  const hit = aspects.get(url)
  if (hit !== undefined) return hit
  begin(url)
  return undefined
}

export function subscribeAspect(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useImageAspect(url: string | null | undefined): number | null | undefined {
  const [, bump] = useReducer((c: number) => c + 1, 0)
  useEffect(() => subscribeAspect(bump), [])
  return url ? aspectFor(url) : undefined
}
