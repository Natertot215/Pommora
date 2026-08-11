import { EditableInput } from './EditableInput'

/** The one inline-rename wrapper: the editing swap, the commit guard (an unchanged or emptied name
 *  cancels, never commits), and the caret seat in a single place. What's being renamed decides the
 *  caret (Nathan's call): a `title` — header fields, the ViewPane's view rows, the view-embed
 *  pills — opens with the caret at the end; a `row` label in a tree or pane opens selected whole.
 *  `children` is the resting render; absent, the plain value text. */
export function RenamableLabel({
  renames,
  editing,
  emptyInitial,
  value,
  className,
  autoSize,
  boxed,
  onCommit,
  onCancel,
  children,
}: {
  renames: 'title' | 'row'
  editing: boolean
  /** A creation's naming session: the field opens genuinely empty while the entity's real title
   *  (Untitled) stays the commit guard's baseline — leaving without a name changes nothing. */
  emptyInitial?: boolean
  value: string
  className: string
  autoSize?: boolean
  /** The field carries its own border and fill — see `EditableInput`. */
  boxed?: boolean
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
      caretAtEnd={renames === 'title'}
      onCommit={(next) => (next && next !== value ? onCommit(next) : onCancel())}
      onCancel={onCancel}
    />
  )
}
