import { describe, expect, it } from 'vitest'
import { isForeignRef, isNavRef, toNavRef } from './navRef'

describe('isNavRef', () => {
  it('admits the id-less Matrix and rejects one carrying an id', () => {
    expect(isNavRef({ kind: 'matrix' })).toBe(true)
    expect(isNavRef({ kind: 'matrix', id: 'x' })).toBe(false)
  })

  it("admits an archive place by its owner's id and refuses one without", () => {
    expect(isNavRef({ kind: 'archive', id: 'c1' })).toBe(true)
    expect(isNavRef({ kind: 'archive' })).toBe(false)
    expect(isForeignRef({ kind: 'archive', id: 'c1' })).toBe(false)
  })
})

describe('isForeignRef', () => {
  it('names a reference of a kind this build can’t navigate, and nothing malformed', () => {
    expect(isForeignRef({ kind: 'task', id: 'x' })).toBe(true)
    expect(isForeignRef({ kind: 'page' })).toBe(false)
    expect(isForeignRef('task')).toBe(false)
  })
})

describe('toNavRef', () => {
  it('drops nothing and adds nothing for a singleton', () => {
    expect(toNavRef({ kind: 'matrix' })).toEqual({ kind: 'matrix' })
  })
})
