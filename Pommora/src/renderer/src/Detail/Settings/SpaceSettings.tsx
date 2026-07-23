import { useRef, useState } from 'react'
import { defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'
import { MenuScrollFrame } from '@renderer/design-system/components/menu'
import { useSession } from '../../store'
import { findSpace } from '../Scope'
import { IconPicker } from '../../Components/IconPicker'
import { InlineEditHeader } from '../../Components/Detail/InlineEditHeader'
import { CurrentColorIcon } from '../../Components/Detail/CurrentColorIcon'

/**
 * The Space settings content for the toolbar SpacePanel — the (Icon)(Title) heading over a
 * divider with the color icon below it. (The Settings window composes its own chrome.)
 */
export function SpaceSettingsContent({ id }: { id: string }): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
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
      <MenuScrollFrame>
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
        <div style={{ padding: '4px 8px' }}>{colorIcon}</div>
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
