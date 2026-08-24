import { type Ref, useState } from 'react'
import type { TitleMenuAction } from '@shared/identityMenus'
import { Icon } from '@renderer/design-system/symbols'
import { RenamableLabel } from '@renderer/design-system/fields'
import './DetailTitleHeader.css'

interface Props {
  title: string
  icon?: string
  iconRef?: Ref<SVGSVGElement>
  // biome-ignore lint/suspicious/noConfusingVoidType: the union is deliberate: a caller may hand back nothing or a promise, and `undefined` in place of `void` breaks assignability for the sync handlers.
  onRename: (newName: string) => void | Promise<boolean | void>
  requestMenu: () => Promise<TitleMenuAction | null>
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
          className={
            iconHidden
              ? 'detail-title-icon title-icon-reveal is-hidden'
              : 'detail-title-icon title-icon-reveal'
          }
          onContextMenu={editing ? undefined : openMenu}
        />
      )}
      {/* A refused rename needs no revert here — the field unmounts on commit and the resting
          span keeps showing the live title until the tree confirms a change. */}
      <RenamableLabel
        renames="title"
        editing={editing}
        value={title}
        className="detail-title-input"
        onCommit={(next) => {
          setEditing(false)
          void onRename(next)
        }}
        onCancel={() => setEditing(false)}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <span className="detail-title-text" onContextMenu={openMenu}>
          {title}
        </span>
      </RenamableLabel>
    </div>
  )
}
