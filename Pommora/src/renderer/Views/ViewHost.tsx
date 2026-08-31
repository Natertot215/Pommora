import { useMemo, useRef } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { useSession } from '../store'
import { useActiveView } from './useActiveView'
import { TableView } from './TableView/TableView'
import { resolveContainerSchema } from './Pipeline/pickView'
import { CardsView } from './CardView/CardsView'
import { useViewHost, type ViewHostApi, type ViewHostSeam } from './useViewHost'
import './view-host.css'

const identity = (v: SavedView): SavedView => v

export function ViewHost({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  const tree = useSession((s) => s.tree)
  const schema = useMemo(() => (tree ? resolveContainerSchema(tree, source) : []), [tree, source])
  const { view } = useActiveView(source, schema)
  const isCards = view.type === 'cards'
  const upward = useRef<ViewHostApi['seam']>({
    foldOverrides: { current: identity },
    bandBucket: { current: (key) => key },
    viewRootRef: { current: null },
    onCreated: { current: () => {} },
  }).current
  const seam = useMemo<ViewHostSeam>(
    () => ({
      foldOverrides: upward.foldOverrides,
      flattenStructural: isCards,
      bandBucket: (key) => upward.bandBucket.current(key),
      viewRootRef: upward.viewRootRef,
      onCreated: (created) => upward.onCreated.current(created),
    }),
    [isCards, upward],
  )
  const host = useViewHost(source, seam, upward)
  // Cards' set cards render independently of the pipeline, so a cards view with Sets present
  // always mounts — Set Cards on paints them, off stays a blank pane (Nathan's call).
  const setChrome = isCards && (source.sets?.length ?? 0) > 0
  if (!host) return <div className="view-empty">Loading…</div>
  if (host.groups.length === 0 && !setChrome) return <div className="view-empty">No pages here</div>
  return isCards ? (
    <CardsView key={source.id} source={source} host={host} />
  ) : (
    <TableView key={source.id} source={source} host={host} />
  )
}
