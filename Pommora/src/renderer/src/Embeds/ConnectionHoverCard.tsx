import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnPage } from '@renderer/MarkdownPM/connections'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'

// PLACEHOLDER contract: no dismiss backdrop and `manageFocus={false}` — a hover affordance must
// never eat the next click or pull focus out of the editor.

const CARD = { w: 260, h: 120 }
const LEAVE_GRACE_MS = 200
const RECT_SLOP = 6

const inRect = (r: DOMRect, x: number, y: number): boolean =>
  x >= r.left - RECT_SLOP &&
  x <= r.right + RECT_SLOP &&
  y >= r.top - RECT_SLOP &&
  y <= r.bottom + RECT_SLOP

export function useConnectionHover(): {
  hover: (page: ConnPage, rect: DOMRect) => void
  card: React.ReactNode
} {
  const [hovered, setHovered] = useState<{ page: ConnPage; rect: DOMRect } | null>(null)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hovered) return
    let grace: ReturnType<typeof setTimeout> | null = null
    const clearGrace = (): void => {
      if (grace) {
        clearTimeout(grace)
        grace = null
      }
    }
    const onMove = (e: MouseEvent): void => {
      const cardRect = cardRef.current?.getBoundingClientRect()
      const overCard = cardRect ? inRect(cardRect, e.clientX, e.clientY) : false
      if (overCard || inRect(hovered.rect, e.clientX, e.clientY)) clearGrace()
      else if (!grace) grace = setTimeout(() => setHovered(null), LEAVE_GRACE_MS)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.preventDefault() // the house contract — window closers skip a handled Escape
      setHovered(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      clearGrace()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [hovered])

  const card = (
    <>
      {hovered && (
        <div
          ref={anchorRef}
          style={{
            position: 'fixed',
            left: hovered.rect.left,
            top: hovered.rect.top,
            width: hovered.rect.width,
            height: hovered.rect.height,
            pointerEvents: 'none',
          }}
        />
      )}
      <PickerMenu solid open={hovered !== null} triggerRef={anchorRef} manageFocus={false}>
        <div ref={cardRef} style={{ width: CARD.w, height: CARD.h }} />
      </PickerMenu>
    </>
  )
  const hover = useCallback((page: ConnPage, rect: DOMRect) => setHovered({ page, rect }), [])
  return { hover, card }
}
