import { describe, it, expect } from 'vitest'
import { decodeTime } from 'ulidx'
import { newId, isUlid, adoptedId, mintPropertyId, idTime, idAt } from './ids'

describe('newId / isUlid', () => {
  it('mints valid, unique ULIDs', () => {
    const a = newId()
    const b = newId()
    expect(isUlid(a)).toBe(true)
    expect(isUlid(b)).toBe(true)
    expect(a).not.toBe(b)
  })

  it('is monotonic — a batch sorts in mint order', () => {
    const ids = Array.from({ length: 50 }, () => newId())
    expect([...ids].sort()).toEqual(ids)
  })

  it('rejects non-ULIDs', () => {
    expect(isUlid('')).toBe(false)
    expect(isUlid('not-a-ulid')).toBe(false)
    expect(isUlid(adoptedId('x'))).toBe(false)
  })
})

describe('idTime', () => {
  it('decodes a minted id to its mint instant', () => {
    const id = newId()
    expect(idTime(id)).toBe(decodeTime(id))
  })

  it('returns null for a shape-valid id the decoder refuses', () => {
    expect(idTime(`8${newId().slice(1)}`)).toBeNull()
  })

  it('returns null for an adopted id', () => {
    expect(idTime(adoptedId('a/b.md'))).toBeNull()
  })
})

describe('idAt', () => {
  it('round-trips through idTime', () => {
    const at = Date.parse('2019-03-04T05:06:07.089Z')
    expect(idTime(idAt(at))).toBe(at)
  })

  it('accepts a fractional seed and a negative one', () => {
    expect(idTime(idAt(1788295304609.0347))).toBe(1788295304609)
    expect(idTime(idAt(-5))).toBe(0)
  })
})

describe('adoptedId', () => {
  it('is stable for the same path', () => {
    expect(adoptedId('Notes/Page.md')).toBe(adoptedId('Notes/Page.md'))
  })

  it('differs for different paths', () => {
    expect(adoptedId('Notes/A.md')).not.toBe(adoptedId('Notes/B.md'))
  })

  it('is the adopted-<16 hex> shape', () => {
    expect(adoptedId('x')).toMatch(/^adopted-[0-9a-f]{16}$/)
  })
})

describe('mintPropertyId', () => {
  it('mints a prop_<ulid> id whose suffix is a valid ULID', () => {
    const id = mintPropertyId()
    expect(id.startsWith('prop_')).toBe(true)
    expect(isUlid(id.slice('prop_'.length))).toBe(true)
  })

  it('mints unique ids', () => {
    expect(mintPropertyId()).not.toBe(mintPropertyId())
  })
})
