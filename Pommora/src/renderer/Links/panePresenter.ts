// The hover preview's presenter slot, apart from the pane itself. The pane claims it at mount and
// releases it on unmount; every call that opens, retargets, or closes a pane goes through here.
//
// A leaf on purpose: the pane's own module reaches into MarkdownPM, while the editor's pointer path
// and the table's resting cells both have to be able to close a pane. Importing the component for
// that closes a cycle between the two, which the runtime resolves by leaving one side's bindings
// uninitialized at first render.
import type { Hovered } from './ConnectionPane'

let present: ((next: Hovered | null) => void) | null = null

/** The pane claims the slot at mount and passes null to release it. */
export function setHoverCardPresenter(fn: ((next: Hovered | null) => void) | null): void {
  present = fn
}

/** Show, retarget, or close. A call before the pane mounts is a no-op, which is the right answer for
 *  a hover on a surface that carries no pane. */
export const presentHoverCard = (next: Hovered | null): void => present?.(next)

export const closeActiveHoverCard = (): void => present?.(null)
