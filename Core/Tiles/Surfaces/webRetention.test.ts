import { afterEach, describe, expect, it } from 'vitest'
import { webGuestRetention as r } from './webRetention'

const CAP = 5

const id = (): symbol => Symbol()
const held: symbol[] = []
const hide = (evicted: string[], name: string, sym = id()): symbol => {
  held.push(sym)
  r.hide(sym, () => evicted.push(name))
  return sym
}
const fill = (evicted: string[]): void => {
  for (let i = 0; i < CAP; i++) hide(evicted, `f${i}`)
}

afterEach(() => {
  for (const sym of held.splice(0)) r.show(sym)
})

describe('webGuestRetention', () => {
  it('keeps hidden guests up to the cap without evicting', () => {
    const evicted: string[] = []
    fill(evicted)
    expect(evicted).toEqual([])
  })

  it('evicts the least-recently-hidden guest over the cap', () => {
    const evicted: string[] = []
    fill(evicted)
    hide(evicted, 'late')
    expect(evicted).toEqual(['f0'])
  })

  it('re-hiding refreshes recency instead of double-counting', () => {
    const evicted: string[] = []
    const a = hide(evicted, 'a')
    for (let i = 0; i < CAP - 1; i++) hide(evicted, `f${i}`)
    hide(evicted, 'a', a)
    hide(evicted, 'late')
    expect(evicted).toEqual(['f0'])
  })

  it('a guest back in view leaves the hidden set and cannot be evicted', () => {
    const evicted: string[] = []
    const a = hide(evicted, 'a')
    r.show(a)
    fill(evicted)
    expect(evicted).toEqual([])
  })
})
