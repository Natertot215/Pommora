// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { labelSlotHidden } from '@pommora/uix/Buttons/button-base.css'
import { titleActionFadeHidden } from '@pommora/uix/Animations/animations.css'
import { DetailTitleHeader, type TitleSearch } from './DetailTitleHeader'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  vi.useRealTimers()
  act(() => root.unmount())
  host.remove()
})

const search = (over: Partial<TitleSearch> = {}): TitleSearch => ({
  query: null,
  summon: 0,
  start: vi.fn(),
  change: vi.fn(),
  ...over,
})
const render = (s?: TitleSearch): Promise<void> =>
  act(async () => {
    root.render(
      <DetailTitleHeader
        title="Ideas"
        onRename={vi.fn()}
        requestMenu={async () => null}
        onEditIcon={vi.fn()}
        search={s}
      />,
    )
  })
const q = (sel: string): HTMLElement => host.querySelector(sel) as HTMLElement
const hidden = (sel: string): boolean => q(sel).classList.contains(titleActionFadeHidden)

describe('the title search', () => {
  it('leaves a title without a search as it was', async () => {
    await render()
    expect(host.querySelector('.detail-title-search')).toBeNull()
    expect(host.querySelector('.detail-title-hint')).toBeNull()
  })

  it('slides the hint out on the dwell, and focusing it or a plain, ⌘, or ⇧ click on the title starts the search', async () => {
    vi.useFakeTimers()
    const s = search()
    await render(s)
    expect(q('.detail-title-hint').classList.contains(labelSlotHidden)).toBe(true)
    await act(async () => {
      q('.detail-title-text').dispatchEvent(
        new MouseEvent('pointerover', { bubbles: true, relatedTarget: document.body }),
      )
      vi.advanceTimersByTime(1500)
    })
    expect(q('.detail-title-hint').classList.contains(labelSlotHidden)).toBe(false)
    act(() => q('.detail-title-search').focus())
    act(() => q('.detail-title-text').click())
    act(() => {
      q('.detail-title-text').dispatchEvent(
        new MouseEvent('click', { bubbles: true, metaKey: true }),
      )
      q('.detail-title-text').dispatchEvent(
        new MouseEvent('click', { bubbles: true, shiftKey: true }),
      )
    })
    expect(s.start).toHaveBeenCalledTimes(4)
  })

  it('an open search holds the hint open beside the title, and shows the X only once text is typed', async () => {
    await render(search({ query: '' }))
    expect(q('.detail-title-hint').classList.contains(labelSlotHidden)).toBe(false)
    expect(hidden('.detail-title-clear')).toBe(true)
    await render(search({ query: 'ab' }))
    expect(hidden('.detail-title-clear')).toBe(false)
  })

  it('Escape, the X, and a blank blur end it', async () => {
    const s = search({ query: 'ab' })
    await render(s)
    const input = q('.detail-title-search') as HTMLInputElement
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    act(() => q('.detail-title-clear button').click())
    expect(s.change).toHaveBeenNthCalledWith(1, null)
    expect(s.change).toHaveBeenNthCalledWith(2, null)
    const empty = search({ query: '  ' })
    await render(empty)
    act(() => {
      input.focus()
      input.blur()
    })
    expect(empty.change).toHaveBeenCalledWith(null)
  })

  it('a search from the hint slides the title away, and any other door replaces it at once', async () => {
    const fromHint = search()
    await render(fromHint)
    act(() => q('.detail-title-search').focus())
    await render({ ...fromHint, query: '' })
    expect(q('.detail-title-lead').classList.contains('is-searching')).toBe(true)
    expect(q('.detail-title-lead').classList.contains('is-instant')).toBe(false)
    await render(search({ query: null }))
    act(() => q('.detail-title-text').click())
    await render(search({ query: '' }))
    expect(q('.detail-title-lead').classList.contains('is-instant')).toBe(true)
  })

  it('picking Rename ends an open search, so the title it renames is back in view', async () => {
    const s = search({ query: 'ab' })
    await act(async () => {
      root.render(
        <DetailTitleHeader
          title="Ideas"
          onRename={vi.fn()}
          requestMenu={async () => 'rename'}
          onEditIcon={vi.fn()}
          search={s}
        />,
      )
    })
    await act(async () => {
      q('.detail-title-text').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(s.change).toHaveBeenCalledWith(null)
  })

  it('refocusing an open field leaves the search and its caret alone', async () => {
    const s = search({ query: 'abc' })
    await render(s)
    act(() => q('.detail-title-search').focus())
    expect(s.start).not.toHaveBeenCalled()
  })

  it('a new summon focuses and selects the field; a standing one leaves focus alone', async () => {
    await render(search({ query: 'ab', summon: 1 }))
    expect(document.activeElement).not.toBe(q('.detail-title-search'))
    await render(search({ query: 'ab', summon: 2 }))
    const input = q('.detail-title-search') as HTMLInputElement
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(2)
  })
})
