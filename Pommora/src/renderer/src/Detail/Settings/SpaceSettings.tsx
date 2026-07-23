import { useRef, useState } from 'react'
import { Icon, defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'
import { MenuBottomRow, MenuScrollFrame } from '@renderer/design-system/components/menu'
import { footerLockAction, lockIcon } from '../../Blocks/handleMenu.css'
import { useSession } from '../../store'
import { findSpace } from '../Scope'
import { IconPicker } from '../../Components/IconPicker'
import { InlineEditHeader } from '../../Components/Detail/InlineEditHeader'
import { CurrentColorIcon } from '../../Components/Detail/CurrentColorIcon'

/**
 * The Space settings content — the (Icon)(Title) heading over a divider, shared by the
 * Settings window and the toolbar SpacePanel. The window puts the color icon in the
 * BottomRow's right and the lock in its left (the Homepage footer treatment); the panel
 * puts the color at its own bottom-left.
 */
export function SpaceSettingsContent({
  id,
  colorInFooter,
}: {
  id: string
  colorInFooter: boolean
}): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const locked = useSession((s) => s.spaceLocks[id] ?? false)
  const setSpaceLocked = useSession((s) => s.setSpaceLocked)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const node = findSpace(tree, id)
  if (!node) return null

  const colorIcon = (
    <CurrentColorIcon
      color={findSpaceColor(tree, id)}
      onPick={(color) => void mutate({ op: 'setSpaceColor', spaceId: id, color })}
    />
  )
  return (
    <>
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
            trailing={colorInFooter ? colorIcon : undefined}
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
        {!colorInFooter && <div style={{ padding: '4px 8px' }}>{colorIcon}</div>}
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
    </>
  )
}

/** The Space's live chip color off the tree (BannerOwner doesn't carry it). */
function findSpaceColor(
  tree: ReturnType<typeof useSession.getState>['tree'],
  id: string,
): string | undefined {
  for (const g of tree?.contextGroups ?? []) {
    const sp = g.spaces.find((s) => s.id === id)
    if (sp) return sp.color
  }
  return undefined
}

/** The Settings-window body: color at BottomRow-right. */
export function SpaceSettings({ id }: { id: string }): React.JSX.Element | null {
  return <SpaceSettingsContent id={id} colorInFooter />
}
