import type { EditorView } from '@codemirror/view'
import type { TextEdit } from '../Engine/markdownCode'
import type { Edit } from './edits'
import type { FormatEdit } from './format'

// One dispatch, two specs: the recount lands in the edited document's coordinates and the pair reaches a listener as a single update, so one undo takes both. An empty recount is dropped rather than dispatched as a second, changeless transaction.
export function applyEdit(
  view: EditorView,
  edit: Edit | FormatEdit | null,
  opts: { userEvent?: string; recount?: TextEdit[]; scrollIntoView?: boolean } = {},
): boolean {
  if (!edit) return false
  const { changes, selection } =
    'changes' in edit
      ? {
          changes: edit.changes,
          selection: edit.selection === undefined ? undefined : { anchor: edit.selection },
        }
      : {
          changes: { from: edit.from, to: edit.to, insert: edit.insert },
          selection: { anchor: edit.selection, head: edit.head },
        }
  const spec = {
    changes,
    selection,
    scrollIntoView: opts.scrollIntoView,
    userEvent: opts.userEvent ?? 'input',
  }
  const recount = opts.recount ?? []
  if (recount.length === 0) view.dispatch(spec)
  else view.dispatch(spec, { changes: recount, sequential: true })
  return true
}
