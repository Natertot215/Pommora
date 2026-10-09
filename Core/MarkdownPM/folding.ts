import { EditorView, Decoration, ViewPlugin, WidgetType } from '@codemirror/view'
import {
  StateField,
  StateEffect,
  Annotation,
  type EditorState,
  type Extension,
  type Text,
  type Range,
} from '@codemirror/state'
import { exitWait } from '@pommora/uix/Animations/motion'
import { docScan, perDoc } from './docCache'
import { headingSections } from './Engine/headingScan'
import { createBlockDragGesture } from './Gestures/blockDrag'
import { lineElementAt } from './lineDom'
import { editorHost, mirrored } from './api'
import { WEB_GUEST_CLASS } from '../Web/guest'

/** The reveal's beat plus slack for the frame that draws its final height — a travel timed earlier lands on the collapsed document. */
export const FOLD_SETTLE_MS = exitWait('fast')

/** Carries the loaded keys on the mount-time re-apply, which the persist plugin records as saved rather than echoing back to disk. */
const initialFoldAnnotation = Annotation.define<string[]>()

export type FoldKind = 'heading' | 'citations'

/** A sentinel no heading scan can produce, so the section can never collide with a saved heading key. */
const CITATIONS_KEY = '\u0000citations'

/** Kept apart from `md-foldable` ("draws a chevron"): one class would make a non-heading anchor inherit all four behaviors. */
export const HEADING_FOLD_CLASS = 'md-heading-fold'
export const HEADING_LINE = `.cm-line.${HEADING_FOLD_CLASS}`

/** Rides the rendered anchor line only when blank — a table's last row is a block widget, and a fence there reads as body. */
const CITE_DIVIDER_LINE = 'md-citation-divider'
const HOVER_HOST = { 'data-reveal-host': '' }

const persisted = (kind: FoldKind): boolean => kind === 'heading'

interface FoldRegion {
  kind: FoldKind
  anchor: number
  anchorLine: number
  lineEnd: number
  to: number
  key: string
}

/** Not the line it renders against: that line is prose, and one Enter there would orphan the entry. */
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

export const regionsOf = perDoc((doc): FoldRegion[] => {
  const heads = headingSections(docScan(doc)).map(
    (s): FoldRegion => ({
      kind: 'heading',
      anchor: s.from,
      anchorLine: s.from,
      lineEnd: s.lineEnd,
      to: s.to,
      key: s.key,
    }),
  )
  const cite = citationsRegion(doc)
  return cite ? [...heads, cite] : heads
})

// Each fold is a block widget over the body lines whose own DOM animates; a per-frame requestMeasure keeps the lines below tracking it.

type Phase = 'collapsing' | 'collapsed' | 'expanding'
interface FoldEntry {
  kind: FoldKind
  anchor: number
  from: number
  to: number
  phase: Phase
  clone: HTMLElement
}

const foldEffect = StateEffect.define<{
  kind: FoldKind
  anchor: number
  from: number
  to: number
  animate: boolean
  clone: HTMLElement
}>()
const settleEffect = StateEffect.define<number>()
const expandEffect = StateEffect.define<number>()
const dropEffect = StateEffect.define<number>()

// A picture of the body, never a second copy of it: inert, and without the web guests a copied one would start.
function cloneBody(view: EditorView, from: number, to: number): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'mdpm-fold-clone'
  wrap.setAttribute('inert', '')
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
  for (const guest of wrap.querySelectorAll(`.${WEB_GUEST_CLASS}`)) guest.remove()
  return wrap
}

/** A caret in a body about to be hidden becomes unplaced rather than stranded on the divider. */
function blurCaretInBody(view: EditorView, r: FoldRegion): void {
  const sel = view.state.selection.main
  if (sel.to > r.lineEnd && sel.from <= r.to) view.contentDOM.blur()
}

const closedAt = (entries: readonly FoldEntry[], anchor: number): boolean =>
  entries.some((e) => e.anchor === anchor && e.phase !== 'expanding')

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
    readonly clone: HTMLElement,
  ) {
    super()
  }
  eq(o: RevealWidget): boolean {
    return o.anchor === this.anchor && o.phase === this.phase && o.clone === this.clone
  }
  toDOM(view: EditorView): HTMLElement {
    const outer = document.createElement('div')
    outer.className = 'mdpm-fold-reveal'
    if (this.phase === 'collapsed') return outer
    const inner = document.createElement('div')
    inner.className = 'mdpm-fold-reveal-inner'
    inner.appendChild(this.clone.cloneNode(true))
    outer.appendChild(inner)

    const open = this.phase === 'expanding'
    outer.style.gridTemplateRows = open ? '0fr' : '1fr'
    const done = open ? dropEffect.of(this.anchor) : settleEffect.of(this.anchor)
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
    // Not `once`: a transition bubbling from a cloned descendant would spend the listener first.
    const settle = (e: TransitionEvent): void => {
      if (e.propertyName !== 'grid-template-rows') return
      outer.removeEventListener('transitionend', settle)
      view.dispatch({ effects: done })
    }
    outer.addEventListener('transitionend', settle)
    return outer
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
    // Each entry is checked against the regions of its own kind — a kind absent says nothing about a kind present.
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

export function expandFoldsAt(view: EditorView, pos: number): boolean {
  // An entry spans its heading's body, so a heading opens by its own entry and by every ancestor whose body contains it.
  const hiding = view.state
    .field(foldField)
    .filter((e) => e.anchor === pos || (pos >= e.from && pos <= e.to))
  if (hiding.length === 0) return false
  view.dispatch({ effects: hiding.map((e) => expandEffect.of(e.anchor)) })
  return true
}

export function toggleFoldAt(view: EditorView, pos: number): boolean {
  const r = regionsOf(view.state.doc).find((x) => x.anchorLine === pos)
  if (!r) return false
  toggleFold(view, r)
  return true
}

export function foldedRegions(
  state: EditorState,
): { kind: FoldKind; anchor: number; key: string }[] {
  const live = regionsOf(state.doc)
  return state
    .field(foldField)
    .filter((e) => e.phase !== 'expanding')
    .flatMap((e) => {
      const r = live.find((x) => x.kind === e.kind && x.anchor === e.anchor)
      return r ? [{ kind: e.kind, anchor: e.anchor, key: r.key }] : []
    })
}

// A chevron anchored to its line in the content layer, not a CM gutter: the gutter is positioned from CM's line-height model and would drift by a scroll-dependent amount below an off-screen variable-height block.
const chevronDeco = EditorView.decorations.compute(['doc', foldField], (state) => {
  const entries = state.field(foldField)
  const ranges: Range<Decoration>[] = []
  for (const r of regionsOf(state.doc)) {
    const closed = closedAt(entries, r.anchor)
    // The section's anchor takes neither the chevron nor the open/closed classes — the closed one would tint ordinary prose.
    if (r.kind === 'heading') {
      ranges.push(
        Decoration.line({
          class: `${HEADING_FOLD_CLASS} md-foldable ${closed ? 'md-fold-closed' : 'md-fold-open'}`,
          attributes: HOVER_HOST,
        }).range(r.anchorLine),
      )
    } else if (state.doc.lineAt(r.anchorLine).text.trim() === '') {
      ranges.push(
        Decoration.line({
          class: closed ? `${CITE_DIVIDER_LINE} md-citation-divider-off` : CITE_DIVIDER_LINE,
          attributes: HOVER_HOST,
        }).range(r.anchorLine),
      )
    }
  }
  return Decoration.set(ranges, true)
})

export function applyCitationsVisibility(view: EditorView, shown: boolean, animate = true): void {
  const r = citationsRegion(view.state.doc)
  if (!r) return
  if (closedAt(view.state.field(foldField), r.anchor) === !shown) return
  const effect = shown ? expandEffect.of(r.anchor) : collapseEffect(view, r, animate)
  if (!effect) return
  if (!shown) blurCaretInBody(view, r)
  view.dispatch({ effects: effect })
  if (shown && animate)
    setTimeout(() => {
      if (view.dom.isConnected)
        view.dispatch({ effects: EditorView.scrollIntoView(r.to, { y: 'nearest' }) })
    }, FOLD_SETTLE_MS)
}

/** A fold entry maps its start forward and its end backward, so an edit that grows the section leaves the new rows outside the widget. */
export function editAcrossCitations(view: EditorView, shown: boolean, dispatch: () => void): void {
  const r = citationsRegion(view.state.doc)
  if (r && closedAt(view.state.field(foldField), r.anchor))
    view.dispatch({ effects: dropEffect.of(r.anchor) })
  dispatch()
  applyCitationsVisibility(view, shown, false)
}

/** A footnoted document ends AT its footnotes, so it closes on the seam's own gap rather than the editor's typing tail. */
const citationsTail = EditorView.contentAttributes.compute(['doc'], (state) => ({
  class: citationsRegion(state.doc) ? 'mdpm-citation-tail' : '',
}))

export function applySavedFolds(view: EditorView, keys: string[]): void {
  const wanted = new Set(keys)
  const effects: StateEffect<unknown>[] = []
  for (const r of regionsOf(view.state.doc)) {
    if (!persisted(r.kind) || !wanted.has(r.key)) continue
    const collapse = collapseEffect(view, r, false)
    if (collapse) effects.push(collapse)
  }
  if (effects.length) view.dispatch({ effects, annotations: initialFoldAnnotation.of(keys) })
}

/** The divider toggles the host's footnote visibility rather than folding itself: the section's state is the page's visibility. */
export function markdownFolding(): Extension {
  // The saved keys are read only at the next mount, so a heading renamed under its fold is re-derived where the editor is left, on each fold change, and on any unfocused edit a mirrored body didn't make.
  const persist = ViewPlugin.define((view) => {
    const keys = (): string[] =>
      foldedRegions(view.state)
        .filter((r) => persisted(r.kind))
        .map((r) => r.key)
    let saved = '[]'
    const flush = (): void => {
      const next = keys()
      const json = JSON.stringify(next)
      if (json === saved) return
      saved = json
      view.state.facet(editorHost).prefs?.save('folds', next)
    }
    return {
      update(u) {
        const loaded = u.transactions
          .find((tr) => tr.annotation(initialFoldAnnotation))
          ?.annotation(initialFoldAnnotation)
        if (loaded) saved = JSON.stringify(loaded)
        else if (
          (!view.hasFocus &&
            (u.focusChanged ||
              u.transactions.some((tr) => tr.docChanged && !tr.annotation(mirrored)))) ||
          u.transactions.some((tr) =>
            tr.effects.some((e) => e.is(foldEffect) || e.is(expandEffect) || e.is(dropEffect)),
          )
        )
          flush()
      },
      destroy: flush,
    }
  })
  // A fold can't survive the relocating edit (its body offsets remap to the replace span's ends), so a folded section unfolds at drag-start.
  const headingDrag = createBlockDragGesture({
    selector: HEADING_LINE,
    onClick: (view, line) => {
      toggleFoldAt(view, view.posAtDOM(line))
    },
    onDragStart: (view, block) => {
      if (view.state.field(foldField).some((en) => en.anchor === block.from))
        view.dispatch({ effects: dropEffect.of(block.from) })
    },
  })
  const dividerPress = EditorView.domEventHandlers({
    mousedown(e, view) {
      if (e.button !== 0) return false
      if (!(e.target as HTMLElement).closest?.(`.cm-line.${CITE_DIVIDER_LINE}`)) return false
      e.preventDefault()
      const { citations } = view.state.facet(editorHost)
      citations.set(!citations.shown())
      return true
    },
  })
  return [foldField, chevronDeco, citationsTail, headingDrag, dividerPress, persist]
}
