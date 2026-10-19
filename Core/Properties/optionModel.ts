import { z } from 'zod'
import { index, op } from '../Files/decoders'
import { formatKey, type KeyFormat } from './keyFormat'
import { optionAppearance, type StatusGroup, type StatusOption } from './properties'

export function mapOptions(
  groups: StatusGroup[],
  fn: (o: StatusOption) => StatusOption,
): StatusGroup[] {
  return groups.map((g) => ({ ...g, options: g.options.map(fn) }))
}

function mapOption(
  groups: StatusGroup[],
  label: string,
  fn: (o: StatusOption) => StatusOption,
): StatusGroup[] {
  return mapOptions(groups, (o) => (o.label === label ? fn(o) : o))
}

function withField<T, K extends keyof T>(o: T, key: K, v: T[K] | undefined): T {
  const { [key]: _drop, ...rest } = o
  return (v ? { ...rest, [key]: v } : rest) as T
}

export function addOption(
  groups: StatusGroup[],
  groupId: string,
  label: string,
  key: string,
  atIndex?: number,
): StatusGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g
    const next = { key, label, group_id: g.id }
    const i = atIndex ?? g.options.length
    return { ...g, options: [...g.options.slice(0, i), next, ...g.options.slice(i)] }
  })
}

function moveOption(
  groups: StatusGroup[],
  label: string,
  toGroupId: string,
  toIndex: number,
): StatusGroup[] {
  const moved = groups.flatMap((g) => g.options).find((o) => o.label === label)
  if (!moved) return groups
  const next = { ...moved, group_id: toGroupId }
  return groups.map((g) => {
    const without = g.options.filter((o) => o.label !== label)
    return g.id === toGroupId
      ? { ...g, options: [...without.slice(0, toIndex), next, ...without.slice(toIndex)] }
      : { ...g, options: without }
  })
}

const option = z.string()
const groupId = z.string()

export const optionEdit = z.discriminatedUnion('op', [
  op('add', { groupId, label: z.string(), atIndex: index.optional() }),
  op('recolor', { option, color: z.string().optional() }),
  op('icon', { option, icon: z.string().optional() }),
  op('appearance', { option, appearance: optionAppearance }),
  op('move', { option, groupId, toIndex: index }),
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
      return addOption(groups, e.groupId, e.label, formatKey(e.label, format), e.atIndex)
    case 'recolor':
      return mapOption(groups, e.option, (o) => withField(o, 'color', e.color))
    case 'icon':
      return mapOption(groups, e.option, (o) => withField(o, 'icon', e.icon))
    case 'appearance':
      return mapOption(groups, e.option, (o) =>
        withField(o, 'appearance', e.appearance === 'clear' ? e.appearance : undefined),
      )
    case 'move':
      return moveOption(groups, e.option, e.groupId, e.toIndex)
    case 'relabelGroup':
      return groups.map((g) => (g.id === e.groupId ? { ...g, label: e.label } : g))
  }
}
