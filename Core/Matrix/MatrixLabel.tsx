import { useLayoutEffect, useRef } from 'react'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { EntityIcon } from '../Assets/EntityIcon'
import { ancestryOf } from '../Nexus/treeIndex'
import { useSession } from '../Session/store'
import { toScreen } from './Engine/viewport'
import type { MatrixRecord } from './matrixKind'
import * as s from './matrix.css'
import { matrixRuntime } from './matrixRuntime'

export function MatrixLabel({
  rec,
  children,
  onPointerDown,
  onContextMenu,
}: {
  rec: MatrixRecord | null
  children?: React.ReactNode
  onPointerDown: (e: React.PointerEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}): React.JSX.Element | null {
  const tree = useSession((st) => st.tree)
  const hideLocation = useSession((st) => st.matrixConfig.display.hideLocation)
  const hideIcon = useSession((st) => st.matrixConfig.display.hideIcon)
  const anchorRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const id = rec?.id ?? null

  // Layout, not passive: the first transform lands before paint, so the label never flashes at the host's origin.
  useLayoutEffect(() => {
    if (id === null) return
    const follow = (): void => {
      const n = matrixRuntime.graph.nodes[matrixRuntime.graph.index.get(id) ?? -1]
      const a = anchorRef.current
      const l = labelRef.current
      if (!n || !a || !l) return
      const { zoom } = matrixRuntime.viewport
      const [sx, sy] = toScreen(matrixRuntime.viewport, n.x, n.y)
      const r = n.radius * zoom
      a.style.transform = `translate(${sx - r}px, ${sy - r}px)`
      a.style.width = a.style.height = `${r * 2}px`
      l.style.transform = `translate(-50%, 0) translate(${sx}px, ${sy + r}px)`
    }
    follow()
    return matrixRuntime.subscribe(follow)
  }, [id])

  if (!rec || !tree) return null
  const node = matrixRuntime.graph.nodes[matrixRuntime.graph.index.get(rec.id) ?? -1]
  if (!node) return null
  const trail = hideLocation
    ? []
    : (ancestryOf(tree, { kind: rec.kind, id: rec.id }) ?? [])
        .slice(0, -1)
        .map((t) => ({ title: t.title, icon: t.icon }))
  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the hovered node made real — its own drag, click and menu, which the canvas cannot carry */}
      <div
        ref={anchorRef}
        className={s.anchor}
        onPointerDown={onPointerDown}
        onContextMenu={onContextMenu}
      />
      <div ref={labelRef} className={s.label}>
        <div className={cx(s.labelRow, text.caption.emphasized)}>
          {!hideIcon && (
            <EntityIcon kind={rec.kind} icon={node.icon} size="caption" className={s.labelGlyph} />
          )}
          {children ?? <span>{node.title}</span>}
        </div>
        {trail.length > 0 && (
          <NavTrail
            segments={trail}
            chevronSize="caption"
            overScroll={false}
            className={text.footnote.standard}
          />
        )}
      </div>
    </>
  )
}
