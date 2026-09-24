import { matchesCommand } from '@pommora/uix/Interactions/chords'
import { useSession } from './store'

type Revert = () => boolean

const DEPTH = 100
const stack: Revert[] = []
let group: Revert[] | null = null
let installed = false

const onKey = (e: KeyboardEvent): void => {
  if (e.defaultPrevented || !matchesCommand(useSession.getState().commands['undo-value'], e)) return
  if (
    e.target instanceof Element &&
    e.target.closest('input,textarea,[contenteditable],.cm-editor')
  )
    return
  for (let revert = stack.pop(); revert; revert = stack.pop()) {
    if (revert()) {
      e.preventDefault()
      return
    }
  }
}

export function pushUndo(revert: Revert): void {
  if (group) {
    group.push(revert)
    return
  }
  if (!installed) {
    installed = true
    window.addEventListener('keydown', onKey)
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
