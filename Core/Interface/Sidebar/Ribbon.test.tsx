// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Ribbon } from './Ribbon'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let selectSpy: ReturnType<typeof vi.fn>
let setPersonalizationSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({})
  selectSpy = vi.fn()
  setPersonalizationSpy = vi.fn()
  useSession.setState({
    select: selectSpy as never,
    setPersonalization: setPersonalizationSpy as never,
    personalization: { sidebarMode: 'collections' },
    tabs: [],
    pinned: [],
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<Ribbon />))
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const buttons = (): HTMLButtonElement[] => Array.from(host.querySelectorAll('button'))

describe('Ribbon', () => {
  it('renders Homepage first, then the six launcher icons in order', () => {
    const bs = buttons()
    expect(bs[0].getAttribute('aria-label')).toBe('Homepage')
    const labels = bs.slice(1).map((b) => b.getAttribute('aria-label'))
    expect(labels).toEqual([
      'matrix',
      'navigation',
      'agenda',
      'contexts',
      'collections',
      'settings',
    ])
  })

  it('a Matrix click opens the Matrix and never switches mode', () => {
    const matrix = buttons().find((b) => b.getAttribute('aria-label') === 'matrix')!
    act(() => matrix.click())
    expect(selectSpy).toHaveBeenCalledWith({ kind: 'matrix' })
    expect(setPersonalizationSpy).not.toHaveBeenCalled()
  })

  it('Open Matrix In Window toggles the window when no Matrix tab stands', () => {
    const openMatrixWindowSpy = vi.fn()
    act(() =>
      useSession.setState({
        toggleMatrixWindow: openMatrixWindowSpy as never,
        personalization: { sidebarMode: 'collections', matrixOpenIn: 'window' },
      }),
    )
    const matrix = buttons().find((b) => b.getAttribute('aria-label') === 'matrix')!
    act(() => matrix.click())
    expect(openMatrixWindowSpy).toHaveBeenCalledTimes(1)
    expect(selectSpy).not.toHaveBeenCalled()
  })

  it('Open Matrix In Window focuses the tab instead once one is open', () => {
    const openMatrixWindowSpy = vi.fn()
    act(() =>
      useSession.setState({
        toggleMatrixWindow: openMatrixWindowSpy as never,
        personalization: { sidebarMode: 'collections', matrixOpenIn: 'window' },
        tabs: [
          { id: 't1', target: { kind: 'matrix' }, navStack: [{ kind: 'matrix' }], navIndex: 0 },
        ],
      }),
    )
    const matrix = buttons().find((b) => b.getAttribute('aria-label') === 'matrix')!
    act(() => matrix.click())
    expect(selectSpy).toHaveBeenCalledWith({ kind: 'matrix' })
    expect(openMatrixWindowSpy).not.toHaveBeenCalled()
  })

  it('Homepage click selects the homepage and never switches mode', () => {
    act(() => buttons()[0].click())
    expect(selectSpy).toHaveBeenCalledWith({ kind: 'homepage' })
    expect(setPersonalizationSpy).not.toHaveBeenCalled()
  })

  it('a mode icon switches sidebarMode', () => {
    const contexts = buttons().find((b) => b.getAttribute('aria-label') === 'contexts')!
    act(() => contexts.click())
    expect(setPersonalizationSpy).toHaveBeenCalledWith('sidebarMode', 'contexts')
  })

  it('navigation / settings are no-ops (no mode switch)', () => {
    const nav = buttons().find((b) => b.getAttribute('aria-label') === 'navigation')!
    act(() => nav.click())
    expect(setPersonalizationSpy).not.toHaveBeenCalled()
  })

  it('the window icons toggle — the icon that summoned a window dismisses it', () => {
    const toggleNavSpy = vi.fn()
    const toggleSettingsSpy = vi.fn()
    act(() =>
      useSession.setState({
        toggleNav: toggleNavSpy as never,
        toggleSettings: toggleSettingsSpy as never,
      }),
    )
    const click = (label: string): void => {
      const b = buttons().find((x) => x.getAttribute('aria-label') === label)!
      act(() => b.click())
    }
    click('navigation')
    click('navigation')
    click('settings')
    click('settings')
    expect(toggleNavSpy).toHaveBeenCalledTimes(2)
    expect(toggleSettingsSpy).toHaveBeenCalledTimes(2)
  })

  it('reflects the active mode via aria-selected, with no highlight class', () => {
    const collections = buttons().find((b) => b.getAttribute('aria-label') === 'collections')!
    expect(collections.getAttribute('aria-selected')).toBe('true')
    expect(collections.className).not.toContain('active')
    const agenda = buttons().find((b) => b.getAttribute('aria-label') === 'agenda')!
    expect(agenda.getAttribute('aria-selected')).toBe('false')
  })

  const renderWithOrder = (ribbonOrder: string[]): (string | null)[] => {
    act(() => root.unmount())
    useSession.setState({ personalization: { sidebarMode: 'collections', ribbonOrder } })
    root = createRoot(host)
    act(() => root.render(<Ribbon />))
    return buttons()
      .slice(1)
      .map((b) => b.getAttribute('aria-label'))
  }

  it('seats a missing key at its default index — a saved five-key order still shows the Matrix first', () => {
    expect(
      renderWithOrder(['settings', 'agenda', 'contexts', 'collections', 'navigation']),
    ).toEqual(['matrix', 'settings', 'agenda', 'contexts', 'collections', 'navigation'])
  })

  it('honors a saved order that places the Matrix itself', () => {
    expect(
      renderWithOrder(['settings', 'agenda', 'contexts', 'matrix', 'collections', 'navigation']),
    ).toEqual(['settings', 'agenda', 'contexts', 'matrix', 'collections', 'navigation'])
  })
})
