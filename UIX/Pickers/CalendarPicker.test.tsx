// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CalendarPicker } from './CalendarPicker'
import * as s from './calendar-picker.css'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

function mount(
  value: { at: Date; timed: boolean; end?: Date } | null,
  span = false,
): ReturnType<typeof vi.fn> {
  const onChange = vi.fn()
  act(() => {
    root.render(
      <CalendarPicker
        span={span}
        value={value}
        timeFormat="twelveHour"
        formatDateValue={(k) => k}
        onChange={onChange}
      />,
    )
  })
  return onChange
}

const day = (key: string): HTMLButtonElement =>
  host.querySelector<HTMLButtonElement>(`[data-k="${key}"]`) as HTMLButtonElement

describe('CalendarPicker saving', () => {
  it('saves a picked day once, 150 ms after the pick', () => {
    const onChange = mount({ at: new Date(2026, 5, 10), timed: false })
    act(() => day('2026-06-12').click())
    expect(onChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('2026-06-12')
  })

  it('saves only the last of two quick picks', () => {
    const onChange = mount({ at: new Date(2026, 5, 10), timed: false })
    act(() => day('2026-06-12').click())
    act(() => vi.advanceTimersByTime(100))
    act(() => day('2026-06-13').click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('2026-06-13')
  })

  it('saves a pick taken back to the day it opened on', () => {
    const onChange = mount({ at: new Date(2026, 5, 10), timed: false })
    act(() => day('2026-06-12').click())
    act(() => vi.advanceTimersByTime(150))
    act(() => day('2026-06-10').click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenLastCalledWith('2026-06-10')
  })

  it('still saves a pick when the picker closes inside that window', () => {
    const onChange = mount({ at: new Date(2026, 5, 10), timed: false })
    act(() => day('2026-06-12').click())
    act(() => root.render(null))
    expect(onChange).toHaveBeenCalledWith('2026-06-12')
  })

  it('saves nothing when it opens on a value and nothing changes', () => {
    const onChange = mount({ at: new Date(2026, 5, 10, 14, 30), timed: true })
    act(() => vi.advanceTimersByTime(1000))
    act(() => root.render(null))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('saves the 9 AM form when Use Time turns on', () => {
    const onChange = mount({ at: new Date(2026, 5, 10), timed: false })
    const useTime = host.querySelector<HTMLButtonElement>('[aria-label="Use Time"]')
    act(() => useTime?.click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenCalledWith('2026-06-10T09:00:00')
  })

  it('clicking the picked day clears it', () => {
    const onChange = mount({ at: new Date(2026, 5, 10), timed: false })
    act(() => day('2026-06-10').click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})

describe('CalendarPicker opening', () => {
  it('opens on the local day and time of the moment it is handed', () => {
    mount({ at: new Date(2026, 5, 14, 23, 30), timed: true })
    expect(day('2026-06-14').className).toContain(s.daySelected)
    expect(host.textContent).toContain('11:30PM')
  })
})

describe('CalendarPicker typing a time part', () => {
  const typePart = (index: 0 | 1, text: string, key: 'Enter' | 'Escape' = 'Enter'): void => {
    const part = host.querySelectorAll<HTMLButtonElement>(`.${s.timePart}`)[index]
    act(() => part.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    const input = host.querySelector('input') as HTMLInputElement
    expect(input.placeholder).toBe(part.textContent)
    input.value = text
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    })
    act(() => vi.advanceTimersByTime(150))
  }

  it('saves a typed minute', () => {
    const onChange = mount({ at: new Date(2026, 5, 10, 14, 30), timed: true })
    typePart(1, '7')
    expect(onChange).toHaveBeenCalledWith('2026-06-10T14:07:00')
  })

  it('holds a typed hour within the clock', () => {
    const onChange = mount({ at: new Date(2026, 5, 10, 14, 30), timed: true })
    typePart(0, '-1')
    expect(onChange).toHaveBeenCalledWith('2026-06-10T13:30:00')
  })

  it('refuses a fractional or non-numeric part, and an Escape', () => {
    const onChange = mount({ at: new Date(2026, 5, 10, 14, 30), timed: true })
    typePart(1, '.5')
    typePart(1, 'ab')
    typePart(1, '45', 'Escape')
    expect(onChange).not.toHaveBeenCalled()
    expect(host.querySelector('input')).toBeNull()
  })
})

describe('CalendarPicker End Date', () => {
  const endDate = (): HTMLButtonElement =>
    host.querySelector<HTMLButtonElement>('[aria-label="End Date"]') as HTMLButtonElement

  it('offers End Date only where a span is allowed', () => {
    mount({ at: new Date(2026, 5, 10), timed: false })
    expect(host.querySelector('[aria-label="End Date"]')).toBeNull()
  })

  it('opens the end on the start day an hour later, and saves a clockless one as the day', () => {
    const onChange = mount({ at: new Date(2026, 5, 10, 9), timed: true }, true)
    act(() => endDate().click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenLastCalledWith('2026-06-10T09:00:00/2026-06-10T10:00:00')
    act(() => root.render(null))
    const untimed = mount({ at: new Date(2026, 5, 10), timed: false }, true)
    act(() => endDate().click())
    act(() => vi.advanceTimersByTime(150))
    expect(untimed).not.toHaveBeenCalled()
  })

  it('stretches the span toward a pick outside it and pulls in the nearer end from inside', () => {
    const onChange = mount(
      { at: new Date(2026, 5, 10), timed: false, end: new Date(2026, 5, 20) },
      true,
    )
    const pickSaved = (k: string): void => {
      act(() => day(k).click())
      act(() => vi.advanceTimersByTime(150))
    }
    pickSaved('2026-06-24')
    expect(onChange).toHaveBeenLastCalledWith('2026-06-10/2026-06-24')
    pickSaved('2026-06-06')
    expect(onChange).toHaveBeenLastCalledWith('2026-06-06/2026-06-24')
    pickSaved('2026-06-09')
    expect(onChange).toHaveBeenLastCalledWith('2026-06-09/2026-06-24')
    pickSaved('2026-06-21')
    expect(onChange).toHaveBeenLastCalledWith('2026-06-09/2026-06-21')
  })

  it('folds the span onto a picked end, and clears on that day picked again', () => {
    const onChange = mount(
      { at: new Date(2026, 5, 10), timed: false, end: new Date(2026, 5, 13) },
      true,
    )
    act(() => day('2026-06-13').click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenLastCalledWith('2026-06-13')
    act(() => day('2026-06-11').click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenLastCalledWith('2026-06-11/2026-06-13')
    act(() => day('2026-06-11').click())
    act(() => day('2026-06-11').click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('bands the span beneath its days from each end, its ends primary', () => {
    mount({ at: new Date(2026, 5, 10), timed: false, end: new Date(2026, 5, 13) }, true)
    const band = (k: string) => day(k).querySelector(`.${s.band}`)?.className ?? null
    const pill = (k: string) => day(k).querySelector(`.${s.pill}`)?.className ?? ''
    expect(pill('2026-06-10')).toContain(s.pillSelected)
    expect(pill('2026-06-13')).toContain(s.pillSelected)
    expect(pill('2026-06-11')).not.toContain(s.pillSelected)
    expect(band('2026-06-10')).toContain(s.bandFromCenter)
    expect(band('2026-06-13')).toContain(s.bandToCenter)
    expect(band('2026-06-11')).not.toBeNull()
    expect(band('2026-06-14')).toBeNull()
  })

  it('rounds the band where a week wraps', () => {
    mount({ at: new Date(2026, 5, 12), timed: false, end: new Date(2026, 5, 15) }, true)
    const band = (k: string) => day(k).querySelector(`.${s.band}`)?.className ?? ''
    expect(band('2026-06-13')).toContain(s.bandTail)
    expect(band('2026-06-14')).toContain(s.bandHead)
  })

  it('holds the end clock of a one-day span at or after its start', () => {
    const onChange = mount(
      { at: new Date(2026, 5, 10, 17), timed: true, end: new Date(2026, 5, 12, 9) },
      true,
    )
    act(() => day('2026-06-10').click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenLastCalledWith('2026-06-10T17:00:00/2026-06-10T17:00:00')
  })

  it('saves both clocks, and drops the end when End Date turns off', () => {
    const onChange = mount(
      { at: new Date(2026, 5, 10, 9), timed: true, end: new Date(2026, 5, 12, 17) },
      true,
    )
    act(() => day('2026-06-15').click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenLastCalledWith('2026-06-10T09:00:00/2026-06-15T17:00:00')
    act(() => endDate().click())
    act(() => vi.advanceTimersByTime(150))
    expect(onChange).toHaveBeenLastCalledWith('2026-06-10T09:00:00')
  })
})
