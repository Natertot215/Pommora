import type { SelectionState } from '@shared/types'
import { DEFAULT_LABELS } from '@shared/types'
import { containerCreators } from '@shared/mutate'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { openPageBody, useSession } from '../../store'
import { findCollection } from '../Scope'
import { pageStats } from './subfieldStats'

/** New item ids slot in here, and in the per-view default order below — the seam for future
 *  user-defined (scoped) items. */
export type SubfieldItemId = 'pageStats' | 'addMenu' | 'viewType'

const ALL_ITEM_IDS: SubfieldItemId[] = ['pageStats', 'addMenu', 'viewType']
/** Narrow a persisted (untrusted) id string to a known item id — drops stale/unknown entries. */
export function isSubfieldItemId(id: string): id is SubfieldItemId {
  return (ALL_ITEM_IDS as string[]).includes(id)
}

/** An optional per-mount scope. When a host (the floating preview) passes it, the footer describes
 *  THIS target and counts THIS body instead of the global selection. The preview's body is its own
 *  local buffer — never the shared `liveBody` slot, which has a single owner (the active main
 *  editor); a second writer would evict the main pane's live count. */
export interface SubfieldScope {
  target: { id: string; path: string }
  body: string
}
export interface SubfieldItemProps {
  scope?: SubfieldScope
}

export const DEFAULT_ITEMS: Record<SelectionState['kind'], SubfieldItemId[]> = {
  none: ['viewType'],
  homepage: [],
  context: [],
  space: [],
  collection: ['addMenu'],
  set: ['addMenu'],
  page: ['pageStats'],
}

/** Lines · Words · Characters for the open page — live as you type. Scoped (the preview), it counts
 *  the scope's own body. Unscoped (the detail pane), the editing buffer wins over the loaded snapshot
 *  while it's for this same page; falls back to the loaded body before any edit. */
function PageStatsItem({ scope }: SubfieldItemProps): React.JSX.Element {
  const pageDetail = useSession((s) => s.pageDetail)
  const liveBody = useSession((s) => s.liveBody)
  const body = scope ? scope.body : openPageBody(pageDetail, liveBody)
  const stats = pageStats(body)
  return (
    <span className="subfield-stats" title="Lines · Words · Characters">
      {stats.lines.toLocaleString()}
      <span className="subfield-sep">·</span>
      {stats.words.toLocaleString()}
      <span className="subfield-sep">·</span>
      {stats.characters.toLocaleString()}
    </span>
  )
}

function AddMenuItem(): React.JSX.Element | null {
  const selection = useSession((s) => s.selection)
  const tree = useSession((s) => s.tree)
  if (selection.kind !== 'collection' && selection.kind !== 'set') return null
  const labels = tree?.labels
  const parentPath =
    selection.kind === 'set' ? selection.path : (findCollection(tree, selection.id)?.path ?? '')
  const creators = containerCreators(selection.kind, parentPath, labels ?? DEFAULT_LABELS)
  const onAdd = (): void => void useSession.getState().createFromMenu(creators, 'detail')
  return (
    <button
      type="button"
      className="subfield-add"
      onClick={onAdd}
      aria-label="Add"
      title={creators.map((c) => c.label).join(' / ')}
    >
      <Icon name="plus" size="body" />
    </button>
  )
}

/** List ⇄ Gallery toggle for NavView (the `none` empty state) — drives the persisted `navViewMode`
 *  slice (separate from NavWindow's `navWindowMode`). Mirrors the NavWindow rail toggle's markup. */
function ViewTypeItem(): React.JSX.Element {
  const mode = useSession((s) => s.navViewMode)
  const setMode = useSession((s) => s.setNavViewMode)
  return (
    <button
      type="button"
      className="subfield-viewtype"
      onClick={() => setMode(mode === 'list' ? 'gallery' : 'list')}
      title={mode === 'list' ? 'Switch to Gallery' : 'Switch to List'}
    >
      <Icon name="chevrons-up-down" size="body" />
      <span>{mode === 'list' ? 'List' : 'Gallery'}</span>
    </button>
  )
}

export function SubfieldItem({
  id,
  scope,
}: { id: SubfieldItemId } & SubfieldItemProps): React.JSX.Element | null {
  switch (id) {
    case 'pageStats':
      return <PageStatsItem scope={scope} />
    case 'addMenu':
      return <AddMenuItem />
    case 'viewType':
      return <ViewTypeItem />
  }
}
