import { useMemo, useState, type RefObject } from 'react'
import { Transaction } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { EDITOR_ACTION_PREFIX } from '@pommora/core/Actions/editorMenu'
import {
  blockMenuSections,
  filterBlockMenu,
  type BlockMenuAction,
  type BlockMenuMatch,
} from '@pommora/core/Actions/blockMenu'
import {
  caretGeometry,
  useMenuCtl,
  type AcCtl,
  type CaretGeometry,
} from '../Autocomplete/useConnectionAutocomplete'
import { citationSeatAt } from '../Citations/citationActions'
import { docScan } from '../docCache'
import { blockQueryAt, type BlockQuery } from './blockQuery'
import { applyEditorAction } from './menu'

export interface BlockMenuState extends BlockQuery, CaretGeometry {
  citeSeat: boolean
}

export function detectBlockQuery(
  view: EditorView,
  set: (s: BlockMenuState | null) => void,
  typed: boolean,
): void {
  const sel = view.state.selection.main
  let next: BlockMenuState | null = null
  if (sel.empty && typed) {
    const q = blockQueryAt(docScan(view.state.doc), sel.head)
    if (q) {
      const g = caretGeometry(view, sel.head)
      if (g) next = { ...q, ...g, citeSeat: citationSeatAt(view.state) }
    }
  }
  set(next)
}

interface BlockMenu {
  state: BlockMenuState | null
  setState: (s: BlockMenuState | null) => void
  matches: BlockMenuMatch[]
  selected: BlockMenuAction | null
  open: boolean
  pick: (action: BlockMenuAction) => void
  ctl: RefObject<AcCtl>
}

export function useBlockMenu(viewRef: RefObject<EditorView | null>): BlockMenu {
  const [state, setState] = useState<BlockMenuState | null>(null)
  const query = state?.query ?? null
  const citeSeat = state?.citeSeat ?? false
  const matches = useMemo(
    () => (query === null ? [] : filterBlockMenu(blockMenuSections(citeSeat), query)),
    [query, citeSeat],
  )
  const rows = matches.flatMap((m) => m.rows)
  const open = state !== null && rows.length > 0

  const pick = (action: BlockMenuAction): void => {
    const view = viewRef.current
    if (!view || !state || !ctl.current.open) return
    view.dispatch({
      changes: { from: state.from, to: state.to, insert: '' },
      annotations: Transaction.addToHistory.of(false),
      userEvent: 'input',
    })
    applyEditorAction(view, EDITOR_ACTION_PREFIX + action)
  }

  const { index, ctl } = useMenuCtl(
    rows.length,
    state?.query,
    {
      open,
      pick: (i) => {
        const r = rows[i]
        if (r) pick(r.action)
      },
      close: () => setState(null),
    },
    null,
  )
  const selected = index === null ? null : (rows[index]?.action ?? null)

  return { state, setState, matches, selected, open, pick, ctl }
}
