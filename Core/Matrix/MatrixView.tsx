import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { showEntityMenu } from '../Interface/Menus/entityMenuActions'
import { pageMoveContext } from '../Interface/Menus/pageMenuActions'
import { usePublishCount } from '../Interface/Subfield/publish'
import { useContentHost } from '../Interface/contentHost'
import { contextTargetToSelect, isOpenInTabs } from '../Navigation/tabsModel'
import { nodesOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { MatrixCanvas, toWorldPoint } from './MatrixCanvas'
import { MatrixLabel, recordOf } from './MatrixLabel'
import { matrixRuntime, type Surface } from './matrixRuntime'
import { useMatrixCount, useMatrixHover } from './useMatrixRuntime'

export function MatrixView(): React.JSX.Element {
  const parked = useContentHost()?.parked ?? false
  const tree = useSession((st) => st.tree)
  const select = useSession((st) => st.select)
  const renamingPath = useSession((st) => (st.renamingHost === 'matrix' ? st.renamingPath : null))
  const iconPath = useSession((st) => (st.iconHost === 'matrix' ? st.iconPath : null))
  const colorPath = useSession((st) => (st.colorHost === 'matrix' ? st.colorPath : null))
  const hoveredId = useMatrixHover()
  usePublishCount(useMatrixCount())
  const begin = usePointerGesture()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const picking = useSession((st) => st.pendingPick !== null)
  useEffect(() => {
    if (!picking) setMenuId(null)
  }, [picking])
  const parkedRef = useRef(parked)
  parkedRef.current = parked
  // One identity for the life of the view: the runtime keys a surface's stage — and so its own framing of the picture — off it.
  const [surface] = useState<Surface>(() => ({ visible: () => !parkedRef.current }))
  const surfaceId = useId()
  // Whichever surface last raised a menu owns what that menu starts; with one surface open there is nothing to tell apart.
  const mine = matrixRuntime.acting === null || matrixRuntime.acting === surfaceId

  // Read when the gesture lands, not when it began: a rename mid-press moves the path the tap opens.
  const open = (id: string): void => {
    const rec = recordOf(useSession.getState().tree, id)
    if (rec) void select(contextTargetToSelect(rec))
  }

  const menu = async (id: string): Promise<void> => {
    const { tabs, pinned, tree } = useSession.getState()
    const rec = recordOf(tree, id)
    if (!rec) return
    matrixRuntime.acting = surfaceId
    // Committed before the menu asks for it: the label seats its anchor on the node in the same pass.
    flushSync(() => setMenuId(rec.id))
    const anchor = anchorRef.current?.dataset.nodeId === rec.id ? anchorRef.current : undefined
    await showEntityMenu(
      {
        kind: rec.kind,
        id: rec.id,
        path: rec.path,
        title: rec.title,
        alreadyOpen: isOpenInTabs(tabs, pinned, contextTargetToSelect(rec)),
        host: 'matrix',
        ...(rec.kind === 'page' ? pageMoveContext(tree, rec.path) : {}),
      },
      anchor,
    )
    if (useSession.getState().pendingPick === null) setMenuId(null)
  }

  // The press holds the node's id, so a rebuild before the drag or tap lands can't hand it another node's slot.
  const nodeDown = (e: React.PointerEvent, id: string): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    begin({
      el: e.currentTarget as HTMLElement,
      event: e,
      onActivate: () => {
        matrixRuntime.beginDrag(id)
        return matrixRuntime.draggingId !== null
      },
      onDragMove: (ev) => {
        const [wx, wy] = toWorldPoint(surface, canvas, ev)
        matrixRuntime.moveDrag(wx, wy)
      },
      onDrop: () => matrixRuntime.endDrag(),
      onAbort: () => matrixRuntime.endDrag(),
      onTap: () => open(id),
    })
  }

  const renamingId = useMemo(
    () =>
      renamingPath === null || !tree
        ? null
        : (nodesOf(tree).find((r) => r.path === renamingPath)?.id ?? null),
    [renamingPath, tree],
  )
  // Read past the memo: a page the graph does not yet carry has no node to seat the field under, and a reply can add one without changing the tree. A hidden surface never claims either, or the field opens where nobody can see it.
  const editing =
    renamingId !== null && !parked && mine && matrixRuntime.graph.index.has(renamingId)
  // The overlay names its node by id: an index taken here goes stale the moment a reply rebuilds the graph under it.
  const pickingId = useMemo(() => {
    const path = iconPath ?? colorPath
    return path === null || !tree ? null : (nodesOf(tree).find((r) => r.path === path)?.id ?? null)
  }, [iconPath, colorPath, tree])
  const liveId = parked
    ? null
    : editing
      ? renamingId
      : ((mine ? (pickingId ?? menuId) : null) ?? hoveredId)
  // The overlay outlives its hover by one fade, and the canvas keeps skipping that title until the fade is over — otherwise the painted one lands under the leaving one. The live node shows at once; only a leaving one waits on the presence.
  const shown = useHeldPresence(liveId, 'slow')
  const labelId = liveId ?? shown?.held ?? null
  // The renamed node keeps the surface's focus while its field is open, and lets it go on the same fade any other hover leaves by.
  useEffect(() => {
    if (!editing) return
    matrixRuntime.setHovered(renamingId)
    return () => matrixRuntime.setHovered(null)
  }, [editing, renamingId])

  return (
    <MatrixCanvas
      surface={surface}
      parked={parked}
      editing={editing}
      labelId={labelId}
      canvasRef={canvasRef}
      onNodeDown={nodeDown}
      onMenu={(id) => void menu(id)}
    >
      <MatrixLabel
        surface={surface}
        id={labelId}
        closing={liveId === null && labelId !== null}
        editing={editing}
        hosts={mine}
        anchorRef={anchorRef}
        onPointerDown={(e) => {
          if (labelId !== null) nodeDown(e, labelId)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          if (labelId !== null) void menu(labelId)
        }}
      />
    </MatrixCanvas>
  )
}
