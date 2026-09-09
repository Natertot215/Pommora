import { keymap, type KeyBinding } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { COMMAND_IDS, type Commands, toKeyBinding } from '@pommora/core/Actions/commands'
import { EDITOR_ACTION_PREFIX, type FormatChordAction } from '@pommora/core/Actions/editorMenu'
import { applyEditorAction } from '../Menus/menu'

export const FORMAT_ACTIONS = COMMAND_IDS.filter((id): id is FormatChordAction =>
  id.startsWith('format:'),
)

export const formatKeymap = (commands: Commands): Extension =>
  keymap.of(
    FORMAT_ACTIONS.map(
      (action): KeyBinding => ({
        key: toKeyBinding(commands[action]),
        run: (view) => applyEditorAction(view, EDITOR_ACTION_PREFIX + action),
      }),
    ),
  )
