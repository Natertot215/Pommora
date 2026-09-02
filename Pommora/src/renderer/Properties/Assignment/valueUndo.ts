import { matchesCommand } from '@renderer/Actions/commands'

const stack: Array<() => void> = []
let installed = false

const onKey = (e: KeyboardEvent): void => {
  if (e.defaultPrevented || !matchesCommand('cmd+z', e)) return
  if (
    e.target instanceof Element &&
    e.target.closest('input,textarea,[contenteditable],.cm-editor')
  )
    return
  const revert = stack.pop()
  if (!revert) return
  e.preventDefault()
  revert()
}

export function pushValueUndo(revert: () => void): () => void {
  if (!installed) {
    installed = true
    window.addEventListener('keydown', onKey)
  }
  stack.push(revert)
  return () => {
    const at = stack.indexOf(revert)
    if (at !== -1) stack.splice(at, 1)
  }
}
