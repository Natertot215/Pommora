import { blockHostKey } from '@shared/blocks'
import { useRef, useState } from 'react'
import { SOLID_COLORS, type SolidColor } from '@shared/types'
import { Icon, entityIcon } from '@renderer/design-system/symbols'
import { MenuBottomRow, MenuItem, MenuScrollFrame } from '@renderer/design-system/components/menu'
import { PointMenu } from '@renderer/design-system/components/PickerMenu'
import { vars as colorVars } from '@renderer/design-system/tokens/color.css'
import { TINT_STEPS, tintAt } from '@renderer/design-system/tokens/tint'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { footerLockAction, lockIcon } from '@renderer/design-system/components/menu/menu.css'
import { useSession } from '../../store'
import { findSpace } from '../Scope'
import { IconPicker } from '../../Components/IconPicker'
import { ColorPicker } from '../../Components/Detail/ColorPicker'
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
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number } | null>(null)
  const node = findSpace(tree, id)
  const color = spaceColor(tree, id)
  if (!node) return null

  const resolved = chipColorFor(color)
  const solid = (SOLID_COLORS as readonly string[]).includes(resolved)
    ? colorVars.color.solid[resolved as SolidColor]
    : null

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
                onClick={() => void setHostLocked({ kind: 'space', id }, !locked)}
              >
                <Icon name="lock" size={12} className={lockIcon} />
                {locked ? 'Unlock' : 'Lock'}
              </button>
            }
            trailing={
              // Stub — its menu is a later arrival.
              <button type="button" aria-label="More actions" className={footerLockAction} disabled>
                <Icon name="ellipsis" size={13} />
              </button>
            }
          />
        }
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div
          ref={headerRef}
          onContextMenu={(e) => {
            // Main pops its own editor menu for ANY editable target and a renderer preventDefault
            // can't suppress it, so the gesture stays yielded mid-rename — two menus over one field
            // would lose both picks. This row's own menu owns everywhere else.
            if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return
            e.preventDefault()
            e.stopPropagation()
            setHeaderMenu({ x: e.clientX, y: e.clientY })
          }}
        >
          <InlineEditHeader
            value={node.name}
            icon={entityIcon('space', node.icon, defaultIcons)}
            iconRef={iconRef}
            outline={solid ? tintAt(solid, TINT_STEPS.secondary) : undefined}
            onIconClick={() => setPickerOpen(true)}
            onCommit={(next) => {
              if (next && next !== node.name)
                void mutate({ op: 'renameSpace', spaceId: id, newName: next })
            }}
          />
        </div>
      </MenuScrollFrame>
      {headerMenu && (
        <PointMenu at={headerMenu} onDismiss={() => setHeaderMenu(null)}>
          <MenuItem
            leading={<Icon name="palette" size={13} />}
            onClick={() => {
              setHeaderMenu(null)
              setColorOpen(true)
            }}
          >
            Change Color
          </MenuItem>
        </PointMenu>
      )}
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
