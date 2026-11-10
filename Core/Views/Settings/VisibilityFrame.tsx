import { FILEDATA } from '../../Properties/properties'
import { useSession } from '../../Session/store'
import { MenuRowView } from '@pommora/uix/Menus/MenuIndex'
import { MenuTopRow, MenuScrollFrame } from '@pommora/uix/Menus/MenuRows'
import {
  hiddenListIds,
  hideShown,
  placeInShown,
  resolveColumn,
  resolveColumns,
  unhide,
} from '../Pipeline/columns'
import { LineGroup, LineRow, LineZone } from '@pommora/uix/Interactions/drag'
import { PaneRestGroup, type PaneDrop, paneSpec } from '@pommora/uix/Menus/paneDrop'
import { contextIdsOf, contextsByIdOf } from '../../Contexts/contextIdentity'
import { columnIcon, columnLabel } from '../../Properties/columnDisplay'
import { Icon } from '@pommora/uix/Symbols'
import * as s from '@pommora/uix/Menus/frames.css'
import type { PropertyPaneProps } from './ViewPane'
import { type HideControls, hideEye } from './OptionOrderList'

function VisibilityGroups({
  shownIds,
  hiddenIds,
  hide,
  nameFor,
  iconFor,
}: {
  shownIds: string[]
  hiddenIds: string[]
  hide: HideControls
  nameFor: (id: string) => string
  iconFor: (id: string) => string
}): React.JSX.Element {
  const row = (id: string): React.JSX.Element => {
    const hidden = hide.isHidden(id)
    return (
      <LineRow key={id} id={id}>
        <MenuRowView
          row={{
            kind: 'item',
            icon: <Icon name={iconFor(id)} size={s.ICON.doc} />,
            label: nameFor(id),
            trailing:
              id === FILEDATA.title.id
                ? {
                    // PLACEHOLDER
                    kind: 'button',
                    icon: 'eye',
                    ariaLabel: 'Always Shown',
                    disabled: true,
                    onClick: () => {},
                  }
                : { kind: 'field', children: hideEye(nameFor(id), id, hide) },
            className: hidden ? s.hiddenRow : undefined,
          }}
        />
      </LineRow>
    )
  }
  return (
    <>
      <LineGroup id="members">{shownIds.map(row)}</LineGroup>
      <PaneRestGroup className={s.hiddenZone}>{hiddenIds.map(row)}</PaneRestGroup>
    </>
  )
}

export function VisibilityFrame({
  schema,
  view,
  back,
  save,
  footer,
  current = 'Visibility',
}: PropertyPaneProps): React.JSX.Element | null {
  const tree = useSession((st) => st.tree)
  if (!tree) return null

  const contextIds = contextIdsOf(tree)
  const shownIds = resolveColumns(view, schema, contextIds).map((c) => c.id)
  const hiddenIds = hiddenListIds(view, schema, contextIds)
  // The hidden list's own membership, not hidden_properties: a prop absent from property_order is hidden by absence and reads as such.
  const hiddenSet = new Set(hiddenIds)
  const columnOf = (id: string) => resolveColumn(id, schema, contextIds)!
  const nameFor = (id: string): string => columnLabel(columnOf(id), contextsByIdOf(tree))
  const iconFor = (id: string): string => columnIcon(columnOf(id), contextsByIdOf(tree))

  // The hidden list holds no order (`ordersRest: false`), so no drop reorders it.
  const handleDrop = (drop: PaneDrop): void => {
    switch (drop.kind) {
      case 'leave':
        return void save(hideShown(view, drop.id))
      case 'reorder-members':
      case 'join':
        return void save(placeInShown(view, shownIds, drop.id, drop.toIndex))
    }
  }

  return (
    <MenuScrollFrame
      header={<MenuTopRow {...back} current={current} />}
      footer={footer}
      maxHeight={s.SETTINGS_PANE_MAX_HEIGHT}
    >
      <LineZone
        className={s.frameZone}
        {...paneSpec({
          members: shownIds,
          ordersRest: false,
          pinned: FILEDATA.title.id,
          titles: { members: 'Shown Properties', rest: 'Hidden Properties' },
          label: nameFor,
          glyph: (id) => <Icon name={iconFor(id)} />,
          onDrop: handleDrop,
          watch: [view, schema, tree],
        })}
      >
        <VisibilityGroups
          shownIds={shownIds}
          hiddenIds={hiddenIds}
          hide={{
            isHidden: (id) => hiddenSet.has(id),
            onToggleHidden: (id) =>
              save(hiddenSet.has(id) ? unhide(view, id) : hideShown(view, id)),
          }}
          nameFor={nameFor}
          iconFor={iconFor}
        />
      </LineZone>
    </MenuScrollFrame>
  )
}
