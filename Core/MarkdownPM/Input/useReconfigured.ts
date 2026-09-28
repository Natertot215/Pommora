import { useEffect, useState, type RefObject } from 'react'
import { Compartment, type Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export function useReconfigured<T>(
  viewRef: RefObject<EditorView | null>,
  value: T,
  build: (value: T) => Extension,
): Extension {
  const [{ compartment, extension }] = useState(() => {
    const compartment = new Compartment()
    return { compartment, extension: compartment.of(build(value)) }
  })
  useEffect(() => {
    viewRef.current?.dispatch({ effects: compartment.reconfigure(build(value)) })
  }, [value])
  return extension
}
