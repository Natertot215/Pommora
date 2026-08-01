import { describe, expect, it } from 'vitest'
import { diffBaselines, type EntityRecord, isEmptyDiff } from './record'

const page = (over: Partial<EntityRecord> = {}): EntityRecord => ({
  id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  kind: 'page',
  title: 'Reading Notes',
  path: 'Library/Reading Notes.md',
  state: 'present',
  ...over,
})

const asBaseline = (...entries: EntityRecord[]): Record<string, EntityRecord> =>
  Object.fromEntries(entries.map((e) => [e.id, e]))

describe('diffBaselines', () => {
  it('reports nothing on identical maps', () => {
    const a = asBaseline(page())
    const d = diffBaselines(a, asBaseline(page()))
    expect(isEmptyDiff(d)).toBe(true)
    expect(d).toEqual({ added: [], removed: [], changed: [] })
  })

  it('reports nothing when both sides are empty', () => {
    expect(isEmptyDiff(diffBaselines({}, {}))).toBe(true)
  })

  it('catches an added key', () => {
    const fresh = page({ id: '01BX5ZZKBKACTAV9WEVGEMMVRZ', title: 'New Page' })
    const d = diffBaselines(asBaseline(page()), asBaseline(page(), fresh))
    expect(d.added).toEqual([fresh])
    expect(d.removed).toEqual([])
    expect(d.changed).toEqual([])
  })

  it('catches a removed key', () => {
    const gone = page({ id: '01BX5ZZKBKACTAV9WEVGEMMVRZ', title: 'Old Page' })
    const d = diffBaselines(asBaseline(page(), gone), asBaseline(page()))
    expect(d.removed).toEqual([gone])
    expect(d.added).toEqual([])
  })

  it('reports an unreadable transition as a change, never a delete', () => {
    const before = page()
    const after = page({ state: 'unreadable' })
    const d = diffBaselines(asBaseline(before), asBaseline(after))
    expect(d.removed).toEqual([])
    expect(d.added).toEqual([])
    expect(d.changed).toEqual([{ before, after }])
  })

  it('catches a scalar field change per side of the union', () => {
    const before = page()
    const renamed = page({ title: 'Reading Log', path: 'Library/Reading Log.md' })
    const d = diffBaselines(asBaseline(before), asBaseline(renamed))
    expect(d.changed).toEqual([{ before, after: renamed }])
    expect(isEmptyDiff(d)).toBe(false)
  })

  it('covers context records the same as node kinds', () => {
    const ctx: EntityRecord = {
      id: '01CTXZZKBKACTAV9WEVGEMMVRZ',
      kind: 'context',
      title: 'Areas',
      path: 'Contexts/Areas',
      state: 'present',
    }
    const d = diffBaselines({}, asBaseline(ctx))
    expect(d.added).toEqual([ctx])
  })
})
