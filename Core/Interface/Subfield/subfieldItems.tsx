import type { SelectionState } from '@pommora/core/Navigation/navRef'
import { Button } from '@pommora/uix/Buttons/Button'
import { type PageTarget, useSession } from '../../Session/store'
import { pageStats } from '../../MarkdownPM/Engine/subfieldStats'

type SubfieldItemId = 'pageStats' | 'viewType'

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
  collection: [],
  set: [],
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
    case 'viewType':
      return <ViewTypeItem />
  }
}
