import { type Ref, useEffect, useRef, useState } from 'react'
import { Icon } from '@renderer/design-system/symbols'
import './DetailTitleHeader.css'

interface Props {
  title: string
  icon?: string
  iconRef?: Ref<SVGSVGElement>
  // biome-ignore lint/suspicious/noConfusingVoidType: the union is deliberate: a caller may hand back nothing or a promise, and `undefined` in place of `void` breaks assignability for the sync handlers.
  onRename: (newName: string) => void | Promise<boolean | void>
  requestMenu: () => Promise<'rename' | 'editIcon' | 'toggleIcon' | null>
  onEditIcon: () => void
  onToggleIcon?: () => void
  iconHidden?: boolean
}

export function DetailTitleHeader({
  title,
  icon,
  iconRef,
  onRename,
  requestMenu,
  onEditIcon,
  onToggleIcon,
  iconHidden,
}: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const reverting = useRef(false) // Escape sets this so the blur it triggers doesn't commit
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setValue(title), [title])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = async (): Promise<void> => {
    setEditing(false)
    const next = value.trim()
    if (!next || next === title) {
      setValue(title)
      return
    }
    const res = await onRename(next)
    if (res === false) setValue(title)
  }

  const openMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation() // don't also trip the banner's Change/Remove menu underneath
    const action = await requestMenu()
    if (action === 'rename') setEditing(true)
    else if (action === 'editIcon') onEditIcon()
    else if (action === 'toggleIcon') onToggleIcon?.()
  }

  return (
    <div className="detail-title">
      {icon && (
        <Icon
          ref={iconRef}
          name={icon}
          className={iconHidden ? 'detail-title-icon is-hidden' : 'detail-title-icon'}
          onContextMenu={editing ? undefined : openMenu}
        />
      )}
      {editing ? (
        <input
          ref={inputRef}
          className="detail-title-input"
          value={value}
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void commit()
            } else if (e.key === 'Escape') {
              reverting.current = true
              setValue(title)
              setEditing(false)
            }
          }}
          onBlur={() => {
            if (reverting.current) {
              reverting.current = false
              return
            }
            void commit()
          }}
        />
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
        <span className="detail-title-text" onContextMenu={openMenu}>
          {title}
        </span>
      )}
    </div>
  )
}
