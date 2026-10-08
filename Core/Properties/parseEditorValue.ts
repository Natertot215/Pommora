import type { PropertyValue } from './propertyValue'
import type { PropertyType } from './properties'
import { linkEditText, linkValueFromEdit } from '../Connections/linkValue'
import { numberFrom } from '@pommora/uix/Pickers/numberUnit'
import { resolveTitle } from './Cells/linkResolve'

export function editorText(value?: PropertyValue | null): string {
  if (value?.kind === 'number') return String(value.value)
  if (value?.kind === 'link') return linkEditText(value.value)
  if (value?.kind === 'text') return value.value.split('\n', 1)[0].trim()
  return ''
}

/** The field edits the first line alone: it lands trimmed, the lines behind it ride through untouched, and an emptied first line drops along with any blank lines under it. */
function textFromEdit(raw: string, current?: PropertyValue | null): PropertyValue | null {
  const first = raw.trim()
  const behind = current?.kind === 'text' ? current.value.split('\n').slice(1) : []
  const lines =
    first === '' ? behind.slice(behind.findIndex((l) => l.trim() !== '')) : [first, ...behind]
  const value = lines.join('\n')
  return value.trim() === '' ? null : { kind: 'text', value }
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
  if (type === 'text') return textFromEdit(raw, current)
  return undefined
}
