import type { PropertyValue } from './propertyValue'
import { urlValueFromEdit } from '@pommora/core/Connections/linkValue'
import { resolveTitle } from './Cells/linkResolve'

/** `null` clears (empty input); `undefined` means invalid — don't commit. */
export function parseEditorValue(
  type: string | undefined,
  raw: string,
): PropertyValue | null | undefined {
  const trimmed = raw.trim()
  if (type === 'number') {
    if (trimmed === '') return null
    const n = Number.parseFloat(trimmed)
    return Number.isNaN(n) ? undefined : { kind: 'number', value: n }
  }
  if (type === 'url') return urlValueFromEdit(trimmed, undefined, resolveTitle)
  return undefined
}
