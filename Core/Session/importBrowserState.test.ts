// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NO_NEXUS, ok } from '@pommora/core/Contract/result'
import type { DevicePrefs } from '@pommora/core/Settings/devicePrefs'
import { stubDialer } from '../vitest.setup'
import { importBrowserState } from './importBrowserState'

const SIDEBAR = 'pommora.sidebarWidth'
const INSPECTOR = 'pommora.inspectorWidth'
const DISCLOSURE = 'pommora.sidebar.disclosure'

let prefsLoad: ReturnType<typeof vi.fn>
let prefsSave: ReturnType<typeof vi.fn>

function install(stored: DevicePrefs | null, saved: unknown = ok(null)): void {
  prefsLoad = vi.fn(async () => ok(stored))
  prefsSave = vi.fn(async () => saved)
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'devicePrefs:load': prefsLoad,
    'devicePrefs:save': prefsSave,
  })
}

beforeEach(() => {
  localStorage.clear()
  install(null)
})

const held = (): string[] => [SIDEBAR, INSPECTOR, DISCLOSURE].filter((k) => localStorage.getItem(k))

describe('what the browser was holding comes across once', () => {
  it('lands the three keys as panes and disclosure, then erases them', async () => {
    localStorage.setItem(SIDEBAR, '300')
    localStorage.setItem(INSPECTOR, '400')
    localStorage.setItem(DISCLOSURE, JSON.stringify({ 'context:areas': false }))
    await importBrowserState()
    expect(prefsSave).toHaveBeenCalledWith({
      panes: { sidebar: 300, inspector: 400 },
      disclosure: { 'context:areas': false },
    })
    expect(held()).toEqual([])
  })

  it('a second run neither loads nor saves', async () => {
    localStorage.setItem(SIDEBAR, '300')
    await importBrowserState()
    install(null)
    await importBrowserState()
    expect(prefsLoad).not.toHaveBeenCalled()
    expect(prefsSave).not.toHaveBeenCalled()
  })

  it('does nothing at all when none of the three keys is present', async () => {
    await importBrowserState()
    expect(prefsLoad).not.toHaveBeenCalled()
    expect(prefsSave).not.toHaveBeenCalled()
  })
})

describe('the device store wins every key it already holds', () => {
  it('leaves a stored value standing and fills only what is missing', async () => {
    install({ panes: { sidebar: 250 }, disclosure: { 'context:areas': true } })
    localStorage.setItem(SIDEBAR, '300')
    localStorage.setItem(INSPECTOR, '400')
    localStorage.setItem(
      DISCLOSURE,
      JSON.stringify({ 'context:areas': false, 'context:topics': false }),
    )
    await importBrowserState()
    expect(prefsSave).toHaveBeenCalledWith({
      panes: { sidebar: 250, inspector: 400 },
      disclosure: { 'context:areas': true, 'context:topics': false },
    })
  })
})

describe('nothing is erased that has not been written', () => {
  it('keeps the keys when the device store cannot be read', async () => {
    install(null)
    prefsLoad.mockImplementation(async () => NO_NEXUS)
    localStorage.setItem(SIDEBAR, '300')
    await importBrowserState()
    expect(prefsSave).not.toHaveBeenCalled()
    expect(held()).toEqual([SIDEBAR])
  })

  it('keeps the keys when the write is refused', async () => {
    install(null, NO_NEXUS)
    localStorage.setItem(SIDEBAR, '300')
    await importBrowserState()
    expect(held()).toEqual([SIDEBAR])
  })
})

describe('what the browser held may be garbage', () => {
  it('skips a corrupt disclosure value rather than throwing', async () => {
    localStorage.setItem(DISCLOSURE, 'not json')
    await importBrowserState()
    expect(prefsSave).toHaveBeenCalledWith({ panes: {}, disclosure: {} })
    expect(held()).toEqual([])
  })

  it('skips a width that is not a positive number', async () => {
    localStorage.setItem(SIDEBAR, 'wide')
    localStorage.setItem(INSPECTOR, '0')
    await importBrowserState()
    expect(prefsSave).toHaveBeenCalledWith({ panes: {}, disclosure: {} })
  })

  it('leaves the stored prefs standing when the browser throws on read', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    try {
      await importBrowserState()
      expect(prefsLoad).not.toHaveBeenCalled()
      expect(prefsSave).not.toHaveBeenCalled()
    } finally {
      getItem.mockRestore()
    }
  })
})
