import { type EditorState, MapMode, Transaction } from '@codemirror/state'
import { ViewPlugin } from '@codemirror/view'
import { normalizeTitle } from '../../Connections/connections'
import { rewriteHeadingConnections } from '../../Connections/rewrite'
import { headingParts } from '../Engine/detect'
import { editorHost } from '../api'
import { docHeadingKeys, docOutline, docSectionHeadings, docString } from '../docCache'
import { changesTo } from '../../Pages/merge3'

interface HeldRename {
  old: string
  from: number
}

// A heading cleared to nothing is still a rename, held until the line settles, and a transaction changing two headings renames neither. The outline decides what a heading line is, so a `## ` sample inside a fence never renames.
function headingRenameOf(tr: Transaction): HeldRename | null {
  let found: HeldRename | null = null
  let seen = 0
  tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    const oldLine = tr.startState.doc.lineAt(fromA)
    const newLine = tr.newDoc.lineAt(fromB)
    if (toB > newLine.to + 1 || (toA > oldLine.to && fromA === oldLine.from)) return
    const oldParts = headingParts(oldLine.text)
    const newParts = headingParts(newLine.text)
    if (!oldParts || !newParts) return
    if (!docOutline(tr.startState.doc).some((h) => h.from === oldLine.from)) return
    const old = oldParts.content.trim()
    if (!old || old === newParts.content.trim()) return
    seen++
    found = { old, from: newLine.from }
  })
  return seen === 1 ? found : null
}

// A deletion across either end of the held line drops the rename.
export const headingRenameSettle = ViewPlugin.define(
  (view, onRename: () => ((old: string, next: string) => void) | undefined) => {
    let pending: HeldRename | null = null
    // Kept out of history, so an undo reverts the heading alone and its own settle carries the links back. A dispatch inside a plugin update throws, so the update path defers it.
    const settle = (state: EditorState, defer: boolean): void => {
      const held = pending
      pending = null
      if (!held) return
      const final = headingParts(state.doc.lineAt(held.from).text)?.content.trim() ?? ''
      if (!final || final === held.old) return
      const pair = [normalizeTitle(final), normalizeTitle(held.old)]
      // The renamed line is one of these keys, so a second means the old text survives or the new text doubles; a case-only rename's line counts once.
      if (docHeadingKeys(state.doc).filter((k) => pair.includes(k)).length > 1) return
      const rewrite = (): void => {
        const now = view.state
        const host = now.facet(editorHost)
        const own = host.pageTitle() ?? ''
        const outline =
          host.settings().inPageHeadingResolution === 'automatic'
            ? docSectionHeadings(now.doc)
            : undefined
        const doc = docString(now.doc)
        const body = rewriteHeadingConnections(doc, own, held.old, final, own, outline)
        if (body !== doc)
          view.dispatch({
            changes: changesTo(doc, body),
            annotations: Transaction.addToHistory.of(false),
            filter: false,
          })
      }
      if (defer) setTimeout(rewrite, 0)
      else rewrite()
      onRename()?.(held.old, final)
    }
    return {
      update(u) {
        if (!(u.docChanged || u.selectionSet || u.focusChanged)) return
        for (const tr of u.transactions) {
          if (pending && tr.docChanged) {
            const lineEnd = tr.startState.doc.lineAt(pending.from).to
            const from = tr.changes.mapPos(pending.from, 1, MapMode.TrackDel)
            const end = tr.changes.mapPos(lineEnd, 1, MapMode.TrackDel)
            pending = from === null || end === null ? null : { old: pending.old, from }
          }
          // A mirrored body and the settle's own link rewrite both stay out of history, and neither is this editor's heading edit.
          if (tr.annotation(Transaction.addToHistory) === false) continue
          const rename = headingRenameOf(tr)
          if (!rename) continue
          if (pending && tr.newDoc.lineAt(pending.from).from !== rename.from) settle(tr.state, true)
          pending ??= rename
        }
        const { doc, selection } = u.state
        if (
          pending &&
          view.hasFocus &&
          doc.lineAt(selection.main.head).from === doc.lineAt(pending.from).from
        )
          return
        settle(u.state, true)
      },
      flush: () => settle(view.state, false),
    }
  },
)
