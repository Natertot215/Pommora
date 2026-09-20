// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Toolbar } from './Toolbar'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let toggleNavSpy: ReturnType<typeof vi.fn>

const render = (): void => {
  root = createRoot(host)
  act(() => root.render(<Toolbar sidePaneOpen={false} onToggleSidePane={() => {}} />))
}

const trioButton = (title: string): HTMLButtonElement =>
  Array.from(host.querySelectorAll<HTMLButtonElement>('.toolbar-trio-cover button')).find(
    (b) => b.title === title,
  )!

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
  toggleNavSpy = vi.fn()
  useSession.setState({
    toggleNav: toggleNavSpy as never,
    navOpen: false,
    tabs: [],
    pinned: [],
    pinnedTabs: [],
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  render()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('the toolbar trio', () => {
  it('summons the NavWindow from its Navigation button', () => {
    act(() => trioButton('Navigation').click())
    expect(toggleNavSpy).toHaveBeenCalledTimes(1)
  })

  it('lights the Navigation button while the window stands', () => {
    expect(trioButton('Navigation').getAttribute('aria-pressed')).toBe('false')
    act(() => {
      useSession.setState({ navOpen: true })
    })
    expect(trioButton('Navigation').getAttribute('aria-pressed')).toBe('true')
  })

  it('opens the Settings panel on its own button, leaving Navigation dark', () => {
    act(() => trioButton('Settings').click())
    expect(trioButton('Settings').getAttribute('aria-pressed')).toBe('true')
    expect(trioButton('Navigation').getAttribute('aria-pressed')).toBe('false')
    expect(toggleNavSpy).not.toHaveBeenCalled()
  })
})
