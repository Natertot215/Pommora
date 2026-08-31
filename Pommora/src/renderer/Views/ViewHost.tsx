import { useMemo, useRef } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import type { CollectionNode, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { useActiveView } from './useActiveView'
import { TableView } from './TableView/TableView'
import { CardsView } from './CardView/CardsView'
import { useViewHost, type ViewHostApi, type ViewHostSeam } from './useViewHost'
import './view-host.css'

const identity = (v: SavedView): SavedView => v
const NO_SCHEMA: PropertyDefinition[] = []

export function ViewHost({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  // Only the type is needed to seat a renderer, and a minted default is a table whatever the
  // schema — so the seat skips the schema walk the host itself performs.
  const isCards = useActiveView(source, NO_SCHEMA).view.type === 'cards'
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
  return isCards ? <CardsView host={host} /> : <TableView host={host} />
}
