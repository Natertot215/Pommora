import { describe, expect, it } from 'vitest'
import { propertyMenuModel } from './propertyMenu'

describe('propertyMenuModel', () => {
  it('editor ⋮ yields Remove then a destructive Delete (A-8)', () => {
    expect(propertyMenuModel({ kind: 'editor', name: 'Status' })).toEqual([
      { label: 'Remove', action: 'property:remove' },
      { label: 'Delete', action: 'property:destroy', separatorBefore: true },
    ])
  })

  it('an assigned row yields Rename · Remove (A-10)', () => {
    expect(
      propertyMenuModel({ kind: 'assigned-row', name: 'Status' }).map((i) => i.action),
    ).toEqual(['property:rename', 'property:remove'])
  })

  it('a page value yields Clear · Remove, led by a separated Edit when editable', () => {
    const rows = (filled: boolean, editable?: boolean) =>
      propertyMenuModel({ kind: 'page-value', name: 'Note', filled, editable }).map((i) => [
        i.action,
        i.separatorBefore,
      ])
    expect(rows(true)).toEqual([
      ['value:clear', undefined],
      ['value:remove', undefined],
    ])
    expect(rows(true, true)).toEqual([
      ['value:edit', undefined],
      ['value:clear', true],
      ['value:remove', undefined],
    ])
    expect(rows(false, true)).toEqual([
      ['value:edit', undefined],
      ['value:remove', true],
    ])
  })
})
