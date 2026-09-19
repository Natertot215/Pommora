import { describe, expect, it } from 'vitest'
import { type Json, isMergedJson, mergeDepthFor, mergeKeys } from './jsonMerge'

type Pick = () => 'local' | 'remote'

const takeLocal: Pick = () => 'local'
const takeRemote: Pick = () => 'remote'
const neverPicks: Pick = () => {
  throw new Error('pick() was consulted for a key only one side changed.')
}

const merge = (base: Json, local: Json, remote: Json, depth = {}, pick: Pick = neverPicks): Json =>
  mergeKeys(base, local, remote, depth, pick)

describe('mergeKeys', () => {
  it('keeps two different personalization changes from two sides', () => {
    const base = { personalization: { accent: 'lavender', density: 'cozy' } }
    const local = { personalization: { accent: 'moss', density: 'cozy' } }
    const remote = { personalization: { accent: 'lavender', density: 'tight' } }
    expect(merge(base, local, remote, { personalization: 1 })).toEqual({
      personalization: { accent: 'moss', density: 'tight' },
    })
  })

  it('merges two sides that both created a depth key the base lacked', () => {
    const local = { personalization: { accent: 'red' } }
    const remote = { personalization: { font: 'serif' } }
    expect(merge({}, local, remote, { personalization: 1 })).toEqual({
      personalization: { accent: 'red', font: 'serif' },
    })
  })

  it('deletes a key one side removed and the other left alone', () => {
    expect(merge({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2 })).toEqual({ a: 1 })
    expect(merge({ a: 1, b: 2 }, { a: 1, b: 2 }, { a: 1 })).toEqual({ a: 1 })
  })

  it('takes pick() for a key both sides changed', () => {
    const base = { title: 'one' }
    expect(merge(base, { title: 'local' }, { title: 'remote' }, {}, takeRemote)).toEqual({
      title: 'remote',
    })
    expect(merge(base, { title: 'local' }, { title: 'remote' }, {}, takeLocal)).toEqual({
      title: 'local',
    })
  })

  it('takes an array inside a key whole', () => {
    const base = { order: { collections: ['a', 'b'] } }
    const local = { order: { collections: ['a', 'b', 'c'] } }
    const remote = { order: { collections: ['b', 'a'] } }
    expect(merge(base, local, remote, { order: 1 }, takeLocal)).toEqual({
      order: { collections: ['a', 'b', 'c'] },
    })
  })

  it('yields remote when base is empty and local is unchanged', () => {
    expect(merge({}, {}, { banner: 'sky', tiles: [1, 2] })).toEqual({
      banner: 'sky',
      tiles: [1, 2],
    })
  })

  it('names the merged set and the depth table', () => {
    expect(isMergedJson('.nexus/settings.json')).toBe(true)
    expect(isMergedJson('Notes/_pagecollection.json')).toBe(true)
    expect(isMergedJson('.nexus/homepage/_tiles.json')).toBe(true)
    expect(isMergedJson('Notes/A.md')).toBe(false)
    expect(isMergedJson('assets/x.json')).toBe(false)

    expect(mergeDepthFor('.nexus/settings.json')).toEqual({ personalization: 1 })
    expect(mergeDepthFor('.nexus/state.json')).toEqual({ order: 1, navigation: 1 })
    expect(mergeDepthFor('.nexus/properties.json')).toEqual({ defs: 1 })
    expect(mergeDepthFor('.nexus/assets/crops.json')).toEqual({ byImage: 1 })
    expect(mergeDepthFor('.nexus/homepage/homepage.json')).toEqual({})
    expect(mergeDepthFor('.nexus/matrix.json')).toEqual({
      group: 1,
      filter: 1,
      forces: 1,
      display: 1,
    })
  })

  it('merges two forces keys and takes one side of rules whole', () => {
    const depth = mergeDepthFor('.nexus/matrix.json')
    const base = {
      forces: { gravity: 0.5, spread: 0.5 },
      filter: { rules: { match: 'all', rules: [{ key: 'Status' }] } },
    }
    const local = {
      forces: { gravity: 0.9, spread: 0.5 },
      filter: { rules: { match: 'all', rules: [{ key: 'Area' }] } },
    }
    const remote = {
      forces: { gravity: 0.5, spread: 0.1 },
      filter: { rules: { match: 'any', rules: [{ key: 'Topic' }] } },
    }
    expect(merge(base, local, remote, depth, takeRemote)).toEqual({
      forces: { gravity: 0.9, spread: 0.1 },
      filter: { rules: { match: 'any', rules: [{ key: 'Topic' }] } },
    })
  })
})
