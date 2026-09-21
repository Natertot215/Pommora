import { describe, expect, it } from 'vitest'
import { resolveRowOrder } from './rowOrder'

const items = [{ k: 'a' }, { k: 'b' }, { k: 'c' }]
const keyOf = (i: { k: string }): string => i.k

describe('resolveRowOrder', () => {
  it('puts the listed first in listed order and the unlisted after in arrival order', () => {
    expect(resolveRowOrder(items, keyOf, ['c', 'a']).map(keyOf)).toEqual(['c', 'a', 'b'])
  })

  it('ignores a listed key no item answers', () => {
    expect(resolveRowOrder(items, keyOf, ['z', 'b']).map(keyOf)).toEqual(['b', 'a', 'c'])
  })

  it('is identity over an empty or absent list', () => {
    expect(resolveRowOrder(items, keyOf, []).map(keyOf)).toEqual(['a', 'b', 'c'])
    expect(resolveRowOrder(items, keyOf).map(keyOf)).toEqual(['a', 'b', 'c'])
  })
})
