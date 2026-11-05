import { keymap, type KeyBinding } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { COMMAND_IDS, type Commands, toKeyBinding } from '../../Actions/commands'
import type { FormatChordAction } from '../../Actions/editorMenu'
import { applyEditorAction } from '../Menus/menu'
import type { MarkdownScope } from '../Engine/detect'

export const FORMAT_ACTIONS = COMMAND_IDS.filter((id): id is FormatChordAction =>
  id.startsWith('format:'),
)

export const formatKeymap =
  (scope: MarkdownScope) =>
  (commands: Commands): Extension =>
    keymap.of(
      FORMAT_ACTIONS.map(
        (action): KeyBinding => ({
          key: toKeyBinding(commands[action]),
          run: (view) => {
            applyEditorAction(view, action, scope)
            return true
          },
        }),
      ),
    )
