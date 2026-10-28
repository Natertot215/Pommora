import { personalizationOf } from '../Session/configSlice'
import { useSession, useSetting } from '../Session/store'
import { previewTargets } from '../Navigation/previewRules'
import { FilterFrame, filterViewOf, standalonePatch } from '../Views/Settings/FilterFrame'
import { ManageRow } from '@pommora/uix/Menus/ManageRow'
import { settingOf } from './personalization'
import type { RowOf } from './frames'

const live = () => settingOf(personalizationOf(useSession.getState()), 'openInPreview')

export function PreviewRulesRow({ row }: { row: RowOf<'previewRules'> }): React.JSX.Element | null {
  const value = useSetting('openInPreview')
  const tree = useSession((s) => s.tree)
  const setPersonalization = useSession((s) => s.setPersonalization)
  if (!tree) return null
  return (
    <ManageRow
      label={row.label}
      caption={row.caption}
      info={row.info}
      count={value.rules?.rules.length ?? 0}
    >
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
