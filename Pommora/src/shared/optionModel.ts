// Pure option-array transforms shared by the renderer panes and the main-process option ops. An
// option's `value` IS its title (value=label), so identity keys on the value string. No I/O, no React
// — unit-tested in isolation; the IPC ops and panes are thin over these.

import type { OptionAppearance, PropertyType, StatusGroup, StatusOption } from './properties'

export type Option = {
  value: string
  label: string
  color?: string
  icon?: string
  appearance?: OptionAppearance
  group_id?: string
}

/** The empty-name fallback when a rename field is left blank: Select / Multi → "Label"; Status → its
 *  group's label (so an unnamed status option reads as its group). */
export function fallbackTitle(type: PropertyType, groupLabel?: string): string {
  return type === 'status' ? (groupLabel ?? 'Label') : 'Label'
}

export function addOption(
  options: Option[],
  title: string,
  groupId?: string,
  /** Omitted appends — the ghost slot passes the seat it was standing in, so an option created off a
   *  chip takes that chip's place in the order rather than the list's end. */
  atIndex?: number,
): Option[] {
  const next = { value: title, label: title, ...(groupId ? { group_id: groupId } : {}) }
  const i = atIndex ?? options.length
  return [...options.slice(0, i), next, ...options.slice(i)]
}

/** Adds to one status group (matched by id). No color, so the chip inherits the group's until recolored. */
export function addStatusOption(
  groups: StatusGroup[],
  groupId: string,
  title: string,
  /** Where in the group the new option lands; omitted appends. */
  atIndex?: number,
): StatusGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g
    const next = { value: title, label: title, group_id: g.id }
    const i = atIndex ?? g.options.length
    return { ...g, options: [...g.options.slice(0, i), next, ...g.options.slice(i)] }
  })
}

/** undefined clears the key → the chip falls back to its group's color. */
export function recolorStatusOption(
  groups: StatusGroup[],
  value: string,
  color: string | undefined,
): StatusGroup[] {
  return groups.map((g) => ({
    ...g,
    options: g.options.map((o) => {
      if (o.value !== value) return o
      const { color: _drop, ...rest } = o
      return color ? { ...rest, color } : rest
    }),
  }))
}

/** By its OLD value. The page cascade (main-process) rewrites the stored label on every assigning page. */
export function renameStatusOption(
  groups: StatusGroup[],
  oldValue: string,
  newTitle: string,
): StatusGroup[] {
  return groups.map((g) => ({
    ...g,
    options: g.options.map((o) =>
      o.value === oldValue ? { ...o, value: newTitle, label: newTitle } : o,
    ),
  }))
}

/** Rename a group's display label (by group id); its calendar-locked id + its options are untouched. */
export function relabelStatusGroup(
  groups: StatusGroup[],
  groupId: string,
  label: string,
): StatusGroup[] {
  return groups.map((g) => (g.id === groupId ? { ...g, label } : g))
}

/** Same group = a reorder; a different group = a cross-group move that inherits the new group's color
 *  unless it carries its own. toIndex is in the target group's without-the-dragged coordinate space. */
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
  return options.map((o) => (o.value === oldValue ? { ...o, value: title, label: title } : o))
}

/** One transform applied to the option with `value`, the rest passed through. */
function mapOption(options: Option[], value: string, fn: (o: Option) => Option): Option[] {
  return options.map((o) => (o.value === value ? fn(o) : o))
}

export function recolorOption(
  options: Option[],
  value: string,
  color: string | undefined,
): Option[] {
  return mapOption(options, value, ({ color: _drop, ...rest }) =>
    color ? { ...rest, color } : rest,
  )
}

/** undefined removes the field → the chip falls back to the type default, single tag for select and
 *  double for multi. */
export function setOptionIcon(
  options: Option[],
  value: string,
  icon: string | undefined,
): Option[] {
  return mapOption(options, value, ({ icon: _drop, ...rest }) => (icon ? { ...rest, icon } : rest))
}

/** Filled is the default, so it clears the key rather than being written. */
export function setOptionAppearance(
  options: Option[],
  value: string,
  appearance: OptionAppearance,
): Option[] {
  return mapOption(options, value, ({ appearance: _drop, ...rest }) =>
    appearance === 'clear' ? { ...rest, appearance } : rest,
  )
}

/** One flat-option transform applied to the status option with `value`, whichever group holds it. */
function mapStatusOption(
  groups: StatusGroup[],
  value: string,
  fn: (o: StatusOption) => StatusOption,
): StatusGroup[] {
  return groups.map((g) => ({
    ...g,
    options: g.options.map((o) => (o.value === value ? fn(o) : o)),
  }))
}

/** undefined removes the field → the chip falls back to its group's glyph. */
export function setStatusOptionIcon(
  groups: StatusGroup[],
  value: string,
  icon: string | undefined,
): StatusGroup[] {
  return mapStatusOption(groups, value, ({ icon: _drop, ...rest }) =>
    icon ? { ...rest, icon } : rest,
  )
}

export function setStatusOptionAppearance(
  groups: StatusGroup[],
  value: string,
  appearance: OptionAppearance,
): StatusGroup[] {
  return mapStatusOption(groups, value, ({ appearance: _drop, ...rest }) =>
    appearance === 'clear' ? { ...rest, appearance } : rest,
  )
}

/** Move the option with `value` to `toIndex` (in the without-the-dragged coordinate space). */
export function reorderOption(options: Option[], value: string, toIndex: number): Option[] {
  const moved = options.find((o) => o.value === value)
  if (!moved) return options
  const without = options.filter((o) => o.value !== value)
  return [...without.slice(0, toIndex), moved, ...without.slice(toIndex)]
}
