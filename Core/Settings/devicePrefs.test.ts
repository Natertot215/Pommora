import { rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeSession, openSession } from '../Nexus/session'
import { writeValue } from '../Platform/localState'
import { installStores, NO_STORES } from '../Platform/stores'
import { tempRoot } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import { packDevicePrefs, readDevicePrefs, readInterfaceScale } from './devicePrefs'

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

describe("what a machine's record reads as", () => {
  let root: string
  beforeEach(async () => {
    root = tempRoot('pom-device-prefs-')
    installStores(memoryStores().stores)
    await openSession(root)
  })
  afterEach(async () => {
    closeSession()
    installStores(NO_STORES)
    await rm(root, { recursive: true, force: true })
  })

  it('reads an empty record when the machine has stored nothing', () => {
    expect(readDevicePrefs()).toEqual({})
    expect(readInterfaceScale()).toBe(1)
  })

  it('clamps a stored width or scale to its bounds', () => {
    writeValue('devicePrefs', { panes: { sidebar: 999, sidePane: 10 }, interfaceScale: 9 })
    expect(readDevicePrefs()).toMatchObject({ panes: { sidebar: 380, sidePane: 240 } })
    expect(readInterfaceScale()).toBe(1.5)
  })

  it('drops a value of the wrong type alone, keeping its neighbours', () => {
    writeValue('devicePrefs', { panes: { sidebar: 'wide', sidePane: 300 }, nativeMenus: 'yes' })
    expect(readDevicePrefs()).toEqual({ panes: { sidePane: 300 } })
  })

  it('carries a key this build does not know through to the save', () => {
    writeValue('devicePrefs', { later: { kept: true }, panes: { sidebar: 300, later: 1 } })
    expect(readDevicePrefs()).toEqual({ later: { kept: true }, panes: { sidebar: 300, later: 1 } })
  })

  it('reads a record that is not an object as empty', () => {
    writeValue('devicePrefs', 'nativeMenus')
    expect(readDevicePrefs()).toEqual({})
  })
})
