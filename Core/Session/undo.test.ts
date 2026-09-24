// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { groupUndo, pushUndo, resetUndo } from './undo'

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

describe('pushUndo', () => {
  it('pops the most recent entry first', () => {
    const order: string[] = []
    pushUndo(() => {
      order.push('first')
      return true
    })
    pushUndo(() => {
      order.push('second')
      return true
    })
    expect(cmdZ()).toBe(true)
    expect(cmdZ()).toBe(true)
    expect(order).toEqual(['second', 'first'])
  })

  it('a stale entry drains through to the next one', () => {
    const applied = vi.fn(() => true)
    pushUndo(applied)
    pushUndo(() => false)
    pushUndo(() => false)
    expect(cmdZ()).toBe(true)
    expect(applied).toHaveBeenCalledTimes(1)
  })

  it('forgets every entry on a reset, as a Nexus switch does', () => {
    const applied = vi.fn(() => true)
    pushUndo(applied)
    resetUndo()
    expect(cmdZ()).toBe(false)
    expect(applied).not.toHaveBeenCalled()
  })

  it('leaves the keypress alone when nothing applies', () => {
    pushUndo(() => false)
    expect(cmdZ()).toBe(false)
    expect(cmdZ()).toBe(false)
  })

  it('ignores a keypress inside a text surface', () => {
    const revert = vi.fn(() => true)
    pushUndo(revert)
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

describe('groupUndo', () => {
  it('collapses a run of pushes into one entry that replays in reverse', () => {
    const order: string[] = []
    groupUndo(() => {
      for (const name of ['a', 'b', 'c'])
        pushUndo(() => {
          order.push(name)
          return true
        })
    })
    expect(cmdZ()).toBe(true)
    expect(order).toEqual(['c', 'b', 'a'])
    expect(cmdZ()).toBe(false)
  })

  it('pushes nothing when the run collected no reverts', () => {
    groupUndo(() => {})
    expect(cmdZ()).toBe(false)
  })

  it('applies when any member applies, and is stale when none do', () => {
    groupUndo(() => {
      pushUndo(() => false)
      pushUndo(() => true)
    })
    expect(cmdZ()).toBe(true)
    groupUndo(() => {
      pushUndo(() => false)
      pushUndo(() => false)
    })
    expect(cmdZ()).toBe(false)
  })
})
