// An option's `value` IS its title (value=label), so identity keys on the value string.

import type { OptionAppearance, PropertyType, StatusGroup, StatusOption } from './properties'

export type Option = {
  value: string
  label: string
  color?: string
  icon?: string
  appearance?: OptionAppearance
  group_id?: string
}

export function fallbackTitle(type: PropertyType, groupLabel?: string): string {
  return type === 'status' ? (groupLabel ?? 'Label') : 'Label'
}

function mapOption<T extends { value: string }>(options: T[], value: string, fn: (o: T) => T): T[] {
  return options.map((o) => (o.value === value ? fn(o) : o))
}

function mapStatusOption(
  groups: StatusGroup[],
  value: string,
  fn: (o: StatusOption) => StatusOption,
): StatusGroup[] {
  return groups.map((g) => ({ ...g, options: mapOption(g.options, value, fn) }))
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
  options: Option[],
  title: string,
  groupId?: string,
  /** Omitted appends — the ghost slot passes the seat it was standing in, so an option created off a chip takes that chip's place in the order. */
  atIndex?: number,
): Option[] {
  const next = { value: title, label: title, ...(groupId ? { group_id: groupId } : {}) }
  const i = atIndex ?? options.length
  return [...options.slice(0, i), next, ...options.slice(i)]
}

export function addStatusOption(
  groups: StatusGroup[],
  groupId: string,
  title: string,
  atIndex?: number,
): StatusGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g
    const next = { value: title, label: title, group_id: g.id }
    const i = atIndex ?? g.options.length
    return { ...g, options: [...g.options.slice(0, i), next, ...g.options.slice(i)] }
  })
}

export function recolorStatusOption(
  groups: StatusGroup[],
  value: string,
  color: string | undefined,
): StatusGroup[] {
  return mapStatusOption(groups, value, (o) => withField(o, 'color', color))
}

/** By its OLD value. The page cascade (main-process) rewrites the stored label on every assigning page. */
export function renameStatusOption(
  groups: StatusGroup[],
  oldValue: string,
  newTitle: string,
): StatusGroup[] {
  return mapStatusOption(groups, oldValue, (o) => ({ ...o, value: newTitle, label: newTitle }))
}

export function relabelStatusGroup(
  groups: StatusGroup[],
  groupId: string,
  label: string,
): StatusGroup[] {
  return groups.map((g) => (g.id === groupId ? { ...g, label } : g))
}

/** toIndex is in the target group's without-the-dragged coordinate space; a cross-group move inherits the new group's color unless it carries its own. */
export function moveStatusOption(
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

export function renameOption(options: Option[], oldValue: string, title: string): Option[] {
  return mapOption(options, oldValue, (o) => ({ ...o, value: title, label: title }))
}

export function recolorOption(
  options: Option[],
  value: string,
  color: string | undefined,
): Option[] {
  return mapOption(options, value, (o) => withField(o, 'color', color))
}

export function setOptionIcon(
  options: Option[],
  value: string,
  icon: string | undefined,
): Option[] {
  return mapOption(options, value, (o) => withField(o, 'icon', icon))
}

export function setOptionAppearance(
  options: Option[],
  value: string,
  appearance: OptionAppearance,
): Option[] {
  return mapOption(options, value, (o) =>
    withField(o, 'appearance', appearance === 'clear' ? appearance : undefined),
  )
}

export function setStatusOptionIcon(
  groups: StatusGroup[],
  value: string,
  icon: string | undefined,
): StatusGroup[] {
  return mapStatusOption(groups, value, (o) => withField(o, 'icon', icon))
}

export function setStatusOptionAppearance(
  groups: StatusGroup[],
  value: string,
  appearance: OptionAppearance,
): StatusGroup[] {
  return mapStatusOption(groups, value, (o) =>
    withField(o, 'appearance', appearance === 'clear' ? appearance : undefined),
  )
}

export function reorderOption(options: Option[], value: string, toIndex: number): Option[] {
  const moved = options.find((o) => o.value === value)
  if (!moved) return options
  const without = options.filter((o) => o.value !== value)
  return [...without.slice(0, toIndex), moved, ...without.slice(toIndex)]
}
