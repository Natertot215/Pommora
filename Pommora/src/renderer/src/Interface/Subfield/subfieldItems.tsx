import type { SelectionState } from '@shared/types'
import { Button } from '@renderer/DesignSystem/Components/Controls/Button'
import { containerCreators } from '@shared/mutate'
import { type PageTarget, useSession } from '../../store'
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

/** The page a host's footer describes and the body it counts — the host hands it down, so the
 *  main pane and a floating window drive the same footer from their own page. */
export interface SubfieldPage {
  target: PageTarget
  body: string
}
export interface SubfieldItemProps {
  page: SubfieldPage | null
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

function PageStatsItem({ page }: SubfieldItemProps): React.JSX.Element {
  const stats = pageStats(page?.body ?? '')
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
  const parentPath =
    selection.kind === 'set' ? selection.path : (findCollection(tree, selection.id)?.path ?? '')
  const creators = containerCreators(selection.kind, parentPath)
  const onAdd = (): void => void useSession.getState().createFromMenu(creators, 'detail')
  return (
    <Button
      size="button-inline"
      icon="plus"
      iconSize="body"
      className="subfield-add"
      onClick={onAdd}
      aria-label="Add"
      title={creators.map((c) => c.label).join(' / ')}
    />
  )
}

/** List ⇄ Gallery toggle for NavView (the `none` empty state) — drives the persisted `navViewMode`
 *  slice (separate from NavWindow's `navWindowMode`). Mirrors the NavWindow rail toggle's markup. */
function ViewTypeItem(): React.JSX.Element {
  const mode = useSession((s) => s.navViewMode)
  const setMode = useSession((s) => s.setNavViewMode)
  return (
    <Button
      size="button-inline"
      icon="chevrons-up-down"
      iconSize="body"
      label={mode === 'list' ? 'List' : 'Gallery'}
      className="subfield-viewtype"
      onClick={() => setMode(mode === 'list' ? 'gallery' : 'list')}
      title={mode === 'list' ? 'Switch to Gallery' : 'Switch to List'}
    />
  )
}

export function SubfieldItem({
  id,
  page,
}: { id: SubfieldItemId } & SubfieldItemProps): React.JSX.Element | null {
  switch (id) {
    case 'pageStats':
      return <PageStatsItem page={page} />
    case 'addMenu':
      return <AddMenuItem />
    case 'viewType':
      return <ViewTypeItem />
  }
}
