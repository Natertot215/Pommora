import type { RefObject } from 'react'
import { linkAlias, urlValueFromRename } from '@shared/linkValue'
import { useSession } from '@renderer/store'
import { PickerMenu } from '@renderer/DesignSystem/Pickers/picker-base'
import { TextPicker } from '@renderer/DesignSystem/Pickers/TextPicker'
import { solidColorCss } from '@renderer/DesignSystem/Tokens/solidColor'
import { contextOptionsFor } from '@renderer/Properties/contextOptions'
import { resolveFieldValue } from '@renderer/Properties/value'
import { DatetimeValuePicker } from './DatetimeValuePicker'
import { PropertyPicker, syntheticContextDef } from './PropertyPicker'
import type { Editing, PropertyRows } from './usePropertyRows'

export function PropertyValueEditors({
  editing,
  onDone,
  triggerRef,
  row,
  schema,
  isContextRow,
  commitValue,
  commitContext,
}: Pick<PropertyRows, 'schema' | 'isContextRow' | 'commitValue' | 'commitContext'> & {
  editing: Editing
  onDone: () => void
  triggerRef: RefObject<HTMLElement | null>
  row: NonNullable<PropertyRows['row']>
}): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const rawLinkOf = (id: string): string => {
    const v = resolveFieldValue(row, id, schema)
    return v.kind === 'url' ? v.value : ''
  }
  const def = editing ? schema.find((d) => d.id === editing.id) : undefined
  const editingDef =
    editing && (def ?? (isContextRow(editing.id) ? syntheticContextDef(editing.id) : undefined))
  return (
    <>
      {editing?.mode === 'rename' && (
        <TextPicker
          open
          triggerRef={triggerRef}
          value={linkAlias(rawLinkOf(editing.id)) ?? ''}
          accent={solidColorCss(def?.link_color)}
          onCommit={(alias) => {
            commitValue(editing.id, urlValueFromRename(alias, rawLinkOf(editing.id)))
            onDone()
          }}
          onDismiss={onDone}
        />
      )}
      {editingDef && editing?.mode === 'picker' && (
        <PropertyPicker
          def={editingDef}
          current={resolveFieldValue(row, editing.id, schema)}
          open
          triggerRef={triggerRef}
          {...(editingDef.type === 'context' && tree
            ? { contextOptions: contextOptionsFor(editing.id, tree) }
            : {})}
          onCommit={(v) => {
            if (isContextRow(editing.id))
              commitContext(editing.id, v?.kind === 'context' ? v.value : [])
            else commitValue(editing.id, v)
          }}
          onDismiss={onDone}
        />
      )}
      <PickerMenu solid open={editing?.mode === 'date'} onDismiss={onDone} triggerRef={triggerRef}>
        {editing?.mode === 'date' && (
          <DatetimeValuePicker
            value={resolveFieldValue(row, editing.id, schema)}
            onCommit={(v) => commitValue(editing.id, v)}
          />
        )}
      </PickerMenu>
    </>
  )
}
