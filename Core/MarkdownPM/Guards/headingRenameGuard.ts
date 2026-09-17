import { EditorState, type Extension, StateEffect, type Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { normalizeTitle } from '@pommora/core/Connections/connections'
import { rewriteHeadingConnections } from '@pommora/core/Connections/rewrite'
import { headingParts } from '../Engine/detect'
import { editorHost, syncLanding } from '../api'
import { docHeadingKeys, docString } from '../docCache'
import { changesTo } from '../../Pages/merge3'
import { carriedAnnotations } from './calloutGuard'

export interface HeadingRename {
  old: string
  next: string
  line: number
}

export const headingRenamed = StateEffect.define<HeadingRename>()

// The one changed range that sits on a heading line and changed its content; other ranges in the same transaction (an undo that also restores links) are ignored. A heading typed fresh is not a rename; a heading cleared is a rename to nothing, which the listener carries.
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
    const old = oldParts.content.trim()
    const next = newParts.content.trim()
    if (!old || old === next) return
    seen++
    found = { old, next, line: newLine.number }
  })
  return seen === 1 ? found : null
}

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
  const after = docString(tr.newDoc)
  const host = tr.startState.facet(editorHost)
  const own = host.pageTitle() ?? ''
  const runs = host.settings().inPageHeadingResolution === 'automatic'
  const rewritten = rewriteHeadingConnections(after, own, rename.old, rename.next, own, runs)
  if (rewritten === after) return stamped
  return [stamped, { changes: changesTo(after, rewritten), sequential: true }]
})

// A rename settles when the caret leaves the heading line or the editor blurs: every text the line passed through rewrites to the final one in one deferred dispatch, and the host hears the settled pair. Undo and redo bypass transaction filters, so their rename is read off the transaction itself.
export function headingRenameSettle(
  onRename: () => ((old: string, next: string) => void) | undefined,
): Extension {
  let pending: { old: string; line: number; trail: Set<string> } | null = null
  return EditorView.updateListener.of((u) => {
    if (!(u.docChanged || u.selectionSet || u.focusChanged)) return
    for (const tr of u.transactions) {
      const renames = tr.effects.filter((e) => e.is(headingRenamed)).map((e) => e.value)
      if (renames.length === 0 && (tr.isUserEvent('undo') || tr.isUserEvent('redo'))) {
        const rename = headingRenameOf(tr)
        if (rename) renames.push(rename)
      }
      for (const rename of renames) {
        pending ??= { old: rename.old, line: rename.line, trail: new Set() }
        pending.trail.add(rename.old).add(rename.next)
      }
    }
    if (!pending) return
    const lineNo = u.state.doc.lineAt(u.state.selection.main.head).number
    if (pending.line === lineNo && !(u.focusChanged && !u.view.hasFocus)) return
    const held = pending
    pending = null
    const text = held.line <= u.state.doc.lines ? u.state.doc.line(held.line).text : ''
    const final = headingParts(text)?.content.trim() ?? ''
    if (
      !final ||
      final === held.old ||
      docHeadingKeys(u.state.doc).includes(normalizeTitle(held.old))
    )
      return
    const host = u.state.facet(editorHost)
    const own = host.pageTitle() ?? ''
    const runs = host.settings().inPageHeadingResolution === 'automatic'
    const doc = docString(u.state.doc)
    let body = doc
    for (const stale of held.trail)
      if (stale && stale !== final)
        body = rewriteHeadingConnections(body, own, stale, final, own, runs)
    // Deferred as the alias slot's own leave dispatch defers: a dispatch inside an update listener re-enters the view.
    if (body !== doc)
      setTimeout(() => u.view.dispatch({ changes: changesTo(doc, body), userEvent: 'input' }), 0)
    onRename()?.(held.old, final)
  })
}
