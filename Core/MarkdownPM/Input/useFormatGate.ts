import { useEffect, useRef, type RefObject } from 'react'
import { Compartment, type Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { Commands } from '@pommora/core/Actions/commands'
import { formatKeymap } from './formatKeymap'

/** The format chords as a compartment the editor reconfigures when the commands change. Placed by the caller directly ahead of the default keymap, which also binds Mod-i and Mod-[. */
export function useFormatGate(
  viewRef: RefObject<EditorView | null>,
  commands: Commands,
): Extension {
  const gate = useRef<{ compartment: Compartment; last: Commands; extension: Extension } | null>(
    null,
  )
  if (!gate.current) {
    const compartment = new Compartment()
    gate.current = {
      compartment,
      last: commands,
      extension: compartment.of(formatKeymap(commands)),
    }
  }
  useEffect(() => {
    const g = gate.current!
    const view = viewRef.current
    if (view && commands !== g.last)
      view.dispatch({ effects: g.compartment.reconfigure(formatKeymap(commands)) })
    g.last = commands
  }, [commands])
  return gate.current.extension
}
