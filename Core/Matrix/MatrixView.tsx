import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { currentZoom } from '@pommora/uix/Utilities/zoom'
import { showEntityMenu } from '../Interface/Menus/entityMenuActions'
import { pageMoveContext } from '../Interface/Menus/pageMenuActions'
import { usePublishCount } from '../Interface/Subfield/publish'
import { useContentHost } from '../Interface/contentHost'
import { contextTargetToSelect, isOpenInTabs } from '../Navigation/tabsModel'
import type { NexusTree } from '../Nexus/tree'
import { nodesOf, recordsByIdOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { MatrixCanvas, toWorldPoint } from './MatrixCanvas'
import { MatrixLabel } from './MatrixLabel'
import type { MatrixRecord } from './matrixKind'
import { matrixRuntime, type Surface } from './matrixRuntime'
import { useMatrixCount, useMatrixHover } from './useMatrixRuntime'

function recordOf(tree: NexusTree | null, id: string | null): MatrixRecord | null {
  if (id === null || !tree) return null
  const r = recordsByIdOf(tree).get(id)
  return r && r.kind !== 'homepage' && r.kind !== 'matrix'
    ? { kind: r.kind, id: r.id, path: r.path, title: r.title }
    : null
}

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

  const idAt = (i: number): string | null => matrixRuntime.graph.nodes[i]?.id ?? null

  const open = (i: number): void => {
    const rec = recordOf(tree, idAt(i))
    if (rec) void select(contextTargetToSelect(rec))
  }

  const menu = async (i: number): Promise<void> => {
    const rec = recordOf(tree, idAt(i))
    if (!rec) return
    matrixRuntime.acting = surfaceId
    setMenuId(rec.id)
    // KNOB — a node right-clicked under a still pointer has no label yet, and mounting one takes two frames; the cap is slack.
    for (let f = 0; f < 4 && anchorRef.current?.dataset.nodeId !== rec.id; f++)
      await new Promise(requestAnimationFrame)
    const anchor = anchorRef.current?.dataset.nodeId === rec.id ? anchorRef.current : undefined
    const { tabs, pinned } = useSession.getState()
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

  const nodeDown = (e: React.PointerEvent, i: number): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    begin({
      el: e.currentTarget as HTMLElement,
      event: e,
      onActivate: () => {
        matrixRuntime.beginDrag(i)
        return matrixRuntime.draggingId !== null
      },
      onDragMove: (ev) => {
        const [wx, wy] = toWorldPoint(surface, canvas, ev)
        matrixRuntime.moveDrag(wx, wy)
      },
      onDrop: () => matrixRuntime.endDrag(),
      onAbort: () => matrixRuntime.endDrag(),
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
        matrixRuntime.pan(surface, (ev.clientX - last[0]) / z, (ev.clientY - last[1]) / z)
        last = [ev.clientX, ev.clientY]
      },
      onDrop: () => {},
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
  const editing = renamingId !== null && !parked && mine && matrixRuntime.indexOf(renamingId) >= 0
  // The overlay names its node by id: an index taken here goes stale the moment a reply rebuilds the graph under it.
  const pickingId = useMemo(() => {
    const path = iconPath ?? colorPath
    return path === null || !tree ? null : (nodesOf(tree).find((r) => r.path === path)?.id ?? null)
  }, [iconPath, colorPath, tree])
  const liveId = editing ? renamingId : ((mine ? (pickingId ?? menuId) : null) ?? hoveredId)
  const live = useMemo(() => (parked ? null : recordOf(tree, liveId)), [tree, liveId, parked])
  // The overlay outlives its hover by one fade, and the canvas keeps skipping that title until the fade is over — otherwise the painted one lands under the leaving one.
  const shown = useHeldPresence(live)
  // The renamed node keeps the surface's focus while its field is open, and lets it go on the same fade any other hover leaves by.
  useEffect(() => {
    if (!editing) return
    const i = matrixRuntime.indexOf(renamingId)
    if (i < 0) return
    matrixRuntime.setHovered(i)
    return () => matrixRuntime.setHovered(-1)
  }, [editing, renamingId])

  const labelId = shown?.held.id ?? null
  return (
    <MatrixCanvas
      surface={surface}
      parked={parked}
      editing={editing}
      labelId={labelId}
      canvasRef={canvasRef}
      onNodeDown={nodeDown}
      onBackgroundDown={backgroundDown}
      onMenu={(i) => void menu(i)}
    >
      <MatrixLabel
        surface={surface}
        rec={shown?.held ?? null}
        closing={shown?.closing ?? false}
        editing={editing}
        hosts={mine}
        anchorRef={anchorRef}
        onPointerDown={(e) => nodeDown(e, matrixRuntime.indexOf(labelId))}
        onContextMenu={(e) => {
          e.preventDefault()
          void menu(matrixRuntime.indexOf(labelId))
        }}
      />
    </MatrixCanvas>
  )
}
