import { describe, expect, it } from 'vitest'
import { packDevicePrefs } from './devicePrefs'

describe('what a machine actually stores', () => {
  it('keeps a preference that has been turned on', () => {
    expect(packDevicePrefs({ nativeMenus: true })).toEqual({ nativeMenus: true })
  })

  it('drops every key resting at its default, so an untouched machine stores nothing', () => {
    expect(packDevicePrefs({ nativeMenus: false })).toEqual({})
    expect(packDevicePrefs({ nativeMenus: undefined })).toEqual({})
    expect(packDevicePrefs({})).toEqual({})
  })

  // Why panes, disclosure and window sizes are nested: a fold map is mostly false, and only the top level is filtered.
  it('keeps a nested false, where a top-level one would be dropped', () => {
    expect(packDevicePrefs({ disclosure: { areas: false } })).toEqual({
      disclosure: { areas: false },
    })
  })

  it('refuses anything that is not a record', () => {
    expect(packDevicePrefs(null)).toEqual({})
    expect(packDevicePrefs('nativeMenus')).toEqual({})
  })
})
