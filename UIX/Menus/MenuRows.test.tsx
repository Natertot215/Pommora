// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MenuItem } from './MenuRows'
import * as s from './menu-row.css'
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

describe('MenuItem', () => {
  it('sets its titleAccessory right after the title text, on the title line', () => {
    act(() => root.render(<MenuItem titleAccessory={<i data-accessory />}>Title</MenuItem>))
    const title = host.querySelector(`.${s.titleText}`)
    expect(title?.textContent).toBe('Title')
    expect(title?.nextElementSibling?.hasAttribute('data-accessory')).toBe(true)
    expect(title?.parentElement?.classList.contains(s.titleLine)).toBe(true)
  })

  it('renders no title line when no titleAccessory is given', () => {
    act(() => root.render(<MenuItem>Title</MenuItem>))
    const title = host.querySelector(`.${s.titleText}`)
    expect(title?.parentElement?.classList.contains(s.titleWrap)).toBe(true)
    expect(title?.nextElementSibling).toBeNull()
  })
})
