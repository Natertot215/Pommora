import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { useSession } from '../../Session/store'
import { useSaveView } from '../ViewTileScope'
import { GroupFrame } from './GroupFrame'
import { SortFrame } from './SortFrame'
import { FilterFrame } from './FilterFrame'

export type ViewLeafId = 'group' | 'filter' | 'sort'

export function ViewLeaf({
  id,
  source,
  view,
  schema,
  label,
  onBack,
}: {
  id: ViewLeafId
  source: CollectionNode | SetNode
  view: SavedView
  schema: PropertyDefinition[]
  label: string
  onBack: () => void
}): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const saveView = useSaveView(source)
  switch (id) {
    case 'group':
      return (
        <GroupFrame source={source} view={view} schema={schema} label={label} onBack={onBack} />
      )
    case 'sort':
      return <SortFrame source={source} view={view} schema={schema} label={label} onBack={onBack} />
    case 'filter':
      return (
        <FilterFrame
          key={view.id}
          locations={source.sets ?? []}
          view={view}
          schema={schema}
          tree={tree}
          label={label}
          onBack={onBack}
          onCommit={(next) => void saveView({ ...view, ...next })}
        />
      )
  }
}
