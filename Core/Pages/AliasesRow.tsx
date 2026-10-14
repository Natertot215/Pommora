import { useMemo, useState } from 'react'
import { InputField } from '@pommora/uix/Fields/InputField'
import { type ManageFieldProps, ManageList, ManageRow } from '@pommora/uix/Menus/ManageRow'
import { Icon } from '@pommora/uix/Symbols'
import { ALIAS_ICON } from '../Assets/entityIconPolicy'
import { type AliasEdit, heldAliases } from '../Connections/aliasMemory'
import { normalizeTitle } from '../Paths/caseFold'
import { pageMetaOf, useSession } from '../Session/store'

export function AliasesRow({
  page,
}: {
  page: { id: string; path: string; title: string }
}): React.JSX.Element {
  const worn = useSession(pageMetaOf(page.id))?.aliases
  const aliases = useMemo(() => heldAliases(worn ?? [], page.title), [worn, page.title])
  const mutate = useSession((s) => s.mutate)
  const edit = async (e: AliasEdit): Promise<boolean> =>
    (await mutate({ op: 'editAliases', path: page.path, edit: e })) !== null
  return (
    <ManageRow label="Aliases" icon={ALIAS_ICON} count={aliases.length} solid>
      <ManageList
        values={aliases}
        noun="alias"
        field={(props) => <AliasField {...props} title={page.title} />}
        onAdd={(alias) => edit({ op: 'add', alias })}
        onRename={(from, to) => edit({ op: 'rename', from, to })}
        onRemove={(alias) => void edit({ op: 'forget', alias })}
      />
    </ManageRow>
  )
}

// A draft opens editing with its caret seated.
function AliasField({
  value,
  onCommit,
  onCancel,
  title,
}: ManageFieldProps & { title: string }): React.JSX.Element {
  const [editing, setEditing] = useState(onCancel !== undefined)
  return (
    <InputField
      chrome="bordered"
      label="Alias"
      leading={<Icon name={ALIAS_ICON} size="body" />}
      edit={{
        value,
        onCommit,
        onCancel,
        renames: 'row',
        invalid: (text) => normalizeTitle(text) === normalizeTitle(title),
        editing,
        onEditingChange: setEditing,
      }}
    >
      {value}
    </InputField>
  )
}
