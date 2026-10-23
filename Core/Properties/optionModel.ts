import { z } from 'zod'
import { index, op } from '../Files/decoders'
import { formatKey, type KeyFormat } from './keyFormat'
import { optionAppearance, type SelectOption, type StatusGroup } from './properties'

export function mapOptions(
  groups: StatusGroup[],
  fn: (o: SelectOption) => SelectOption,
): StatusGroup[] {
  return groups.map((g) => ({ ...g, options: g.options.map(fn) }))
}

function mapOption(
  groups: StatusGroup[],
  id: string,
  fn: (o: SelectOption) => SelectOption,
): StatusGroup[] {
  return mapOptions(groups, (o) => (o.id === id ? fn(o) : o))
}

function withField<T, K extends keyof T>(o: T, key: K, v: T[K] | undefined): T {
  const { [key]: _drop, ...rest } = o
  return (v ? { ...rest, [key]: v } : rest) as T
}

export function addOption(
  groups: StatusGroup[],
  groupId: string,
  option: SelectOption,
  atIndex?: number,
): StatusGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g
    const i = atIndex ?? g.options.length
    return { ...g, options: [...g.options.slice(0, i), option, ...g.options.slice(i)] }
  })
}

function moveOption(
  groups: StatusGroup[],
  id: string,
  toGroupId: string,
  toIndex: number,
): StatusGroup[] {
  const moved = groups.flatMap((g) => g.options).find((o) => o.id === id)
  if (!moved) return groups
  return groups.map((g) => {
    const without = g.options.filter((o) => o.id !== id)
    return g.id === toGroupId
      ? { ...g, options: [...without.slice(0, toIndex), moved, ...without.slice(toIndex)] }
      : { ...g, options: without }
  })
}

const optionId = z.string()
const groupId = z.string()

export const optionEdit = z.discriminatedUnion('op', [
  op('add', { groupId, id: z.string().min(1), label: z.string(), atIndex: index.optional() }),
  op('recolor', { optionId, color: z.string().optional() }),
  op('icon', { optionId, icon: z.string().optional() }),
  op('appearance', { optionId, appearance: optionAppearance }),
  op('move', { optionId, groupId, toIndex: index }),
  op('relabelGroup', { groupId, label: z.string() }),
])
export type OptionEdit = z.infer<typeof optionEdit>

export function applyOptionEdit(
  groups: StatusGroup[],
  e: OptionEdit,
  format?: KeyFormat,
): StatusGroup[] {
  switch (e.op) {
    case 'add':
      return addOption(
        groups,
        e.groupId,
        { id: e.id, key: formatKey(e.label, format), label: e.label },
        e.atIndex,
      )
    case 'recolor':
      return mapOption(groups, e.optionId, (o) => withField(o, 'color', e.color))
    case 'icon':
      return mapOption(groups, e.optionId, (o) => withField(o, 'icon', e.icon))
    case 'appearance':
      return mapOption(groups, e.optionId, (o) =>
        withField(o, 'appearance', e.appearance === 'clear' ? e.appearance : undefined),
      )
    case 'move':
      return moveOption(groups, e.optionId, e.groupId, e.toIndex)
    case 'relabelGroup':
      return groups.map((g) => (g.id === e.groupId ? { ...g, label: e.label } : g))
  }
}
