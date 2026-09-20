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
  it('renders Homepage first, then the five launcher icons in order', () => {
    const bs = buttons()
    expect(bs[0].getAttribute('aria-label')).toBe('Homepage')
    const labels = bs.slice(1).map((b) => b.getAttribute('aria-label'))
    expect(labels).toEqual(['matrix', 'agenda', 'contexts', 'collections', 'settings'])
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

  it('settings is a no-op (no mode switch)', () => {
    const settings = buttons().find((b) => b.getAttribute('aria-label') === 'settings')!
    act(() => settings.click())
    expect(setPersonalizationSpy).not.toHaveBeenCalled()
  })

  it('the Settings icon toggles — the icon that summoned a window dismisses it', () => {
    const toggleSettingsSpy = vi.fn()
    act(() => useSession.setState({ toggleSettings: toggleSettingsSpy as never }))
    const settings = buttons().find((b) => b.getAttribute('aria-label') === 'settings')!
    act(() => settings.click())
    act(() => settings.click())
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

  it('seats a missing key at its default index — a saved four-key order still shows the Matrix first', () => {
    expect(renderWithOrder(['settings', 'agenda', 'contexts', 'collections'])).toEqual([
      'matrix',
      'settings',
      'agenda',
      'contexts',
      'collections',
    ])
  })

  it('honors a saved order that places the Matrix itself', () => {
    expect(renderWithOrder(['settings', 'agenda', 'contexts', 'matrix', 'collections'])).toEqual([
      'settings',
      'agenda',
      'contexts',
      'matrix',
      'collections',
    ])
  })

  it('drops a key the ribbon no longer carries — a saved order naming Navigation loses it', () => {
    expect(
      renderWithOrder(['settings', 'navigation', 'agenda', 'contexts', 'matrix', 'collections']),
    ).toEqual(['settings', 'agenda', 'contexts', 'matrix', 'collections'])
  })
})
