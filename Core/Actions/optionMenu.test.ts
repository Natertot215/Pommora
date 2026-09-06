import { describe, expect, it } from 'vitest'
import { optionMenuModel } from './optionMenu'

describe('the option chip menu', () => {
  it('divides the two destructive rows from Rename, and offers Edit Icon only where an icon is its own', () => {
    expect(optionMenuModel().map((i) => [i.label, i.separatorBefore ?? false])).toEqual([
      ['Rename', false],
      ['Remove', true],
      ['Clear', false],
    ])
    expect(optionMenuModel(true).map((i) => i.label)).toEqual([
      'Rename',
      'Edit Icon',
      'Remove',
      'Clear',
    ])
  })

  it('marks Remove and Clear as asking first', () => {
    expect(
      optionMenuModel()
        .filter((i) => i.confirm)
        .map((i) => i.action),
    ).toEqual(['option:remove', 'option:clear'])
  })
})
