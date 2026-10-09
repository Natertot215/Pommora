// A code block's lines scroll as one: each content line's code sits in a run its block's offset shifts, so the frame, the gutter, and the tag hold still while the code moves under them.
import {
  EditorSelection,
  Prec,
  type Range,
  StateEffect,
  StateField,
  type Text,
} from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import { overScrollFace } from '@pommora/uix/Interactions/OverScroll'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { editorHost, redrawNudge } from './api'
import { docScan, drawnLast } from './docCache'
import { codeSeat } from './Engine/detect'
import type { DocScan } from './Engine/docScan'
import { lineIndexAt } from './Engine/markdownCode'
import { lineElementAt } from './lineDom'

/** A block by the start of its opening fence line; `overflow` is how far its widest line runs past the width its lines rest at. */
interface BlockScroll {
  from: number
  x: number
  overflow: number
}
interface CodeScrolls {
  blocks: readonly BlockScroll[]
  hovered: number | null
}

const scrollBlock = StateEffect.define<BlockScroll>()
const hoverBlock = StateEffect.define<number | null>()

// KNOB: how far a sideways wheel over a resting block travels before the block reveals.
const REVEAL_TRAVEL = 24

const openerAt = (scan: DocScan, pos: number): number | null =>
  scan.fences[lineIndexAt(scan, pos)]?.from ?? null

export const codeScrolls = StateField.define<CodeScrolls>({
  create: () => ({ blocks: [], hovered: null }),
  update(value, tr) {
    let { blocks, hovered } = value
    if (tr.docChanged && (blocks.length > 0 || hovered !== null)) {
      const scan = docScan.after(tr)
      // Forward, so a line opened at the fence's own start leaves the key on the fence.
      const kept = (from: number): number | null => {
        const at = tr.changes.mapPos(from, 1)
        return openerAt(scan, at) === at ? at : null
      }
      blocks = blocks.flatMap((b) => {
        const from = kept(b.from)
        return from === null ? [] : [{ ...b, from }]
      })
      hovered = hovered === null ? null : kept(hovered)
    }
    for (const e of tr.effects)
      if (e.is(scrollBlock)) blocks = [...blocks.filter((b) => b.from !== e.value.from), e.value]
      else if (e.is(hoverBlock)) hovered = e.value
    return blocks === value.blocks && hovered === value.hovered ? value : { blocks, hovered }
  },
  toJSON: ({ blocks }) => blocks.filter((b) => b.x > 0).map((b) => [b.from, b.x]),
  // A warm entry restores only onto the text it was captured from, so its keys still open their fences; overflow is measured again on the next reveal.
  fromJSON: (json: [number, number][]) => ({
    blocks: json.map(([from, x]) => ({ from, x, overflow: x })),
    hovered: null,
  }),
})

const on = (view: EditorView): boolean => view.state.facet(editorHost).settings().codeblockScroll

const liveBlock = (view: EditorView): number | null =>
  on(view) && view.hasFocus
    ? openerAt(docScan(view.state.doc), view.state.selection.main.head)
    : null

const run = Decoration.mark({ class: `codeblock-run ${overScrollFace}` })
const nowrap = Decoration.line({ class: 'codeblock-nowrap' })

function decorate(view: EditorView, live: number | null): DecorationSet {
  if (!on(view)) return Decoration.none
  const scan = docScan(view.state.doc)
  const { blocks, hovered } = view.state.field(codeScrolls)
  const ranges: Range<Decoration>[] = []
  for (
    let i = lineIndexAt(scan, view.viewport.from), last = lineIndexAt(scan, view.viewport.to);
    i <= last;
    i++
  ) {
    const f = scan.fences[i]
    if (f?.role !== 'content') continue
    const ls = scan.lineStarts[i]
    const le = ls + scan.lines[i].length
    const seat = ls + codeSeat(scan.lines[i], f)
    const b = blocks.find((s) => s.from === f.from)
    const shown = f.from === live || f.from === hovered
    ranges.push(
      b || shown
        ? Decoration.line({
            class: shown ? 'codeblock-nowrap codeblock-revealed' : 'codeblock-nowrap',
            attributes: {
              style: `--code-scroll:${b?.x ?? 0}px;--code-overflow:${b?.overflow ?? 0}px`,
            },
          }).range(ls)
        : nowrap.range(ls),
    )
    if (seat < le) ranges.push(run.range(seat, le))
  }
  return Decoration.set(ranges)
}

// Made on first use, so nothing that only imports the editor creates a canvas.
let measure: CanvasRenderingContext2D | undefined
const widthsOf = drawnLast((key: string) => {
  measure ??= document.createElement('canvas').getContext('2d')!
  const cut = key.indexOf('\n')
  measure.font = key.slice(0, cut)
  return measure.measureText(key.slice(cut + 1)).width
})

/** A run's tab stops count from the run's own start, so a tab widens to the next stop there. */
const expandTabs = (text: string, size: number): string =>
  text.replace(/[^\t]*\t/g, (s) => s.slice(0, -1) + ' '.repeat(size - ((s.length - 1) % size)))

/** The width of a block's widest code line, read from every line of the block, drawn or not; a pass that leaves the text, block, and font alone reuses the last one. */
const widestHeld = new WeakMap<
  EditorView,
  { doc: Text; from: number; font: string; widest: number }
>()
function widestOf(view: EditorView, from: number, font: string): number {
  const { doc } = view.state
  const held = widestHeld.get(view)
  if (held?.doc === doc && held.from === from && held.font === font) return held.widest
  const scan = docScan(doc)
  const close = lineIndexAt(scan, scan.fences[lineIndexAt(scan, from)]!.to)
  let widest = 0
  widthsOf(view, (read) => {
    for (let i = lineIndexAt(scan, from) + 1; i < close; i++) {
      const code = scan.lines[i].slice(codeSeat(scan.lines[i], scan.fences[i]!))
      widest = Math.max(widest, read(`${font}\n${expandTabs(code, view.state.tabSize)}`))
    }
  })
  widestHeld.set(view, { doc, from, font, widest })
  return widest
}

/** How far a block's widest line runs past the width its lines rest at, in layout pixels; null while none of its lines is drawn to take the font and width from. */
function overflowOf(view: EditorView, from: number): number | null {
  const scan = docScan(view.state.doc)
  const open = lineIndexAt(scan, from)
  const last = Math.min(
    lineIndexAt(scan, scan.fences[open]!.to) - 1,
    lineIndexAt(scan, view.viewport.to),
  )
  let sample: HTMLElement | null = null
  for (let i = Math.max(open + 1, lineIndexAt(scan, view.viewport.from)); i <= last && !sample; i++)
    sample = lineElementAt(view, scan.lineStarts[i])
  if (!sample) return null
  const cs = getComputedStyle(sample)
  const rest = sample.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  return Math.max(0, Math.ceil(widestOf(view, from, cs.font) - rest))
}

/** The run's on-screen box for a position at or past its line's code, read only once the scan says the position is code. */
function runBox(view: EditorView, pos: number): DOMRect | null {
  if (
    !view.plugin(codeScrollPlugin) ||
    !on(view) ||
    pos < view.viewport.from ||
    pos > view.viewport.to
  )
    return null
  const scan = docScan(view.state.doc)
  const i = lineIndexAt(scan, pos)
  const f = scan.fences[i]
  if (f?.role !== 'content' || pos < scan.lineStarts[i] + codeSeat(scan.lines[i], f)) return null
  return lineElementAt(view, pos)?.querySelector('.codeblock-run')?.getBoundingClientRect() ?? null
}

/** The span a code line's run shows, in the coordinates CM's layers draw in. */
export function codeClip(view: EditorView, pos: number): { left: number; right: number } | null {
  const box = runBox(view, pos)
  if (!box) return null
  const base = view.scrollDOM.getBoundingClientRect().left - view.scrollDOM.scrollLeft * view.scaleX
  return { left: box.left - base, right: box.right - base }
}

/** How far the offset must move to bring the caret clear of the run's fading edges, in layout pixels. */
function caretShift(view: EditorView): number {
  const head = view.state.selection.main.head
  const box = runBox(view, head)
  const caret = box && view.coordsAtPos(head)
  if (!box || !caret) return 0
  const room = parseFloat(getComputedStyle(view.contentDOM).getPropertyValue('--fade-light')) || 0
  if (caret.left > box.right - room) return (caret.left - box.right + room) / view.scaleX
  if (caret.left < box.left + room) return (caret.left - box.left - room) / view.scaleX
  return 0
}

function blockUnder(view: EditorView, target: EventTarget | null): number | null {
  const line = target instanceof Element ? target.closest<HTMLElement>('.cm-line.codeblock') : null
  if (!line || line.closest('.cm-content') !== view.contentDOM) return null
  return openerAt(docScan(view.state.doc), view.posAtDOM(line))
}

class CodeScroll {
  deco: DecorationSet
  live: number | null
  /** Whether the live block's width or code may have moved since its overflow was last measured. */
  stale = true
  /** Sideways travel gathered over a resting block, toward revealing it. */
  gathered = { from: -1, dx: 0 }

  constructor(view: EditorView) {
    this.live = liveBlock(view)
    this.deco = decorate(view, this.live)
  }

  update(u: ViewUpdate): void {
    const live = liveBlock(u.view)
    if (live !== this.live || u.docChanged || u.geometryChanged) this.stale = true
    if (
      live !== this.live ||
      u.docChanged ||
      u.viewportChanged ||
      u.startState.field(codeScrolls) !== u.state.field(codeScrolls) ||
      u.transactions.some((tr) => tr.effects.some((e) => e.is(redrawNudge)))
    ) {
      this.live = live
      this.deco = decorate(u.view, live)
    }
  }
}

const codeScrollPlugin = ViewPlugin.fromClass(CodeScroll, {
  provide: (p) => EditorView.outerDecorations.of((v) => v.plugin(p)?.deco ?? Decoration.none),
  eventObservers: {
    wheel(e, view) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !on(view)) return
      const from = blockUnder(view, e.target)
      if (from === null) return
      const { blocks, hovered } = view.state.field(codeScrolls)
      const b = blocks.find((s) => s.from === from)
      if (from === this.live || from === hovered) {
        if (!b) return
        const x = clamp(b.x + e.deltaX, 0, b.overflow)
        if (x !== b.x) view.dispatch({ effects: scrollBlock.of({ ...b, x }) })
        return
      }
      const g = this.gathered
      g.dx = g.from === from ? g.dx + e.deltaX : e.deltaX
      g.from = from
      if (Math.abs(g.dx) < REVEAL_TRAVEL) return
      g.from = -1
      const overflow = overflowOf(view, from) ?? b?.overflow ?? 0
      view.dispatch({
        effects: [
          hoverBlock.of(from),
          scrollBlock.of({ from, x: Math.min(b?.x ?? 0, overflow), overflow }),
        ],
      })
    },
    // `relatedTarget` is where the pointer went; a table, a tile, or anything off the editor resolves to no block.
    pointerout(e, view) {
      const { hovered } = view.state.field(codeScrolls)
      if (hovered !== null && blockUnder(view, e.relatedTarget) !== hovered)
        view.dispatch({ effects: hoverBlock.of(null) })
    },
  },
})

/** A code line clips rather than wraps, so its boundary is its logical end; CM's wrap probe at the editor's edge would land on a clipped glyph. */
function lineBoundary(forward: boolean, extend: boolean) {
  return (view: EditorView): boolean => {
    const scan = docScan(view.state.doc)
    const r = view.state.selection.main
    if (!on(view) || scan.fences[lineIndexAt(scan, r.head)]?.role !== 'content') return false
    const to = view.moveToLineBoundary(r, forward, false)
    view.dispatch({
      selection: EditorSelection.create([extend ? EditorSelection.range(r.anchor, to.head) : to]),
      scrollIntoView: true,
      userEvent: 'select',
    })
    return true
  }
}

const boundaryKeys = Prec.high(
  keymap.of([
    { key: 'Home', run: lineBoundary(false, false), shift: lineBoundary(false, true) },
    { key: 'End', run: lineBoundary(true, false), shift: lineBoundary(true, true) },
    { mac: 'Cmd-ArrowLeft', run: lineBoundary(false, false), shift: lineBoundary(false, true) },
    { mac: 'Cmd-ArrowRight', run: lineBoundary(true, false), shift: lineBoundary(true, true) },
  ]),
)

// A dispatch from a measure's write is refused and one deferred a frame draws the caret stale, so the follow reads layout here, once the update has landed.
const follow = EditorView.updateListener.of((u) => {
  const plugin = u.view.plugin(codeScrollPlugin)
  const from = plugin?.live ?? null
  if (!plugin || from === null || (!plugin.stale && !u.selectionSet)) return
  const { state } = u.view
  const b = state.field(codeScrolls).blocks.find((s) => s.from === from)
  const measured = plugin.stale || !b ? overflowOf(u.view, from) : null
  if (measured !== null) plugin.stale = false
  const overflow = measured ?? b?.overflow
  if (overflow === undefined) return
  const shift = caretShift(u.view)
  // Reading the caret can run CM's pending measure, whose own follow then already dispatched from fresher layout.
  if (u.view.state !== state) return
  const x = clamp((b?.x ?? 0) + shift, 0, overflow)
  if (x !== b?.x || overflow !== b?.overflow)
    u.view.dispatch({ effects: scrollBlock.of({ from, x, overflow }) })
})

export const codeScroll = [codeScrolls, codeScrollPlugin, boundaryKeys, follow]
