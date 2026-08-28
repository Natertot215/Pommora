import { blockHostKey } from '@shared/blocks'
import { lockLabel } from '@shared/toggleLabels'
import { useRef, useState } from 'react'
import { entityIcon } from '@renderer/DesignSystem/Symbols'
import {
  FooterLockButton,
  FooterMoreButton,
  MenuFooting,
  MenuDropdown,
  MenuScrollFrame,
} from '@renderer/DesignSystem/Menus'
import { tintAt } from '@renderer/DesignSystem/Tokens/tint'
import { cellColor } from '@renderer/DesignSystem/Tokens/ramp'
import { labelColorFor } from '@renderer/DesignSystem/Tokens/colorMap'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { ColorPicker } from '@renderer/DesignSystem/Components/Pickers/ColorPicker/ColorPicker'
import { InlineEditHeader } from '../Frames/InlineEditHeader'
import { findSpace } from '../Detail/Scope'
import { useSession } from '../store'
import * as s from './toolbarMenu.css'

const PANE_MIN_W = 225
const PANE_MIN_H = 245

export function SpaceMenu(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const id = selection.kind === 'space' ? selection.id : null
  const locked = useSession(
    (st) => st.hostLocks[blockHostKey({ kind: 'space', id: id ?? '' })] ?? false,
  )
  const setHostLocked = useSession((st) => st.setHostLocked)
  const iconRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
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
