import { EditorState, type Extension, StateEffect, type Transaction } from '@codemirror/state'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { normalizeTitle } from '@pommora/core/Connections/connections'
import { rewriteHeadingConnections } from '@pommora/core/Connections/rewrite'
import { headingParts } from '../Engine/detect'
import { editorHost, syncLanding } from '../api'
import { docHeadingKeys, docOutline, docSectionHeadings, docString } from '../docCache'
import { changesTo } from '../../Pages/merge3'
import { carriedAnnotations } from './calloutGuard'

export interface HeadingRename {
  old: string
  next: string
  line: number
}

export const headingRenamed = StateEffect.define<HeadingRename>()

// The one changed range that sits on a heading line and changed its content; other ranges in the same transaction (an undo that also restores links) are ignored. A heading typed fresh is not a rename; a heading cleared is a rename to nothing, which the listener carries. The outline decides what a heading line is, so a `## ` sample inside a fence never renames.
function headingRenameOf(tr: Transaction): HeadingRename | null {
  let found: HeadingRename | null = null
  let seen = 0
  tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    const oldLine = tr.startState.doc.lineAt(fromA)
    const newLine = tr.newDoc.lineAt(fromB)
    if (toA > oldLine.to || toB > newLine.to) return
    const oldParts = headingParts(oldLine.text)
    const newParts = headingParts(newLine.text)
    if (!oldParts || !newParts) return
    if (!docOutline(tr.startState.doc).some((h) => h.from === oldLine.from)) return
    const old = oldParts.content.trim()
    const next = newParts.content.trim()
    if (!old || old === next) return
    seen++
    found = { old, next, line: newLine.number }
  })
  return seen === 1 ? found : null
}

// Where the old text stands on more than one line, only the links nearest the renamed line move; the rest keep the survivor. The cut falls on a line boundary, the midpoint's line going to the earlier heading, so no link straddles it.
function ownedRange(tr: Transaction, rename: HeadingRename): [number, number] {
  const oldKey = normalizeTitle(rename.old)
  const doc = tr.newDoc
  const renamedFrom = doc.line(rename.line).from
  const others = docOutline(tr.startState.doc)
    .filter((h) => normalizeTitle(h.text) === oldKey)
    .map((h) => tr.changes.mapPos(h.from))
    .filter((from) => from !== renamedFrom)
  const prev = Math.max(-1, ...others.filter((f) => f < renamedFrom))
  const next = Math.min(doc.length + 1, ...others.filter((f) => f > renamedFrom))
  const a =
    prev < 0 ? 0 : Math.min(doc.lineAt(Math.ceil((prev + renamedFrom) / 2)).to + 1, renamedFrom)
  const b = next > doc.length ? doc.length : doc.lineAt(Math.floor((renamedFrom + next) / 2)).to
  return [a, b]
}

const runOutline = (state: EditorState): readonly string[] | undefined =>
  state.facet(editorHost).settings().inPageHeadingResolution === 'automatic'
    ? docSectionHeadings(state.doc)
    : undefined

export const headingRenameGuard: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || tr.annotation(syncLanding)) return tr
  const rename = headingRenameOf(tr)
  if (!rename) return tr
  const stamped = {
    changes: tr.changes,
    selection: tr.selection,
    effects: [...tr.effects, headingRenamed.of(rename)],
    annotations: carriedAnnotations(tr),
    scrollIntoView: tr.scrollIntoView,
  }
  if (!rename.next) return stamped
  const host = tr.startState.facet(editorHost)
  const own = host.pageTitle() ?? ''
  const outline = runOutline(tr.startState)
  const after = docString(tr.newDoc)
  const [a, b] = ownedRange(tr, rename)
  const rewritten =
    after.slice(0, a) +
    rewriteHeadingConnections(after.slice(a, b), own, rename.old, rename.next, own, outline) +
    after.slice(b)
  if (rewritten === after) return stamped
  return [stamped, { changes: changesTo(after, rewritten), sequential: true }]
})

// A rename settles when the caret leaves the heading line or the editor blurs: every text the line passed through rewrites to the final one in one deferred dispatch, and the host hears the settled pair. A second line's rename settles the held one first. Undo and redo bypass transaction filters, so their rename is read off the transaction itself.
export function headingRenameSettle(
  onRename: () => ((old: string, next: string) => void) | undefined,
): Extension {
  interface Pending {
    old: string
    pos: number
    trail: Set<string>
  }
  let pending: Pending | null = null
  const settle = (u: ViewUpdate, held: Pending): void => {
    const text = held.pos <= u.state.doc.length ? u.state.doc.lineAt(held.pos).text : ''
    const final = headingParts(text)?.content.trim() ?? ''
    const live = docHeadingKeys(u.state.doc)
    if (!final || final === held.old || live.includes(normalizeTitle(held.old))) return
    const host = u.state.facet(editorHost)
    const own = host.pageTitle() ?? ''
    const outline = runOutline(u.state)
    const doc = docString(u.state.doc)
    let body = doc
    for (const stale of held.trail)
      if (stale && stale !== final && !live.includes(normalizeTitle(stale)))
        body = rewriteHeadingConnections(body, own, stale, final, own, outline)
    // Deferred as the alias slot's own leave dispatch defers: a dispatch inside an update listener re-enters the view.
    if (body !== doc)
      setTimeout(() => u.view.dispatch({ changes: changesTo(doc, body), userEvent: 'input' }), 0)
    onRename()?.(held.old, final)
  }
  return EditorView.updateListener.of((u) => {
    if (!(u.docChanged || u.selectionSet || u.focusChanged)) return
    if (pending) pending.pos = u.changes.mapPos(pending.pos, 1)
    for (const tr of u.transactions) {
      const renames = tr.effects.filter((e) => e.is(headingRenamed)).map((e) => e.value)
      if (renames.length === 0 && (tr.isUserEvent('undo') || tr.isUserEvent('redo'))) {
        const rename = headingRenameOf(tr)
        if (rename) renames.push(rename)
      }
      for (const rename of renames) {
        const pos = u.state.doc.line(rename.line).from
        if (pending && u.state.doc.lineAt(pending.pos).from !== pos) {
          settle(u, pending)
          pending = null
        }
        pending ??= { old: rename.old, pos, trail: new Set() }
        pending.trail.add(rename.old).add(rename.next)
      }
    }
    if (!pending) return
    const onLine =
      u.state.doc.lineAt(u.state.selection.main.head).from === u.state.doc.lineAt(pending.pos).from
    if (onLine && !(u.focusChanged && !u.view.hasFocus)) return
    const held = pending
    pending = null
    settle(u, held)
  })
}
