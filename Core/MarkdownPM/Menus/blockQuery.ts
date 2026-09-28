import { StateEffect, StateField, Transaction } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import {
  BLOCK_MENU_SECTIONS,
  filterBlockMenu,
  type BlockMenuMatch,
} from '@pommora/core/Actions/blockMenu'
import { inSealedBlockAt, type DocScan } from '../Engine/docScan'
import { lineIndexAt } from '../Engine/markdownCode'
import { docScan } from '../docCache'

export interface BlockQuery {
  query: string
  from: number
  to: number
}

export function blockQueryAt(scan: DocScan, caret: number): BlockQuery | null {
  const i = lineIndexAt(scan, caret)
  const from = scan.lineStarts[i]
  const match = /^\/(\S*)$/.exec(scan.lines[i])
  if (!match || caret !== from + scan.lines[i].length) return null
  if (inSealedBlockAt(scan, i) || i >= scan.citations.firstLine) return null
  return { query: match[1], from, to: caret }
}

export interface OpenBlockQuery extends BlockQuery {
  matches: BlockMenuMatch[]
}

export const closeBlockQuery = StateEffect.define<null>()

const querySlash = Decoration.mark({ class: 'md-phantom-syntax' })
const queryText = Decoration.mark({ class: 'md-connection-phantom' })

export const blockQuery = StateField.define<OpenBlockQuery | null>({
  create: () => null,
  update(value, tr) {
    if (tr.effects.some((e) => e.is(closeBlockQuery))) return null
    if (!tr.docChanged) return tr.selection ? null : value
    if (value === null && !tr.annotation(Transaction.userEvent)) return null
    const sel = tr.newSelection.main
    if (!sel.empty || tr.startState.readOnly) return null
    const q = blockQueryAt(docScan(tr.newDoc), sel.head)
    if (!q) return null
    const matches = filterBlockMenu(BLOCK_MENU_SECTIONS, q.query)
    return matches.length > 0 ? { ...q, matches } : null
  },
  provide: (field) =>
    EditorView.decorations.from(field, (q) =>
      q === null
        ? Decoration.none
        : Decoration.set([
            querySlash.range(q.from, q.from + 1),
            ...(q.query === '' ? [] : [queryText.range(q.from + 1, q.to)]),
          ]),
    ),
})
