import { describe, expect, it } from 'vitest'
import { reconcile } from './reconcile'

describe('reconcile', () => {
  it('spends an entry only on a landed write; a refused one stays kept', async () => {
    const { spent, kept } = await reconcile({ a: 1, b: 2, c: 3 }, async (id) => id !== 'b')
    expect(spent.sort()).toEqual(['a', 'c'])
    expect(kept).toEqual({ b: 2 })
  })

  it('a throwing item stays kept and the rest continue', async () => {
    const { spent, kept } = await reconcile({ a: 1, b: 2, c: 3 }, async (id) => {
      if (id === 'b') throw new Error('mid-loop failure')
      return true
    })
    expect(spent.sort()).toEqual(['a', 'c'])
    expect(kept).toEqual({ b: 2 })
  })

  it('empty entries reconcile to nothing spent, nothing kept', async () => {
    const { spent, kept } = await reconcile({}, async () => true)
    expect(spent).toEqual([])
    expect(kept).toEqual({})
  })

  it('hands each entry its own value', async () => {
    const seen: Record<string, unknown> = {}
    await reconcile({ x: 'first', y: 'second' }, async (id, value) => {
      seen[id] = value
      return false
    })
    expect(seen).toEqual({ x: 'first', y: 'second' })
  })
})
