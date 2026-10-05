import type { NexusTree } from '../Nexus/tree'
import { TileHost } from '../Tiles/TileHost'
import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
import { findSpace } from '../Nexus/treeIndex'

export function SpaceView({ tree, id }: { tree: NexusTree | null; id: string }): React.JSX.Element {
  const owner = findSpace(tree, id)
  if (!owner)
    return (
      <div className="detail interface-inset">
        <div className="detail-placeholder">Space not found</div>
      </div>
    )
  return (
    <InterfaceScaffold owner={owner}>
      {/* Keyed per Space: the surface's debounced saves and editor session must never carry across an in-place host swap. */}
      <TileHost key={id} host={{ kind: 'space', id }} />
    </InterfaceScaffold>
  )
}
