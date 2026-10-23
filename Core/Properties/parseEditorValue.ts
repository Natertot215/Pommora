import { type PropertyValue, readNumber } from './propertyValue'
import type { ColumnType } from './properties'
import { linkValueFromEdit } from '../Connections/linkValue'
import type { ConnPage, PageIndex } from '../Connections/pageIndex'

interface LinkEditContext {
  index: PageIndex | undefined
  own: ConnPage | undefined
}

export function editorText(value?: PropertyValue | null): string {
  if (value?.kind === 'number') return String(value.value)
  if (value?.kind === 'link') return value.value
  if (value?.kind === 'text') return value.value.split('\n', 1)[0].trim()
  return ''
}

/** The field edits the first line alone: it lands trimmed, the lines behind it ride through untouched, and an emptied first line drops along with any blank lines under it. */
function textFromEdit(raw: string, current?: PropertyValue | null): PropertyValue | null {
  const first = raw.trim()
  const behind = current?.kind === 'text' ? current.value.split('\n').slice(1) : []
  const kept = behind.findIndex((l) => l.trim() !== '')
  const lines = first === '' ? (kept === -1 ? [] : behind.slice(kept)) : [first, ...behind]
  const value = lines.join('\n')
  return value.trim() === '' ? null : { kind: 'text', value }
}

/** `null` clears (empty input); `undefined` means invalid — don't commit. */
export function parseEditorValue(
  type: ColumnType | undefined,
  raw: string,
  current?: PropertyValue | null,
  link?: LinkEditContext,
): PropertyValue | null | undefined {
  if (type === 'number') {
    if (raw.trim() === '') return null
    const n = readNumber(raw)
    return n === undefined ? undefined : { kind: 'number', value: n }
  }
  if (type === 'link' && link) return linkValueFromEdit(raw, link.index, link.own)
  if (type === 'text') return textFromEdit(raw, current)
  return undefined
}
