import { useRef, useState } from 'react'
import { Icon, defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'
import { MenuBottomRow, MenuScrollFrame } from '@renderer/design-system/components/menu'
import { footerLockAction, lockIcon } from '../../Blocks/handleMenu.css'
import { useSession } from '../../store'
import { findSpace } from '../Scope'
import { IconPicker } from '../../Components/IconPicker'
import { InlineEditHeader } from '../../Components/Detail/InlineEditHeader'

/**
 * The Space settings pane for the toolbar dropdown — the (Icon)(Title) heading over the
 * BottomRow footer: the board lock leading, the actions ellipsis trailing (its menu is a
 * later arrival).
 */
export function SpaceSettingsContent({ id }: { id: string }): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const locked = useSession((s) => s.spaceLocks[id] ?? false)
  const setSpaceLocked = useSession((s) => s.setSpaceLocked)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const node = findSpace(tree, id)
  if (!node) return null

  return (
    <div style={{ minWidth: 225, minHeight: 245, display: 'flex', flexDirection: 'column' }}>
      <MenuScrollFrame
        footer={
          <MenuBottomRow
            leading={
              <button
                type="button"
                aria-label={locked ? 'Unlock board' : 'Lock board'}
                className={footerLockAction}
                onClick={() => void setSpaceLocked(id, !locked)}
              >
                <Icon name="lock" size={12} className={lockIcon} />
                {locked ? 'Unlock' : 'Lock'}
              </button>
            }
            trailing={
              <button type="button" aria-label="More actions" className={footerLockAction} disabled>
                <Icon name="ellipsis" size={13} />
              </button>
            }
          />
        }
      >
        <InlineEditHeader
          value={node.name}
          icon={iconNameOr(node.icon, defaultEntityIcon('space', defaultIcons))}
          iconRef={iconRef}
          onIconClick={() => setPickerOpen(true)}
          onCommit={(next) => {
            if (next && next !== node.name)
              void mutate({ op: 'renameSpace', spaceId: id, newName: next })
          }}
        />
      </MenuScrollFrame>
      <IconPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={iconRef}
        value={node.icon}
        onSelect={(picked) => {
          setPickerOpen(false)
          void mutate({ op: 'setIcon', path: node.path, kind: 'space', icon: picked })
        }}
      />
    </div>
  )
}
