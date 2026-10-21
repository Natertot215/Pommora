import { describe, expect, it } from 'vitest'
import { actedOn } from './checkSet'

const id = (key: string): string => key

describe('actedOn', () => {
  it('a right-click on an unchecked item acts on it alone, whatever else is checked', () => {
    expect(actedOn(new Set(['a', 'c']), ['c', 'b', 'a'], 'b', id)).toEqual(['b'])
  })

  it('a checked item takes the checked items still shown, in their shown order', () => {
    expect(actedOn(new Set(['a', 'c', 'z']), ['c', 'b', 'a'], 'a', id)).toEqual(['c', 'a'])
  })
})
