import type { NexusTree } from '../Nexus/tree'
import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
import { ViewHost } from './Host/ViewHost'
import { containerOwner, findCollection, findSet } from '../Nexus/treeIndex'

export function ContainerView({
  tree,
  kind,
  id,
}: {
  tree: NexusTree | null
  kind: 'collection' | 'set'
  id: string
}): React.JSX.Element {
  const source = kind === 'collection' ? findCollection(tree, id) : findSet(tree, id)
  if (!source)
    return (
      <div className="detail interface-inset">
        <div className="detail-placeholder">
          {kind === 'collection' ? 'Collection not found' : 'Set not found'}
        </div>
      </div>
    )
  return (
    <InterfaceScaffold owner={containerOwner(source)}>
      <ViewHost key={source.id} source={source} />
    </InterfaceScaffold>
  )
}
