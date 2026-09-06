import { EditableInput } from './EditableInput'

/** The one inline-rename wrapper: the editing swap, the commit guard (an unchanged or emptied name cancels, never commits), and the caret seat in one place. What's being renamed decides the caret: a `title` opens with the caret at the end; a `row` label opens selected whole. */
export function RenamableLabel({
  renames,
  editing,
  emptyInitial,
  value,
  className,
  autoSize,
  boxed,
  ariaLabel,
  emptyCommits,
  onCommit,
  onCancel,
  children,
}: {
  renames: 'title' | 'row'
  editing: boolean
  emptyInitial?: boolean
  value: string
  className: string
  autoSize?: boolean
  boxed?: boolean
  ariaLabel?: string
  /** A value field rather than a name: clearing it is a commit — the caller's unset — not a cancel. */
  emptyCommits?: boolean
  onCommit: (next: string) => void
  onCancel: () => void
  children?: React.ReactNode
}): React.JSX.Element {
  if (!editing) return <>{children ?? value}</>
  return (
    <EditableInput
      value={value}
      initialText={emptyInitial ? '' : undefined}
      className={className}
      autoSize={autoSize}
      boxed={boxed}
      ariaLabel={ariaLabel}
      caretAtEnd={renames === 'title'}
      onCommit={(next) => ((next || emptyCommits) && next !== value ? onCommit(next) : onCancel())}
      onCancel={onCancel}
    />
  )
}
