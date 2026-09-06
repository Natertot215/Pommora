export interface ActionItem<A> {
  label: string
  action: A
  /** Leading separators are the caller's to drop — a divider at the top of a menu separates nothing. */
  separatorBefore?: boolean
  disabled?: boolean
  confirm?: boolean
  checked?: boolean
  /** A branch's own `action` is never resolved — the leaf a person lands on is. */
  submenu?: ActionItem<A>[]
}

export function afterSeparator<A>(rows: readonly ActionItem<A>[]): ActionItem<A>[] {
  return rows.length === 0 ? [] : [{ ...rows[0], separatorBefore: true }, ...rows.slice(1)]
}

/** Viewport-relative CSS pixels, as `getBoundingClientRect` gives; absent opens at the cursor. */
export interface MenuAnchor {
  left: number
  top: number
  width: number
  height: number
}

export interface RowMenuRequest {
  items: readonly ActionItem<string>[]
  anchor?: MenuAnchor
}
