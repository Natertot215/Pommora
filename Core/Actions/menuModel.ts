export interface ActionItem<A> {
  label: string
  action: A
  separatorBefore?: boolean
  disabled?: boolean
  checked?: boolean
  icon?: string
  stay?: boolean
  /** A branch's own `action` is never resolved — the leaf a person lands on is. */
  submenu?: ActionItem<A>[]
}

export function afterSeparator<A>(rows: readonly ActionItem<A>[]): ActionItem<A>[] {
  return rows.length === 0 ? [] : [{ ...rows[0], separatorBefore: true }, ...rows.slice(1)]
}

export function withoutLeadingSeparator<A>(
  rows: readonly ActionItem<A>[],
): readonly ActionItem<A>[] {
  return rows[0]?.separatorBefore
    ? [{ ...rows[0], separatorBefore: false }, ...rows.slice(1)]
    : rows
}

export interface MenuAnchor {
  left: number
  top: number
  height: number
}

export interface MenuRequest {
  items: readonly ActionItem<string>[]
  anchor?: MenuAnchor
}

export interface MenuOptions<A extends string = string> {
  solid?: boolean
  stay?: (action: A) => readonly ActionItem<A>[]
  compact?: boolean
}
