import { describe, expect, it } from 'vitest'
import { isNavRef, TAB_KINDS, toNavRef } from './navRef'

describe('isNavRef', () => {
  it('admits the id-less Matrix and rejects one carrying an id', () => {
    expect(isNavRef({ kind: 'matrix' })).toBe(true)
    expect(isNavRef({ kind: 'matrix', id: 'x' })).toBe(false)
  })

  it('admits the Matrix against TAB_KINDS, so a stored Matrix tab survives a relaunch', () => {
    expect(isNavRef({ kind: 'matrix' }, TAB_KINDS)).toBe(true)
  })
})

describe('toNavRef', () => {
  it('drops nothing and adds nothing for a singleton', () => {
    expect(toNavRef({ kind: 'matrix' })).toEqual({ kind: 'matrix' })
  })
})
