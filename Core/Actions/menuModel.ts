export interface ActionItem<A> {
  label: string
  action: A
  /** Leading separators are the caller's to drop — a divider at the top of a menu separates nothing. */
  separatorBefore?: boolean
  disabled?: boolean
  checked?: boolean
  // A registry icon name, drawn by the in-app presenter; an OS menu draws its own marks. A string, since this file sits in the engine graph and IconName would pull the registry in.
  icon?: string
  /** A branch's own `action` is never resolved — the leaf a person lands on is. */
  submenu?: ActionItem<A>[]
}

export function afterSeparator<A>(rows: readonly ActionItem<A>[]): ActionItem<A>[] {
  return rows.length === 0 ? [] : [{ ...rows[0], separatorBefore: true }, ...rows.slice(1)]
}

// Viewport-relative CSS pixels; the host converts to DIPs.
export interface MenuAnchor {
  left: number
  top: number
  height: number
}

export interface MenuRequest {
  items: readonly ActionItem<string>[]
  anchor?: MenuAnchor
}
