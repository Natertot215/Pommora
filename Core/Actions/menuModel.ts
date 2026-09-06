export interface ActionItem<A> {
  label: string
  action: A
  /** Leading separators are the caller's to drop — a divider at the top of a menu separates nothing. */
  separatorBefore?: boolean
  /** Shown and refused rather than absent; absent reads as available. */
  disabled?: boolean
  /** Resolves only on confirm; whoever pops the menu owns the dialog. */
  confirm?: boolean
  /** The row in force, out of a set where exactly one is. */
  checked?: boolean
  /** A branch's own `action` is never resolved — the leaf a person lands on is. */
  submenu?: ActionItem<A>[]
}

/** Viewport-relative CSS pixels, as `getBoundingClientRect` gives; absent opens at the cursor. */
export interface MenuAnchor {
  left: number
  top: number
  width: number
  height: number
}

export interface RowMenuRequest {
  items: ActionItem<string>[]
  anchor?: MenuAnchor
}
