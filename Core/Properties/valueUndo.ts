import { matchesCommand } from '@pommora/uix/Interactions/chords'

type Revert = () => boolean

const stack: Revert[] = []
let group: Revert[] | null = null
let installed = false

const onKey = (e: KeyboardEvent): void => {
  if (e.defaultPrevented || !matchesCommand('cmd+z', e)) return
  if (
    e.target instanceof Element &&
    e.target.closest('input,textarea,[contenteditable],.cm-editor')
  )
    return
  // A stale entry drains rather than eating the keypress — nothing was reverted, so the event stays available.
  while (stack.length) {
    const revert = stack.pop() as Revert
    if (revert()) {
      e.preventDefault()
      return
    }
  }
}

export function pushValueUndo(revert: Revert): void {
  if (group) {
    group.push(revert)
    return
  }
  if (!installed) {
    installed = true
    window.addEventListener('keydown', onKey)
  }
  stack.push(revert)
}

/** A fan-out's reverts collapse into one entry, so the whole sweep walks back on a single ⌘Z. */
export function groupValueUndo(run: () => void): void {
  const collected: Revert[] = []
  group = collected
  try {
    run()
  } finally {
    group = null
  }
  if (!collected.length) return
  pushValueUndo(() => {
    let applied = false
    for (let i = collected.length - 1; i >= 0; i--) if (collected[i]()) applied = true
    return applied
  })
}
