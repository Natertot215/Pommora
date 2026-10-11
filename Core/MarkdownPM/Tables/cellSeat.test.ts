import { describe, expect, it } from 'vitest'
import { seatSelection } from './CellEditor'

const nowhere = (): number | null => null

describe('where an entered cell seats its selection', () => {
  it('Tab and Enter enter with the caret at the end', () => {
    expect(seatSelection(null, 5, nowhere)).toEqual({ anchor: 5, head: 5 })
  })

  it('a range is clamped to the text the cell holds', () => {
    expect(seatSelection({ kind: 'select', range: [1, 3] }, 2, nowhere)).toEqual({
      anchor: 1,
      head: 2,
    })
  })

  it('a pointer seats the caret where it pressed', () => {
    expect(seatSelection({ kind: 'point', x: 4, y: 4 }, 5, () => 2)).toEqual({
      anchor: 2,
      head: 2,
    })
  })

  it('a sweep that crossed in from above extends from the start', () => {
    expect(seatSelection({ kind: 'point', x: 4, y: 4, sweep: 'start' }, 5, () => 2)).toEqual({
      anchor: 0,
      head: 2,
    })
  })

  it('a pointer the view cannot place falls to the end', () => {
    expect(seatSelection({ kind: 'point', x: 4, y: 4 }, 5, nowhere)).toEqual({
      anchor: 5,
      head: 5,
    })
  })
})
