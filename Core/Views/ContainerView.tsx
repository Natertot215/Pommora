import type { NexusTree } from '../Nexus/tree'
import { DetailPlaceholder, InterfaceScaffold } from '../Interface/InterfaceScaffold'
import { ViewHost } from './Host/ViewHost'
import { containerOwner } from '../Nexus/treeIndex'
import { findContainerById } from '../Nexus/treePatch'

export function ContainerView({
  tree,
  kind,
  id,
}: {
  tree: NexusTree | null
  kind: 'collection' | 'set'
  id: string
}): React.JSX.Element {
  const source = tree ? findContainerById(tree, id) : null
  if (!source)
    return (
      <DetailPlaceholder>
        {kind === 'collection' ? 'Collection not found' : 'Set not found'}
      </DetailPlaceholder>
    )
  return (
    <InterfaceScaffold owner={containerOwner(source)}>
      <ViewHost key={source.id} source={source} />
    </InterfaceScaffold>
  )
}
