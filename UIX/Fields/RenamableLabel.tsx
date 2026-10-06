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
  onBegin?: () => void
  onCommit: (next: string) => void
  onCancel: () => void
  children?: React.ReactNode
}): React.JSX.Element {
  if (!editing) {
    if (!onBegin) return <>{children ?? value}</>
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut; every title's menu carries Rename for the keyboard
      <span className={resting} onDoubleClick={onBegin}>
        {children ?? value}
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
      onCommit={(next) => (next !== value ? onCommit(next) : onCancel())}
      onCancel={onCancel}
    />
  )
}
