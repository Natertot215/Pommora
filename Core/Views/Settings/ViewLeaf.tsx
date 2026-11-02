import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView } from '../views'
import { useSession } from '../../Session/store'
import { useSaveView } from '../viewWrite'
import { readLiveView } from '../Host/pendingView'
import { GroupFrame } from './GroupFrame'
import { SortFrame } from './SortFrame'
import { FilterFrame } from './FilterFrame'
import type { MenuBack } from '@pommora/uix/Menus/MenuRows'

export type ViewLeafId = 'group' | 'filter' | 'sort'

export function ViewLeaf({
  id,
  source,
  view,
  schema,
  back,
}: {
  id: ViewLeafId
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  back: MenuBack
}): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const saveView = useSaveView(source)
  switch (id) {
    case 'group':
      return <GroupFrame source={source} view={view} schema={schema} back={back} />
    case 'sort':
      return <SortFrame source={source} view={view} schema={schema} back={back} />
    case 'filter':
      return (
        <FilterFrame
          key={view.id}
          locations={source.sets ?? []}
          view={view}
          read={() => readLiveView(source.id, view)}
          schema={schema}
          tree={tree}
          back={back}
          onCommit={(patch) => void saveView(view, patch)}
        />
      )
  }
}
