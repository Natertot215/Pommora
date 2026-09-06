import { tileHostKey } from '@pommora/core/Tiles/tiles'
import { lockLabel } from '@pommora/core/Actions/toggleLabels'
import { useRef, useState } from 'react'
import { entityIcon } from '../Assets/entityIconPolicy'
import {
  FooterLockButton,
  FooterIconButton,
  MenuFooting,
  MenuDropdown,
  MenuScrollFrame,
} from '@pommora/uix/Menus'
import { tintAt } from '@pommora/uix/Theme/tint'
import { cellColor } from '@pommora/uix/Theme/ramp'
import { labelColorFor } from '@pommora/uix/Theme/colorMap'
import { IconPicker } from '../Assets/IconPicker'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker/ColorPicker'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { findSpace } from '../Session/treeIndex'
import { useSession } from '../Session/store'
import * as s from '../Interface/Toolbar/toolbar-menu.css'
import { host } from '../Platform/dialer'

const PANE_MIN_W = 225
const PANE_MIN_H = 245

export function SpaceMenu(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const id = selection.kind === 'space' ? selection.id : null
  const locked = useSession(
    (st) => st.hostLocks[tileHostKey({ kind: 'space', id: id ?? '' })] ?? false,
  )
  const setHostLock = useSession((st) => st.setHostLock)
  const iconRef = useRef<HTMLButtonElement>(null)
  const colorRef = useRef<HTMLButtonElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const node = id === null ? null : findSpace(tree, id)
  if (id === null || !node) return null

  const iconHidden = node.headingIconHidden === true
  const resolved = labelColorFor(spaceColor(tree, id))
  const solid = resolved === 'default' ? null : cellColor(resolved)

  const openHeaderMenu = async (e: React.MouseEvent): Promise<void> => {
    // Main pops its own editor menu for ANY editable target and a renderer preventDefault
    // can't suppress it, so the gesture stays yielded mid-rename — two menus over one field
    // would lose both picks. This row's own menu owns everywhere else.
    if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return
    e.preventDefault()
    e.stopPropagation()
    const action = await host().ask('nexus:titleMenu', { toggleIcon: true, iconHidden })
    if (action === 'rename') setRenaming(true)
    else if (action === 'editIcon') setPickerOpen(true)
    else if (action === 'toggleIcon')
      await mutate({
        op: 'setHeadingIconHidden',
        path: node.path,
        kind: 'space',
        hidden: !iconHidden,
      })
  }

  return (
    <MenuDropdown
      icon={entityIcon('space', node.icon, defaultIcons)}
      title="Space"
      classNames={s.chrome}
    >
      {() => (
        <div
          style={{
            minWidth: PANE_MIN_W,
            minHeight: PANE_MIN_H,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <MenuScrollFrame
            footer={
              <MenuFooting
                leading={
                  <FooterLockButton
                    verb={lockLabel(locked)}
                    noun="board"
                    locked={locked}
                    onToggle={() => setHostLock({ kind: 'space', id }, !locked)}
                  />
                }
                trailing={
                  <FooterIconButton
                    ref={colorRef}
                    icon="palette"
                    ariaLabel="Change Color"
                    pressed={colorOpen}
                    onClick={() => setColorOpen(true)}
                  />
                }
              />
            }
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
            <div onContextMenu={(e) => void openHeaderMenu(e)}>
              <InlineEditHeader
                value={node.name}
                icon={entityIcon('space', node.icon, defaultIcons)}
                iconRef={iconRef}
                outline={solid ? tintAt(solid, 'secondary') : undefined}
                editing={renaming}
                onEditingChange={setRenaming}
                iconOpen={pickerOpen}
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
            triggerRef={colorRef}
          />
        </div>
      )}
    </MenuDropdown>
  )
}

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
