// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { groupValueUndo, pushValueUndo } from './valueUndo'

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

beforeEach(() => {
  while (cmdZ()) {}
})

describe('pushValueUndo', () => {
  it('pops the most recent entry first', () => {
    const order: string[] = []
    pushValueUndo(() => {
      order.push('first')
      return true
    })
    pushValueUndo(() => {
      order.push('second')
      return true
    })
    expect(cmdZ()).toBe(true)
    expect(cmdZ()).toBe(true)
    expect(order).toEqual(['second', 'first'])
  })

  it('a stale entry drains through to the next one', () => {
    const applied = vi.fn(() => true)
    pushValueUndo(applied)
    pushValueUndo(() => false)
    pushValueUndo(() => false)
    expect(cmdZ()).toBe(true)
    expect(applied).toHaveBeenCalledTimes(1)
  })

  it('leaves the keypress alone when nothing applies', () => {
    pushValueUndo(() => false)
    expect(cmdZ()).toBe(false)
    expect(cmdZ()).toBe(false)
  })

  it('ignores a keypress inside a text surface', () => {
    const revert = vi.fn(() => true)
    pushValueUndo(revert)
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
    groupValueUndo(() => {
      for (const name of ['a', 'b', 'c'])
        pushValueUndo(() => {
          order.push(name)
          return true
        })
    })
    expect(cmdZ()).toBe(true)
    expect(order).toEqual(['c', 'b', 'a'])
    expect(cmdZ()).toBe(false)
  })

  it('pushes nothing when the run collected no reverts', () => {
    groupValueUndo(() => {})
    expect(cmdZ()).toBe(false)
  })

  it('applies when any member applies, and is stale when none do', () => {
    groupValueUndo(() => {
      pushValueUndo(() => false)
      pushValueUndo(() => true)
    })
    expect(cmdZ()).toBe(true)
    groupValueUndo(() => {
      pushValueUndo(() => false)
      pushValueUndo(() => false)
    })
    expect(cmdZ()).toBe(false)
  })
})
