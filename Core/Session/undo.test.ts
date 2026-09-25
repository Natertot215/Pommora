// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { groupUndo, pushUndo, resetUndo, undoValue } from './undo'

beforeEach(resetUndo)

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
    expect(undoValue(null)).toBe(true)
    expect(undoValue(null)).toBe(true)
    expect(order).toEqual(['second', 'first'])
  })

  it('a stale entry drains through to the next one', () => {
    const applied = vi.fn(() => true)
    pushUndo(applied)
    pushUndo(() => false)
    pushUndo(() => false)
    expect(undoValue(null)).toBe(true)
    expect(applied).toHaveBeenCalledTimes(1)
  })

  it('forgets every entry on a reset, as a Nexus switch does', () => {
    const applied = vi.fn(() => true)
    pushUndo(applied)
    resetUndo()
    expect(undoValue(null)).toBe(false)
    expect(applied).not.toHaveBeenCalled()
  })

  it('leaves the keypress alone when nothing applies', () => {
    pushUndo(() => false)
    expect(undoValue(null)).toBe(false)
    expect(undoValue(null)).toBe(false)
  })

  it('ignores a keypress inside a text surface', () => {
    const revert = vi.fn(() => true)
    pushUndo(revert)
    const input = document.createElement('input')
    document.body.append(input)
    expect(undoValue(input)).toBe(false)
    const editor = document.createElement('div')
    editor.className = 'cm-editor'
    const inner = document.createElement('span')
    editor.append(inner)
    document.body.append(editor)
    expect(undoValue(inner)).toBe(false)
    expect(revert).not.toHaveBeenCalled()
    expect(undoValue(null)).toBe(true)
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
    expect(undoValue(null)).toBe(true)
    expect(order).toEqual(['c', 'b', 'a'])
    expect(undoValue(null)).toBe(false)
  })

  it('pushes nothing when the run collected no reverts', () => {
    groupUndo(() => {})
    expect(undoValue(null)).toBe(false)
  })

  it('applies when any member applies, and is stale when none do', () => {
    groupUndo(() => {
      pushUndo(() => false)
      pushUndo(() => true)
    })
    expect(undoValue(null)).toBe(true)
    groupUndo(() => {
      pushUndo(() => false)
      pushUndo(() => false)
    })
    expect(undoValue(null)).toBe(false)
  })
})
