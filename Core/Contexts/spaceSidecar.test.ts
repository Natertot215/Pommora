import { describe, expect, it } from 'vitest'
import { readSpaceRowOrder, spaceFieldsFrom, withOrderEntry } from './spaceSidecar'

describe('spaceFieldsFrom', () => {
  it('reads the four modeled fields and leaves values undefined when nothing is left', () => {
    const fields = spaceFieldsFrom({
      id: 'sp1',
      icon: 'folder',
      banner: 'Loose/b.png',
      heading_icon_hidden: true,
      $color: 'mint',
      '<Areas>': ['Home'],
    })
    expect(fields).toEqual({
      icon: 'folder',
      banner: 'Loose/b.png',
      headingIconHidden: true,
      color: 'mint',
      values: undefined,
    })
  })

  it('collects exactly the unmodeled, unwrapped keys into values', () => {
    const fields = spaceFieldsFrom({
      id: 'sp1',
      icon: 'folder',
      $color: 'mint',
      '<Areas>': ['Home'],
      Status: 'Active',
      $order: { contexts: ['g1'], properties: ['prop_a'] },
    })
    expect(fields.values).toEqual({
      Status: 'Active',
      $order: { contexts: ['g1'], properties: ['prop_a'] },
    })
  })
})

describe('readSpaceRowOrder', () => {
  it('reads two empty lists for a missing or malformed $order', () => {
    expect(readSpaceRowOrder(undefined)).toEqual({ contexts: [], properties: [] })
    expect(readSpaceRowOrder({})).toEqual({ contexts: [], properties: [] })
    expect(readSpaceRowOrder({ $order: 'nope' })).toEqual({ contexts: [], properties: [] })
    expect(readSpaceRowOrder({ $order: { contexts: 'nope' } })).toEqual({
      contexts: [],
      properties: [],
    })
  })

  it('keeps only a list string entries', () => {
    expect(readSpaceRowOrder({ $order: { contexts: ['g1', 7, null, 'g2'] } })).toEqual({
      contexts: ['g1', 'g2'],
      properties: [],
    })
  })
})

describe('withOrderEntry', () => {
  const inert = (): null => null
  const raw = {
    Status: 'Active',
    $order: { contexts: ['g1', 'g2'], properties: ['prop_a'] },
  }

  it('renames the entry in place over an inner rewrite that changed nothing', () => {
    const out = withOrderEntry(inert, 'properties', 'prop_a', 'prop_b')(raw, 'f')
    expect(out).toEqual({
      Status: 'Active',
      $order: { contexts: ['g1', 'g2'], properties: ['prop_b'] },
    })
  })

  it('drops the entry when `to` is null', () => {
    const out = withOrderEntry(inert, 'contexts', 'g1', null)(raw, 'f')
    expect(out).toEqual({
      Status: 'Active',
      $order: { contexts: ['g2'], properties: ['prop_a'] },
    })
  })

  it('returns the inner answer when the list does not name `from`', () => {
    expect(withOrderEntry(inert, 'contexts', 'g9', 'g8')(raw, 'f')).toBeNull()
  })

  it('rewrites the entry over the object the inner rewrite returned', () => {
    const inner = (r: Record<string, unknown>): Record<string, unknown> => ({
      ...r,
      Stage: 'Active',
    })
    const out = withOrderEntry(inner, 'properties', 'prop_a', 'prop_b')(raw, 'f')
    expect(out).toEqual({
      Status: 'Active',
      Stage: 'Active',
      $order: { contexts: ['g1', 'g2'], properties: ['prop_b'] },
    })
  })
})
