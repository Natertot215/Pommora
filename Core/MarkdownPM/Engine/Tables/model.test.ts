import { describe, it, expect } from 'vitest'
import { normalize } from './model'

describe('model', () => {
  it('normalize pads short rows and truncates long rows to column count', () => {
    const m = normalize({
      columns: [
        { align: null, dashes: 3 },
        { align: null, dashes: 3 },
      ],
      header: ['a'],
      rows: [['x', 'y', 'z']],
    })
    expect(m.header).toEqual(['a', ''])
    expect(m.rows).toEqual([['x', 'y']])
  })
})
