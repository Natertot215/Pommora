import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { toggleComment } from '@codemirror/commands'
import { autoCloseTags, html } from '@codemirror/lang-html'

export const htmlTags = html({ matchClosingTags: false, autoCloseTags: false })

export const htmlShortcuts = (on: boolean): Extension =>
  on ? [autoCloseTags, keymap.of([{ key: 'Mod-/', run: toggleComment }])] : []
