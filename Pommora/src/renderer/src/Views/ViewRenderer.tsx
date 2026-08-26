import { useMemo } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import { useSession } from '../store'
import { useActiveView } from './useActiveView'
import { TableView } from './TableView/TableView'
import { resolveContainerSchema } from './pipeline/pickView'
import { CardsView } from './CardView/CardsView'

export function ViewRenderer({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const schema = useMemo(() => (tree ? resolveContainerSchema(tree, source) : []), [tree, source])
  const { view } = useActiveView(source, schema)
  return view.type === 'cards' ? (
    <CardsView key={source.id} source={source} />
  ) : (
    <TableView key={source.id} source={source} />
  )
}
