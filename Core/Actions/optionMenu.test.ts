import { describe, expect, it } from 'vitest'
import { optionMenuModel } from './optionMenu'

describe('the option chip menu', () => {
  it('divides the two destructive rows from Rename and Edit Icon', () => {
    expect(optionMenuModel().map((i) => [i.label, i.separatorBefore ?? false])).toEqual([
      ['Rename', false],
      ['Edit Icon', false],
      ['Remove', true],
      ['Clear', false],
    ])
  })
})
