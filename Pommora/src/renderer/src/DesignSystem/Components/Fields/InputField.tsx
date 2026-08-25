import type { ReactNode } from 'react'
import * as s from './fields.css'
import { cx } from '../../Util/cx'
import { onActivateKey } from '../../Interactions/activate'
import { useDraftEdit } from './useDraftEdit'

export interface FieldEdit {
  value: string
  onCommit: (next: string) => void
}

/** The inert stand-in for a field that isn't press-to-edit — `useDraftEdit` is a hook, so it runs
 *  either way and this is what it runs on. */
const NO_EDIT: FieldEdit = { value: '', onCommit: () => {} }

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
  /** Press-to-edit: the children at rest, a draft caret over the raw value under a click. */
  edit?: FieldEdit
  /** Before the content — one lead glyph. */
  leading?: ReactNode
  /** After the content, outside the draft — an action the field carries. */
  trailing?: ReactNode
  label?: string
}): React.JSX.Element {
  const draftEdit = useDraftEdit(edit ?? NO_EDIT)
  const editing = edit !== undefined && draftEdit.draft !== null
  const activate: ((el: HTMLElement) => void) | undefined = edit
    ? (el) => {
        if (draftEdit.draft === null) draftEdit.openEdit(el)
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
        ...(edit ? draftEdit.restProps.style : undefined),
        ...(outline ? ({ '--field-ring': outline } as React.CSSProperties) : undefined),
      }}
      {...(activate ? { role: 'button', tabIndex: editing ? -1 : 0, 'aria-label': label } : {})}
      onClick={activate ? (e) => activate(e.currentTarget) : undefined}
      onKeyDown={activate ? (e) => onActivateKey(() => activate(e.currentTarget))(e) : undefined}
    >
      {leading && <span className={s.leading}>{leading}</span>}
      {editing ? (
        <input className={s.draftInput} aria-label={label} {...draftEdit.inputProps} />
      ) : capped ? (
        <span className={cx(s.contentRow, 'over-scroll-x', 'over-scroll-cap')}>{children}</span>
      ) : (
        children
      )}
      {trailing && <span className={s.trailing}>{trailing}</span>}
    </div>
  )
}
