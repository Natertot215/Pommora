import { describe, expect, it } from 'vitest'
import { LINK_DISPLAY_LABELS, LINK_DISPLAYS } from '../Connections/linkValue'
import { pickerOptions, TIME_FORMAT_LABELS } from './displayLabels'

describe('pickerOptions', () => {
  it("builds one option per value in the values' order, labelled from the table, and a part of a vocabulary keeps its own values", () => {
    expect(pickerOptions(['twelveHour', 'twentyFourHour'] as const, TIME_FORMAT_LABELS)).toEqual([
      { value: 'twelveHour', label: '12 Hours' },
      { value: 'twentyFourHour', label: '24 Hours' },
    ])
    expect(pickerOptions(LINK_DISPLAYS, LINK_DISPLAY_LABELS).map((o) => o.value)).toEqual([
      ...LINK_DISPLAYS,
    ])
  })
})
