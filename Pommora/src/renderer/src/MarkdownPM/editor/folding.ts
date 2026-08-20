import { EditorView, Decoration, WidgetType, type ViewUpdate } from '@codemirror/view'
import {
  StateField,
  StateEffect,
  Annotation,
  type EditorState,
  type Extension,
  type Text,
  type Range,
} from '@codemirror/state'
import { headingParts, isHeadingLine, lineOffsets, splitWithOffsets } from '../detect'
import { fencedLineMask } from '@shared/markdownCode'
import { docString } from './docCache'
import { createBlockDragGesture } from './blockDrag'
import { lineElementAt } from './lineDom'

/** Per-page fold persistence seam — reads/writes the device-local fold state via the host (kept
 *  Electron-free here, so this file never learns where that state lives). */
export interface FoldsApi {
  load: () => Promise<string[]>
  save: (keys: string[]) => void
}

/** Marks the mount-time re-apply of saved folds so the persist listener doesn't echo it straight back to disk. */
const initialFoldAnnotation = Annotation.define<boolean>()

export interface HeadingSection {
  from: number
  /** End of the heading line's text — the body to fold begins on the next line. */
  lineEnd: number
  level: number
  /** Ordinal-disambiguated key for the saved fold set (stable across heading-level changes). */
  key: string
  /** End of the section: the last line before the next equal-or-higher heading (or document end). */
  to: number
}

interface ScannedHeading {
  idx: number
  level: number
  /** The heading's own text, markers stripped. */
  text: string
  /** Ordinal-disambiguated identity — duplicate text stays tellable apart across renders and folds. */
  key: string
}

/** Every heading line in document order. THE heading scan — the fold sections and the outline both
 *  read it, so the two can never disagree about what counts as a heading. */
function scanHeadings(lines: string[]): ScannedHeading[] {
  const heads: ScannedHeading[] = []
  const seen = new Map<string, number>()
  // Fence parity: a `# comment` inside a code block is code, not a heading — treating it as one gives it
  // a chevron, corrupts heading-drag extents, and poisons the persisted fold keys.
  const fenced = fencedLineMask(lines)
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue
    if (!isHeadingLine(lines[i])) continue
    const m = headingParts(lines[i])
    if (!m) continue
    const text = m.content.trim()
    const n = (seen.get(text) ?? 0) + 1
    seen.set(text, n)
    heads.push({ idx: i, level: m.hashes.length, text, key: n === 1 ? text : `${text} ${n}` })
  }
  return heads
}

export interface OutlineHeading {
  /** Offset of the heading line's start — what a jump scrolls to. */
  from: number
  level: number
  text: string
  key: string
}

/** Every heading, body-less ones included. `headingSections` drops those because there is nothing to
 *  fold; an outline still has to list them, or two consecutive headings would show only the second. */
export function headingOutline(doc: string): OutlineHeading[] {
  const { lines, lineStarts } = splitWithOffsets(doc)
  return scanHeadings(lines).map((h) => ({
    from: lineStarts[h.idx],
    level: h.level,
    text: h.text,
    key: h.key,
  }))
}

/** Exclusive end index of the section heading `start` owns — the first later heading of
 *  equal-or-higher level, or the array end. Levels alone decide the span, so any level-bearing
 *  heading list works. */
export function sectionEnd(headings: readonly { level: number }[], start: number): number {
  for (let n = start + 1; n < headings.length; n++)
    if (headings[n].level <= headings[start].level) return n
  return headings.length
}

/** Every heading's foldable section. A section reaching no body lines is dropped (nothing to fold),
 *  but still consumes its ordinal so duplicate-text keys stay stable. */
export function headingSections(doc: string): HeadingSection[] {
  const lines = doc.split('\n')
  const starts = lineOffsets(lines)
  const heads = scanHeadings(lines)

  const out: HeadingSection[] = []
  for (let h = 0; h < heads.length; h++) {
    const { idx, level, key } = heads[h]
    let endLine = lines.length - 1
    for (let n = h + 1; n < heads.length; n++) {
      if (heads[n].level <= level) {
        endLine = heads[n].idx - 1
        break
      }
    }
    const from = starts[idx]
    const lineEnd = from + lines[idx].length
    const to = starts[endLine] + lines[endLine].length
    if (to > lineEnd) out.push({ from, lineEnd, level, key, to })
  }
  return out
}

const sectionCache = new WeakMap<Text, HeadingSection[]>()
function sectionsOf(doc: Text): HeadingSection[] {
  let s = sectionCache.get(doc)
  if (!s) {
    s = headingSections(docString(doc))
    sectionCache.set(doc, s)
  }
  return s
}

// ── What a fold can be about ───────────────────────────────────────────────────
// A heading section is one kind of foldable region; it is not the only possible one. A region is
// named by its KIND and its anchor — the line the chevron sits on — and each kind says where its
// regions are, what key persists one, and whether it starts collapsed. Everything below reads the
// registry rather than assuming a heading, so a second kind is a registration and not a fork.

export type FoldKind = 'heading'

/** One foldable region of some kind, in document order. */
export interface FoldRegion {
  kind: FoldKind
  /** The line the chevron sits on, and the region's identity within the document. */
  anchor: number
  /** End of the anchor line — the body begins after it. */
  lineEnd: number
  /** End of the last body line. */
  to: number
  /** What persists this fold across sessions, stable across renders. */
  key: string
  /** Whether a region of this kind is collapsed the first time it is ever seen. */
  collapsedByDefault?: boolean
}

const KINDS: Record<FoldKind, (doc: Text) => FoldRegion[]> = {
  heading: (doc) =>
    sectionsOf(doc).map((s) => ({
      kind: 'heading',
      anchor: s.from,
      lineEnd: s.lineEnd,
      to: s.to,
      key: s.key,
    })),
}

/** Every foldable region in the document, of every kind. */
function regionsOf(doc: Text): FoldRegion[] {
  return Object.values(KINDS).flatMap((of) => of(doc))
}

// ── Custom fold state ──────────────────────────────────────────────────────────
// CM6's native fold removes the body lines instantly. To mirror the sidebar's Reveal
// (grid 0fr↔1fr), each fold is a block widget over the body lines whose own DOM
// animates; a per-frame requestMeasure keeps the lines below tracking the animated height.

type Phase = 'collapsing' | 'collapsed' | 'expanding'
interface FoldEntry {
  kind: FoldKind
  anchor: number
  from: number // first body line start
  to: number // last body line end
  phase: Phase
  /** The folded body's line DOM, captured when it was still on screen. It rides the ENTRY rather
   *  than a map beside it: the entry is what remaps when the document moves, and a clone kept under
   *  the old offset is both an empty reveal and an orphan nothing frees. A region that has never
   *  been rendered — one collapsed the moment the document opens — has none, and draws none. */
  clone?: HTMLElement
}

const foldEffect = StateEffect.define<{
  kind: FoldKind
  anchor: number
  from: number
  to: number
  animate: boolean
  clone?: HTMLElement
}>()
const settleEffect = StateEffect.define<number>() // collapsing → collapsed (animation done)
const expandEffect = StateEffect.define<number>() // collapsed → expanding (start opening)
const dropEffect = StateEffect.define<number>() // expanding done → remove the fold

function cloneBody(view: EditorView, from: number, to: number): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'mdpm-fold-clone'
  const seen = new Set<HTMLElement>()
  for (let pos = from; pos <= to; ) {
    const line = view.state.doc.lineAt(pos)
    const el = lineElementAt(view, line.from)
    if (el && !seen.has(el)) {
      seen.add(el)
      wrap.appendChild(el.cloneNode(true))
    }
    if (line.to >= to) break
    pos = line.to + 1
  }
  return wrap
}

class RevealWidget extends WidgetType {
  constructor(
    readonly anchor: number,
    readonly phase: Phase,
    readonly clone: HTMLElement | undefined,
  ) {
    super()
  }
  eq(o: RevealWidget): boolean {
    return o.anchor === this.anchor && o.phase === this.phase && o.clone === this.clone
  }
  toDOM(view: EditorView): HTMLElement {
    const outer = document.createElement('div')
    outer.className = 'mdpm-fold-reveal'
    const inner = document.createElement('div')
    inner.className = 'mdpm-fold-reveal-inner'
    // A region collapsed before it was ever rendered has nothing to clone — the reveal opens on the
    // real lines instead, which is what an unanimated collapse wants anyway.
    if (this.clone) inner.appendChild(this.clone.cloneNode(true))
    outer.appendChild(inner)

    if (this.phase === 'collapsed') {
      outer.style.gridTemplateRows = '0fr'
      return outer
    }
    const open = this.phase === 'expanding'
    outer.style.gridTemplateRows = open ? '0fr' : '1fr'
    const done = open ? dropEffect.of(this.anchor) : settleEffect.of(this.anchor)
    // Re-measure each frame so the lines below follow the animated height (CM6 only measures on update).
    const tick = (): void => {
      if (!outer.isConnected) return
      view.requestMeasure()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        outer.style.gridTemplateRows = open ? '1fr' : '0fr'
        requestAnimationFrame(tick)
      })
    })
    // NOT `once`: a transition bubbling up from a cloned descendant would spend the listener before
    // the row transition ever fires, leaving the entry animating and `tick` measuring every frame
    // for the life of the view. The property guard is what ends it, so the removal goes with it.
    const settle = (e: TransitionEvent): void => {
      if (e.propertyName !== 'grid-template-rows') return
      outer.removeEventListener('transitionend', settle)
      view.dispatch({ effects: done })
    }
    outer.addEventListener('transitionend', settle)
    return outer
  }
  get estimatedHeight(): number {
    return -1
  }
  ignoreEvent(): boolean {
    return true
  }
}

const foldField = StateField.define<FoldEntry[]>({
  create: () => [],
  update(entries, tr) {
    let next: FoldEntry[] = tr.changes.empty
      ? entries
      : entries.map((e) => ({
          ...e,
          anchor: tr.changes.mapPos(e.anchor),
          from: tr.changes.mapPos(e.from, 1),
          to: tr.changes.mapPos(e.to, -1),
        }))
    // Prune entries whose region no longer exists — deleting a folded heading would otherwise leave
    // its body hidden behind a widget with no chevron anywhere to expand it (invisible until
    // reload). Each entry is checked against the regions of ITS OWN kind: a kind absent from a
    // document says nothing about a kind that is present.
    if (tr.docChanged && next.length > 0) {
      const live = regionsOf(tr.state.doc)
      next = next.filter((e) => live.some((r) => r.kind === e.kind && r.anchor === e.anchor))
    }
    for (const ef of tr.effects) {
      if (ef.is(foldEffect)) {
        const v = ef.value
        next = [
          ...next.filter((e) => e.anchor !== v.anchor),
          {
            kind: v.kind,
            anchor: v.anchor,
            from: v.from,
            to: v.to,
            phase: v.animate ? 'collapsing' : 'collapsed',
            clone: v.clone,
          },
        ]
      } else if (ef.is(settleEffect)) {
        next = next.map((e) => (e.anchor === ef.value ? { ...e, phase: 'collapsed' } : e))
      } else if (ef.is(expandEffect)) {
        next = next.map((e) => (e.anchor === ef.value ? { ...e, phase: 'expanding' } : e))
      } else if (ef.is(dropEffect)) {
        next = next.filter((e) => e.anchor !== ef.value)
      }
    }
    return next
  },
  provide: (f) =>
    EditorView.decorations.from(f, (entries) => {
      const ranges: Range<Decoration>[] = []
      for (const e of entries) {
        if (e.to > e.from) {
          ranges.push(
            Decoration.replace({
              block: true,
              widget: new RevealWidget(e.anchor, e.phase, e.clone),
            }).range(e.from, e.to),
          )
        }
      }
      return Decoration.set(ranges, true)
    }),
})

function toggleFold(view: EditorView, r: FoldRegion): void {
  const folded = view.state.field(foldField).some((e) => e.anchor === r.anchor)
  if (folded) {
    view.dispatch({ effects: expandEffect.of(r.anchor) })
    return
  }
  const bodyStart = r.lineEnd + 1
  if (bodyStart > r.to) return
  // A caret inside the body being folded becomes unplaced (blur) rather than jumping to the next visible line.
  const sel = view.state.selection.main
  const caretInBody = sel.to > r.lineEnd && sel.from <= r.to
  view.dispatch({
    effects: foldEffect.of({
      kind: r.kind,
      anchor: r.anchor,
      from: bodyStart,
      to: r.to,
      animate: true,
      clone: cloneBody(view, bodyStart, r.to),
    }),
  })
  if (caretInBody) view.contentDOM.blur()
}

/** Open every fold hiding `pos` — the innermost and each ancestor above it, since a heading can sit
 *  several collapsed sections deep. Returns whether anything was opened: a caller travelling to `pos`
 *  has to let the reveal land before it measures, because a folded section has no height to scroll to. */
export function expandFoldsAt(view: EditorView, pos: number): boolean {
  // An entry spans its heading's BODY, so a heading is opened by its own entry (matched on
  // its anchor) and by every ancestor entry whose body contains it.
  const hiding = view.state
    .field(foldField)
    .filter((e) => e.anchor === pos || (pos >= e.from && pos <= e.to))
  if (hiding.length === 0) return false
  view.dispatch({ effects: hiding.map((e) => expandEffect.of(e.anchor)) })
  return true
}

/** Toggle the fold of the heading whose line starts at `pos`. The chevron's own gesture and the
 *  hover card's click-a-heading affordance both land here, so fold behavior stays one fact. */
export function toggleFoldAt(view: EditorView, pos: number): boolean {
  const r = regionsOf(view.state.doc).find((x) => x.anchor === pos)
  if (!r) return false
  toggleFold(view, r)
  return true
}

/** What is folded right now, as regions rather than offsets — the state machine's readable face. */
export function foldedRegions(
  state: EditorState,
): { kind: FoldKind; anchor: number; key: string; hasBody: boolean }[] {
  const live = regionsOf(state.doc)
  return state
    .field(foldField)
    .filter((e) => e.phase !== 'expanding')
    .flatMap((e) => {
      const r = live.find((x) => x.kind === e.kind && x.anchor === e.anchor)
      return r
        ? [{ kind: e.kind, anchor: e.anchor, key: r.key, hasBody: e.clone !== undefined }]
        : []
    })
}

// Every foldable heading carries a chevron anchored to its line in the CONTENT layer (a ::before), NOT a CM
// gutter. The gutter is positioned from CM's line-height MODEL, which only measures the visible viewport and
// estimates off-screen variable-height blocks (callouts, folds) at the default height — so every gutter
// chevron below such a block drifts from its heading by a scroll-dependent amount. A line-anchored chevron
// is laid out by the browser next to its heading and can't drift. Open → points down (hover-only); closed →
// points right (dim + persistent). The fold state lives in foldField; this just maps it to a line class.
const chevronDeco = EditorView.decorations.compute(['doc', foldField], (state) => {
  const entries = state.field(foldField)
  const ranges: Range<Decoration>[] = []
  for (const r of regionsOf(state.doc)) {
    const closed = entries.some((e) => e.anchor === r.anchor && e.phase !== 'expanding')
    ranges.push(
      Decoration.line({
        class: closed ? 'md-foldable md-fold-closed' : 'md-foldable md-fold-open',
      }).range(r.anchor),
    )
  }
  return Decoration.set(ranges, true)
})

/** Re-apply a page's saved folds at mount (no animation), capturing clones from the freshly-rendered lines. */
export function applySavedFolds(view: EditorView, keys: string[]): void {
  const wanted = new Set(keys)
  const effects: StateEffect<unknown>[] = []
  for (const r of regionsOf(view.state.doc)) {
    // A region nobody has an opinion about yet starts the way its kind says it does.
    if (!(wanted.has(r.key) || (r.collapsedByDefault && !wanted.size))) continue
    const bodyStart = r.lineEnd + 1
    if (bodyStart > r.to) continue
    effects.push(
      foldEffect.of({
        kind: r.kind,
        anchor: r.anchor,
        from: bodyStart,
        to: r.to,
        animate: false,
        clone: cloneBody(view, bodyStart, r.to),
      }),
    )
  }
  if (effects.length) view.dispatch({ effects, annotations: initialFoldAnnotation.of(true) })
}

/** Heading folding with the sidebar's Reveal motion; folded sections persist via `onFoldsChange`. */
export function markdownFolding(onFoldsChange: (keys: string[]) => void): Extension {
  const persist = EditorView.updateListener.of((u: ViewUpdate) => {
    const changed = u.transactions.some(
      (tr) =>
        !tr.annotation(initialFoldAnnotation) &&
        tr.effects.some((e) => e.is(foldEffect) || e.is(expandEffect) || e.is(dropEffect)),
    )
    if (!changed) return
    onFoldsChange(foldedRegions(u.state).map((r) => r.key))
  })
  // The chevron strip doubles as a drag handle (shares the block-drag gesture): a sub-threshold release toggles
  // the fold; a press-drag relocates the whole heading section. A folded section unfolds at drag-start — a fold
  // can't survive the relocating edit (its body offsets remap to the single-replace span's ends), so it moves
  // as plain text and re-collapses with one click.
  const headingDrag = createBlockDragGesture({
    gate: 'md-foldable',
    onClick: (view, line) => {
      const r = regionsOf(view.state.doc).find((x) => x.anchor === view.posAtDOM(line))
      if (r) toggleFold(view, r)
    },
    onDragStart: (view, block) => {
      if (view.state.field(foldField).some((en) => en.anchor === block.from))
        view.dispatch({ effects: dropEffect.of(block.from) })
    },
  })
  return [foldField, chevronDeco, headingDrag, persist]
}
