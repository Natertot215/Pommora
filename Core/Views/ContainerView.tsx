import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
import { ViewHost } from './Host/ViewHost'
import { containerOwner } from '../Session/treeIndex'

export function ContainerView({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  return (
    <InterfaceScaffold owner={containerOwner(source)}>
      <ViewHost key={source.id} source={source} />
    </InterfaceScaffold>
  )
}
