import { keymap, type KeyBinding } from '@codemirror/view'
import { defaultKeymap, toggleBlockComment, toggleComment } from '@codemirror/commands'
import type { Extension } from '@codemirror/state'
import { COMMAND_IDS, type Commands, toKeyBinding } from '@pommora/core/Actions/commands'
import type { FormatChordAction } from '@pommora/core/Actions/editorMenu'
import { applyEditorAction } from '../Menus/menu'

export const FORMAT_ACTIONS = COMMAND_IDS.filter((id): id is FormatChordAction =>
  id.startsWith('format:'),
)

export const editorKeymap = defaultKeymap.filter(
  (b) => b.run !== toggleComment && b.run !== toggleBlockComment,
)

export const formatKeymap = (commands: Commands): Extension =>
  keymap.of(
    FORMAT_ACTIONS.map(
      (action): KeyBinding => ({
        key: toKeyBinding(commands[action]),
        run: (view) => applyEditorAction(view, action),
      }),
    ),
  )
