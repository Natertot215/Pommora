// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Undo = typeof import('./valueUndo')

let undo: Undo
beforeEach(async () => {
  vi.resetModules()
  undo = await import('./valueUndo')
})

const cmdZ = (target: EventTarget = window): boolean => {
  const e = new KeyboardEvent('keydown', {
    key: 'z',
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(e)
  return e.defaultPrevented
}

describe('pushValueUndo', () => {
  it('pops the most recent entry first', () => {
    const order: string[] = []
    undo.pushValueUndo(() => {
      order.push('first')
      return true
    })
    undo.pushValueUndo(() => {
      order.push('second')
      return true
    })
    expect(cmdZ()).toBe(true)
    expect(cmdZ()).toBe(true)
    expect(order).toEqual(['second', 'first'])
  })

  it('a stale entry drains through to the next one', () => {
    const applied = vi.fn(() => true)
    undo.pushValueUndo(applied)
    undo.pushValueUndo(() => false)
    undo.pushValueUndo(() => false)
    expect(cmdZ()).toBe(true)
    expect(applied).toHaveBeenCalledTimes(1)
  })

  it('leaves the keypress alone when nothing applies', () => {
    undo.pushValueUndo(() => false)
    expect(cmdZ()).toBe(false)
    expect(cmdZ()).toBe(false)
  })

  it('ignores a keypress inside a text surface', () => {
    const revert = vi.fn(() => true)
    undo.pushValueUndo(revert)
    const input = document.createElement('input')
    document.body.append(input)
    expect(cmdZ(input)).toBe(false)
    const editor = document.createElement('div')
    editor.className = 'cm-editor'
    const inner = document.createElement('span')
    editor.append(inner)
    document.body.append(editor)
    expect(cmdZ(inner)).toBe(false)
    expect(revert).not.toHaveBeenCalled()
    expect(cmdZ()).toBe(true)
  })
})

describe('groupValueUndo', () => {
  it('collapses a run of pushes into one entry that replays in reverse', () => {
    const order: string[] = []
    undo.groupValueUndo(() => {
      for (const name of ['a', 'b', 'c'])
        undo.pushValueUndo(() => {
          order.push(name)
          return true
        })
    })
    expect(cmdZ()).toBe(true)
    expect(order).toEqual(['c', 'b', 'a'])
    expect(cmdZ()).toBe(false)
  })

  it('pushes nothing when the run collected no reverts', () => {
    undo.groupValueUndo(() => {})
    expect(cmdZ()).toBe(false)
  })

  it('applies when any member applies, and is stale when none do', () => {
    undo.groupValueUndo(() => {
      undo.pushValueUndo(() => false)
      undo.pushValueUndo(() => true)
    })
    expect(cmdZ()).toBe(true)
    undo.groupValueUndo(() => {
      undo.pushValueUndo(() => false)
      undo.pushValueUndo(() => false)
    })
    expect(cmdZ()).toBe(false)
  })
})
