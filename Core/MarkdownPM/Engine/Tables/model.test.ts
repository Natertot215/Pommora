import { describe, it, expect } from 'vitest'
import { columnShares, normalize } from './model'

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

  it('columnShares reads a row totaling 100 dashes as percents', () => {
    const cols = [30, 70].map((dashes) => ({ align: null, dashes }))
    expect(columnShares(cols)).toEqual([30, 70])
  })

  it('columnShares splits any other total equally, however the padding fell', () => {
    const cols = [34, 500, 300, 13, 16].map((dashes) => ({ align: null, dashes }))
    expect(columnShares(cols)).toEqual([20, 20, 20, 20, 20])
  })
})
