import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView, ViewWriter } from '../views'
import { useSession } from '../../Session/store'
import { readLiveView } from '../Host/liveView'
import { Icon, type IconName } from '@pommora/uix/Symbols'
import type { MenuRow } from '@pommora/uix/Menus/MenuIndex'
import type { MenuBack } from '@pommora/uix/Menus/MenuRows'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { VisibilityFrame } from './VisibilityFrame'
import { LayoutFrame } from './LayoutFrame'
import { GroupFrame } from './GroupFrame'
import { SortFrame } from './SortFrame'
import { FilterFrame } from './FilterFrame'
import { groupPlan, orderSetTree, viewSetOrder } from '../Pipeline/group'
import { presentedKind } from '../Host/viewKinds'

export type ViewPaneId = 'visibility' | 'layout' | 'group' | 'filter' | 'sort'

export interface SettingsPane<Id extends string = ViewPaneId> {
  id: Id
  label: string
  icon: IconName
}

// The singular here is intentional.
export const VIEW_PANES: SettingsPane[] = [
  { id: 'visibility', label: 'Visibility', icon: 'eye' },
  { id: 'layout', label: 'Layout', icon: 'layout-dashboard' },
  { id: 'group', label: 'Group', icon: 'layers' },
  { id: 'filter', label: 'Filter', icon: 'list-filter' },
  { id: 'sort', label: 'Sort', icon: 'arrow-up-down' },
]

export const chevronRows = <Id extends string>(
  panes: SettingsPane<Id>[],
  open: (id: Id) => void,
  frozen?: (id: Id) => boolean,
): MenuRow[] =>
  panes.map((p) => ({
    kind: 'item',
    icon: <Icon name={p.icon} size={ICON.rootEntry} />,
    label: p.label,
    trailing: { kind: 'chevron' },
    disabled: frozen?.(p.id),
    onSelect: () => open(p.id),
  }))

export interface PaneProps {
  view: SavedView
  schema: PropertyDefinition[]
  back: MenuBack
  save: ViewWriter
}

export function ViewPane({
  id,
  source,
  view,
  schema,
  back,
  save,
}: PaneProps & { id: ViewPaneId; source: CollectionNode | SetNode }): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const pane: PaneProps = { view, schema, back, save }
  switch (id) {
    case 'visibility':
      return <VisibilityFrame {...pane} />
    case 'layout':
      return <LayoutFrame {...pane} />
    case 'group':
      return <GroupFrame {...pane} source={source} />
    case 'sort':
      return <SortFrame {...pane} />
    case 'filter': {
      const order = viewSetOrder(groupPlan(view, schema, presentedKind(view.type).nests), view)
      return (
        <FilterFrame
          key={view.id}
          locations={orderSetTree(source.sets ?? [], order)}
          view={view}
          read={() => readLiveView(source.id, view)}
          schema={schema}
          tree={tree}
          back={back}
          onCommit={pane.save}
        />
      )
    }
  }
}
