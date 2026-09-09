import { keymap, type KeyBinding } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { type CommandId, type Commands, DEFAULT_COMMANDS } from '@pommora/core/Actions/commands'
import {
  EDITOR_ACTION_PREFIX,
  type FormatChordAction,
  keyBindingFor,
} from '@pommora/core/Actions/editorMenu'
import { applyEditorAction } from '../Menus/menu'

export const FORMAT_ACTIONS = (Object.keys(DEFAULT_COMMANDS) as CommandId[]).filter(
  (id): id is FormatChordAction => id.startsWith('format:'),
)

const bind = (commands: Commands, action: FormatChordAction): KeyBinding => ({
  key: keyBindingFor(commands, action),
  run: (view) => applyEditorAction(view, EDITOR_ACTION_PREFIX + action),
})

export const formatKeymap = (commands: Commands): Extension =>
  keymap.of(FORMAT_ACTIONS.map((action) => bind(commands, action)))
