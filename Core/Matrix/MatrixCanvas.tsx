import { useEffect, useRef } from 'react'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { cx } from '@pommora/uix/Utilities/cx'
import { PINCH_RATE, currentZoom } from '@pommora/uix/Utilities/zoom'
import { glanceShown } from '../Interface/Glance/glanceAction'
import { toWorld } from './Engine/viewport'
import { onIconLoad } from './iconCache'
import * as s from './matrix.css'
import { createPainter } from './matrixPaint'
import { matrixRuntime, type Surface } from './matrixRuntime'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

// The modifier the label's glance arms on, since a canvas node has no pointer event of its own.
export let lastShift = false

// A canvas can't move under a still pointer, so its box is read once per hover or press, not per move; leaving, pressing, and a resize let it go.
const boxes = new WeakMap<HTMLCanvasElement, { left: number; top: number; zoom: number }>()

function screenPoint(
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number },
): [number, number] {
  let box = boxes.get(canvas)
  if (!box) {
    const { left, top } = canvas.getBoundingClientRect()
    box = { left, top, zoom: currentZoom(canvas) }
    boxes.set(canvas, box)
  }
  return [(e.clientX - box.left) / box.zoom, (e.clientY - box.top) / box.zoom]
}

export function toWorldPoint(
  surface: Surface,
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number },
): [number, number] {
  return toWorld(matrixRuntime.viewportOf(surface), ...screenPoint(canvas, e))
}

export function MatrixCanvas({
  surface,
  parked,
  editing,
  labelId,
  canvasRef,
  onNodeDown,
  onMenu,
  children,
}: {
  surface: Surface
  parked: boolean
  editing: boolean
  labelId: string | null
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onNodeDown: (e: React.PointerEvent, id: string) => void
  onMenu: (id: string) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const labelRef = useLatest(labelId)
  const begin = usePointerGesture()

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    const painter = createPainter(host, canvas, surface, () => labelRef.current)
    // The accent lands as `--accent` on the root, from the setting and from the system colour alike; the paint is re-read off that write.
    const mo = new MutationObserver(painter.restyle)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    const stop = matrixRuntime.subscribe(painter.draw)
    let media: MediaQueryList | null = null
    const resize = (): void => {
      boxes.delete(canvas)
      painter.resize()
    }
    const watchRatio = (): void => {
      media?.removeEventListener('change', onRatio)
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
      media.addEventListener('change', onRatio)
    }
    const onRatio = (): void => {
      resize()
      watchRatio()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()
    watchRatio()
    // A floating window re-clamped into a smaller viewport moves without resizing.
    const moved = (): void => void boxes.delete(canvas)
    window.addEventListener('resize', moved)
    return () => {
      mo.disconnect()
      stop()
      ro.disconnect()
      media?.removeEventListener('change', onRatio)
      window.removeEventListener('resize', moved)
    }
  }, [canvasRef, surface])

  useEffect(() => {
    const detach = matrixRuntime.attach(surface)
    const stopIcons = onIconLoad(() => matrixRuntime.invalidate())
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      matrixRuntime.setStage(surface, { x: box.x, y: box.y, width: box.width, height: box.height })
    })
    if (stageRef.current) ro.observe(stageRef.current)
    return () => {
      ro.disconnect()
      stopIcons()
      detach()
    }
  }, [surface])

  useEffect(() => {
    if (parked) matrixRuntime.setHovered(null)
    else matrixRuntime.resume()
  }, [parked])

  // The overlaid node's title is skipped by index, and a rename moves that index without any runtime event to repaint on.
  useEffect(() => matrixRuntime.invalidate(), [labelId])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!e.ctrlKey) {
        matrixRuntime.pan(surface, -e.deltaX, -e.deltaY)
        return
      }
      if (!canvas) return
      const [sx, sy] = screenPoint(canvas, e)
      matrixRuntime.zoom(surface, sx, sy, Math.exp(-e.deltaY * PINCH_RATE))
    }
    host.addEventListener('wheel', onWheel, { passive: false })
    return () => host.removeEventListener('wheel', onWheel)
  }, [canvasRef, surface])

  const nodeAt = (e: React.MouseEvent<HTMLCanvasElement>): string | null =>
    matrixRuntime.hitTest(...toWorldPoint(surface, e.currentTarget, e))

  const backgroundDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    // Hoisted: `e.currentTarget` is null by the time a window-level move listener runs.
    const el = e.currentTarget
    let last: [number, number] = [e.clientX, e.clientY]
    begin({
      el,
      event: e,
      onDragMove: (ev) => {
        const z = currentZoom(el)
        matrixRuntime.pan(surface, (ev.clientX - last[0]) / z, (ev.clientY - last[1]) / z)
        last = [ev.clientX, ev.clientY]
      },
      onDrop: () => {},
    })
  }

  return (
    <div
      ref={hostRef}
      className={cx('scroll-fade', s.host)}
      onPointerLeave={() => {
        if (canvasRef.current) boxes.delete(canvasRef.current)
        if (!editing && !glanceShown()) matrixRuntime.setHovered(null)
      }}
    >
      <canvas
        ref={canvasRef}
        className={s.canvas}
        onPointerDown={(e) => {
          boxes.delete(e.currentTarget)
          const id = nodeAt(e)
          if (id !== null) onNodeDown(e, id)
          else backgroundDown(e)
        }}
        onPointerMove={(e) => {
          lastShift = e.shiftKey
          // A held button is a drag or a pan in progress, which the hover leaves where it began.
          if (editing || e.buttons !== 0) return
          const id = nodeAt(e)
          if (id !== null || !glanceShown()) matrixRuntime.setHovered(id)
        }}
        // Cancelled here alone, so the rename field and anything else laid over the canvas keeps the system's own menu.
        onContextMenu={(e) => {
          e.preventDefault()
          const id = nodeAt(e)
          if (id !== null) onMenu(id)
        }}
      />
      <div ref={stageRef} className={cx('detail interface-inset', s.stage)}>
        {children}
      </div>
    </div>
  )
}
