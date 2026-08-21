// The hover card's presenter slot, apart from the card itself. The card claims it at mount and
// releases it on unmount; every call that opens, retargets, or closes a card goes through here.
//
// It is a leaf on purpose. The card's own module reaches into MarkdownPM — the editor's fold and its
// connections model — while the editor's pointer path and the table's resting cells both have to be
// able to close a card. Importing the component for that closes a cycle between the two, which the
// runtime resolves by leaving one side's bindings uninitialized at first render.
import type { Hovered } from './ConnectionHoverCard'

let present: ((next: Hovered | null) => void) | null = null

/** The card claims the slot at mount and passes null to release it. */
export function setHoverCardPresenter(fn: ((next: Hovered | null) => void) | null): void {
  present = fn
}

/** Show, retarget, or close. A call before the card mounts is a no-op, which is the right answer for
 *  a hover on a surface that carries no card. */
export const presentHoverCard = (next: Hovered | null): void => present?.(next)

export const closeActiveHoverCard = (): void => present?.(null)
