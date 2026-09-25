import type { PageTarget, SelectionState } from '@pommora/core/Navigation/navRef'
import { Button } from '@pommora/uix/Buttons/Button'
import { useSession } from '../../Session/store'
import { pageStats } from '../../MarkdownPM/Engine/subfieldStats'

type SubfieldItemId = 'pageStats' | 'count'

export interface SubfieldPage {
  target: PageTarget
  body: string
}

export const DEFAULT_ITEMS: Record<SelectionState['kind'], SubfieldItemId[]> = {
  none: ['count'],
  homepage: [],
  matrix: ['count'],
  context: [],
  space: [],
  collection: ['count'],
  set: ['count'],
  page: ['pageStats'],
}

/** A highlight retires the document's own figures: what is measured is what is selected, and the caret alone restores the whole page. */
function PageStatsItem({ page }: { page: SubfieldPage | null }): React.JSX.Element {
  const selection = useSession((s) => s.editorSelection)
  const stats =
    selection && selection.path === page?.target.path ? selection : pageStats(page?.body ?? '')
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

function CountItem({ count }: { count: number | null }): React.JSX.Element | null {
  if (count === null) return null
  return <span title="Results">{count.toLocaleString()}</span>
}

/** Drives `navViewGallery`, separate from NavWindow's own `navWindowGallery`. */
export function ViewTypeItem(): React.JSX.Element {
  const gallery = useSession((s) => s.devicePrefs.navViewGallery === true)
  const setDevicePref = useSession((s) => s.setDevicePref)
  return (
    <Button
      size="button-inline"
      icon="chevrons-up-down"
      iconSize="body"
      paddingX="0"
      label={gallery ? 'Gallery' : 'List'}
      className="subfield-viewtype"
      onClick={() => setDevicePref('navViewGallery', !gallery)}
      title={gallery ? 'Switch to List' : 'Switch to Gallery'}
    />
  )
}

export function SubfieldItem({
  id,
  page,
  count,
}: {
  id: SubfieldItemId
  page: SubfieldPage | null
  count: number | null
}): React.JSX.Element | null {
  switch (id) {
    case 'pageStats':
      return <PageStatsItem page={page} />
    case 'count':
      return <CountItem count={count} />
  }
}
