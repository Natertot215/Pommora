// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SEARCH_PLACEHOLDER, SearchField } from './SearchField'
import { search } from './fields.css'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const field = (): HTMLInputElement => host.querySelector('input') as HTMLInputElement

describe('SearchField — the field four surfaces share', () => {
  it('reads the family copy when a caller passes no placeholder', () => {
    act(() => root.render(<SearchField value="" onValueChange={() => {}} />))
    expect(field().getAttribute('placeholder')).toBe(SEARCH_PLACEHOLDER)
  })

  it('keeps the caller class alongside the family reset', () => {
    act(() => root.render(<SearchField value="" onValueChange={() => {}} className="mine" />))
    expect(field().classList.contains('mine')).toBe(true)
    expect(field().classList.contains(search)).toBe(true)
  })

  it('never spell-checks, whatever the surface', () => {
    act(() => root.render(<SearchField value="" onValueChange={() => {}} />))
    expect(field().getAttribute('spellcheck')).toBe('false')
  })

  it('hands the caller the value rather than the event', () => {
    const onValueChange = vi.fn()
    act(() => root.render(<SearchField value="" onValueChange={onValueChange} />))
    const input = field()
    // React reads the value off its own tracker, so a bare assignment looks like no change at all.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setValue?.call(input, 'trash')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onValueChange).toHaveBeenCalledWith('trash')
  })

  it('carries a consumer ref through the seam, so the autofocusing surface can still reach it', () => {
    const ref = createRef<HTMLInputElement>()
    act(() => root.render(<SearchField value="" onValueChange={() => {}} inputRef={ref} />))
    expect(ref.current).toBe(field())
  })
})
