// The row shape every menu model emits, and the one place it is stated.
//
// A model describes what a menu OFFERS; it never says how the rows are drawn. That is what lets the
// same model reach an OS menu and an in-app pane without either renderer knowing about the other.

/** `action` is the model's own action union, which is why this is generic: a model stays
 *  exhaustively typed while the shape it fills stays shared. */
export interface ActionItem<A> {
  label: string
  action: A
  /** Leading separators are the caller's to drop — a divider at the top of a menu separates nothing. */
  separatorBefore?: boolean
  /** Shown and refused rather than absent, for a row whose reason for being unavailable is worth
   *  stating. Absent reads as available. */
  disabled?: boolean
  /** The row asks before it acts, resolving only on confirm — no renderer ever sees an unconfirmed
   *  strip. Whoever pops the menu owns the dialog. */
  confirm?: boolean
  /** The row currently in force, out of a set where exactly one is. Absent throughout means the
   *  menu offers commands rather than a choice. */
  checked?: boolean
  /** A row that leads somewhere is not itself a destination, so its own `action` is never resolved —
   *  the leaf a person lands on is. */
  submenu?: ActionItem<A>[]
}

/** The trigger's box in renderer CSS pixels, viewport-relative — the same numbers
 *  `getBoundingClientRect` gives. Crosses as a rect rather than a point so the popup, not the
 *  caller, converts coordinate spaces. Absent opens at the cursor, for a right-click. */
export interface MenuAnchor {
  left: number
  top: number
  width: number
  height: number
}

/** The generic request behind every menu that is a plain list. One channel serves all of them: the
 *  rows ARE the menu, so a per-surface channel would carry nothing a row doesn't already say. */
export interface RowMenuRequest {
  items: ActionItem<string>[]
  anchor?: MenuAnchor
}
