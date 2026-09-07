import type { PropertyValue } from './propertyValue'
import { urlValueFromEdit } from '@pommora/core/Connections/linkValue'
import { resolveTitle } from './Cells/linkResolve'

/** `null` clears (empty input); `undefined` means invalid — don't commit. */
export function parseEditorValue(
  type: string | undefined,
  raw: string,
  current?: PropertyValue | null,
): PropertyValue | null | undefined {
  if (type === 'number') {
    const trimmed = raw.trim()
    if (trimmed === '') return null
    const n = Number.parseFloat(trimmed)
    return Number.isNaN(n) ? undefined : { kind: 'number', value: n }
  }
  if (type === 'url')
    return urlValueFromEdit(raw, current?.kind === 'url' ? current.value : undefined, resolveTitle)
  return undefined
}
