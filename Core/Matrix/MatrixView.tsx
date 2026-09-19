import { useMemo, useRef } from 'react'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { currentZoom } from '@pommora/uix/Utilities/zoom'
import { usePublishCount } from '../Interface/Subfield/publish'
import { contextTargetToSelect } from '../Navigation/tabsModel'
import type { NexusTree } from '../Nexus/tree'
import { recordsByIdOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { panBy } from './Engine/viewport'
import { MatrixCanvas, toWorldPoint } from './MatrixCanvas'
import { MatrixLabel } from './MatrixLabel'
import type { MatrixRecord } from './matrixKind'
import { matrixRuntime } from './matrixRuntime'
import { useMatrixCount, useMatrixHover } from './useMatrixRuntime'

export function recordOf(tree: NexusTree | null, index: number): MatrixRecord | null {
  const n = matrixRuntime.graph.nodes[index]
  if (!n || !tree) return null
  const r = recordsByIdOf(tree).get(n.id)
  return r && r.kind !== 'homepage' && r.kind !== 'matrix'
    ? { kind: r.kind, id: r.id, path: r.path, title: r.title }
    : null
}

function PublishCount({ count }: { count: number }): null {
  usePublishCount(count)
  return null
}

export function MatrixView({
  parked,
  publishes,
}: {
  parked: boolean
  publishes: boolean
}): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const select = useSession((st) => st.select)
  const hovered = useMatrixHover()
  const count = useMatrixCount()
  const begin = usePointerGesture()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const open = (i: number): void => {
    const rec = recordOf(tree, i)
    if (rec) void select(contextTargetToSelect(rec))
  }

  const nodeDown = (e: React.PointerEvent, i: number): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    begin({
      el: e.currentTarget as HTMLElement,
      event: e,
      onActivate: () => {
        matrixRuntime.beginDrag(i)
        return true
      },
      onDragMove: (ev) => {
        const [wx, wy] = toWorldPoint(canvas, ev)
        matrixRuntime.moveDrag(wx, wy)
      },
      onDrop: () => matrixRuntime.endDrag(),
      onAbort: () => matrixRuntime.cancelDrag(),
      onTap: () => open(i),
    })
  }

  const backgroundDown = (e: React.PointerEvent): void => {
    // Hoisted: `e.currentTarget` is null by the time a window-level move listener runs.
    const el = e.currentTarget as HTMLElement
    let last: [number, number] = [e.clientX, e.clientY]
    begin({
      el,
      event: e,
      onActivate: () => true,
      onDragMove: (ev) => {
        const z = currentZoom(el)
        matrixRuntime.setViewport(
          panBy(matrixRuntime.viewport, (ev.clientX - last[0]) / z, (ev.clientY - last[1]) / z),
        )
        last = [ev.clientX, ev.clientY]
      },
      onDrop: () => {},
    })
  }

  const labelIndex = hovered
  const rec = useMemo(() => recordOf(tree, labelIndex), [tree, labelIndex])
  return (
    <>
      {publishes && <PublishCount count={count} />}
      <MatrixCanvas
        parked={parked}
        // Phase 7: the inline rename field, which holds the hover while it is open.
        editing={false}
        canvasRef={canvasRef}
        onNodeDown={nodeDown}
        onBackgroundDown={backgroundDown}
        // Phase 7: the entity menu for the node under the pointer.
        onMenu={() => {}}
      >
        <MatrixLabel
          rec={rec}
          onPointerDown={(e) => nodeDown(e, labelIndex)}
          onContextMenu={(e) => e.preventDefault()}
        />
      </MatrixCanvas>
    </>
  )
}
