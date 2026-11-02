import { describe, expect, it } from 'vitest'
import { placePane, sideFor, type TriggerBox } from './panePlacement'

const view = { w: 1024, h: 768 }
const pane = { w: 200, h: 120 }
const trigger = (center: number): TriggerBox => ({
  left: center - 20,
  top: 100,
  bottom: 120,
  width: 40,
  height: 20,
})
const place = (
  center: number,
  rest: Partial<Parameters<typeof placePane>[0]> = {},
): ReturnType<typeof placePane> =>
  placePane({
    t: trigger(center),
    pane,
    view,
    side: 'down',
    centered: null,
    origin: 'auto',
    ...rest,
  })

// Whether a pane CENTERS is a decision, not a look — the pixels stay visual truth, but which of the two placements it takes has to hold.
describe('placePane', () => {
  it('straddles the trigger when the whole pane fits there', () => {
    const { pos, centered } = place(512)
    expect(centered).toBe(true)
    expect(pos.left).toBe(412)
  })

  // A named `center` slides within its bounds; `auto` declines to center at all once it would have to be clamped.
  it('slides a centered pane within a given bounds rather than the viewport', () => {
    // Mid-viewport, so nothing about the WINDOW would move it; the surface is what does.
    expect(place(580, { origin: 'center', bounds: { left: 200, right: 600 } }).pos.left).toBe(392)
  })

  it('centers freely at that same point when nothing bounds it', () => {
    expect(place(580, { origin: 'center' }).pos.left).toBe(480)
  })

  it('declines to center under `auto` when the bounds would clamp it', () => {
    const { pos, centered } = place(580, { bounds: { left: 200, right: 600 } })
    expect(centered).toBe(false)
    expect(pos.left).toBeUndefined()
    expect(pos.right).toBe(432)
  })

  it('hangs from its right when centering would be clamped', () => {
    const { pos, centered } = place(60)
    expect(centered).toBe(false)
    expect(pos.left).toBeUndefined()
    expect(pos.right).toBe(816)
  })

  it('hangs from its left under `origin="left"`', () => {
    const { pos, centered } = place(512, { origin: 'left' })
    expect(centered).toBe(false)
    expect(pos.left).toBe(482)
    expect(pos.origin).toBe('30px 0px')
  })

  it('hangs off the trigger when it fits', () => {
    expect(place(512).pos.top).toBe(126)
  })

  it('fences a pane neither side holds', () => {
    const tall = { w: 200, h: 700 }
    expect(place(512, { pane: tall }).pos.top).toBe(60)
    expect(place(512, { pane: tall, side: 'up' }).pos.bottom).toBe(60)
  })

  it('pins a pane taller than the window to the top margin', () => {
    const { pos } = place(512, { pane: { w: 200, h: 900 } })
    expect(pos.top).toBe(8)
  })
})

describe('sideFor', () => {
  it('keeps a side that fits', () => {
    expect(sideFor('down', 100, { down: 200, up: 50 })).toBe('down')
  })

  it('takes the other side when overrun', () => {
    expect(sideFor('down', 300, { down: 100, up: 400 })).toBe('up')
  })

  it('stays when the other side has less room', () => {
    expect(sideFor('down', 300, { down: 100, up: 50 })).toBe('down')
  })
})
