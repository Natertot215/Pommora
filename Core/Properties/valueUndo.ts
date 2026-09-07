import { matchesCommand } from '@pommora/uix/Interactions/chords'

type Revert = () => boolean

const DEPTH = 100
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
  for (let revert = stack.pop(); revert; revert = stack.pop()) {
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
  if (stack.push(revert) > DEPTH) stack.shift()
}

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
