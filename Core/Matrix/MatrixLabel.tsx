import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLineRow } from '@pommora/uix/Interactions/drag'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { titleInput } from '@pommora/uix/Menus'
import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { EntityIcon } from '../Assets/EntityIcon'
import { IconChoice } from '../Assets/IconChoice'
import { glanceShown, hoverGlance, leaveGlanceFrom } from '../Interface/Glance/glanceAction'
import { RenamableTitle } from '../Interface/RenamableTitle'
import type { NexusTree } from '../Nexus/tree'
import { ancestryOf, recordsByIdOf } from '../Nexus/treeIndex'
import { spaceIdentityOf } from '../Contexts/contextIdentity'
import { useSession } from '../Session/store'
import { toScreen } from './Engine/viewport'
import { lastShift } from './MatrixCanvas'
import type { MatrixRecord } from './matrixKind'
import * as s from './matrix.css'
import { matrixRuntime, type Surface } from './matrixRuntime'

// Here rather than beside the record type: the tree index already imports that file for the Matrix's own kind.
export function recordOf(tree: NexusTree | null, id: string | null): MatrixRecord | null {
  if (id === null || !tree) return null
  const r = recordsByIdOf(tree).get(id)
  return r && r.kind !== 'homepage' && r.kind !== 'matrix'
    ? { kind: r.kind, id: r.id, path: r.path, title: r.title, icon: r.ownIcon }
    : null
}

export function MatrixLabel({
  surface,
  id,
  closing,
  editing,
  picking,
  anchorRef,
  onPointerDown,
  onOpen,
  onContextMenu,
}: {
  surface: Surface
  id: string | null
  closing: boolean
  editing: boolean
  picking: 'icon' | 'color' | null
  anchorRef: React.RefObject<HTMLDivElement | null>
  onPointerDown: (e: React.PointerEvent) => void
  onOpen: () => void
  onContextMenu: (e: React.MouseEvent) => void
}): React.JSX.Element | null {
  const tree = useSession((st) => st.tree)
  const endIcon = useSession((st) => st.endIcon)
  const endColor = useSession((st) => st.endColor)
  const mutate = useSession((st) => st.mutate)
  const hidePath = useSession((st) => st.matrixConfig.display.hidePath)
  const hideIcon = useSession((st) => st.matrixConfig.display.hideIcon)
  const locked = useSession((st) => st.matrixConfig.display.locked)
  const [entered, setEntered] = useState<string | null>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const row = useLineRow(id ?? '', { open: onOpen })
  const seatRow = row.ref
  const seat = useCallback(
    (el: HTMLDivElement | null) => {
      anchorRef.current = el
      seatRow(el)
    },
    [anchorRef, seatRow],
  )
  const rec = recordOf(tree, id)
  const path = rec?.path
  const kind = rec?.kind

  // Each node's label is its own element, and its opacity has to change after its first paint for the transition to run at all.
  useEffect(() => {
    if (id === null) return
    const frame = requestAnimationFrame(() => setEntered(id))
    return () => {
      cancelAnimationFrame(frame)
      setEntered(null)
    }
  }, [id])

  // Layout, not passive: the first transform lands before paint, so the label never flashes at the host's origin.
  useLayoutEffect(() => {
    if (id === null) return
    let lx = Number.NaN
    let ly = Number.NaN
    const follow = (): void => {
      const n = matrixRuntime.nodeOf(id)
      const a = anchorRef.current
      const l = labelRef.current
      if (!n || !a || !l) return
      const v = matrixRuntime.viewportOf(surface)
      const { zoom } = v
      const [sx, sy] = toScreen(v, n.x, n.y)
      const r = n.radius * zoom
      a.style.transform = `translate(${sx - r}px, ${sy - r}px)`
      a.style.width = a.style.height = `${r * 2}px`
      l.style.transform = `translate(-50%, 0) translate(${sx}px, ${sy + r}px)`
      if (sx === lx && sy === ly) return
      lx = sx
      ly = sy
      // A standing pane re-measures off the anchor's own scroll, so it tracks the node rather than the frame.
      if (glanceShown()) a.dispatchEvent(new Event('scroll'))
    }
    follow()
    return matrixRuntime.subscribe(follow)
  }, [id, surface])

  // Keyed on the node's identity, not its record, which every tree push rebuilds: a push mid-dwell would cancel the preview.
  useEffect(() => {
    const a = anchorRef.current
    if (!a || editing || closing || id === null || kind !== 'page' || path === undefined) return
    hoverGlance({ kind: 'page', id, path }, a, 'location', lastShift)
    return () => leaveGlanceFrom(a)
  }, [id, path, kind, editing, closing])

  if (!rec || !tree) return null
  const node = matrixRuntime.nodeOf(rec.id)
  if (!node) return null
  const trail = hidePath
    ? []
    : (ancestryOf(tree, { kind: rec.kind, id: rec.id }) ?? [])
        .slice(0, -1)
        .map((t) => ({ title: t.title, icon: t.icon }))
  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the hovered node made real — its own drag, click and menu, which the canvas cannot carry */}
      <div
        ref={seat}
        data-node-id={rec.id}
        className={cx(s.anchor, closing && s.anchorClosing)}
        {...(locked ? { ...row.handle, onClick: onOpen } : { onPointerDown })}
        onContextMenu={onContextMenu}
      />
      <IconChoice
        open={picking === 'icon'}
        onClose={endIcon}
        triggerRef={anchorRef}
        value={rec.icon}
        onSelect={(icon) => void mutate({ op: 'setIcon', path: rec.path, kind: rec.kind, icon })}
      />
      {rec.kind === 'space' && (
        <ColorPicker
          open={picking === 'color'}
          selected={colorNameFor(spaceIdentityOf(tree, rec.id)?.color)}
          onPick={(color) => {
            endColor()
            void mutate({ op: 'setSpaceColor', spaceId: rec.id, color })
          }}
          onDismiss={endColor}
          triggerRef={anchorRef}
        />
      )}
      <div
        key={rec.id}
        ref={labelRef}
        className={cx(s.label, s.labelFade, entered === rec.id && !closing && s.labelShown)}
      >
        <div className={cx(s.labelRow, text.footnote.emphasized)}>
          {!hideIcon && (
            <EntityIcon kind={rec.kind} icon={rec.icon} size="footnote" className={s.labelGlyph} />
          )}
          {editing ? (
            <RenamableTitle
              path={rec.path}
              kind={rec.kind}
              title={node.title}
              className={cx(titleInput, s.labelField)}
              autoSize
              host="matrix"
            />
          ) : (
            <span>{node.title}</span>
          )}
        </div>
        {trail.length > 0 && (
          <NavTrail
            segments={trail}
            chevronSize="caption"
            iconSize="footnote"
            overScroll={false}
            className={text.subline.standard}
          />
        )}
      </div>
    </>
  )
}
