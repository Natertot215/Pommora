import { useEffect, useRef } from 'react'
import { duration, easeBase, ms } from '@pommora/uix/Animations/motion'
import { text } from '@pommora/uix/Theme'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { cx } from '@pommora/uix/Utilities/cx'
import { currentZoom } from '@pommora/uix/Utilities/zoom'
import { spacesByIdOf } from '../Contexts/contextIdentity'
import { recordsByIdOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { BASE_RADIUS, LINK_GAP } from './Engine/forces'
import { type Graph, type GraphLink, type GraphNode, isGroupingLink } from './Engine/graph'
import { glanceShown } from '../Interface/Glance/glanceAction'
import { cullLabels, labelReveal, type LabelReveal } from './Engine/labels'
import { toScreen, toWorld, type Viewport } from './Engine/viewport'
import { iconFor, onIconLoad } from './iconCache'
import * as s from './matrix.css'
import { FADE_MS, matrixRuntime, type Surface } from './matrixRuntime'

// KNOBs — the pinch rate, the link widths, and the frame ceiling the emphasis eases against.
const PINCH_RATE = 0.01
const LINK_WIDTH_MIN = 1.0
const LINK_WIDTH_MAX = 5.0
const LINK_WIDTH_SCALE = 0.5
const MAX_FRAME_MS = 64

const titleAlphas = (zoom: number): LabelReveal => {
  const r = labelReveal(zoom)
  return { page: easeBase(r.page), folder: easeBase(r.folder), space: easeBase(r.space) }
}

interface Paint {
  fill: string
  fillLit: string
  ring: string
  ringHover: string
  ringDrag: string
  link: string
  linkOther: string
  linkHover: string
  title: string
  icon: string
  inactive: number
  hairline: number
  ringWidth: number
  iconScale: number
  titleFont: string
}

// What one node is painted in: its resting fill, the tone the emphasis lays over it, and the stroke that tone rings it with.
interface Tone {
  fill: string
  lit: string
  stroke: string
}

interface SpacePaint extends Tone {
  icon: string
}

// The accent strokes and the Space tints are `color-mix()` at the custom-property level; a probe inside the host resolves them through its own computed `color`.
function withProbe<T>(host: HTMLElement, read: (probe: HTMLSpanElement) => T): T {
  const probe = document.createElement('span')
  probe.className = text.footnote.emphasized
  host.appendChild(probe)
  const out = read(probe)
  probe.remove()
  return out
}

const colorOf = (probe: HTMLElement, css: string): string => {
  probe.style.color = css
  return getComputedStyle(probe).color
}

function readPaint(host: HTMLElement): Paint {
  const scoped = getComputedStyle(host)
  const number = (token: string): number => Number.parseFloat(scoped.getPropertyValue(token))
  return withProbe(host, (probe) => {
    const cs = getComputedStyle(probe)
    const color = (token: string): string => colorOf(probe, `var(${token})`)
    return {
      fill: color('--matrix-fill'),
      fillLit: color('--matrix-fill-lit'),
      ring: color('--matrix-ring'),
      ringHover: color('--matrix-ring-hover'),
      ringDrag: color('--matrix-ring-drag'),
      link: color('--matrix-link'),
      linkOther: color('--matrix-link-other'),
      linkHover: color('--matrix-link-hover'),
      title: color('--matrix-title'),
      icon: color('--matrix-icon'),
      inactive: number('--matrix-inactive'),
      hairline: number('--matrix-hairline'),
      ringWidth: number('--matrix-ring-width'),
      iconScale: number('--matrix-icon-scale'),
      titleFont: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    }
  })
}

function readSpacePaint(host: HTMLElement, color: string): SpacePaint {
  const solid = solidColorCss(color)
  return withProbe(host, (probe) => ({
    fill: colorOf(
      probe,
      `color-mix(in srgb, ${solid} var(--matrix-space-tint), var(--matrix-fill))`,
    ),
    lit: colorOf(
      probe,
      `color-mix(in srgb, ${solid} var(--matrix-space-lit-tint), var(--matrix-fill))`,
    ),
    stroke: colorOf(probe, solid),
    icon: colorOf(
      probe,
      `color-mix(in srgb, ${solid} var(--matrix-space-icon-tint), var(--matrix-icon))`,
    ),
  }))
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
  tone: Tone,
  ring: 'rest' | 'hover' | 'drag',
  alpha: number,
  lit = 0,
): void {
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = tone.fill
  ctx.fill()
  // The lit tone lays over the resting fill rather than replacing it, so a Space rises through its own color and a Location through the same hue it already sits in.
  if (lit > 0) {
    ctx.globalAlpha = alpha * lit
    ctx.fillStyle = tone.lit
    ctx.fill()
    ctx.globalAlpha = alpha
  }
  ctx.lineWidth = paint.hairline
  ctx.strokeStyle = paint.ring
  ctx.stroke()
  if (ring !== 'rest' && lit > 0) {
    ctx.globalAlpha = alpha * lit
    ctx.lineWidth = paint.ringWidth
    ctx.strokeStyle = tone.stroke
    ctx.stroke()
  }
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
  const subjectRef = useRef<string | null>(null)
  const neighboursRef = useRef(new Set<number>())
  const hotRef = useRef<GraphLink[]>([])
  const cellsRef = useRef(new Map<number, number>())
  const spacePaintsRef = useRef(new Map<string, SpacePaint>())
  const hideIcon = useSession((st) => st.matrixConfig.display.hideIcon)

  drawRef.current = (): void => {
    // The runtime's listeners are not surface-scoped, so a parked surface would repaint its whole graph on every frame another surface drives.
    if (!surface.visible()) return
    const canvas = canvasRef.current
    const host = hostRef.current
    const paint = paintRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !host || !ctx || !paint) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    ctx.clearRect(0, 0, width, height)

    const v = matrixRuntime.viewportOf(surface)
    const graph = matrixRuntime.graph
    const { nodes, links } = graph
    const tree = useSession.getState().tree
    const records = tree ? recordsByIdOf(tree) : null
    const spaces = tree ? spacesByIdOf(tree) : null
    const spacePaints = spacePaintsRef.current
    // A Space with no color of its own takes no tint: it paints as a Location does, rather than reading as a grey blob with a glyph lost inside it.
    const spacePaintOf = (n: GraphNode): SpacePaint | null => {
      if (n.kind !== 'space') return null
      const color = spaces?.get(n.id)?.color
      if (!color) return null
      const held = spacePaints.get(color)
      if (held) return held
      const made = readSpacePaint(host, color)
      spacePaints.set(color, made)
      return made
    }
    const dragging = matrixRuntime.draggingIndex()
    // A held node keeps the focus even when the pointer outruns it, since it trails the cursor on its spring.
    const focus = dragging >= 0 ? dragging : matrixRuntime.hoveredIndex()
    if (focus >= 0) subjectRef.current = nodes[focus].id

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
    // The released subject outlives its focus until the emphasis reaches nothing, held by id so a rebuild mid-fade cannot resolve it onto whatever took the slot.
    let subject = focus >= 0 || emphasis > 0 ? matrixRuntime.indexOf(subjectRef.current) : -1
    // A subject that left the graph mid-fade takes the emphasis with it: without this the whole picture reads as lit.
    if (subject < 0 && emphasis > 0) {
      ease.from = 0
      ease.to = 0
      ease.t = 1
      emphasis = 0
      subject = -1
    }
    const dim = 1 - emphasis * (1 - paint.inactive)

    const arrivals = matrixRuntime.arrivals
    const arrival =
      arrivals.size === 0
        ? (): number => 1
        : (i: number): number => {
            const born = arrivals.get(nodes[i].id)
            return born === undefined ? 1 : clamp((now - born) / FADE_MS, 0, 1)
          }

    const strokeOf = (l: GraphLink): string =>
      isGroupingLink(matrixRuntime.mode, l.kind) ? paint.link : paint.linkOther

    const neighbours = neighboursRef.current
    const hot = hotRef.current
    const isLit = (i: number): boolean => subject < 0 || i === subject || neighbours.has(i)
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
          strokeOf(l),
          dim * Math.min(arrival(l.source), arrival(l.target)),
        )
    }
    const subjectSpace = subject >= 0 ? spacePaintOf(nodes[subject]) : null
    const hotStroke = subjectSpace?.stroke ?? (dragging >= 0 ? paint.ringDrag : paint.linkHover)
    for (const l of hot) {
      const a = Math.min(arrival(l.source), arrival(l.target))
      drawLink(ctx, graph, l, v, strokeOf(l), a)
      drawLink(ctx, graph, l, v, hotStroke, a * emphasis)
    }

    const alphas = titleAlphas(v.zoom)
    // Both resting tones are cut once: a node loop that minted one per node would allocate the whole graph every frame.
    const rest: Tone = { fill: paint.fill, lit: paint.fillLit, stroke: paint.ringHover }
    const restHeld: Tone = { fill: paint.fill, lit: paint.fillLit, stroke: paint.ringDrag }
    nodes.forEach((n, i) => {
      const [sx, sy] = toScreen(v, n.x, n.y)
      const r = n.radius * v.zoom
      if (sx + r < 0 || sy + r < 0 || sx - r > width || sy - r > height) return
      const ring = i === dragging ? 'drag' : i === subject ? 'hover' : 'rest'
      const lit = isLit(i)
      const space = spacePaintOf(n)
      const tone = space ?? (ring === 'drag' ? restHeld : rest)
      const alpha = (lit ? 1 : dim) * arrival(i)
      const raise = lit ? emphasis : 0
      drawNode(ctx, sx, sy, r, paint, tone, ring, alpha, raise)
      if (hideIcon) return
      // A Page's glyph arrives on the zoom that reveals its title; a Folder's and a Space's stand whatever the picture is scaled to.
      const iconAlpha = alpha * (n.kind === 'page' ? alphas.page : 1)
      const glyph = iconAlpha > 0 ? records?.get(n.id)?.icon : undefined
      if (!glyph) return
      const box = r * 2 * paint.iconScale
      const px = box * dprRef.current
      const left = sx - box / 2
      const top = sy - box / 2
      const image = iconFor(glyph, space?.icon ?? paint.icon, px)
      if (image) {
        ctx.globalAlpha = iconAlpha
        ctx.drawImage(image, left, top, box, box)
        ctx.globalAlpha = 1
      }
      // The glyph rides the same layering its fill does, so a Space's icon brightens with the tint it sits on rather than holding its resting color through the raise.
      const raised = space && raise > 0 ? iconFor(glyph, paint.fillLit, px) : null
      if (raised) {
        ctx.globalAlpha = iconAlpha * raise
        ctx.drawImage(raised, left, top, box, box)
        ctx.globalAlpha = 1
      }
    })
    for (const g of matrixRuntime.ghosts) {
      const [sx, sy] = toScreen(v, g.x, g.y)
      drawNode(
        ctx,
        sx,
        sy,
        g.radius * v.zoom,
        paint,
        rest,
        'rest',
        clamp(1 - (now - g.born) / FADE_MS, 0, 1),
      )
    }

    ctx.font = paint.titleFont
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = paint.title
    const cells = cellsRef.current
    cullLabels(nodes, v, width, height, matrixRuntime.indexOf(labelId), cells, alphas)
    for (const i of cells.values()) {
      const n = nodes[i]
      const [sx, sy] = toScreen(v, n.x, n.y + n.radius)
      ctx.globalAlpha = (isLit(i) ? 1 : dim) * arrival(i) * alphas[n.kind]
      ctx.fillText(n.title, sx - ctx.measureText(n.title).width / 2, sy + s.TITLE_OFFSET)
      ctx.globalAlpha = 1
    }
  }

  // The accent lands as `--accent` on the root, from the setting and from the system colour alike; the paint is re-read off that write.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const read = (): void => {
      paintRef.current = readPaint(host)
      spacePaintsRef.current.clear()
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
