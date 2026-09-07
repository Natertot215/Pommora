// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { armPreview, glanceLink } from './glanceLink'
import { cancelGlance, setGlancePresenter, type GlanceRequest } from './glanceAction'
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
  cancelGlance()
  setGlancePresenter(null)
  document.body.innerHTML = ''
  vi.useRealTimers()
})

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
