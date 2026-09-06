import type { SelectionState } from '@pommora/core/Navigation/navRef'
import { Button } from '@pommora/uix/Buttons/Button'
import { containerCreators } from '@pommora/core/Pages/mutateRequest'
import { type PageTarget, useSession } from '../../Session/store'
import { findCollection } from '../../Session/treeIndex'
import { pageStats } from '../../MarkdownPM/Engine/subfieldStats'

type SubfieldItemId = 'pageStats' | 'addMenu' | 'viewType'

export interface SubfieldPage {
  target: PageTarget
  body: string
}
interface SubfieldItemProps {
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

/** Drives `navViewMode`, separate from NavWindow's own `navWindowMode`. */
function ViewTypeItem(): React.JSX.Element {
  const mode = useSession((s) => s.navViewMode)
  const setMode = useSession((s) => s.setNavViewMode)
  return (
    <Button
      size="button-inline"
      icon="chevrons-up-down"
      iconSize="body"
      paddingX="0"
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
