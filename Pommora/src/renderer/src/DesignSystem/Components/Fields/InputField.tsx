import { type ReactNode, useRef, useState } from 'react'
import * as s from './fields.css'
import { cx } from '../../Util/cx'
import { onActivateKey } from '../../Interactions/activate'
import { RenamableLabel } from './RenamableLabel'

export interface FieldEdit {
  value: string
  onCommit: (next: string) => void
  /** Where the caret lands — a `title` opens with it at the end, a `row` selected whole. */
  renames?: 'title' | 'row'
  /** Uncontrolled by default: a click opens the field. A host with its own way in — a menu's
   *  Rename — drives it instead. */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
}

export function InputField({
  children,
  className,
  onClick,
  outline,
  capped,
  chrome = 'boxed',
  edit,
  leading,
  trailing,
  label,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  outline?: string
  capped?: boolean
  chrome?: 'boxed' | 'bordered'
  /** Press-to-edit: the children at rest, a caret over the raw value under a click. */
  edit?: FieldEdit
  /** Before the content — one lead glyph. */
  leading?: ReactNode
  /** After the content, outside the caret — an action the field carries. */
  trailing?: ReactNode
  label?: string
}): React.JSX.Element {
  const [ownEditing, setOwnEditing] = useState(false)
  const editing = edit !== undefined && (edit.editing ?? ownEditing)
  // The width the field had at rest, held for the whole edit so the swap never re-flows the row;
  // the caret sizes to its text and widens the field only when the value outgrows the pin.
  const restWidth = useRef(0)
  const setEditing = (next: boolean): void => {
    setOwnEditing(next)
    edit?.onEditingChange?.(next)
  }
  const activate: ((el: HTMLElement) => void) | undefined = edit
    ? (el) => {
        if (editing) return
        restWidth.current = el.offsetWidth
        setEditing(true)
      }
    : onClick
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the button role is applied conditionally on the click handler, which a static parse cannot see
    <div
      className={cx(
        chrome === 'bordered' ? s.borderedField : s.field,
        edit && s.editable,
        className,
      )}
      style={{
        ...(editing ? { minWidth: restWidth.current } : undefined),
        ...(outline ? ({ '--field-ring': outline } as React.CSSProperties) : undefined),
      }}
      {...(activate ? { role: 'button', tabIndex: editing ? -1 : 0, 'aria-label': label } : {})}
      onClick={activate ? (e) => activate(e.currentTarget) : undefined}
      onKeyDown={activate ? (e) => onActivateKey(() => activate(e.currentTarget))(e) : undefined}
    >
      {leading && <span className={s.leading}>{leading}</span>}
      {edit ? (
        <RenamableLabel
          renames={edit.renames ?? 'title'}
          editing={editing}
          value={edit.value}
          className={s.draftInput}
          boxed
          onCommit={(next) => {
            setEditing(false)
            edit.onCommit(next)
          }}
          onCancel={() => setEditing(false)}
        >
          {children}
        </RenamableLabel>
      ) : capped ? (
        <span className={cx(s.contentRow, 'over-scroll-x', 'over-scroll-cap')}>{children}</span>
      ) : (
        children
      )}
      {trailing && <span className={s.trailing}>{trailing}</span>}
    </div>
  )
}
