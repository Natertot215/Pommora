import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import {
  type ChangeSpec,
  type EditorState,
  type Line,
  MapMode,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state'
import { escapeLabel, fitsSlot } from '../../Connections/links'
import { type LinkOccurrence, targetSpan } from '../../Connections/connections'
import {
  keepsShown,
  type LinkTarget,
  pageLabel,
  readLinkText,
  readOccurrence,
  resolveLink,
  shownAlias,
} from '../../Connections/linkValue'
import type { PageIndex } from '../../Connections/pageIndex'
import type { MarkdownScope } from '../Engine/detect'
import type { Span } from '../Engine/markdownCode'
import { docScan } from '../docCache'
import { linkAt, linkWithin } from '../Input/edits'
import { editorHost, inRawHtml } from '../api'
import { inCaretPane } from '../Menus/caretPane'
import { linkRest, restedOnLink } from './linkReveal'

// The link an edit is being made inside, from the change that arms it to the settle that remembers its alias and collapses its emptied parts.

interface Writing {
  start: number
  was: string
}

type Remembered = NonNullable<ReturnType<typeof shownAlias>>

export const linkSettled = StateEffect.define<null>()

/** The link an edit is being made inside, as it read before the first edit: what the typing color, alias memory, emptied-part collapse, and the Remove Title baseline all compare against. Armed by a typed or deleted change reaching into a link, mapped through changes, dropped with its opener, cleared when the settle lands. */
export const linkWriting = StateField.define<Writing | null>({
  create: () => null,
  update(w, tr) {
    if (tr.effects.some((e) => e.is(linkSettled))) return null
    if (!tr.docChanged) return w
    const edited = tr.isUserEvent('input') || tr.isUserEvent('delete')
    if (!w) return edited ? changedLink(tr, null) : null
    const start = tr.changes.mapPos(w.start, 1)
    const kept = start === w.start ? w : { start, was: w.was }
    const relinked = edited ? changedLink(tr, kept) : null
    return relinked ?? (tr.changes.mapPos(w.start, 1, MapMode.TrackAfter) === null ? null : kept)
  },
})

/** How the link at `start` read before the edit being made inside it began, else as it reads now; `now` is null for a link that never closed. */
function baselineAt(state: EditorState, start: number, now: string | null): string | null {
  const w = state.field(linkWriting, false)
  return w?.start === start ? w.was : now
}

/** Whether re-aiming the link at `start` to `next` keeps its shown text: `keepsShown` asked against the link's baseline where `state` holds one, and against `now` for a surface without an editor state. */
export function keptShown(
  state: EditorState | null,
  start: number,
  now: string | null,
  next: LinkTarget,
  removeTitle: boolean,
  index?: PageIndex,
): boolean {
  const was = state ? baselineAt(state, start, now) : now
  return keepsShown(was === null ? null : readLinkText(was), next, removeTitle, index)
}

// The link already armed keeps its baseline, a replace over the whole of it included; only a change landing in another link reads the old document for how that link read.
function changedLink(tr: Transaction, kept: Writing | null): Writing | null {
  const scan = docScan.after(tr)
  let found: Writing | null = null
  tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    if (found) return
    const after = linkWithin(scan, fromB, toB)
    if (!after) return
    found =
      after.start === kept?.start
        ? kept
        : {
            start: after.start,
            was: linkWithin(docScan(tr.startState.doc), fromA, toA)?.text ?? '',
          }
  })
  return found
}

/** The link starting exactly at `start`, with its line. */
function linkStartingAt(
  state: EditorState,
  start: number,
): { line: Line; o: LinkOccurrence } | null {
  const line = state.doc.lineAt(start)
  const o = linkAt(docScan(state.doc), start + 1)
  return o && line.from + o.full[0] === start ? { line, o } : null
}

/** Every empty part of the link at `start`: an empty alias takes its pipe and an empty heading its hash, matching the nexus-wide rule that an emptied value drops its key; a markdown link can't drop its label, so an empty one shows the label the draw gives it, as a picked one does, and an emptied address label stays empty, since an address has none. */
function emptied(state: EditorState, start: number): ChangeSpec[] {
  const hit = linkStartingAt(state, start)
  if (!hit) return []
  const { line, o } = hit
  const empty = (s: Span | null): s is Span => s !== null && s[0] === s[1]
  if (o.syntax === 'wiki')
    return [
      ...(empty(o.heading)
        ? [{ from: line.from + o.heading[0] - 1, to: line.from + o.heading[1] }]
        : []),
      ...(empty(o.shown)
        ? [{ from: line.from + targetSpan(o)[1], to: line.from + o.shown[1] }]
        : []),
    ]
  if (!empty(o.shown)) return []
  const written = readOccurrence(line.text, o)
  const index = state.facet(editorHost).connections()?.index
  const label = pageLabel(written, resolveLink(written, index))
  return label && fitsSlot(label)
    ? [{ from: line.from + o.shown[0], insert: escapeLabel(label) }]
    : []
}

/** When a surface's alias memory writes: `leave` as the caret leaves the link, `flush` once its host flushes, so a field whose edit can be cancelled remembers only what it saved, and `never` where the surface's write layer remembers. */
export type Remembers = 'leave' | 'flush' | 'never'

/** A body reaches the memory only where a link is written, typed into or picked, either syntax, and it remembers once the caret leaves that link, against how the link read before, since a scan of bodies can't honor a real forget; under `flush` what the leave would write queues until the host's `flush`, and an unmount without one drops it. Its emptied parts collapse at the leave too, so reading a note never rewrites it and clearing a slot to retype never pulls the pipe from under the caret: the collapse is deferred and stands down if the caret is back in the link when it runs. The field clears only when the collapse lands, so `settling` holds the link already being settled and a second leave of it before then settles nothing. Blur settles on the event and unmount through `flush`, since the editor's own teardown outruns a deferred dispatch. */
export const linkSettle = ViewPlugin.define(
  (view: EditorView, { scope, remembers }: { scope: MarkdownScope; remembers: Remembers }) => {
    let settling: number | null = null
    const queued: Remembered[] = []
    const holds = (start: number): boolean =>
      view.hasFocus &&
      linkWithin(docScan(view.state.doc), view.state.selection.main.head)?.start === start
    const write = ({ page, alias }: Remembered): void =>
      void view.state.facet(editorHost).aliases.edit(page.id, { op: 'add', alias })
    const remember = (w: Writing): void => {
      const api = view.state.facet(editorHost).connections()
      const hit = linkStartingAt(view.state, w.start)
      const shown =
        hit && api ? shownAlias(hit.line.text.slice(...hit.o.full), api.index, w.was) : null
      if (!shown) return
      if (remembers === 'flush') queued.push(shown)
      else write(shown)
    }
    const settle = (w: Writing, defer: boolean): void => {
      if (settling === w.start && defer) return
      const html = inRawHtml(view.state, w.start, scope)
      if (settling !== w.start && !html && remembers !== 'never') remember(w)
      settling = w.start
      const collapse = (): void => {
        if (settling === w.start) settling = null
        if (defer && holds(w.start)) return
        const armed = view.state.field(linkWriting)?.start === w.start
        const changes = view.state.changes(html ? [] : emptied(view.state, w.start))
        const rest = view.state.field(linkRest)
        view.dispatch({
          changes,
          effects: [
            ...(armed ? [linkSettled.of(null)] : []),
            ...(rest === null ? [] : [restedOnLink.of(changes.mapPos(rest, 1))]),
          ],
        })
      }
      if (defer) setTimeout(collapse, 0)
      else collapse()
    }
    const settleNow = (): void => {
      const w = view.state.field(linkWriting)
      if (w) settle(w, false)
    }
    return {
      update(u: ViewUpdate) {
        const was = u.startState.field(linkWriting)
        const now = u.state.field(linkWriting)
        if (was && now) {
          const start = u.changes.mapPos(was.start, 1)
          if (now.start !== start) settle({ start, was: was.was }, true)
        }
        if (now && u.selectionSet && !holds(now.start)) settle(now, true)
      },
      settleNow,
      /** The host's way out: settles the link under edit and writes what `flush` memory queued. */
      flush() {
        settleNow()
        for (const shown of queued.splice(0)) write(shown)
      },
    }
  },
  {
    eventHandlers: {
      // A blur settles alone: Chromium fires one as a focused editor is removed, and a cancelled field's queue must not write through it.
      blur(e) {
        if (!inCaretPane(e.relatedTarget)) this.settleNow()
        return false
      },
    },
  },
)
