import type { CollectionNode, SetNode } from '@shared/types'
import { DetailScaffold } from './DetailScaffold'
import { ViewRenderer } from './Views/ViewRenderer'
import { containerOwner } from './Scope'

export function ContainerView({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  return (
    <DetailScaffold owner={containerOwner(source)}>
      <ViewRenderer source={source} />
    </DetailScaffold>
  )
}
