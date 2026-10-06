import { describe, expect, it } from 'vitest'
import { dateDefaults } from '../Properties/columnStyles'
import { optionMenuModel } from './optionMenu'

const rows = (items: ReturnType<typeof optionMenuModel>) =>
  items.map((i) => [i.label, i.separatorBefore ?? false])

describe('optionMenuModel', () => {
  it('leads with Style where a view gives one, then Edit Option, then Clear and Remove apart', () => {
    const items = optionMenuModel({
      style: { type: 'select', current: { ...dateDefaults('full'), look: 'compact' } },
      destructive: true,
    })
    expect(rows(items)).toEqual([
      ['Style', false],
      ['Edit Option', false],
      ['Clear', true],
      ['Remove', false],
    ])
    expect(items[0].submenu?.map((r) => [r.label, 'checked' in r && r.checked])).toEqual([
      ['Standard', false],
      ['Compact', true],
    ])
  })

  it('omits Style where no view exists, and Clear and Remove where the surface is not destructive', () => {
    expect(rows(optionMenuModel({ destructive: false }))).toEqual([['Edit Option', false]])
  })
})
