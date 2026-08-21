import { citationsLabel } from '@shared/toggleLabels'
import { text } from '@renderer/design-system/tokens/typography.css'
import { onActivateClick } from '@renderer/design-system/interactions/activate'
import { openPageBody, useSession } from '../../store'
import { pageStats } from './subfieldStats'
import type { SubfieldScope } from './subfieldItems'

/** Show / Hide Footnotes for the open page — a lead control in the reveal band above the Subfield,
 *  facing the bar's own collapse chevron across it. It rides that band rather than the bar's item
 *  row so the two disclosures read as one kind of chrome.
 *
 *  Absent from a page with no citation lines: there is nothing to disclose. Present the moment one
 *  exists, an orphan included, so a section can never become unreachable. The label states what the
 *  click will do and reads the current state at once. */
export function CitationsToggle({ scope }: { scope?: SubfieldScope }): React.JSX.Element | null {
  const pageDetail = useSession((s) => s.pageDetail)
  const liveBody = useSession((s) => s.liveBody)
  const target = scope ? scope.target : pageDetail
  const body = scope ? scope.body : openPageBody(pageDetail, liveBody)
  const stats = pageStats(body)
  const fallback = useSession((s) => s.personalization.citationsShown ?? false)
  const override = useSession((s) => (target ? s.citationsShown[target.id] : undefined))
  const toggle = useSession((s) => s.toggleCitations)
  if (stats.citations === 0 || !target) return null
  const shown = override ?? fallback
  return (
    <button
      type="button"
      className={`footnotes-toggle ${text.subline.emphasized}`}
      onClick={() => toggle(target.id)}
      onKeyDown={onActivateClick}
      title={citationsLabel(shown)}
    >
      {citationsLabel(shown)}
    </button>
  )
}
