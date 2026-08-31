import type { CollectionNode, SetNode } from '@shared/types'
import { InterfaceScaffold } from './InterfaceScaffold'
import { ViewHost } from '@renderer/Views/ViewHost'
import { containerOwner } from './Scope'

export function ContainerView({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  return (
    <InterfaceScaffold owner={containerOwner(source)}>
      <ViewHost source={source} />
    </InterfaceScaffold>
  )
}
