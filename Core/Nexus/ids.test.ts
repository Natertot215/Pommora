import { describe, it, expect } from 'vitest'
import { decodeTime } from 'ulidx'
import { isUlidShaped } from './identityMark'
import { newId, mintPropertyId, idTime, idAt, contentIdAt, shardOf } from './ids'

describe('newId / isUlidShaped', () => {
  it('mints valid, unique ULIDs', () => {
    const a = newId()
    const b = newId()
    expect(isUlidShaped(a)).toBe(true)
    expect(isUlidShaped(b)).toBe(true)
    expect(a).not.toBe(b)
  })

  it('is monotonic — a batch sorts in mint order', () => {
    const ids = Array.from({ length: 50 }, () => newId())
    expect([...ids].sort()).toEqual(ids)
  })

  it('rejects non-ULIDs', () => {
    expect(isUlidShaped('')).toBe(false)
    expect(isUlidShaped('not-a-ulid')).toBe(false)
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

describe('shardOf', () => {
  it('names the month of the id in UTC, whatever the local zone', () => {
    const tz = process.env.TZ
    process.env.TZ = 'Pacific/Kiritimati'
    try {
      expect(shardOf(contentIdAt(Date.UTC(2026, 8, 30, 23, 30), 'page'))).toBe('09-2026')
    } finally {
      if (tz === undefined) delete process.env.TZ
      else process.env.TZ = tz
    }
  })

  it('maps a minted page id to its month', () => {
    expect(shardOf('01KZSWEW0WPF1PFWWJSKE8Q83P')).toBe('08-2026')
  })
})

describe('mintPropertyId', () => {
  it('mints a prop_<ulid> id whose suffix is a valid ULID', () => {
    const id = mintPropertyId()
    expect(id.startsWith('prop_')).toBe(true)
    expect(isUlidShaped(id.slice('prop_'.length))).toBe(true)
  })

  it('mints unique ids', () => {
    expect(mintPropertyId()).not.toBe(mintPropertyId())
  })
})
