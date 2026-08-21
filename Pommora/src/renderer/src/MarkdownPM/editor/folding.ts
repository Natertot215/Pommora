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
import { docScan, docString } from './docCache'
import { headingSections, type HeadingSection } from './headingScan'
import { createBlockDragGesture } from './blockDrag'
import { lineElementAt } from './lineDom'

export {
  headingOutline,
  headingSections,
  sectionEnd,
  type HeadingSection,
  type OutlineHeading,
} from './headingScan'

/** Per-page fold persistence seam — reads/writes the device-local fold state via the host (kept
 *  Electron-free here, so this file never learns where that state lives). */
export interface FoldsApi {
  load: () => Promise<string[]>
  save: (keys: string[]) => void
}

/** Marks the mount-time re-apply of saved folds so the persist listener doesn't echo it straight back to disk. */
const initialFoldAnnotation = Annotation.define<boolean>()

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

export type FoldKind = 'heading' | 'citations'

/** The citations section's fold key. A sentinel no heading scan can produce, so the section can
 *  never collide with a heading's saved key — and it is never saved in the first place. */
const CITATIONS_KEY = '\u0000citations'

/** The heading's own gesture class — the drag gate, the grip menu's hit-test and the hover card's
 *  click-to-fold all read it. Kept apart from `md-foldable`, which means "draws a chevron" and
 *  nothing else: a non-heading anchor wearing one class would inherit all four behaviors, and the
 *  hit-test's would fail silently — the press defaulted away and main stood its own menu down, then
 *  the heading menu bailing on a line with no heading parts, leaving a press that opens nothing. */
export const HEADING_FOLD_LINE = 'md-heading-fold'

/** Which kinds survive a session. The section's disclosure is its own per-page override, so letting
 *  it into the shared fold row would make two writers of one fact. */
const persisted = (kind: FoldKind): boolean => kind === 'heading'

/** One foldable region of some kind, in document order. */
export interface FoldRegion {
  kind: FoldKind
  /** The region's identity within the document — the first offset it hides. Deliberately not the
   *  line it renders against: that line is prose the user edits, and one Enter there would move the
   *  live anchor, orphan the entry and pop a hidden region open with nothing to resync it. */
  anchor: number
  /** The line the chevron sits on. The same offset as `anchor` for a heading, which hides its own
   *  body; the line above the run for the section, which is entirely body. */
  anchorLine: number
  /** End of the anchor line — the body begins after it. */
  lineEnd: number
  /** End of the last body line. */
  to: number
  /** What persists this fold across sessions, stable across renders. */
  key: string
}

/** The offset a collapsed section leaves visible above it — the end of the line the divider renders
 *  on, or -1 where the document has no section. A heading section reaching past this swallows the
 *  footnotes whole when it collapses, so the heading generator clamps against it. The clamp lives
 *  here rather than in the heading scan because the scan takes a raw string and would have to derive
 *  the boundary a second time; this holds the `Text` the cached scan is keyed on. */
function citationsCut(doc: Text): number {
  const { citations, lineStarts, lines } = docScan(doc)
  const a = citations.anchorLine
  return a < 0 ? -1 : lineStarts[a] + lines[a].length
}

const KINDS: Record<FoldKind, (doc: Text) => FoldRegion[]> = {
  // EVERY section whose end reaches the boundary clamps, not just the last: a page shaped
  // `# Title` … `## Sources` … the run has two sections running to the document's end, and
  // clamping one leaves the other spanning the footnotes.
  heading: (doc) => {
    const cut = citationsCut(doc)
    return sectionsOf(doc).flatMap((s) => {
      const to = cut < 0 ? s.to : Math.min(s.to, cut)
      return to > s.lineEnd + 1
        ? [
            {
              kind: 'heading' as const,
              anchor: s.from,
              anchorLine: s.from,
              lineEnd: s.lineEnd,
              to,
              key: s.key,
            },
          ]
        : []
    })
  },
  // A section starting at line 0 has nothing above it to anchor against, and hiding it would leave
  // a blank page — so it offers no region and stays visible, which is the right answer.
  citations: (doc) => {
    const { citations, lineStarts, lines } = docScan(doc)
    const a = citations.anchorLine
    if (a < 0) return []
    const last = lines.length - 1
    return [
      {
        kind: 'citations',
        anchor: lineStarts[citations.firstLine],
        anchorLine: lineStarts[a],
        lineEnd: lineStarts[a] + lines[a].length,
        to: lineStarts[last] + lines[last].length,
        key: CITATIONS_KEY,
      },
    ]
  },
}

/** Every foldable region in the document, of every kind. */
export function regionsOf(doc: Text): FoldRegion[] {
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
   *  the old offset is both an empty reveal and an orphan nothing frees. Optional because a region
   *  collapsed before its lines were ever rendered has nothing to capture — the reveal opens on the
   *  real lines instead, which is what an unanimated collapse wants anyway. */
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
  const r = regionsOf(view.state.doc).find((x) => x.anchorLine === pos)
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
    // The chevron is the heading's affordance. The section discloses from the Subfield and its own
    // divider, so its anchor takes neither the chevron nor the open/closed classes — the closed one
    // carries a color rule that would tint ordinary prose to the folded-heading control color.
    if (r.kind !== 'heading') continue
    const closed = entries.some((e) => e.anchor === r.anchor && e.phase !== 'expanding')
    ranges.push(
      Decoration.line({
        class: `${HEADING_FOLD_LINE} ${closed ? 'md-foldable md-fold-closed' : 'md-foldable md-fold-open'}`,
      }).range(r.anchorLine),
    )
  }
  return Decoration.set(ranges, true)
})

/** Put the citations section where the resolved visibility says it belongs — the seed at mount and
 *  every later change to that value land here, so the stored boolean has exactly one reader.
 *
 *  The mount annotation is not optional: the persist listener writes the whole surviving key set to
 *  disk on any un-annotated fold effect, and this runs before `applySavedFolds` has restored the
 *  page's heading folds — an un-annotated seed would erase them on every open of a footnoted page. */
export function applyCitationsVisibility(view: EditorView, shown: boolean): void {
  const r = regionsOf(view.state.doc).find((x) => x.kind === 'citations')
  if (!r) return
  const folded = view.state
    .field(foldField)
    .some((e) => e.anchor === r.anchor && e.phase !== 'expanding')
  if (folded === !shown) return
  const bodyStart = r.lineEnd + 1
  if (bodyStart > r.to) return
  view.dispatch({
    effects: shown
      ? expandEffect.of(r.anchor)
      : foldEffect.of({
          kind: r.kind,
          anchor: r.anchor,
          from: bodyStart,
          to: r.to,
          animate: false,
          clone: cloneBody(view, bodyStart, r.to),
        }),
    annotations: initialFoldAnnotation.of(true),
  })
}

/** Re-apply a page's saved folds at mount (no animation), capturing clones from the freshly-rendered lines. */
export function applySavedFolds(view: EditorView, keys: string[]): void {
  const wanted = new Set(keys)
  const effects: StateEffect<unknown>[] = []
  for (const r of regionsOf(view.state.doc)) {
    if (!persisted(r.kind) || !wanted.has(r.key)) continue
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
    onFoldsChange(
      foldedRegions(u.state)
        .filter((r) => persisted(r.kind))
        .map((r) => r.key),
    )
  })
  // The chevron strip doubles as a drag handle (shares the block-drag gesture): a sub-threshold release toggles
  // the fold; a press-drag relocates the whole heading section. A folded section unfolds at drag-start — a fold
  // can't survive the relocating edit (its body offsets remap to the single-replace span's ends), so it moves
  // as plain text and re-collapses with one click.
  const headingDrag = createBlockDragGesture({
    gate: HEADING_FOLD_LINE,
    onClick: (view, line) => {
      toggleFoldAt(view, view.posAtDOM(line))
    },
    onDragStart: (view, block) => {
      if (view.state.field(foldField).some((en) => en.anchor === block.from))
        view.dispatch({ effects: dropEffect.of(block.from) })
    },
  })
  return [foldField, chevronDeco, headingDrag, persist]
}
