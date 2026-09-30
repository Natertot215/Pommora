import type { EditorView } from '@codemirror/view'
import type { Edit } from './edits'
import type { FormatEdit } from './format'
import { RELIST } from './listRenumber'

export function applyEdit(
  view: EditorView,
  edit: Edit | FormatEdit | null,
  opts: { userEvent?: string; scrollIntoView?: boolean } = {},
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
  view.dispatch({
    changes,
    selection,
    scrollIntoView: opts.scrollIntoView,
    userEvent: opts.userEvent ?? (edit.relist ? RELIST : 'input'),
  })
  return true
}
