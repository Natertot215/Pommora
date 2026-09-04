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
import { duration, ms } from '@renderer/Animation'
import { docScan } from './docCache'
import { headingSections } from './headingScan'
import { createBlockDragGesture } from './blockDrag'
import { lineElementAt } from './lineDom'

export {
  headingOutline,
  headingSections,
  sectionEnd,
  type HeadingSection,
  type OutlineHeading,
} from './headingScan'

/** Per-page fold persistence seam, kept Electron-free here so this file never learns where the
 *  device-local state lives. */
export interface FoldsApi {
  load: () => Promise<string[]>
  save: (keys: string[]) => void
}

/** The reveal's own beat, plus slack for the frame that draws its final height. Anything measuring a
 *  section that just opened has to wait it out, or a travel timed any earlier lands on the
 *  collapsed document. */
export const FOLD_SETTLE_MS = ms(duration.fast) + 30

/** Marks the mount-time re-apply of saved folds so the persist listener doesn't echo it straight back to disk. */
const initialFoldAnnotation = Annotation.define<boolean>()

// A heading section is one kind of foldable region; it is not the only possible one. A region is
// named by its kind and its anchor — the line the chevron sits on. Everything below reads the
// registry rather than assuming a heading, so a second kind is a registration and not a fork.

export type FoldKind = 'heading' | 'citations'

/** The citations section's fold key. A sentinel no heading scan can produce, so the section can
 *  never collide with a heading's saved key — and it is never saved in the first place. */
const CITATIONS_KEY = '\u0000citations'

/** The heading's own gesture class — the drag gate, the grip menu's hit-test and the hover card's
 *  click-to-fold all read it. Kept apart from `md-foldable`, which means "draws a chevron" and
 *  nothing else: a non-heading anchor wearing one class would inherit all four behaviors, and the
 *  hit-test would fail silently. */
export const HEADING_FOLD_LINE = 'md-heading-fold'

/** The citations divider — the section's visible boundary and its disclosure at once. It rides the
 *  rendered anchor line only when that line is blank: a table's last row is a block widget so a line
 *  decoration there never draws, and a fence or paragraph there would read as part of the body.
 *  With no blank line to take it, the section falls back to its own top edge. */
const CITE_DIVIDER_LINE = 'md-cite-divider'

/** Which kinds survive a session. The section's disclosure is its own per-page override, so letting
 *  it into the shared fold row would make two writers of one fact. */
const persisted = (kind: FoldKind): boolean => kind === 'heading'

/** One foldable region of some kind, in document order. */
export interface FoldRegion {
  kind: FoldKind
  /** The first offset it hides. Deliberately not the line it renders against: that line is prose
   *  the user edits, and one Enter there would move the live anchor and orphan the entry. */
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

/** The document's citations section as a foldable region, or null where it has none. Its `lineEnd`
 *  is also the offset a collapsed section leaves visible above it, which the heading generator
 *  clamps against — a heading reaching past it would swallow the footnotes whole when it collapses.
 *
 *  A section starting at line 0 has nothing above it to anchor against, and hiding it would leave a
 *  blank page — so it offers no region and stays visible. */
function citationsRegion(doc: Text): FoldRegion | null {
  const { citations, lineStarts, lines } = docScan(doc)
  const a = citations.anchorLine
  if (a < 0) return null
  const last = lines.length - 1
  return {
    kind: 'citations',
    anchor: lineStarts[citations.firstLine],
    anchorLine: lineStarts[a],
    lineEnd: lineStarts[a] + lines[a].length,
    to: lineStarts[last] + lines[last].length,
    key: CITATIONS_KEY,
  }
}

const KINDS: Record<FoldKind, (doc: Text) => FoldRegion[]> = {
  // Every section whose end reaches the boundary clamps, not just the last, or a nested heading run
  // would leave one section spanning the footnotes while its parent got clamped.
  heading: (doc) => {
    const cut = citationsRegion(doc)?.lineEnd ?? -1
    return headingSections(docScan(doc)).flatMap((s) => {
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
  citations: (doc) => {
    const r = citationsRegion(doc)
    return r ? [r] : []
  },
}

/** Every foldable region in the document, of every kind. */
export function regionsOf(doc: Text): FoldRegion[] {
  return Object.values(KINDS).flatMap((of) => of(doc))
}

// CM6's native fold removes the body lines instantly. To mirror the sidebar's Reveal (grid 0fr↔1fr),
// each fold is a block widget over the body lines whose own DOM animates; a per-frame
// requestMeasure keeps the lines below tracking the animated height.

type Phase = 'collapsing' | 'collapsed' | 'expanding'
interface FoldEntry {
  kind: FoldKind
  anchor: number
  from: number
  to: number
  phase: Phase
  /** The folded body's line DOM, captured when it was still on screen. It rides the entry rather
   *  than a map beside it, since the entry is what remaps when the document moves. Optional because
   *  a region collapsed before its lines were ever rendered has nothing to capture. */
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
const settleEffect = StateEffect.define<number>()
const expandEffect = StateEffect.define<number>()
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

/** A caret inside a body about to be hidden becomes unplaced rather than jumping to the next
 *  visible line, which would strand it on the divider. */
function blurCaretInBody(view: EditorView, r: FoldRegion): void {
  const sel = view.state.selection.main
  if (sel.to > r.lineEnd && sel.from <= r.to) view.contentDOM.blur()
}

/** Whether a region's fold is standing — collapsed, or on its way there. */
const closedAt = (entries: readonly FoldEntry[], anchor: number): boolean =>
  entries.some((e) => e.anchor === anchor && e.phase !== 'expanding')

/** Every collapse in the file goes through here, so what a fold captures is one fact rather than
 *  three copies. */
function collapseEffect(
  view: EditorView,
  r: FoldRegion,
  animate: boolean,
): StateEffect<unknown> | null {
  const from = r.lineEnd + 1
  if (from > r.to) return null
  return foldEffect.of({
    kind: r.kind,
    anchor: r.anchor,
    from,
    to: r.to,
    animate,
    clone: cloneBody(view, from, r.to),
  })
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
    // real lines instead.
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
    // Not `once`: a transition bubbling up from a cloned descendant would spend the listener before
    // the row transition ever fires, leaving `tick` measuring every frame for the life of the view.
    // The property guard is what ends it, so the removal goes with it.
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
    // its body hidden behind a widget with no chevron to expand it. Each entry is checked against
    // the regions of its own kind: a kind absent from a document says nothing about a kind present.
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
  const collapse = collapseEffect(view, r, true)
  if (!collapse) return
  blurCaretInBody(view, r)
  view.dispatch({ effects: collapse })
}

/** Open every fold hiding `pos` — the innermost and each ancestor above it. Returns whether anything
 *  was opened: a caller travelling to `pos` has to let the reveal land before it measures, since a
 *  folded section has no height to scroll to. */
export function expandFoldsAt(view: EditorView, pos: number): boolean {
  // An entry spans its heading's body, so a heading is opened by its own entry (matched on its
  // anchor) and by every ancestor entry whose body contains it.
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

// Every foldable heading carries a chevron anchored to its line in the content layer (a ::before),
// not a CM gutter. The gutter is positioned from CM's line-height model, which estimates off-screen
// variable-height blocks at the default height — so a gutter chevron below one would drift from its
// heading by a scroll-dependent amount. A line-anchored chevron is laid out by the browser next to
// its heading and can't drift. Open points down (hover-only); closed points right (dim + persistent).
const chevronDeco = EditorView.decorations.compute(['doc', foldField], (state) => {
  const entries = state.field(foldField)
  const ranges: Range<Decoration>[] = []
  for (const r of regionsOf(state.doc)) {
    const closed = closedAt(entries, r.anchor)
    // The section discloses from the footer's control and its own divider, so its anchor takes
    // neither the chevron nor the open/closed classes — the closed one carries a color rule that
    // would tint ordinary prose to the fold control's color.
    if (r.kind === 'heading') {
      ranges.push(
        Decoration.line({
          class: `${HEADING_FOLD_LINE} md-foldable ${closed ? 'md-fold-closed' : 'md-fold-open'}`,
        }).range(r.anchorLine),
      )
    } else if (state.doc.lineAt(r.anchorLine).text.trim() === '') {
      ranges.push(
        Decoration.line({
          class: closed ? `${CITE_DIVIDER_LINE} md-cite-divider-off` : CITE_DIVIDER_LINE,
        }).range(r.anchorLine),
      )
    }
  }
  return Decoration.set(ranges, true)
})

/** Put the citations section where the resolved visibility says it belongs — the seed at mount and
 *  every later change to that value land here, so the stored boolean has exactly one reader. A page
 *  opening seeds without animation; a toggle after it discloses on the reveal's own beat, closing
 *  the way it opens.
 *
 *  The mount annotation is not optional: the persist listener writes the whole surviving key set to
 *  disk on any un-annotated fold effect, and this runs before `applySavedFolds` has restored the
 *  page's heading folds — an un-annotated seed would erase them on every open of a footnoted page. */
export function applyCitationsVisibility(view: EditorView, shown: boolean, animate = true): void {
  const r = citationsRegion(view.state.doc)
  if (!r) return
  if (closedAt(view.state.field(foldField), r.anchor) === !shown) return
  const effect = shown ? expandEffect.of(r.anchor) : collapseEffect(view, r, animate)
  if (!effect) return
  if (!shown) blurCaretInBody(view, r)
  view.dispatch({ effects: effect, annotations: initialFoldAnnotation.of(true) })
  // A section revealed at the foot of a long page opens below the viewport, so the act reads as
  // nothing happening. Once the reveal has its height, bring its end into view — the minimum scroll,
  // which is none at all when the section already fits.
  if (shown && animate)
    setTimeout(() => {
      if (view.dom.isConnected)
        view.dispatch({ effects: EditorView.scrollIntoView(r.to, { y: 'nearest' }) })
    }, FOLD_SETTLE_MS)
}

/** Run a footnote gesture's dispatch with the section unfolded, and settle it back to `shown`
 *  afterwards. A fold entry maps its start forward and its end backward, so an edit that grows the
 *  section leaves the new rows standing outside the collapsed widget — the heading drag drops its
 *  fold for the same reason and re-collapses after. Settling on the page's visibility rather than on
 *  whatever was folded a moment ago is what also answers for a section that did not exist yet: the
 *  first footnote written on a page whose footnotes are hidden arrives hidden. */
export function editAcrossCitations(view: EditorView, shown: boolean, dispatch: () => void): void {
  const r = citationsRegion(view.state.doc)
  if (r && closedAt(view.state.field(foldField), r.anchor))
    view.dispatch({ effects: dropEffect.of(r.anchor), annotations: initialFoldAnnotation.of(true) })
  dispatch()
  applyCitationsVisibility(view, shown, false)
}

/** A footnoted document ends AT its footnotes. The editor's generous tail is typing room for a body
 *  still being written; a citations section is the document's foot, so it closes on the seam's own
 *  gap instead of floating above a field of empty scroller. */
const citationsTail = EditorView.contentAttributes.compute(['doc'], (state) => ({
  class: citationsRegion(state.doc) ? 'mdpm-cite-tail' : '',
}))

/** Re-apply a page's saved folds at mount (no animation), capturing clones from the freshly-rendered lines. */
export function applySavedFolds(view: EditorView, keys: string[]): void {
  const wanted = new Set(keys)
  const effects: StateEffect<unknown>[] = []
  for (const r of regionsOf(view.state.doc)) {
    if (!persisted(r.kind) || !wanted.has(r.key)) continue
    const collapse = collapseEffect(view, r, false)
    if (collapse) effects.push(collapse)
  }
  if (effects.length) view.dispatch({ effects, annotations: initialFoldAnnotation.of(true) })
}

/** Heading folding with the sidebar's Reveal motion; folded sections persist via `onFoldsChange`.
 *  The citations divider reports its press through `onCitationsToggle` rather than folding itself:
 *  the section's state is the page's own visibility, and the fold follows that one writer. */
export function markdownFolding(
  onFoldsChange: (keys: string[]) => void,
  onCitationsToggle: () => void,
): Extension {
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
  // A press, not a click: the divider sits on a text line, and letting the caret seat there first
  // would put a blinking cursor on the row the press is meant to act on.
  const dividerPress = EditorView.domEventHandlers({
    mousedown(e) {
      if (e.button !== 0) return false
      if (!(e.target as HTMLElement).closest?.(`.cm-line.${CITE_DIVIDER_LINE}`)) return false
      e.preventDefault()
      onCitationsToggle()
      return true
    },
  })
  return [foldField, chevronDeco, citationsTail, headingDrag, dividerPress, persist]
}
