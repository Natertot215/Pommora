import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
import { carries, LineZone } from '@pommora/uix/Interactions/drag'
import { usePointerGesture } from '@pommora/uix/Interactions/gesture'
import { EntityIcon } from '../Assets/EntityIcon'
import { showEntityMenu } from '../Interface/Menus/entityMenuActions'
import { pageMoveContext } from '../Interface/Menus/pageMenuActions'
import { usePublishCount } from '../Interface/Subfield/publish'
import { useContentHost } from '../Interface/contentHost'
import { isOpenInTabs } from '../Navigation/tabsModel'
import { selectTargetOf } from '../Navigation/navRef'
import { TAB_FAMILY } from '../Navigation/tabRows'
import type { NexusTree } from '../Nexus/tree'
import { nodesOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { MatrixCanvas, toWorldPoint } from './MatrixCanvas'
import { MatrixLabel, recordOf } from './MatrixLabel'
import * as s from './matrix.css'
import { matrixRuntime, type Surface } from './matrixRuntime'
import { useMatrixCount, useMatrixHover } from './useMatrixRuntime'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

// Whichever surface last raised a menu owns what that menu starts; with one surface open there is nothing to tell apart.
let acting: string | null = null

const idAtPath = (tree: NexusTree | null, path: string | null): string | null =>
  path === null || !tree ? null : (nodesOf(tree).find((r) => r.path === path)?.id ?? null)

export function MatrixView(): React.JSX.Element {
  const content = useContentHost()
  const parked = content?.parked ?? false
  const tree = useSession((st) => st.tree)
  const select = useSession((st) => st.select)
  const renamingPath = useSession((st) => (st.renamingHost === 'matrix' ? st.renamingPath : null))
  const iconPath = useSession((st) => (st.iconHost === 'matrix' ? st.iconPath : null))
  const colorPath = useSession((st) => (st.colorHost === 'matrix' ? st.colorPath : null))
  const locked = useSession((st) => st.matrixConfig.display.locked)
  usePublishCount(useMatrixCount())
  const begin = usePointerGesture()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const picking = useSession((st) => st.pendingPick !== null)
  useEffect(() => {
    if (!picking) setMenuId(null)
  }, [picking])
  const parkedRef = useLatest(parked)
  // One identity for the life of the view: the runtime keys a surface's stage — and so its own framing of the picture — and its hover off it.
  const [surface] = useState<Surface>(() => ({ visible: () => !parkedRef.current }))
  const hoveredId = useMatrixHover(surface)
  const surfaceId = useId()
  const mine = acting === null || acting === surfaceId

  // Read when the gesture lands, not when it began: a rename mid-press moves the path the tap opens.
  const open = (id: string): void => {
    const rec = recordOf(useSession.getState().tree, id)
    if (rec) void select(selectTargetOf(rec))
  }

  const menu = async (id: string): Promise<void> => {
    const { tabs, pinned, tree } = useSession.getState()
    const rec = recordOf(tree, id)
    if (!rec) return
    acting = surfaceId
    // Committed before the menu asks for it: the label seats its anchor on the node in the same pass.
    flushSync(() => setMenuId(rec.id))
    const anchor = anchorRef.current?.dataset.nodeId === rec.id ? anchorRef.current : undefined
    await showEntityMenu(
      {
        kind: rec.kind,
        id: rec.id,
        path: rec.path,
        title: rec.title,
        alreadyOpen: isOpenInTabs(tabs, pinned, selectTargetOf(rec)),
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

  const renamingId = useMemo(() => idAtPath(tree, renamingPath), [tree, renamingPath])
  // Read past the memo: a page the graph does not yet carry has no node to seat the field under, and a reply can add one without changing the tree. A hidden surface never claims either, or the field opens where nobody can see it.
  const editing =
    renamingId !== null && !parked && mine && matrixRuntime.graph.index.has(renamingId)
  // The overlay names its node by id: an index taken here goes stale the moment a reply rebuilds the graph under it.
  const pickingId = useMemo(
    () => idAtPath(tree, iconPath ?? colorPath),
    [tree, iconPath, colorPath],
  )
  const liveId = parked
    ? null
    : editing
      ? renamingId
      : ((mine ? (pickingId ?? menuId) : null) ?? hoveredId)
  // The overlay outlives its hover by one fade, and the canvas keeps skipping that title until the fade is over — otherwise the painted one lands under the leaving one. The live node shows at once; only a leaving one waits on the presence.
  const shown = useHeldPresence(liveId, 'slow')
  const labelId = liveId ?? shown?.held ?? null
  const pickKind = iconPath !== null ? 'icon' : colorPath !== null ? 'color' : null
  const picker = mine && labelId === pickingId ? pickKind : null
  return (
    <MatrixCanvas
      surface={surface}
      parked={parked}
      inWindow={content === null}
      liveId={liveId}
      labelId={labelId}
      canvasRef={canvasRef}
      onNodeDown={nodeDown}
      onMenu={(id) => void menu(id)}
    >
      {/* A locked layout lends its nodes to the tab strips instead: the zone never reorders, it only carries. */}
      <LineZone
        className={s.carryZone}
        disabled={!locked}
        snap={() => null}
        resolve={() => null}
        commit={() => {}}
        label={(id) => recordOf(useSession.getState().tree, id)?.title ?? ''}
        glyph={(id) => {
          const rec = recordOf(useSession.getState().tree, id)
          return rec && <EntityIcon kind={rec.kind} icon={rec.icon} />
        }}
        carry={[
          carries(TAB_FAMILY, (id) => {
            const rec = recordOf(useSession.getState().tree, id)
            return rec && selectTargetOf(rec)
          }),
        ]}
        watch={[]}
      >
        <MatrixLabel
          surface={surface}
          id={labelId}
          closing={liveId === null && labelId !== null}
          editing={editing}
          picking={picker}
          anchorRef={anchorRef}
          onPointerDown={(e) => {
            if (labelId !== null) nodeDown(e, labelId)
          }}
          onOpen={() => {
            if (labelId !== null) open(labelId)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            if (labelId !== null) void menu(labelId)
          }}
        />
      </LineZone>
    </MatrixCanvas>
  )
}
