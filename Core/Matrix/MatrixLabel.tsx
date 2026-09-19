import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { titleInput } from '@pommora/uix/Menus'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { EntityIcon } from '../Assets/EntityIcon'
import { IconChoice } from '../Assets/IconChoice'
import { glanceShown } from '../Interface/Glance/glanceAction'
import { hoverGlance, leaveGlanceFrom } from '../Interface/Glance/glanceLink'
import { RenamableTitle } from '../Interface/RenamableTitle'
import { ancestryOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { toScreen } from './Engine/viewport'
import { lastShift } from './MatrixCanvas'
import type { MatrixRecord } from './matrixKind'
import * as s from './matrix.css'
import { matrixRuntime, type Surface } from './matrixRuntime'

export function MatrixLabel({
  surface,
  rec,
  closing,
  editing,
  hosts,
  onPointerDown,
  onContextMenu,
}: {
  surface: Surface
  rec: MatrixRecord | null
  closing: boolean
  editing: boolean
  hosts: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}): React.JSX.Element | null {
  const tree = useSession((st) => st.tree)
  const iconPath = useSession((st) => (st.iconHost === 'matrix' ? st.iconPath : null))
  const picking = hosts ? iconPath : null
  const endIcon = useSession((st) => st.endIcon)
  const mutate = useSession((st) => st.mutate)
  const hidePath = useSession((st) => st.matrixConfig.display.hidePath)
  const hideIcon = useSession((st) => st.matrixConfig.display.hideIcon)
  const [entered, setEntered] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const id = rec?.id ?? null

  // The opacity has to change after the first paint for the transition to run at all.
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

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

  useEffect(() => {
    const a = anchorRef.current
    if (!a || editing || closing || !rec || rec.kind !== 'page') return
    hoverGlance({ kind: 'page', id: rec.id, path: rec.path }, a, 'location', lastShift)
    return () => leaveGlanceFrom(a)
  }, [rec, editing, closing])

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
        ref={anchorRef}
        className={cx(s.anchor, closing && s.anchorClosing)}
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
      />
      <IconChoice
        open={picking === rec.path}
        onClose={endIcon}
        triggerRef={anchorRef}
        value={node.icon}
        onSelect={(icon) => void mutate({ op: 'setIcon', path: rec.path, kind: rec.kind, icon })}
      />
      <div ref={labelRef} className={cx(s.label, s.labelFade, entered && !closing && s.labelShown)}>
        <div className={cx(s.labelRow, text.footnote.emphasized)}>
          {!hideIcon && (
            <EntityIcon kind={rec.kind} icon={node.icon} size="footnote" className={s.labelGlyph} />
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
