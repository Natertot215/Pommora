import { keymap, type KeyBinding } from '@codemirror/view'
import {
  EDITOR_ACTION_PREFIX,
  FORMAT_CHORDS,
  type FormatChordAction,
  keyBindingFor,
} from '@pommora/core/Actions/editorMenu'
import { applyEditorAction } from '../Menus/menu'

// The chords come from FORMAT_CHORDS, which the context menu's accelerators also read — so a shortcut the menu displays is a shortcut this binds.
const bind = (action: FormatChordAction): KeyBinding => ({
  key: keyBindingFor(action),
  run: (view) => applyEditorAction(view, EDITOR_ACTION_PREFIX + action),
})

export const formatKeymap = keymap.of((Object.keys(FORMAT_CHORDS) as FormatChordAction[]).map(bind))
