// The row shape every menu model emits, and the one place it is stated.
//
// A model describes what a menu OFFERS; it never says how the rows are drawn. That is what lets the
// same model reach an OS menu and an in-app pane without either renderer knowing about the other.

/** One actionable row. `action` is the model's own action union, which is why this is generic: a
 *  model stays exhaustively typed while the shape it fills stays shared. */
export interface ActionItem<A> {
  label: string
  action: A
  /** A divider sits above this row, grouping it away from the one before. Leading separators are
   *  the caller's to drop — a divider at the top of a menu separates nothing. */
  separatorBefore?: boolean
  /** Shown and refused rather than absent — for a row whose reason for being unavailable is worth
   *  stating. Absent reads as available. */
  disabled?: boolean
  /** The row asks before it acts, and resolves only on confirm — so no renderer ever sees an
   *  unconfirmed strip. Whoever pops the menu owns the dialog. */
  confirm?: boolean
  /** The row is the one currently in force, out of a set where exactly one is. Absent throughout
   *  means the menu offers commands rather than a choice. */
  checked?: boolean
  /** The row opens a nested list rather than acting. A row that leads somewhere is not itself a
   *  destination, so its own `action` is never resolved — the leaf a person lands on is. */
  submenu?: ActionItem<A>[]
}

/** Where a menu opens: the trigger's box in renderer CSS pixels, viewport-relative — the same
 *  numbers `getBoundingClientRect` gives. Whoever pops the menu converts; a caller measuring in one
 *  coordinate space and a popup expecting another is the whole reason this crosses as a rect rather
 *  than as a point. Absent opens at the cursor, which is what a right-click wants. */
export interface MenuAnchor {
  left: number
  top: number
  width: number
  height: number
}

/** A menu described entirely by its rows — the generic request behind every menu that is a plain
 *  list. One channel serves all of them: the rows ARE the menu, so a per-surface channel would
 *  carry nothing a row doesn't already say. */
export interface RowMenuRequest {
  items: ActionItem<string>[]
  anchor?: MenuAnchor
}
