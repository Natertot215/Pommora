import { matchesCommand } from '@renderer/Actions/Commands'

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

export function pushValueUndo(revert: () => void): void {
  if (!installed) {
    installed = true
    window.addEventListener('keydown', onKey)
  }
  stack.push(revert)
}
