import { useRef, useState } from 'react'
import { entityIcon } from '../Assets/entityIconPolicy'
import {
  FooterIconButton,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
} from '@pommora/uix/Menus'
import { BoardLock } from './BoardLock'
import { Icon } from '@pommora/uix/Symbols'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { tintAt } from '@pommora/uix/Theme/colors'
import { cellColor } from '@pommora/uix/Theme/ramp'
import { labelColorFor } from '@pommora/uix/Theme/ramp'
import { IconChoice } from '../Assets/IconChoice'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { spaceNodeOf } from '../Nexus/treeIndex'
import { PropertyPanel } from '../Properties/PropertyPanel'
import { useSession } from '../Session/store'
import { popMenu } from '../Actions/menuActions'
import { useExperimental } from '../Settings/experimental'
import { type TitleMenuAction, titleMenuItems } from '@pommora/core/Actions/identityMenus'

export function SpaceMenu(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const id = selection.kind === 'space' ? selection.id : null
  const iconRef = useRef<HTMLButtonElement>(null)
  const colorRef = useRef<HTMLButtonElement>(null)
  const colorAnchor = useRef<Element | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const experimental = useExperimental()
  const node = id === null ? null : spaceNodeOf(tree, id)
  if (id === null || !node) return null

  const resolved = labelColorFor(node.color)
  const solid = resolved === 'default' ? null : cellColor(resolved)

  const openColor = (anchor: Element | null): void => {
    colorAnchor.current = anchor
    setColorOpen(true)
  }

  const openHeaderMenu = async (e: React.MouseEvent): Promise<void> => {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, [contenteditable]')) return
    e.preventDefault()
    e.stopPropagation()
    const field = target.closest('button, [role=button]') ?? e.currentTarget
    const action = await popMenu<TitleMenuAction | 'changeColor'>([
      ...titleMenuItems(),
      { label: 'Change Color', action: 'changeColor' },
    ])
    if (action === 'rename') setRenaming(true)
    else if (action === 'editIcon') setPickerOpen(true)
    else if (action === 'changeColor') openColor(field)
  }

  return (
    <>
      <MenuScrollFrame
        footer={
          <MenuFooting
            leading={<BoardLock host={{ kind: 'space', id }} />}
            trailing={
              <FooterIconButton
                ref={colorRef}
                icon="palette"
                ariaLabel="Change Color"
                pressed={colorOpen}
                quiet
                onClick={() => openColor(colorRef.current)}
              />
            }
          />
        }
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
        <div onContextMenu={(e) => void openHeaderMenu(e)}>
          <InlineEditHeader
            value={node.title}
            icon={entityIcon('space', node.icon, defaultIcons)}
            iconRef={iconRef}
            outline={solid ? tintAt(solid, 'secondary') : undefined}
            editing={renaming}
            onEditingChange={setRenaming}
            iconOpen={pickerOpen}
            onIconClick={() => setPickerOpen(true)}
            onCommit={(next) => {
              if (next && next !== node.title)
                void mutate({ op: 'renameSpace', spaceId: id, newName: next })
            }}
          />
        </div>
        <MenuSeparator flush />
        <PropertyPanel subject={{ kind: 'space', id }} host="dropdown" />
        {experimental && (
          <MenuItem
            leading={<Icon name="link-2" size={ICON.rootEntry} />}
            trailing={<Icon name="chevron-right" />}
          >
            Connections
          </MenuItem>
        )}
      </MenuScrollFrame>
      <IconChoice
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
        triggerRef={colorAnchor}
      />
    </>
  )
}
