import { citationsLabel } from '@pommora/core/Actions/toggleLabels'
import { text } from '@pommora/uix/Theme/typography.css'
import { onActivateClick } from '@pommora/uix/Interactions/activate'
import { citationsVisible, useSession } from '../../Session/store'
import { pageStats } from '../../MarkdownPM/subfieldStats'
import type { SubfieldPage } from './subfieldItems'

export function CitationsToggle({ page }: { page: SubfieldPage | null }): React.JSX.Element | null {
  const target = page?.target
  const stats = pageStats(page?.body ?? '')
  const shown = useSession((s) => citationsVisible(s, target?.id))
  const toggle = useSession((s) => s.toggleCitations)
  if (stats.citations === 0 || !target) return null
  const label = citationsLabel(shown)
  return (
    <button
      type="button"
      className={`footnotes-toggle ${text.subline.emphasized}`}
      onClick={() => toggle(target.id)}
      onKeyDown={onActivateClick}
      title={label}
    >
      {label}
    </button>
  )
}
