import type { CollectionNode, SetNode } from '@shared/types'
import { InterfaceScaffold } from './InterfaceScaffold'
import { ViewRenderer } from '@renderer/Views/ViewRenderer'
import { containerOwner } from './Scope'

export function ContainerView({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  return (
    <InterfaceScaffold owner={containerOwner(source)}>
      <ViewRenderer source={source} />
    </InterfaceScaffold>
  )
}
