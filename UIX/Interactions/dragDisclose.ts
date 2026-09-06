// The hit-test rides a window pointermove + elementFromPoint so it works under pointer capture,
// where pointerenter never fires.

const DWELL_MS = 500

const targets = new Map<HTMLElement, () => void>()
let drags = 0 // refcounted so unbalanced calls can't strand the listener
let hovered: HTMLElement | null = null
let timer: number | null = null
let lastCheck = 0
let remeasure: (() => void) | null = null
let remeasureRaf: number | null = null

function clearHover(): void {
  hovered = null
  if (timer != null) {
    clearTimeout(timer)
    timer = null
  }
}

const SETTLE_MS = 250 // covers the disclosure animation, with slack for its start-of-frame skew

// Re-aims every frame until the reveal settles: a discrete once-then-settle pair left a gap where
// a move re-took the snapshot mid-animation and cleared its dirty flag.
function scheduleRemeasure(): void {
  if (!remeasure) return
  if (remeasureRaf != null) cancelAnimationFrame(remeasureRaf)
  const settle = performance.now() + SETTLE_MS
  const tick = (): void => {
    remeasureRaf = null
    if (drags === 0) return
    remeasure?.()
    if (performance.now() < settle) remeasureRaf = requestAnimationFrame(tick)
  }
  remeasureRaf = requestAnimationFrame(tick)
}

function onMove(e: PointerEvent): void {
  // Throttled well under the dwell: elementFromPoint is a layout read.
  const now = performance.now()
  if (now - lastCheck < 100) return
  lastCheck = now
  const under = document.elementFromPoint(e.clientX, e.clientY)
  const found = under?.closest('[data-disclose]') as HTMLElement | null
  const target = found && targets.has(found) ? found : null
  if (target === hovered) return
  clearHover()
  hovered = target
  if (target)
    timer = window.setTimeout(() => {
      const expand = targets.get(target)
      clearHover()
      expand?.()
      scheduleRemeasure()
    }, DWELL_MS)
}

export function registerDiscloseTarget(el: HTMLElement, expand: () => void): () => void {
  targets.set(el, expand)
  return () => {
    targets.delete(el)
    if (hovered === el) clearHover()
  }
}

export function beginDragDisclose(onDisclose?: () => void): void {
  remeasure = onDisclose ?? null
  if (drags++ === 0) window.addEventListener('pointermove', onMove)
}

export function endDragDisclose(): void {
  drags = Math.max(0, drags - 1)
  if (drags === 0) {
    window.removeEventListener('pointermove', onMove)
    clearHover()
    remeasure = null
    if (remeasureRaf != null) {
      cancelAnimationFrame(remeasureRaf)
      remeasureRaf = null
    }
  }
}
