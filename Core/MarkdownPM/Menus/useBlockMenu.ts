import { useState, type RefObject } from 'react'
import { type Extension, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { BlockMenuAction } from '../../Actions/blockMenu'
import { caretGeometry, usePaneCtl, type PaneCtl, type CaretGeometry } from './caretPane'
import { blockQuery, closeBlockQuery, type OpenBlockQuery } from './blockQuery'
import { applyEditorAction } from './menu'

export type BlockMenuState = OpenBlockQuery & CaretGeometry

interface BlockMenu {
  extension: Extension
  state: BlockMenuState | null
  close: () => void
  selected: BlockMenuAction | null
  pick: (action: BlockMenuAction) => void
  ctl: RefObject<PaneCtl>
}

export function useBlockMenu(viewRef: RefObject<EditorView | null>): BlockMenu {
  const [state, setState] = useState<BlockMenuState | null>(null)
  const [extension] = useState<Extension>(() => [
    blockQuery,
    EditorView.updateListener.of((u) => {
      const q = u.state.field(blockQuery)
      if (q === u.startState.field(blockQuery)) return
      const g = q && caretGeometry(u.view, q.to)
      setState(q && g ? { ...q, ...g } : null)
    }),
  ])
  const close = (): void => {
    const view = viewRef.current
    if (view?.state.field(blockQuery)) view.dispatch({ effects: closeBlockQuery.of(null) })
  }
  const rows = state?.matches.flatMap((m) => m.rows) ?? []

  const pick = (action: BlockMenuAction): void => {
    const view = viewRef.current
    const q = view?.state.field(blockQuery)
    if (!view || !q) return
    view.dispatch({
      changes: { from: q.from, to: q.to, insert: '' },
      annotations: Transaction.addToHistory.of(false),
      userEvent: 'input',
    })
    applyEditorAction(view, action)
  }

  const { row, ctl } = usePaneCtl(
    rows,
    state?.query,
    { open: state !== null, pick: (r) => pick(r.action), close },
    null,
  )
  const selected = row?.action ?? null

  return { extension, state, close, selected, pick, ctl }
}
