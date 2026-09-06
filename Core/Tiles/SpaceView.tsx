import { useMemo } from 'react'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { TileHost } from './TileHost'
import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
import { findSpace } from '../Nexus/treeIndex'

export function SpaceView({ tree, id }: { tree: NexusTree | null; id: string }): React.JSX.Element {
  // Memoized per Space — a fresh host literal each render would churn every tile memo downstream.
  const host = useMemo(() => ({ kind: 'space' as const, id }), [id])
  const owner = findSpace(tree, id)
  if (!owner)
    return (
      <div className="detail">
        <div className="detail-placeholder">Space not found</div>
      </div>
    )
  return (
    <InterfaceScaffold owner={owner}>
      {/* Keyed per Space: the surface's debounced saves and editor session must never carry across an in-place host swap. */}
      <TileHost key={id} host={host} />
    </InterfaceScaffold>
  )
}
