import type { ReactNode } from 'react'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import type { SavedView } from '@pommora/core/Views/views'
import { GroupBand, resolveBandHead } from './GroupBand'
import { bandShowsAdd } from './CardView/cardsBand'
import { useBandDrag } from './BandDnd'
import type { ResolveContext } from '../Properties/resolveContext'
import { host } from '../Platform/dialer'

/** Holds `useBandDrag`, which throws outside `<BandDnd>` and so can't live in the shared presentational GroupBand. */
export function ViewGroupBand({
  group,
  view,
  ctx,
  setNames,
  setIcons,
  source,
  setPath,
  onOpen,
  onAdd,
  collapsed,
  onToggle,
  indent,
  headless,
  fill,
  children,
}: {
  group: ResolvedGroup
  view: SavedView
  ctx: ResolveContext | null
  setNames: Map<string, string>
  setIcons: Map<string, string | undefined>
  source: CollectionNode | SetNode
  setPath?: string
  onOpen?: () => void
  onAdd?: () => void
  collapsed: boolean
  onToggle: () => void
  indent?: string
  headless?: boolean
  fill?: boolean
  children: ReactNode
}): React.JSX.Element {
  const dragHandle = useBandDrag(group.key)
  const glyph = ctx
    ? resolveBandHead(group, view, ctx, setNames, setIcons, source, setPath).glyph
    : undefined
  const onContextMenu = setPath
    ? (e: React.MouseEvent): void => {
        e.preventDefault()
        e.stopPropagation()
        void host().ask('context-menu', {
          kind: 'set',
          path: setPath,
          title: setNames.get(group.key) ?? group.key,
          host: 'detail',
        })
      }
    : undefined
  return (
    <GroupBand
      glyph={glyph}
      collapsed={collapsed}
      onToggle={onToggle}
      showAdd={bandShowsAdd(group.kind)}
      onAdd={onAdd}
      subBand={group.bucket !== undefined}
      indent={indent}
      headless={headless}
      fill={fill}
      dragHandle={dragHandle}
      onOpen={onOpen}
      onContextMenu={onContextMenu}
    >
      {children}
    </GroupBand>
  )
}
