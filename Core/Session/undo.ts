import { EDITABLE_TARGETS } from '@pommora/uix/Interactions/shared'

type Revert = () => boolean

const DEPTH = 100
const stack: Revert[] = []
let group: Revert[] | null = null

export function undoValue(target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest(`${EDITABLE_TARGETS}, .cm-editor`)) return false
  for (let revert = stack.pop(); revert; revert = stack.pop()) if (revert()) return true
  return false
}

export function pushUndo(revert: Revert): void {
  if (group) {
    group.push(revert)
    return
  }
  if (stack.push(revert) > DEPTH) stack.shift()
}

/** An undo reaches into the Nexus it was taken in, so a switch leaves none behind. */
export const resetUndo = (): void => {
  stack.length = 0
}

export function groupUndo(run: () => void): void {
  const collected: Revert[] = []
  group = collected
  try {
    run()
  } finally {
    group = null
  }
  if (!collected.length) return
  pushUndo(() => {
    let applied = false
    for (let i = collected.length - 1; i >= 0; i--) if (collected[i]()) applied = true
    return applied
  })
}
