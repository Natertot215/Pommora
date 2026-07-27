import { useRef, useState } from 'react'
import { CHIP_SOLID_COLORS, type ChipSolidColor } from '@shared/types'
import { Icon, defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'
import { MenuBottomRow, MenuScrollFrame } from '@renderer/design-system/components/menu'
import { vars as colorVars } from '@renderer/design-system/tokens/color.css'
import { TINT_STEPS, tintAt } from '@renderer/design-system/tokens/tint'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { footerLockAction, lockIcon } from '../../Blocks/handleMenu.css'
import { useSession } from '../../store'
import { findSpace } from '../Scope'
import { IconPicker } from '../../Components/IconPicker'
import { ColorPicker } from '../../Components/Detail/ColorPicker'
import { InlineEditHeader } from '../../Components/Detail/InlineEditHeader'

/**
 * The Space settings pane for the toolbar dropdown — the (Icon)(Title) heading over the
 * BottomRow footer: the board lock leading, the actions ellipsis trailing (its menu is a
 * later arrival). Right-clicking the heading offers Change Color; the title field's fill
 * IS the selected color (the input var re-tints for this subtree).
 */
export function SpaceSettingsContent({ id }: { id: string }): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  const mutate = useSession((s) => s.mutate)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const locked = useSession((s) => s.spaceLocks[id] ?? false)
  const setSpaceLocked = useSession((s) => s.setSpaceLocked)
  const iconRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const node = findSpace(tree, id)
  const color = spaceColor(tree, id)
  if (!node) return null

  const resolved = chipColorFor(color)
  const solid = (CHIP_SOLID_COLORS as readonly string[]).includes(resolved)
    ? colorVars.color.solid[resolved as ChipSolidColor]
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
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div
          ref={headerRef}
          onContextMenu={(e) => {
            // Main pops the editor menu for ANY editable target, and a renderer preventDefault does
            // not suppress it — so right-clicking the title mid-rename would put two native menus on
            // one window and lose both picks. Yield the gesture there; ours owns the rest of the row.
            if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return
            e.preventDefault()
            e.stopPropagation()
            void window.nexus.spaceHeaderMenu().then((action) => {
              if (action === 'change-color') setColorOpen(true)
            })
          }}
        >
          <InlineEditHeader
            value={node.name}
            icon={iconNameOr(node.icon, defaultEntityIcon('space', defaultIcons))}
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
