import { useSyncExternalStore } from 'react'
import { emitter } from '@pommora/uix/Utilities/subscribable'

// Filled behind a synchronous read: the paint path may not await, so a miss answers undefined and repaints once for however many URLs land in the same frame. null means an image that won't load.
const aspects = new Map<string, number | null>()
const loading = new Set<string>()
const landed = emitter()
let queued = false

function notify(): void {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    landed.emit()
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

export const subscribeAspect = landed.subscribe

export function useImageAspect(url: string | null | undefined): number | null | undefined {
  return useSyncExternalStore(subscribeAspect, () => (url ? aspectFor(url) : undefined))
}
