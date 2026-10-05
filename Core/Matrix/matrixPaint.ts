import { duration, easeBase, ms } from '@pommora/uix/Animations/motion'
import { GLASS_EDGE } from '@pommora/uix/Glass/glassBase'
import { text, vars } from '@pommora/uix/Theme'
import { STATE_OPACITY } from '@pommora/uix/Theme/color.css'
import { mixAt } from '@pommora/uix/Theme/colors'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { currentZoom } from '@pommora/uix/Utilities/zoom'
import { spacesByIdOf } from '../Contexts/contextIdentity'
import { recordsByIdOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { BASE_RADIUS, LINK_GAP } from './Engine/forces'
import { type Graph, type GraphLink, type GraphNode, isGroupingLink } from './Engine/graph'
import { cullLabels, labelReveal, type LabelReveal } from './Engine/labels'
import { toScreen, type Viewport } from './Engine/viewport'
import { iconFor, iconsLoading } from './iconCache'
import { TITLE_OFFSET } from './matrix.css'
import { FADE_MS, matrixRuntime, type Surface } from './matrixRuntime'

// KNOBs — the link widths, the frame ceiling the emphasis eases against, and a glyph's share of its node's diameter.
const LINK_WIDTH_MIN = 1.25
const LINK_WIDTH_MAX = 5.0
const LINK_WIDTH_SCALE = 0.5
const MAX_FRAME_MS = 64
const ICON_SCALE = 0.5

const INACTIVE = Number(STATE_OPACITY.inactive)
const c = vars.color

const titleAlphas = (zoom: number): LabelReveal => {
  const r = labelReveal(zoom)
  return { page: easeBase(r.page), folder: easeBase(r.folder), space: easeBase(r.space) }
}

interface Paint {
  fill: string
  fillLit: string
  ring: string
  accent: string
  ringDrag: string
  link: string
  linkOther: string
  title: string
  icon: string
  hairline: number
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

interface Painter {
  draw: () => void
  restyle: () => void
  resize: () => void
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
  const width = Number.parseFloat(getComputedStyle(host).getPropertyValue('--width-200'))
  return withProbe(host, (probe) => {
    const cs = getComputedStyle(probe)
    const color = (css: string): string => colorOf(probe, css)
    return {
      fill: color(c.label.control),
      fillLit: color(c.label.primary),
      ring: color(GLASS_EDGE),
      accent: color('var(--accent-stroke)'),
      ringDrag: color('var(--accent-stroke-hot)'),
      link: color(c.solid.greyDefault),
      linkOther: color(c.border.base),
      title: color(c.label.primary),
      icon: color(c.solid.grey),
      hairline: width,
      titleFont: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    }
  })
}

function readSpacePaint(host: HTMLElement, color: string): SpacePaint {
  const solid = solidColorCss(color)
  return withProbe(host, (probe) => ({
    fill: colorOf(probe, mixAt(solid, 'tertiary', c.label.control)),
    lit: colorOf(probe, mixAt(solid, 'primary', c.label.control)),
    stroke: colorOf(probe, solid),
    icon: colorOf(probe, mixAt(solid, 'solid', c.solid.grey)),
  }))
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  paint: Paint,
  tone: Tone,
  ringed: boolean,
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
  if (ringed && lit > 0) {
    ctx.globalAlpha = alpha * lit
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
  const width = clamp(LINK_WIDTH_MIN + weight * LINK_WIDTH_SCALE, LINK_WIDTH_MIN, LINK_WIDTH_MAX)
  ctx.lineWidth = Math.max(width * v.zoom, LINK_WIDTH_MIN)
  ctx.lineCap = 'round'
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.moveTo(ax + ux * from, ay + uy * from)
  ctx.lineTo(bx - ux * to, by - uy * to)
  ctx.stroke()
  ctx.globalAlpha = 1
}

export function createPainter(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  surface: Surface,
  live: { readonly current: string | null },
  label: { readonly current: string | null },
): Painter {
  const ctx = canvas.getContext('2d')
  let paint = readPaint(host)
  let subjectId: string | null = null
  let presented = false
  const ease = { from: 0, to: 0, t: 1, at: 0 }
  const neighbours = new Set<number>()
  const hot: GraphLink[] = []
  const cells = new Map<number, number>()
  const spacePaints = new Map<string, SpacePaint>()

  const draw = (): void => {
    // The runtime's listeners are not surface-scoped, so a parked surface would repaint its whole graph on every frame another surface drives.
    if (!ctx || !surface.visible()) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    ctx.clearRect(0, 0, width, height)

    const v = matrixRuntime.viewportOf(surface)
    const graph = matrixRuntime.graph
    const { nodes, links } = graph
    const { tree, matrixConfig } = useSession.getState()
    const records = tree ? recordsByIdOf(tree) : null
    const spaces = tree ? spacesByIdOf(tree) : null
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
    const dragging = matrixRuntime.indexOf(matrixRuntime.draggingId)
    // A held node keeps the focus even when the pointer outruns it, since it trails the cursor on its spring.
    const focus = dragging >= 0 ? dragging : matrixRuntime.indexOf(live.current)
    if (focus >= 0) subjectId = nodes[focus].id

    const now = performance.now()
    // Each flip re-seeds from the value on screen, so a reversal mid-fade cannot jump.
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
    const subject = focus >= 0 || emphasis > 0 ? matrixRuntime.indexOf(subjectId) : -1
    // A subject that left the graph mid-fade takes the emphasis with it: without this the whole picture reads as lit.
    if (subject < 0 && emphasis > 0) {
      ease.from = 0
      ease.to = 0
      ease.t = 1
      emphasis = 0
    }
    const dim = 1 - emphasis * (1 - INACTIVE)

    const arrivals = matrixRuntime.arrivals
    const arrival =
      arrivals.size === 0
        ? (): number => 1
        : (i: number): number => {
            const born = arrivals.get(nodes[i].id)
            return born === undefined ? 1 : clamp((now - born) / FADE_MS, 0, 1)
          }

    const strokeOf = (l: GraphLink): string =>
      isGroupingLink(matrixConfig.group.mode, l.kind) ? paint.link : paint.linkOther

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
    const hotStroke = subjectSpace?.stroke ?? (dragging >= 0 ? paint.ringDrag : paint.accent)
    for (const l of hot) {
      const a = Math.min(arrival(l.source), arrival(l.target))
      drawLink(ctx, graph, l, v, strokeOf(l), a)
      drawLink(ctx, graph, l, v, hotStroke, a * emphasis)
    }

    const alphas = titleAlphas(v.zoom)
    // Both resting tones are cut once: a node loop that minted one per node would allocate the whole graph every frame.
    const rest: Tone = { fill: paint.fill, lit: paint.fillLit, stroke: paint.accent }
    const restHeld: Tone = { fill: paint.fill, lit: paint.fillLit, stroke: paint.ringDrag }
    nodes.forEach((n, i) => {
      const [sx, sy] = toScreen(v, n.x, n.y)
      const r = n.radius * v.zoom
      if (sx + r < 0 || sy + r < 0 || sx - r > width || sy - r > height) return
      const lit = isLit(i)
      const space = spacePaintOf(n)
      const tone = space ?? (i === dragging ? restHeld : rest)
      const alpha = (lit ? 1 : dim) * arrival(i)
      const raise = lit ? emphasis : 0
      drawNode(ctx, sx, sy, r, paint, tone, i === subject, alpha, raise)
      if (matrixConfig.display.hideIcon) return
      // A Page's glyph arrives on the zoom that reveals its title; a Folder's and a Space's stand whatever the picture is scaled to.
      const iconAlpha = alpha * (n.kind === 'page' ? alphas.page : 1)
      const glyph = iconAlpha > 0 ? records?.get(n.id)?.icon : undefined
      if (!glyph) return
      const box = r * 2 * ICON_SCALE
      const left = sx - box / 2
      const top = sy - box / 2
      const image = iconFor(glyph, space?.icon ?? paint.icon)
      if (image) {
        ctx.globalAlpha = iconAlpha
        ctx.drawImage(image, left, top, box, box)
        ctx.globalAlpha = 1
      }
      // The glyph rides the same layering its fill does, so a Space's icon brightens with the tint it sits on rather than holding its resting color through the raise.
      const raised = space && raise > 0 ? iconFor(glyph, paint.fillLit) : null
      if (raised) {
        ctx.globalAlpha = iconAlpha * raise
        ctx.drawImage(raised, left, top, box, box)
        ctx.globalAlpha = 1
      }
    })
    // The first picture with nodes in it waits on the glyphs it asked for, so it never shows them bare.
    if (!presented) {
      if (iconsLoading()) {
        ctx.clearRect(0, 0, width, height)
        return
      }
      presented = nodes.length > 0
    }
    for (const g of matrixRuntime.ghosts) {
      const [sx, sy] = toScreen(v, g.x, g.y)
      drawNode(
        ctx,
        sx,
        sy,
        g.radius * v.zoom,
        paint,
        rest,
        false,
        clamp(1 - (now - g.born) / FADE_MS, 0, 1),
      )
    }

    ctx.font = paint.titleFont
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = paint.title
    cullLabels(nodes, v, width, height, matrixRuntime.indexOf(label.current), cells, alphas)
    for (const i of cells.values()) {
      const n = nodes[i]
      const [sx, sy] = toScreen(v, n.x, n.y + n.radius)
      ctx.globalAlpha = (isLit(i) ? 1 : dim) * arrival(i) * alphas[n.kind]
      ctx.fillText(n.title, sx, sy + TITLE_OFFSET)
      ctx.globalAlpha = 1
    }
  }

  return {
    draw,
    restyle: () => {
      paint = readPaint(host)
      spacePaints.clear()
      draw()
    },
    resize: () => {
      // The backing store is physical pixels: the device ratio compounded with any CSS zoom the surface renders at.
      const scale = (window.devicePixelRatio || 1) * currentZoom(host)
      canvas.width = Math.round(host.clientWidth * scale)
      canvas.height = Math.round(host.clientHeight * scale)
      ctx?.setTransform(scale, 0, 0, scale, 0, 0)
      draw()
    },
  }
}
