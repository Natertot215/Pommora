import { type RefObject, useLayoutEffect, useRef, useState } from 'react'
import { DEFAULT_FEEL } from '@pommora/uix/Animations/feel'

type Seat = { frame: Element | null; x: number; y: number }

const seatOf = (el: Element, frame: Element | null): Seat => {
  const r = el.getBoundingClientRect()
  const f = frame?.getBoundingClientRect()
  return { frame, x: r.left - (f?.left ?? 0), y: r.top - (f?.top ?? 0) }
}

const gridOf = (root: HTMLElement, id: string | null): Element | null =>
  id === null
    ? null
    : (root.querySelector(`[data-rid="${CSS.escape(id)}"]`)?.closest('.cards-grid') ?? null)

function seats(root: HTMLElement, from: string | null, to: string | null): Map<Element, Seat> {
  const m = new Map<Element, Seat>()
  for (const grid of new Set([gridOf(root, from), gridOf(root, to)]))
    for (const el of grid?.querySelectorAll('.card-displace') ?? []) m.set(el, seatOf(el, grid))
  for (const band of root.querySelectorAll('.group-band')) m.set(band, seatOf(band, null))
  return m
}

export function useGhostFlip(
  rootRef: RefObject<HTMLElement | null>,
  liveId: string | null,
  gone: boolean,
  zoom: number,
): string | null {
  const [shown, setShown] = useState<string | null>(null)
  const before = useRef<Map<Element, Seat> | null>(null)
  useLayoutEffect(() => {
    if (liveId === shown) return
    const root = rootRef.current
    before.current = root && !gone ? seats(root, shown, liveId) : null
    setShown(liveId)
  }, [liveId, shown])
  useLayoutEffect(() => {
    const prev = before.current
    before.current = null
    if (!prev) return
    const z = zoom || 1
    for (const [el, was] of prev) {
      if (!el.isConnected) continue
      const now = seatOf(el, was.frame)
      const dx = (was.x - now.x) / z
      const dy = (was.y - now.y) / z
      if (dx !== 0 || dy !== 0)
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          DEFAULT_FEEL,
        )
    }
  }, [shown])
  return shown
}
