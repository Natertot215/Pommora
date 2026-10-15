import { personalizationOf } from '../Session/configSlice'
import { useSession, useSetting } from '../Session/store'
import { previewTargets } from '../Navigation/previewRules'
import { FilterFrame, filterViewOf, standalonePatch } from '../Views/Settings/FilterFrame'
import { ManageRow } from '@pommora/uix/Menus/ManageRow'
import { settingOf } from './personalization'

const live = () => settingOf(personalizationOf(useSession.getState()), 'openInPreview')

export function PreviewRulesRow({
  label,
  hint,
}: {
  label: string
  hint?: string
}): React.JSX.Element | null {
  const value = useSetting('openInPreview')
  const tree = useSession((s) => s.tree)
  const setPersonalization = useSession((s) => s.setPersonalization)
  if (!tree) return null
  return (
    <ManageRow label={label} hint={hint} count={value.rules?.rules.length ?? 0}>
      <FilterFrame
        locations={tree.collections}
        view={filterViewOf(value)}
        read={() => filterViewOf(live())}
        schema={[]}
        tree={tree}
        targets={previewTargets(tree)}
        onCommit={(p) => setPersonalization('openInPreview', { ...live(), ...standalonePatch(p) })}
      />
    </ManageRow>
  )
}
