import { PANE_MIN_W } from '@pommora/uix/Menus/frame-slide.css'
import { RESERVED_PROPERTY_ID } from '../Properties/properties'
import { personalizationOf } from '../Session/configSlice'
import { useSession, useSetting } from '../Session/store'
import { filterTargets } from '../Views/filterModel'
import { FilterFrame, filterViewOf, standalonePatch } from '../Views/Settings/FilterFrame'
import { ManageRow } from './ManageRow'
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
    <ManageRow
      label={label}
      hint={hint}
      count={value.rules?.rules.length ?? 0}
      style={{ minWidth: PANE_MIN_W }}
    >
      <FilterFrame
        locations={tree.collections}
        view={filterViewOf(value)}
        read={() => filterViewOf(live())}
        schema={[]}
        tree={tree}
        targets={filterTargets([], tree, tree.collections.length > 0).filter(
          (t) => t.id !== RESERVED_PROPERTY_ID.modifiedAt,
        )}
        onCommit={(p) => setPersonalization('openInPreview', { ...live(), ...standalonePatch(p) })}
      />
    </ManageRow>
  )
}
