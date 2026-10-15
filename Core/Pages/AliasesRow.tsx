import { useMemo } from 'react'
import { ManageRow } from '@pommora/uix/Menus/ManageRow'
import { ALIAS_ROW_MENU } from '../Actions/aliasRowMenu'
import { popMenu } from '../Actions/menuActions'
import { ALIAS_ICON } from '../Assets/entityIconPolicy'
import { heldAliases } from '../Connections/aliasMemory'
import { AliasList } from '../MarkdownPM/Autocomplete/AliasList'
import { pageMetaOf, useSession } from '../Session/store'
import { editAliasesIn } from './editorHost'

export function AliasesRow({
  page,
}: {
  page: { id: string; path: string; title: string }
}): React.JSX.Element {
  const worn = useSession(pageMetaOf(page.id))?.aliases
  const aliases = useMemo(() => heldAliases(worn ?? [], page.title), [worn, page.title])
  return (
    <ManageRow label="Aliases" icon={ALIAS_ICON} count={aliases.length} solid menu>
      <AliasList
        aliases={aliases}
        host={{
          title: page.title,
          edit: editAliasesIn(page.path),
          menu: () => popMenu(ALIAS_ROW_MENU),
        }}
      />
    </ManageRow>
  )
}
