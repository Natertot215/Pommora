import type { ReactNode } from 'react'
import type { CollectionNode, ResolvedGroup, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { GroupBand, resolveBandHead } from './GroupBand'
import { bandShowsAdd } from './Cards/cardsBand'
import { useBandDrag } from './BandDnd'
import type { ResolveContext } from './Table/resolveContext'

/** The band adapter every view renders: it holds the `useBandDrag` hook (which throws outside
 *  `<BandDnd>`, so it can't live in the shared presentational GroupBand) and the native Set context
 *  menu, then hands the resolved glyph + drag wiring to GroupBand. The disclosure body — rows, cards,
 *  nested child bands — arrives as children, so what a band CONTAINS stays the renderer's business
 *  and what a band IS stays here. */
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
  /** Null before the schema resolves — the band still renders, wearing no glyph yet. */
  ctx: ResolveContext | null
  setNames: Map<string, string>
  setIcons: Map<string, string | undefined>
  source: CollectionNode | SetNode
  /** The structural Set's real path — enables the native menu + inline rename (absent for property
   *  bands). */
  setPath?: string
  /** Present only for OPENABLE Sets (a Collection's direct children — sub-Sets are expand-only). */
  onOpen?: () => void
  /** The band "+"'s creation handler — present on structural Set bands only. */
  onAdd?: () => void
  collapsed: boolean
  onToggle: () => void
  indent?: string
  /** Group By: None renders one headerless, force-open band (cards). */
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
        void window.nexus.contextMenu({
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
