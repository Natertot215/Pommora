import { useRef, useState } from 'react'
import { entityIcon } from '../Assets/entityIconPolicy'
import {
  FooterIconButton,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
} from '@pommora/uix/Menus/MenuRows'
import { BoardLock } from '../Tiles/BoardLock'
import { Icon } from '@pommora/uix/Symbols'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { tintAt } from '@pommora/uix/Theme/colors'
import { cellColor, colorNameFor } from '@pommora/uix/Theme/ramp'
import { chooseColor, useChoiceOpen, useIconChoice } from '../Assets/IdentityChoice'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { spaceNodeOf } from '../Nexus/treeIndex'
import { PropertyPanel } from '../Properties/PropertyPanel'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import { EDITABLE_TARGETS } from '@pommora/uix/Interactions/shared'
import { popMenu } from '../Actions/menuActions'
import { useExperimental } from '../Settings/experimental'
import { type TitleMenuAction, titleMenuItems } from '../Actions/identityMenus'

export function SpaceMenu(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const defaultIcons = useSession((st) => personalizationOf(st).defaultIcons)
  const id = selection.kind === 'space' ? selection.id : null
  const colorRef = useRef<HTMLButtonElement>(null)
  const [renaming, setRenaming] = useState(false)
  const experimental = useExperimental()
  const node = id === null ? null : spaceNodeOf(tree, id)
  const colorOpen = useChoiceOpen(colorRef)
  const iconChoice = useIconChoice(node?.icon, (icon) => {
    if (node) void mutate({ op: 'setIcon', path: node.path, kind: 'space', icon })
  })
  if (id === null || !node) return null

  const resolved = colorNameFor(node.color)
  const solid = resolved === 'default' ? null : cellColor(resolved)

  const openColor = (anchor: Element | null): void =>
    chooseColor(
      anchor,
      node.color,
      (color) => void mutate({ op: 'setSpaceColor', spaceId: id, color }),
    )

  const openHeaderMenu = async (e: React.MouseEvent): Promise<void> => {
    const target = e.target as HTMLElement
    if (target.closest(EDITABLE_TARGETS)) return
    e.preventDefault()
    e.stopPropagation()
    const field = target.closest('button, [role=button]') ?? e.currentTarget
    const action = await popMenu<TitleMenuAction | 'changeColor'>([
      ...titleMenuItems(),
      { label: 'Change Color', action: 'changeColor' },
    ])
    if (action === 'rename') setRenaming(true)
    else if (action === 'editIcon') iconChoice.onIconClick()
    else if (action === 'changeColor') openColor(field)
  }

  return (
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
          {...iconChoice}
          outline={solid ? tintAt(solid, 'secondary') : undefined}
          editing={renaming}
          onEditingChange={setRenaming}
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
  )
}
