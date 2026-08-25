import { blockHostKey } from '@shared/blocks'
import { lockLabel } from '@shared/toggleLabels'
import { useRef, useState } from 'react'
import { entityIcon } from '@renderer/DesignSystem/Symbols'
import {
  FooterLockButton,
  FooterMoreButton,
  MenuBottomRow,
  MenuScrollFrame,
} from '@renderer/DesignSystem/Components/Menu'
import { tintAt } from '@renderer/DesignSystem/Tokens/tint'
import { cellColor } from '@renderer/DesignSystem/Tokens/ramp'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { useSession } from '../../store'
import { findSpace } from '../Scope'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { ColorPicker } from '@renderer/DesignSystem/Components/Pickers/ColorPicker/ColorPicker'
import { InlineEditHeader } from '../../Components/Detail/InlineEditHeader'

export function SpaceSettingsContent({ id }: { id: string }): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const locked = useSession((s) => s.hostLocks[blockHostKey({ kind: 'space', id })] ?? false)
  const setHostLocked = useSession((s) => s.setHostLocked)
  const iconRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const node = findSpace(tree, id)
  const color = spaceColor(tree, id)
  if (!node) return null

  const iconHidden = node.headingIconHidden === true
  const resolved = labelColorFor(color)
  const solid = resolved === 'default' ? null : cellColor(resolved)

  const openHeaderMenu = async (e: React.MouseEvent): Promise<void> => {
    // Main pops its own editor menu for ANY editable target and a renderer preventDefault
    // can't suppress it, so the gesture stays yielded mid-rename — two menus over one field
    // would lose both picks. This row's own menu owns everywhere else.
    if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return
    e.preventDefault()
    e.stopPropagation()
    const action = await window.nexus.titleMenu({ toggleIcon: true, iconHidden, changeColor: true })
    if (action === 'rename') setRenaming(true)
    else if (action === 'editIcon') setPickerOpen(true)
    else if (action === 'toggleIcon')
      await mutate({
        op: 'setHeadingIconHidden',
        path: node.path,
        kind: 'space',
        hidden: !iconHidden,
      })
    else if (action === 'changeColor') setColorOpen(true)
  }

  return (
    <div style={{ minWidth: 225, minHeight: 245, display: 'flex', flexDirection: 'column' }}>
      <MenuScrollFrame
        footer={
          <MenuBottomRow
            leading={
              <FooterLockButton
                verb={lockLabel(locked)}
                noun="board"
                onToggle={() => void setHostLocked({ kind: 'space', id }, !locked)}
              />
            }
            trailing={<FooterMoreButton disabled />}
          />
        }
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div ref={headerRef} onContextMenu={(e) => void openHeaderMenu(e)}>
          <InlineEditHeader
            value={node.name}
            icon={entityIcon('space', node.icon, defaultIcons)}
            iconRef={iconRef}
            outline={solid ? tintAt(solid, 'secondary') : undefined}
            editing={renaming}
            onEditingChange={setRenaming}
            onIconClick={() => setPickerOpen(true)}
            onCommit={(next) => {
              if (next && next !== node.name)
                void mutate({ op: 'renameSpace', spaceId: id, newName: next })
            }}
          />
        </div>
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
      <ColorPicker
        open={colorOpen}
        selected={resolved}
        onPick={(picked) => {
          setColorOpen(false)
          void mutate({ op: 'setSpaceColor', spaceId: id, color: picked })
        }}
        onDismiss={() => setColorOpen(false)}
        triggerRef={headerRef}
      />
    </div>
  )
}

/** The Space's live chip color off the tree (the BannerOwner shape doesn't carry it). */
function spaceColor(
  tree: ReturnType<typeof useSession.getState>['tree'],
  id: string,
): string | undefined {
  for (const g of tree?.contexts ?? []) {
    const sp = g.spaces.find((s) => s.id === id)
    if (sp) return sp.color
  }
  return undefined
}
