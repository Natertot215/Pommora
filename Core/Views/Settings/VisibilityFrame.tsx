import type { NexusTree } from '../../Nexus/tree'
import { FILEDATA, type ResolvedColumn } from '../../Properties/properties'
import { useSession } from '../../Session/store'
import { type MenuRow, MenuRowView } from '@pommora/uix/Menus/MenuIndex'
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
import type { PaneProps, VisibilityPaneProps } from './ViewPane'
import { hideEye } from './OptionOrderList'

export function visibilityPane({ view, schema, save }: PaneProps, tree: NexusTree | null) {
  const contextIds = contextIdsOf(tree)
  const contexts = contextsByIdOf(tree)
  const columnOf = (id: string): ResolvedColumn => resolveColumn(id, schema, contextIds)!
  const shown = resolveColumns(view, schema, contextIds)
  // The hidden list's own membership, not hidden_properties: a prop absent from property_order is hidden by absence and reads as such.
  const hidden = hiddenListIds(view, schema, contextIds).map(columnOf)
  const hiddenIds = new Set(hidden.map((c) => c.id))
  const hide = {
    isHidden: (id: string) => hiddenIds.has(id),
    onToggleHidden: (id: string) =>
      save(hiddenIds.has(id) ? unhide(view, id) : hideShown(view, id)),
  }
  const label = (id: string): string => columnLabel(columnOf(id), contexts)
  const icon = (id: string): string => columnIcon(columnOf(id), contexts)
  const row = (c: ResolvedColumn): MenuRow => ({
    kind: 'item',
    icon: <Icon name={icon(c.id)} size={s.ICON.doc} />,
    label: label(c.id),
    trailing:
      c.kind === 'title'
        ? {
            // PLACEHOLDER
            kind: 'button',
            icon: 'eye',
            ariaLabel: 'Always Shown',
            disabled: true,
            onClick: () => {},
          }
        : { kind: 'field', children: hideEye(label(c.id), c.id, hide) },
    className: hiddenIds.has(c.id) ? s.hiddenRow : undefined,
  })
  return { shown, hidden, label, icon, row }
}

export function VisibilityFrame({
  footer,
  current = 'Visibility',
  ...pane
}: VisibilityPaneProps): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const { view, schema, back, save } = pane
  const { shown, hidden, label, icon, row } = visibilityPane(pane, tree)
  const shownIds = shown.map((c) => c.id)
  const line = (c: ResolvedColumn): React.JSX.Element => (
    <LineRow key={c.id} id={c.id}>
      <MenuRowView row={row(c)} />
    </LineRow>
  )

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
          label,
          glyph: (id) => <Icon name={icon(id)} />,
          onDrop: handleDrop,
          watch: [view, schema, tree],
        })}
      >
        <LineGroup id="members">{shown.map(line)}</LineGroup>
        <PaneRestGroup className={s.hiddenZone}>{hidden.map(line)}</PaneRestGroup>
      </LineZone>
    </MenuScrollFrame>
  )
}
