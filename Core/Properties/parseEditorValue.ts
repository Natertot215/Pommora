import type { PropertyValue } from './propertyValue'
import { urlValueFromEdit } from '@pommora/core/Connections/linkValue'
import { resolveTitle } from './Cells/linkResolve'

/** Parse a text-editor string for a number/url property into its committable value. `null` clears
 *  (empty input); `undefined` means invalid — don't commit. Shared by the card value editor and the
 *  add-picker's value pane so both parse identically. */
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
