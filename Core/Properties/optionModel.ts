import { z } from 'zod'
import { optionAppearance, type StatusGroup, type StatusOption } from './properties'

function mapOption(
  groups: StatusGroup[],
  value: string,
  fn: (o: StatusOption) => StatusOption,
): StatusGroup[] {
  return groups.map((g) => ({
    ...g,
    options: g.options.map((o) => (o.value === value ? fn(o) : o)),
  }))
}

function withField<T extends { value: string }, K extends keyof T>(
  o: T,
  key: K,
  v: T[K] | undefined,
): T {
  const { [key]: _drop, ...rest } = o
  return (v ? { ...rest, [key]: v } : rest) as T
}

export function addOption(
  groups: StatusGroup[],
  groupId: string,
  title: string,
  atIndex?: number,
): StatusGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g
    const next = { value: title, group_id: g.id }
    const i = atIndex ?? g.options.length
    return { ...g, options: [...g.options.slice(0, i), next, ...g.options.slice(i)] }
  })
}

export function renameOption(
  groups: StatusGroup[],
  oldValue: string,
  newTitle: string,
): StatusGroup[] {
  return mapOption(groups, oldValue, (o) => ({ ...o, value: newTitle }))
}

export function moveOption(
  groups: StatusGroup[],
  value: string,
  toGroupId: string,
  toIndex: number,
): StatusGroup[] {
  const moved = groups.flatMap((g) => g.options).find((o) => o.value === value)
  if (!moved) return groups
  const next = { ...moved, group_id: toGroupId }
  return groups.map((g) => {
    const without = g.options.filter((o) => o.value !== value)
    return g.id === toGroupId
      ? { ...g, options: [...without.slice(0, toIndex), next, ...without.slice(toIndex)] }
      : { ...g, options: without }
  })
}

const edit = <K extends string, S extends z.ZodRawShape>(literal: K, fields: S) =>
  z.object({ op: z.literal(literal), ...fields })
const value = z.string()
const groupId = z.string()
const index = z.number().int().nonnegative()

export const optionEdit = z.discriminatedUnion('op', [
  edit('add', { groupId, title: z.string(), atIndex: index.optional() }),
  edit('recolor', { value, color: z.string().optional() }),
  edit('icon', { value, icon: z.string().optional() }),
  edit('appearance', { value, appearance: optionAppearance }),
  edit('move', { value, groupId, toIndex: index }),
  edit('relabelGroup', { groupId, label: z.string().min(1) }),
])
export type OptionEdit = z.infer<typeof optionEdit>

export function applyOptionEdit(groups: StatusGroup[], e: OptionEdit): StatusGroup[] {
  switch (e.op) {
    case 'add':
      return addOption(groups, e.groupId, e.title, e.atIndex)
    case 'recolor':
      return mapOption(groups, e.value, (o) => withField(o, 'color', e.color))
    case 'icon':
      return mapOption(groups, e.value, (o) => withField(o, 'icon', e.icon))
    case 'appearance':
      return mapOption(groups, e.value, (o) =>
        withField(o, 'appearance', e.appearance === 'clear' ? e.appearance : undefined),
      )
    case 'move':
      return moveOption(groups, e.value, e.groupId, e.toIndex)
    case 'relabelGroup':
      return groups.map((g) => (g.id === e.groupId ? { ...g, label: e.label } : g))
  }
}
