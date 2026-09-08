// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { armPreview, glanceLink, hoverGlance, leaveGlance } from './glanceLink'
import { setGlancePresenter, type GlanceRequest } from './glanceAction'
import { useSession } from '../../Session/store'
import type { PreviewPersistence } from '../../Settings/personalization'

const page = { kind: 'page', id: 'p1', path: 'Notes/A.md' } as const

let present: ReturnType<typeof vi.fn<(next: GlanceRequest | null) => void>>
let el: HTMLElement

const setPersistence = (v: PreviewPersistence | undefined): void =>
  useSession.setState({ personalization: { previewPersistence: v } })

beforeEach(() => {
  vi.useFakeTimers()
  present = vi.fn()
  setGlancePresenter(present)
  el = document.createElement('span')
  document.body.appendChild(el)
})

afterEach(() => {
  leaveGlance()
  setGlancePresenter(null)
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const pressShift = (repeat = false): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', repeat }))
}

describe('the Off gate', () => {
  it("'off' arms nothing", () => {
    setPersistence('off')
    armPreview(page, el, 'link')
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })

  it('a set rung arms a preview', () => {
    setPersistence('1s')
    armPreview(page, el, 'link')
    vi.runAllTimers()
    expect(present).toHaveBeenCalledWith({ target: page, el })
  })

  it('an absent setting arms — the default is on', () => {
    setPersistence(undefined)
    armPreview(page, el, 'link')
    vi.runAllTimers()
    expect(present).toHaveBeenCalledTimes(1)
  })

  it('glanceLink routes the editor slot through the same gate', () => {
    setPersistence('off')
    glanceLink(page, el)
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })
})

describe('the hovered-Shift arm', () => {
  it('arms the hovered surface when Shift is pressed at rest, no re-enter needed', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', false)
    expect(present).not.toHaveBeenCalled()
    pressShift()
    vi.runAllTimers()
    expect(present).toHaveBeenCalledWith({ target: page, el })
  })

  it('ignores an auto-repeat keydown so the dwell is never reset out from under itself', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', false)
    pressShift(true)
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })

  it('armNow raises the preview immediately, without a keypress', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', true)
    vi.runAllTimers()
    expect(present).toHaveBeenCalledWith({ target: page, el })
  })

  it('leaveGlance clears the hovered surface, so a later Shift arms nothing', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', false)
    leaveGlance()
    pressShift()
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })

  it('honors the Off gate on the Shift arm', () => {
    setPersistence('off')
    hoverGlance(page, el, 'location', false)
    pressShift()
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })

  it('a right-click cancels the pending dwell and clears the hovered surface', () => {
    setPersistence('1s')
    hoverGlance(page, el, 'location', true)
    window.dispatchEvent(new Event('contextmenu'))
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
    pressShift()
    vi.runAllTimers()
    expect(present).not.toHaveBeenCalled()
  })
})
