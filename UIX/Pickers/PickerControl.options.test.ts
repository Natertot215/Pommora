import { describe, expect, it } from 'vitest'
import { pickerOptions } from './PickerControl'

describe('pickerOptions', () => {
  it("builds one option per value in the values' order, labelled from the table, and a part of a vocabulary keeps its own values", () => {
    const labels: Record<'twelveHour' | 'twentyFourHour' | 'system', string> = {
      twelveHour: '12 Hours',
      twentyFourHour: '24 Hours',
      system: 'System',
    }
    expect(pickerOptions(['twelveHour', 'twentyFourHour'] as const, labels)).toEqual([
      { value: 'twelveHour', label: '12 Hours' },
      { value: 'twentyFourHour', label: '24 Hours' },
    ])
  })
})
