// A code block's lines scroll as one: each content line's code sits in a run its block's offset shifts, so the frame, the gutter, and the tag hold still while the code moves under them.
import {
  EditorSelection,
  MapMode,
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
  WidgetType,
} from '@codemirror/view'
import { overScrollFace } from '@pommora/uix/Interactions/OverScroll'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { editorHost, redrawNudge } from './api'
import { languageLoaded } from './codeHighlight'
import { docScan, drawnLast } from './docCache'
import { codeSeat, type FenceInfo } from './Engine/detect'
import type { DocScan } from './Engine/docScan'
import { lineIndexAt } from './Engine/markdownCode'
import { perText } from './Engine/perText'
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
const cutsRead = StateEffect.define<null>()

/** The width a block's lines rest at and the font its code is set in, read from its first drawn line. */
interface Rest {
  width: number
  font: string
}

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
      // Forward, so a line opened at the fence's own start leaves the key on the fence, and a deleted opener drops it.
      const kept = (from: number): number | null => {
        const at = tr.changes.mapPos(from, 1, MapMode.TrackAfter)
        return at !== null && openerAt(scan, at) === at ? at : null
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
  // A warm entry restores only onto the text it was captured from, so its keys still open their fences; overflow is measured again once the block is drawn.
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

// Inclusive, so a tab stop at either edge of the code draws inside its run.
const run = Decoration.mark({ class: `codeblock-run ${overScrollFace}`, inclusive: true })
const ink = Decoration.mark({ class: 'codeblock-ink' })
const nowrap = Decoration.line({ class: 'codeblock-nowrap' })

/** A tab drawn as the stop it reaches from its run's start; a run shifts by text-indent, which moves where the browser would otherwise count stops from. */
class TabStop extends WidgetType {
  constructor(readonly cols: number) {
    super()
  }
  eq(other: TabStop): boolean {
    return other.cols === this.cols
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'codeblock-tab'
    el.style.width = `${this.cols}ch`
    return el
  }
}
const tabStop = perText((cols) => Decoration.replace({ widget: new TabStop(Number(cols)) }), 16)

// The language and the line's place in its block stand in for its context, since the same code colors differently inside a comment or another language.
const cutKey = (rest: Rest, x: number, f: FenceInfo, code: string): string =>
  `${rest.width}|${x}|${rest.font}|${f.name ?? ''}|${f.ordinal}|${code}`

/** The first and last of a block's content lines the viewport holds. */
function drawnSpan(view: EditorView, scan: DocScan, from: number): [number, number] {
  const open = lineIndexAt(scan, from)
  return [
    Math.max(open + 1, lineIndexAt(scan, view.viewport.from)),
    Math.min(lineIndexAt(scan, scan.fences[open]!.to) - 1, lineIndexAt(scan, view.viewport.to)),
  ]
}

/** A code line's frame: its block's offset and overflow once the block shows or has scrolled, and the color its resting ellipsis takes. */
function frameOf(b: BlockScroll | undefined, shown: boolean, cut?: string): Decoration {
  const vars = [
    (b || shown) && `--code-scroll:${b?.x ?? 0}px;--code-overflow:${b?.overflow ?? 0}px`,
    cut && `--code-cut:${cut}`,
  ].filter(Boolean)
  return vars.length > 0
    ? Decoration.line({
        class: shown ? 'codeblock-nowrap codeblock-revealed' : 'codeblock-nowrap',
        attributes: { style: vars.join(';') },
      })
    : nowrap
}

function decorate(
  view: EditorView,
  live: number | null,
  rests: ReadonlyMap<number, Rest>,
  cuts: ReadonlyMap<string, string>,
): [DecorationSet, DecorationSet] {
  if (!on(view)) return [Decoration.none, Decoration.none]
  const scan = docScan(view.state.doc)
  const { blocks, hovered } = view.state.field(codeScrolls)
  const ranges: Range<Decoration>[] = []
  const inks: Range<Decoration>[] = []
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
    const rest = rests.get(f.from)
    const code = scan.lines[i].slice(seat - ls)
    const cut = !shown && rest ? cuts.get(cutKey(rest, b?.x ?? 0, f, code)) : undefined
    ranges.push(frameOf(b, shown, cut).range(ls))
    if (seat < le) {
      ranges.push(run.range(seat, le))
      inks.push(ink.range(seat, le))
      if (code.includes('\t'))
        for (let k = 0, col = 0; k < code.length; k++) {
          if (code[k] !== '\t') col++
          else {
            const cols = view.state.tabSize - (col % view.state.tabSize)
            inks.push(tabStop(String(cols)).range(seat + k, seat + k + 1))
            col += cols
          }
        }
    }
  }
  return [Decoration.set(ranges, true), Decoration.set(inks, true)]
}

/** Moves each shown block's drawn lines to its new offset, leaving the runs, the ink, and every other line as drawn. */
function shiftFrames(
  view: EditorView,
  deco: DecorationSet,
  moved: readonly BlockScroll[],
): DecorationSet {
  const scan = docScan(view.state.doc)
  for (const b of moved) {
    const [first, last] = drawnSpan(view, scan, b.from)
    if (first > last) continue
    const frame = frameOf(b, true)
    const add: Range<Decoration>[] = []
    for (let i = first; i <= last; i++) add.push(frame.range(scan.lineStarts[i]))
    deco = deco.update({
      add,
      filter: (from, to) => to > from,
      filterFrom: scan.lineStarts[first],
      filterTo: scan.lineStarts[last],
    })
  }
  return deco
}

// Made on first use, so nothing that only imports the editor creates a canvas.
let measure: CanvasRenderingContext2D | undefined
function textWidth(font: string, text: string): number {
  measure ??= document.createElement('canvas').getContext('2d')!
  measure.font = font
  return measure.measureText(text).width
}
const widthsOf = drawnLast((key: string) => {
  const cut = key.indexOf('\n')
  return textWidth(key.slice(0, cut), key.slice(cut + 1))
})

/** A run's tabs reach stops counted from the run's own start, as its tab stops draw them. */
const expandTabs = (text: string, size: number): string =>
  text.replace(/[^\t]*\t/g, (s) => s.slice(0, -1) + ' '.repeat(size - ((s.length - 1) % size)))

interface Widest {
  widest: number
  at: number
  end: number
}

/** The width of a block's widest code line, read from every line of the block, drawn or not. A pass that leaves the text, block, and font alone reuses the last one, and an edit inside the block measures only the lines it touched unless it shortened the widest. */
const widestHeld = new WeakMap<EditorView, Widest & { doc: Text; from: number; font: string }>()
function widestOf(view: EditorView, from: number, font: string, edit?: ViewUpdate): number {
  const { doc, tabSize } = view.state
  const held = widestHeld.get(view)
  if (held?.doc === doc && held.from === from && held.font === font) return held.widest
  const scan = docScan(doc)
  const open = lineIndexAt(scan, from)
  const close = lineIndexAt(scan, scan.fences[open]!.to)
  const lineOf = (i: number, w: number): Widest => ({
    widest: w,
    at: scan.lineStarts[i],
    end: scan.lineStarts[i] + scan.lines[i].length,
  })
  const codeOf = (i: number) =>
    expandTabs(scan.lines[i].slice(codeSeat(scan.lines[i], scan.fences[i]!)), tabSize)
  const changes = edit?.changes
  const carried =
    held &&
    changes &&
    held.doc === edit.startState.doc &&
    held.font === font &&
    changes.mapPos(held.from, 1, MapMode.TrackAfter) === from
  let best: Widest = { widest: 0, at: -1, end: -1 }
  if (carried) {
    changes.iterChangedRanges((_fa, _ta, fb, tb) => {
      const last = Math.min(close - 1, lineIndexAt(scan, tb))
      for (let i = Math.max(open + 1, lineIndexAt(scan, fb)); i <= last; i++) {
        const w = textWidth(font, codeOf(i))
        if (w > best.widest) best = lineOf(i, w)
      }
    })
    if (!changes.touchesRange(held.at, held.end) && held.widest > best.widest)
      best = { widest: held.widest, at: changes.mapPos(held.at), end: changes.mapPos(held.end) }
  }
  if (!carried || (changes.touchesRange(held.at, held.end) && best.widest < held.widest)) {
    best = { widest: 0, at: -1, end: -1 }
    widthsOf(view, (read) => {
      for (let i = open + 1; i < close; i++) {
        const w = read(`${font}\n${codeOf(i)}`)
        if (w > best.widest) best = lineOf(i, w)
      }
    })
  }
  widestHeld.set(view, { doc, from, font, ...best })
  return best.widest
}

/** The width a drawn code line rests at and its font. */
function restOf(line: HTMLElement): Rest {
  const cs = getComputedStyle(line)
  return {
    width: line.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    font: cs.font,
  }
}

/** How far a block's widest line runs past the width its lines rest at, in layout pixels; null while none of its lines is drawn to take the font and width from. */
function overflowOf(view: EditorView, from: number, edit?: ViewUpdate): number | null {
  const scan = docScan(view.state.doc)
  const [first, last] = drawnSpan(view, scan, from)
  let sample: HTMLElement | null = null
  for (let i = first; i <= last && !sample; i++) sample = lineElementAt(view, scan.lineStarts[i])
  if (!sample) return null
  const rest = restOf(sample)
  return Math.max(0, Math.ceil(widestOf(view, from, rest.font, edit) - rest.width))
}

/** The color of the code a resting run's ellipsis stands in for: the first character past what the run shows, found the way the ellipsis is placed, by the widths of the code before it. */
function cutColor(view: EditorView, start: number, code: string, rest: Rest, x: number): string {
  const width = (text: string) => textWidth(rest.font, expandTabs(text, view.state.tabSize))
  const edge = x + rest.width
  if (width(code) <= edge) return ''
  const room = edge - width('…')
  let lo = 0
  let hi = code.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (width(code.slice(0, mid + 1)) > room) hi = mid
    else lo = mid + 1
  }
  const { node } = view.domAtPos(start + lo + 1, -1)
  const host = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
  return host ? getComputedStyle(host).color : ''
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
  inks: DecorationSet
  live: number | null
  /** Whether the live block's width or code may have moved since its overflow was last measured. */
  stale = true
  /** Sideways travel gathered over a resting block, toward revealing it. */
  gathered = { from: -1, dx: 0 }
  /** Each drawn block's resting width and font, by its key; an edit that touches a block drops it to be read again. */
  rests = new Map<number, Rest>()
  /** Whether geometry moved since the drawn blocks' rests were last checked. */
  reflow = false
  /** Each drawn resting line's ellipsis color, by its block's rest, its offset, and its code; empty where the line fits. */
  cuts = new Map<string, string>()
  /** Whether a drawn line may have a rest or an ellipsis color not yet read. */
  unread = true

  constructor(view: EditorView) {
    this.live = liveBlock(view)
    ;[this.deco, this.inks] = decorate(view, this.live, this.rests, this.cuts)
  }

  update(u: ViewUpdate): void {
    const live = liveBlock(u.view)
    if (live !== this.live || u.docChanged || u.geometryChanged) this.stale = true
    if (u.docChanged) this.rests = mapRests(this.rests, u)
    if (u.geometryChanged) this.reflow = this.unread = true
    if (u.transactions.some((tr) => tr.effects.some((e) => e.is(languageLoaded)))) {
      this.cuts.clear()
      this.unread = true
    }
    const was = u.startState.field(codeScrolls)
    const now = u.state.field(codeScrolls)
    if (
      live !== this.live ||
      u.docChanged ||
      u.viewportChanged ||
      u.transactions.some((tr) => tr.effects.some((e) => e.is(redrawNudge) || e.is(cutsRead)))
    )
      this.redraw(u.view, live)
    else if (was !== now) {
      const moved = now.blocks.filter((b) => !was.blocks.includes(b))
      // A shown block has no ellipsis to recolor, so an offset that moved alone changes only its lines' frames.
      if (
        was.hovered === now.hovered &&
        moved.every((b) => b.from === live || b.from === now.hovered)
      )
        this.deco = shiftFrames(u.view, this.deco, moved)
      else this.redraw(u.view, live)
    }
  }

  private redraw(view: EditorView, live: number | null): void {
    this.live = live
    ;[this.deco, this.inks] = decorate(view, live, this.rests, this.cuts)
    this.unread = true
  }

  /** Reads what the drawn blocks other than the live one lack: each block's rest, which re-clamps an offset its width no longer allows, and each resting line's ellipsis color. */
  read(view: EditorView): StateEffect<unknown>[] {
    const scan = docScan(view.state.doc)
    const { blocks, hovered } = view.state.field(codeScrolls)
    const cuts = new Map<string, string>()
    const checked = new Set<number>()
    const effects: StateEffect<unknown>[] = []
    let colored = false
    for (
      let i = lineIndexAt(scan, view.viewport.from), last = lineIndexAt(scan, view.viewport.to);
      i <= last;
      i++
    ) {
      const f = scan.fences[i]
      if (f?.role !== 'content' || f.from === this.live) continue
      const b = blocks.find((s) => s.from === f.from)
      let rest = this.rests.get(f.from)
      if (!rest || (this.reflow && !checked.has(f.from))) {
        const line = lineElementAt(view, scan.lineStarts[i])
        if (!line) continue
        checked.add(f.from)
        const read = restOf(line)
        const moved = read.width !== rest?.width || read.font !== rest.font
        rest = moved ? read : rest!
        this.rests.set(f.from, rest)
        if (b && moved) {
          const overflow = Math.max(0, Math.ceil(widestOf(view, f.from, rest.font) - rest.width))
          if (overflow !== b.overflow)
            effects.push(scrollBlock.of({ ...b, x: Math.min(b.x, overflow), overflow }))
        }
      }
      if (f.from === hovered) continue
      const seat = scan.lineStarts[i] + codeSeat(scan.lines[i], f)
      const code = scan.lines[i].slice(seat - scan.lineStarts[i])
      const key = cutKey(rest, b?.x ?? 0, f, code)
      let color = this.cuts.get(key)
      if (color === undefined) {
        color = cutColor(view, seat, code, rest, b?.x ?? 0)
        colored ||= color !== ''
      }
      cuts.set(key, color)
    }
    this.cuts = cuts
    this.reflow = false
    if (colored) effects.push(cutsRead.of(null))
    return effects
  }
}

/** Carries each block's rest through an edit to its new key, dropping a block the edit touched or whose opener it deleted. */
function mapRests(rests: Map<number, Rest>, u: ViewUpdate): Map<number, Rest> {
  const scan = docScan(u.startState.doc)
  const out = new Map<number, Rest>()
  for (const [from, rest] of rests) {
    const to = scan.fences[lineIndexAt(scan, from)]?.to ?? from
    const at = u.changes.mapPos(from, 1, MapMode.TrackAfter)
    if (at !== null && !u.changes.touchesRange(from, to)) out.set(at, rest)
  }
  return out
}

const codeScrollPlugin = ViewPlugin.fromClass(CodeScroll, {
  // The ink and the tab stops are regular decorations, so they sit inside the run, whichever way the syntax marks nest with them.
  provide: (p) => [
    EditorView.outerDecorations.of((v) => v.plugin(p)?.deco ?? Decoration.none),
    EditorView.decorations.of((v) => v.plugin(p)?.inks ?? Decoration.none),
  ],
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
        if (x === b.x) return
        // Scrolled back to its start, a wheel-revealed block rests again and takes its ellipsis back.
        const rests = x === 0 && from !== this.live
        view.dispatch({
          effects: rests
            ? [scrollBlock.of({ ...b, x }), hoverBlock.of(null)]
            : scrollBlock.of({ ...b, x }),
        })
        return
      }
      const g = this.gathered
      g.dx = g.from === from ? g.dx + e.deltaX : e.deltaX
      g.from = from
      // A block at its start has nowhere to go leftward, so only rightward travel reveals it.
      if (Math.abs(g.dx) < REVEAL_TRAVEL || (g.dx < 0 && !b?.x)) return
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

/** A code line clips rather than wraps, so its boundary is its logical end; CM's wrap probe at the editor's edge would land on a clipped glyph. Backward, it takes the code's indentation first, then the code's start, as CM's own Home does. */
function lineBoundary(forward: boolean, extend: boolean) {
  return (view: EditorView): boolean => {
    const scan = docScan(view.state.doc)
    const r = view.state.selection.main
    const i = lineIndexAt(scan, r.head)
    const f = scan.fences[i]
    if (!on(view) || f?.role !== 'content') return false
    let to = view.moveToLineBoundary(r, forward, false)
    if (!forward) {
      const seat = scan.lineStarts[i] + codeSeat(scan.lines[i], f)
      const text = scan.lines[i].slice(seat - scan.lineStarts[i])
      const indent = seat + text.length - text.trimStart().length
      to = EditorSelection.cursor(r.head === indent ? seat : indent)
    }
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
  const field = u.view.state.field(codeScrolls)
  const b = field.blocks.find((s) => s.from === from)
  const measured = plugin.stale || !b ? overflowOf(u.view, from, u) : null
  if (measured !== null) plugin.stale = false
  const overflow = measured ?? b?.overflow
  if (overflow === undefined) return
  const shift = caretShift(u.view)
  // Reading the caret can run CM's pending measure, whose own follow may already have moved the offset from fresher layout.
  if (u.view.state.field(codeScrolls) !== field) return
  const x = clamp((b?.x ?? 0) + shift, 0, overflow)
  if (x !== b?.x || overflow !== b?.overflow)
    u.view.dispatch({ effects: scrollBlock.of({ from, x, overflow }) })
})

// Rests and ellipsis colors are read once the lines they belong to are drawn, and a dispatch from here draws them before the frame paints.
const readDrawn = EditorView.updateListener.of((u) => {
  const plugin = u.view.plugin(codeScrollPlugin)
  if (!plugin?.unread || !on(u.view)) return
  plugin.unread = false
  const effects = plugin.read(u.view)
  if (effects.length > 0) u.view.dispatch({ effects })
})

export const codeScroll = [codeScrolls, codeScrollPlugin, boundaryKeys, follow, readDrawn]
