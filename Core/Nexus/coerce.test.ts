import { describe, expect, it } from 'vitest'
import { asString } from './coerce'

describe('asString', () => {
  it('returns a string verbatim — it does not police shape', () => {
    expect(asString('research-bizops')).toBe('research-bizops')
  })

  it('is undefined for an absent, non-string, or empty value — YAML admits numbers, maps and lists', () => {
    for (const v of [undefined, 3, null, { nested: true }, ['a'], ''])
      expect(asString(v)).toBeUndefined()
  })
})
