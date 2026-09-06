import { useEffect, useRef, useState } from 'react'
import { cx } from '@pommora/uix/Utilities/cx'
import { base } from '@pommora/uix/Fields/fields.css'

/** The done-guard keeps Enter's commit from double-firing through the blur that follows it. */
export function PropertyEditor({
  initial,
  numeric = false,
  validate,
  color,
  onCommit,
  onCancel,
}: {
  initial: string
  numeric?: boolean
  validate?: (raw: string) => boolean
  color?: string
  onCommit: (raw: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const [text, setText] = useState(initial)
  const done = useRef(false)
  const finish = (fn: () => void): void => {
    if (done.current) return
    done.current = true
    fn()
  }
  // A non-blur teardown must not drop typed text; the changed-text guard keeps StrictMode's dev cleanup cycle from committing the untouched initial value.
  const textRef = useRef(text)
  textRef.current = text
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit
  useEffect(
    () => () => {
      if (!done.current && textRef.current !== initial)
        finish(() => commitRef.current(textRef.current))
    },
    [],
  )
  return (
    <input
      className={cx(
        base,
        'property-editor',
        validate != null && text.trim() !== '' && !validate(text.trim()) && 'property-editor-ghost',
      )}
      style={color ? { color } : undefined}
      // biome-ignore lint/a11y/noAutofocus: the surface exists to take focus the moment it opens; that IS the interaction
      autoFocus
      value={text}
      onChange={(e) => {
        const next = e.target.value
        if (numeric && !/^-?\d*(\.\d*)?$/.test(next)) return
        setText(next)
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') finish(() => onCommit(text))
        else if (e.key === 'Escape') finish(onCancel)
      }}
      onBlur={() => finish(() => onCommit(text))}
      onClick={(e) => e.stopPropagation()}
    />
  )
}
