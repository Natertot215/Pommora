import { useState } from 'react'
import { EditableInput } from './EditableInput'
import { resting } from './fields.css'

/** A `title` opens with the caret at the end; a `row` label opens selected whole. */
export function RenamableLabel({
  renames,
  editing,
  emptyInitial,
  value,
  className,
  type,
  autoSize,
  boxed,
  ariaLabel,
  emptyCommits,
  invalid,
  onBegin,
  onCommit,
  onCancel,
  children,
}: {
  renames: 'title' | 'row'
  editing: boolean
  emptyInitial?: boolean
  value: string
  className: string
  type?: 'text' | 'password'
  autoSize?: boolean
  boxed?: boolean
  ariaLabel?: string
  /** A value field rather than a name: clearing it is a commit — the caller's unset — not a cancel. */
  emptyCommits?: boolean
  invalid?: (text: string) => boolean
  onBegin?: () => void
  /** A commit that returns its landing keeps the committed text shown until that settles. */
  // biome-ignore lint/suspicious/noConfusingVoidType: a synchronous commit hands back nothing, and `undefined` in place of `void` breaks assignability for those handlers.
  onCommit: (next: string) => void | Promise<unknown>
  onCancel: () => void
  children?: React.ReactNode | ((shown: string) => React.ReactNode)
}): React.JSX.Element {
  const [landing, setLanding] = useState<string | null>(null)
  const commit = (next: string): void => {
    const landed = onCommit(next)
    if (!landed) return
    setLanding(next)
    void landed.finally(() => setLanding(null))
  }
  if (!editing) {
    const shown = landing ?? value
    const rest = typeof children === 'function' ? children(shown) : (children ?? shown)
    if (!onBegin) return <>{rest}</>
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut; every title's menu carries Rename for the keyboard
      <span className={resting} onDoubleClick={onBegin}>
        {rest}
      </span>
    )
  }
  return (
    <EditableInput
      initial={emptyInitial ? '' : value}
      className={className}
      type={type}
      autoSize={autoSize}
      boxed={boxed}
      ariaLabel={ariaLabel}
      caretAtEnd={renames === 'title'}
      required={!emptyCommits}
      invalid={invalid}
      onCommit={(next) => (next !== value ? commit(next) : onCancel())}
      onCancel={onCancel}
    />
  )
}
