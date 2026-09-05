import { FORMAT_CHORDS, type FormatChordAction } from '@pommora/core/Actions/editorMenu'

/** The chord as Electron writes an accelerator — display-only in the context menu. */
export function acceleratorFor(action: FormatChordAction): string {
  const { shift, key } = FORMAT_CHORDS[action]
  return `CmdOrCtrl+${shift ? 'Shift+' : ''}${key.toUpperCase()}`
}
