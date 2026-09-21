import { useEffect, useRef } from 'react'
import { duration, easeBase, ms } from '@pommora/uix/Animations/motion'
import { text } from '@pommora/uix/Theme'
import { ICON_PX } from '@pommora/uix/Theme/theme-vars.css'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { cx } from '@pommora/uix/Utilities/cx'
import { currentZoom } from '@pommora/uix/Utilities/zoom'
import { recordsByIdOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { BASE_RADIUS, LINK_GAP } from './Engine/forces'
import type { Graph, GraphLink } from './Engine/graph'
import { glanceShown } from '../Interface/Glance/glanceAction'
import { cullLabels, labelReveal, type LabelReveal } from './Engine/labels'
import { toScreen, toWorld, type Viewport } from './Engine/viewport'
import { iconFor, onIconLoad } from './iconCache'
import * as s from './matrix.css'
import { FADE_MS, matrixRuntime, type Surface } from './matrixRuntime'

// KNOBs — the pinch rate, the link widths, and the frame ceiling the emphasis eases against.
const PINCH_RATE = 0.01
const LINK_WIDTH_MIN = 1.0
const LINK_WIDTH_MAX = 2.5
const LINK_WIDTH_SCALE = 0.5
const MAX_FRAME_MS = 64

const titleAlphas = (zoom: number): LabelReveal => {
  const r = labelReveal(zoom)
  return { page: easeBase(r.page), folder: easeBase(r.folder), space: easeBase(r.space) }
}

type Rgb = [number, number, number]

interface Paint {
  fill: string
  fillRgb: Rgb
  fillLitRgb: Rgb
  ring: string
  ringHover: string
  ringDrag: string
  link: string
  linkHover: string
  title: string
  inactive: number
  hairline: number
  ringWidth: number
  titleFont: string
}

const rgbOf = (css: string): Rgb => {
  const [r = 0, g = 0, b = 0] = css.match(/[\d.]+/g)?.map(Number) ?? []
  return [r, g, b]
}

const mixRgb = (a: Rgb, b: Rgb, t: number): string =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`

function readPaint(host: HTMLElement): Paint {
  const probe = document.createElement('span')
  probe.className = text.footnote.emphasized
  host.appendChild(probe)
  const cs = getComputedStyle(probe)
  const titleFont = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  // The accent strokes are `color-mix()` text at the custom-property level; the probe's computed `color` resolves them.
  const color = (token: string): string => {
    probe.style.color = `var(${token})`
    return getComputedStyle(probe).color
  }
  const scoped = getComputedStyle(host)
  const number = (token: string): number => Number.parseFloat(scoped.getPropertyValue(token))
  const paint: Paint = {
    fill: color('--matrix-fill'),
    fillRgb: rgbOf(color('--matrix-fill')),
    fillLitRgb: rgbOf(color('--matrix-fill-lit')),
    ring: color('--matrix-ring'),
    ringHover: color('--matrix-ring-hover'),
    ringDrag: color('--matrix-ring-drag'),
    link: color('--matrix-link'),
    linkHover: color('--matrix-link-hover'),
    title: color('--matrix-title'),
    inactive: number('--matrix-inactive'),
    hairline: number('--matrix-hairline'),
    ringWidth: number('--matrix-ring-width'),
    titleFont,
  }
  probe.remove()
  return paint
}

// The modifier the label's glance arms on, since a canvas node has no pointer event of its own.
export let lastShift = false

function screenPoint(
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number },
): [number, number] {
  const box = canvas.getBoundingClientRect()
  const z = currentZoom(canvas)
  return [(e.clientX - box.left) / z, (e.clientY - box.top) / z]
}

export function toWorldPoint(
  surface: Surface,
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number },
): [number, number] {
  return toWorld(matrixRuntime.viewportOf(surface), ...screenPoint(canvas, e))
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  paint: Paint,
  ring: 'rest' | 'hover' | 'drag',
  alpha: number,
  fill: string = paint.fill,
): void {
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = ring === 'rest' ? paint.hairline : paint.ringWidth
  ctx.strokeStyle =
    ring === 'rest' ? paint.ring : ring === 'hover' ? paint.ringHover : paint.ringDrag
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawLink(
  ctx: CanvasRenderingContext2D,
  graph: Graph,
  link: GraphLink,
  v: Viewport,
  color: string,
  alpha: number,
): void {
  const a = graph.nodes[link.source]
  const b = graph.nodes[link.target]
  const [ax, ay] = toScreen(v, a.x, a.y)
  const [bx, by] = toScreen(v, b.x, b.y)
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy)
  const from = a.radius * v.zoom + LINK_GAP
  const to = b.radius * v.zoom + LINK_GAP
  if (len === 0 || from + to >= len) return
  const ux = dx / len
  const uy = dy / len
  const weight = Math.min(a.radius, b.radius) / BASE_RADIUS.page
  ctx.globalAlpha = alpha
  ctx.lineWidth = clamp(LINK_WIDTH_MIN + weight * LINK_WIDTH_SCALE, LINK_WIDTH_MIN, LINK_WIDTH_MAX)
  ctx.lineCap = 'round'
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.moveTo(ax + ux * from, ay + uy * from)
  ctx.lineTo(bx - ux * to, by - uy * to)
  ctx.stroke()
  ctx.globalAlpha = 1
}

export function MatrixCanvas({
  surface,
  parked,
  editing,
  labelId,
  canvasRef,
  onNodeDown,
  onBackgroundDown,
  onMenu,
  children,
}: {
  surface: Surface
  parked: boolean
  editing: boolean
  labelId: string | null
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onNodeDown: (e: React.PointerEvent, index: number) => void
  onBackgroundDown: (e: React.PointerEvent) => void
  onMenu: (index: number) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const paintRef = useRef<Paint | null>(null)
  const drawRef = useRef<() => void>(() => {})
  const dprRef = useRef(1)
  const emphasisRef = useRef({ from: 0, to: 0, t: 1, at: 0 })
  const subjectRef = useRef(-1)
  const neighboursRef = useRef(new Set<number>())
  const hotRef = useRef<GraphLink[]>([])
  const cellsRef = useRef(new Map<number, number>())
  const hideIcon = useSession((st) => st.matrixConfig.display.hideIcon)

  drawRef.current = (): void => {
    // The runtime's listeners are not surface-scoped, so a parked surface would repaint its whole graph on every frame another surface drives.
    if (!surface.visible()) return
    const canvas = canvasRef.current
    const paint = paintRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !paint) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    ctx.clearRect(0, 0, width, height)

    const v = matrixRuntime.viewportOf(surface)
    const graph = matrixRuntime.graph
    const { nodes, links } = graph
    const hovered = matrixRuntime.hoveredIndex()
    const dragging = matrixRuntime.draggingIndex()
    // A held node keeps the focus even when the pointer outruns it, since it trails the cursor on its spring.
    const focus = dragging >= 0 ? dragging : hovered
    if (focus >= 0) subjectRef.current = focus

    const now = performance.now()
    // Each flip re-seeds from the value on screen, so a reversal mid-fade cannot jump.
    const ease = emphasisRef.current
    const target = focus >= 0 ? 1 : 0
    const elapsed = ease.at === 0 ? 0 : Math.min(now - ease.at, MAX_FRAME_MS)
    ease.at = now
    let emphasis = ease.from + (ease.to - ease.from) * easeBase(ease.t)
    if (ease.to !== target) {
      ease.from = emphasis
      ease.to = target
      ease.t = 0
    } else if (ease.t < 1) {
      ease.t = Math.min(1, ease.t + elapsed / ms(duration.slow))
      emphasis = ease.from + (ease.to - ease.from) * easeBase(ease.t)
    }
    if (ease.t < 1) matrixRuntime.invalidate()
    // The released subject outlives the focus until the emphasis reaches nothing, so the dim and the fill fade off it.
    const subject = focus >= 0 ? focus : emphasis > 0 ? subjectRef.current : -1
    const dim = 1 - emphasis * (1 - paint.inactive)
    const litFill = mixRgb(paint.fillRgb, paint.fillLitRgb, emphasis)

    const arrivals = matrixRuntime.arrivals
    const arrival =
      arrivals.size === 0
        ? (): number => 1
        : (i: number): number => {
            const born = arrivals.get(nodes[i].id)
            return born === undefined ? 1 : clamp((now - born) / FADE_MS, 0, 1)
          }

    const neighbours = neighboursRef.current
    const hot = hotRef.current
    neighbours.clear()
    hot.length = 0
    for (const l of links) {
      const touches = subject >= 0 && (l.source === subject || l.target === subject)
      if (touches) {
        neighbours.add(l.source)
        neighbours.add(l.target)
        hot.push(l)
      } else
        drawLink(
          ctx,
          graph,
          l,
          v,
          paint.link,
          (subject >= 0 ? dim : 1) * Math.min(arrival(l.source), arrival(l.target)),
        )
    }
    const hotStroke = dragging >= 0 ? paint.ringDrag : paint.linkHover
    for (const l of hot)
      drawLink(ctx, graph, l, v, hotStroke, Math.min(arrival(l.source), arrival(l.target)))

    nodes.forEach((n, i) => {
      const [sx, sy] = toScreen(v, n.x, n.y)
      const r = n.radius * v.zoom
      if (sx + r < 0 || sy + r < 0 || sx - r > width || sy - r > height) return
      const ring = i === dragging ? 'drag' : i === hovered ? 'hover' : 'rest'
      const lit = subject < 0 || i === subject || neighbours.has(i)
      const fill = subject >= 0 && lit ? litFill : paint.fill
      drawNode(ctx, sx, sy, r, paint, ring, (lit ? 1 : dim) * arrival(i), fill)
    })
    for (const g of matrixRuntime.ghosts) {
      const [sx, sy] = toScreen(v, g.x, g.y)
      drawNode(
        ctx,
        sx,
        sy,
        g.radius * v.zoom,
        paint,
        'rest',
        clamp(1 - (now - g.born) / FADE_MS, 0, 1),
      )
    }

    const tree = useSession.getState().tree
    const records = tree ? recordsByIdOf(tree) : null
    ctx.font = paint.titleFont
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = paint.title
    const cells = cellsRef.current
    const alphas = titleAlphas(v.zoom)
    cullLabels(nodes, v, width, height, matrixRuntime.indexOf(labelId), cells, alphas)
    for (const i of cells.values()) {
      const n = nodes[i]
      const [sx, sy] = toScreen(v, n.x, n.y + n.radius)
      const glyph = hideIcon ? undefined : records?.get(n.id)?.icon
      const image = glyph ? iconFor(glyph, paint.title, dprRef.current) : null
      const lead = image ? ICON_PX.footnote + s.TITLE_ICON_GAP : 0
      const left = sx - (ctx.measureText(n.title).width + lead) / 2
      const top = sy + s.TITLE_OFFSET
      const lit = subject < 0 || i === subject || neighbours.has(i)
      ctx.globalAlpha = (lit ? 1 : dim) * arrival(i) * alphas[n.kind]
      if (image) ctx.drawImage(image, left, top, ICON_PX.footnote, ICON_PX.footnote)
      ctx.fillText(n.title, left + lead, top)
      ctx.globalAlpha = 1
    }
  }

  // The accent lands as `--accent` on the root, from the setting and from the system colour alike; the paint is re-read off that write.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const read = (): void => {
      paintRef.current = readPaint(host)
      drawRef.current()
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const detach = matrixRuntime.attach(surface)
    const stop = matrixRuntime.subscribe(() => drawRef.current())
    const stopIcons = onIconLoad(() => matrixRuntime.invalidate())
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      matrixRuntime.setStage(surface, { x: box.x, y: box.y, width: box.width, height: box.height })
    })
    if (stageRef.current) ro.observe(stageRef.current)
    return () => {
      ro.disconnect()
      stopIcons()
      stop()
      detach()
    }
  }, [surface])

  useEffect(() => {
    if (parked) matrixRuntime.setHovered(-1)
    else matrixRuntime.resume()
  }, [parked])

  // The overlaid node's title is skipped by index, and a rename moves that index without any runtime event to repaint on.
  useEffect(() => matrixRuntime.invalidate(), [labelId])

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    let media: MediaQueryList | null = null
    const resize = (): void => {
      // The backing store is physical pixels: the device ratio compounded with the CSS zoom the interface scale renders the surface at.
      const scale = (window.devicePixelRatio || 1) * currentZoom(host)
      dprRef.current = scale
      canvas.width = Math.round(host.clientWidth * scale)
      canvas.height = Math.round(host.clientHeight * scale)
      canvas.getContext('2d')?.setTransform(scale, 0, 0, scale, 0, 0)
      drawRef.current()
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
    return () => {
      ro.disconnect()
      media?.removeEventListener('change', onRatio)
    }
  }, [canvasRef])

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

  const onCanvas = (e: { target: EventTarget }): boolean => e.target === canvasRef.current

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the canvas is the surface, and its nodes carry their own semantics through the overlay
    <div
      ref={hostRef}
      className={cx('over-scroll', s.host)}
      onPointerDown={(e) => {
        const canvas = canvasRef.current
        if (!canvas || !onCanvas(e)) return
        const [wx, wy] = toWorldPoint(surface, canvas, e)
        const i = matrixRuntime.hitTest(wx, wy)
        if (i >= 0) onNodeDown(e, i)
        else onBackgroundDown(e)
      }}
      onPointerMove={(e) => {
        lastShift = e.shiftKey
        const canvas = canvasRef.current
        if (!canvas || !onCanvas(e) || editing) return
        const [wx, wy] = toWorldPoint(surface, canvas, e)
        const i = matrixRuntime.hitTest(wx, wy)
        if (i >= 0 || !glanceShown()) matrixRuntime.setHovered(i)
      }}
      onPointerLeave={() => {
        if (!editing && !glanceShown()) matrixRuntime.setHovered(-1)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas || !onCanvas(e)) return
        const [wx, wy] = toWorldPoint(surface, canvas, e)
        const i = matrixRuntime.hitTest(wx, wy)
        if (i >= 0) onMenu(i)
      }}
    >
      <canvas ref={canvasRef} className={s.canvas} />
      <div ref={stageRef} className={cx('detail', s.stage)} />
      {children}
    </div>
  )
}
