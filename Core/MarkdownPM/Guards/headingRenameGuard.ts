import { EditorState, type Extension, StateEffect, type Transaction } from '@codemirror/state'
import { rewriteHeadingConnections } from '@pommora/core/Connections/rewrite'
import { headingParts } from '../Engine/detect'
import { editorHost, syncLanding } from '../api'
import { docString } from '../docCache'
import { changesTo } from '../../Pages/merge3'
import { carriedAnnotations } from './calloutGuard'

export interface HeadingRename {
  old: string
  next: string
  line: number
}

export const headingRenamed = StateEffect.define<HeadingRename>()

// The one changed range that sits on a heading line and changed its content; other ranges in the same transaction (an undo that also restores links) are ignored. A heading typed fresh is not a rename; a heading cleared is a rename to nothing, which the listener carries.
export function headingRenameOf(tr: Transaction): HeadingRename | null {
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
  const own = tr.startState.facet(editorHost).pageTitle() ?? ''
  const runs = tr.startState.facet(editorHost).settings().inPageHeadingResolution === 'automatic'
  const rewritten = rewriteHeadingConnections(after, own, rename.old, rename.next, own, runs)
  if (rewritten === after) return stamped
  return [stamped, { changes: changesTo(after, rewritten), sequential: true }]
})
