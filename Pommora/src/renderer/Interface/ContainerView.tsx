import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import { InterfaceScaffold } from './InterfaceScaffold'
import { ViewHost } from '@renderer/Views/ViewHost'
import { containerOwner } from './scope'

export function ContainerView({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  return (
    <InterfaceScaffold owner={containerOwner(source)}>
      <ViewHost key={source.id} source={source} />
    </InterfaceScaffold>
  )
}
