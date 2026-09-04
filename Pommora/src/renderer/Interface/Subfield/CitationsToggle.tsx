import { citationsLabel } from '@shared/toggleLabels'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import { onActivateClick } from '@renderer/Interactions/activate'
import { citationsVisible, useSession } from '../../store'
import { pageStats } from './subfieldStats'
import type { SubfieldPage } from './subfieldItems'

/** Show / Hide Footnotes for the open page — a lead control in the reveal band above the Subfield,
 *  facing the bar's own collapse chevron. Absent from a page with no citation lines; present the
 *  moment one exists (an orphan included), so a section can never become unreachable. */
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
