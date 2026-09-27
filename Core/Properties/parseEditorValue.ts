import type { PropertyValue } from './propertyValue'
import type { PropertyType } from './properties'
import { linkEditText, linkValueFromEdit } from '@pommora/core/Connections/linkValue'
import { numberFrom } from '@pommora/uix/Pickers/numberUnit'
import { resolveTitle } from './Cells/linkResolve'

export function editorText(value?: PropertyValue | null): string {
  if (value?.kind === 'number') return String(value.value)
  if (value?.kind === 'link') return linkEditText(value.value)
  return ''
}

/** `null` clears (empty input); `undefined` means invalid — don't commit. */
export function parseEditorValue(
  type: PropertyType | 'title' | undefined,
  raw: string,
  current?: PropertyValue | null,
): PropertyValue | null | undefined {
  if (type === 'number') {
    if (raw.trim() === '') return null
    const n = numberFrom(raw)
    return n === undefined ? undefined : { kind: 'number', value: n }
  }
  if (type === 'link')
    return linkValueFromEdit(
      raw,
      current?.kind === 'link' ? current.value : undefined,
      resolveTitle,
    )
  return undefined
}
