// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionItem, MenuRequest } from './menuModel'
import { ok } from '../Contract/result'
import { stubDialer } from '../vitest.setup'
import type { ChromeSlice } from '../Session/chromeSlice'
import { useSession } from '../Session/store'
import { popMenu } from './menuActions'

let asked = vi.fn((_req: MenuRequest) => ok('native'))
let presented = vi.fn<ChromeSlice['presentMenu']>(async () => 'in-app')

beforeEach(() => {
  asked = vi.fn((_req: MenuRequest) => ok('native'))
  presented = vi.fn<ChromeSlice['presentMenu']>(async () => 'in-app')
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ menu: asked })
  useSession.setState({ devicePrefs: {}, presentMenu: presented })
})

const trigger = (): HTMLElement => document.createElement('button')

describe('the one door every menu opens through', () => {
  it('resolves null on an empty menu without asking either renderer', async () => {
    await expect(popMenu([], trigger())).resolves.toBeNull()
    expect(presented).not.toHaveBeenCalled()
    expect(asked).not.toHaveBeenCalled()
  })

  it('presents in-app when a trigger hangs the menu and the preference is off', async () => {
    const el = trigger()
    await expect(popMenu([{ label: 'Rename', action: 'rename' }], el)).resolves.toBe('in-app')
    expect(presented.mock.calls[0][1]).toBe(el)
    expect(asked).not.toHaveBeenCalled()
  })

  it('carries a solid list through the door to the presenter', async () => {
    await popMenu([{ label: 'Rename', action: 'rename' }], trigger(), { solid: true })
    expect(presented.mock.calls[0][2]?.solid).toBe(true)
  })

  it('carries a stay handler through the door to the presenter', async () => {
    const stay = (): ActionItem<string>[] => [{ label: 'Rename', action: 'rename' }]
    await popMenu([{ label: 'Rename', action: 'rename' }], trigger(), { stay })
    expect(presented.mock.calls[0][2]?.stay).toBe(stay)
  })

  it('leaves a stay handler unread on the native path, where the menu closes on any pick', async () => {
    useSession.setState({ devicePrefs: { nativeMenus: true } })
    const stay = vi.fn((): ActionItem<string>[] => [])
    await expect(
      popMenu([{ label: 'Lock', action: 'lock', stay: true }], trigger(), { stay }),
    ).resolves.toBe('native')
    expect(stay).not.toHaveBeenCalled()
  })

  it('asks the host when the preference is on, anchored to the trigger', async () => {
    useSession.setState({ devicePrefs: { nativeMenus: true } })
    await expect(popMenu([{ label: 'Rename', action: 'rename' }], trigger())).resolves.toBe(
      'native',
    )
    expect(asked.mock.calls[0][0]).toMatchObject({ anchor: { left: 0, top: 0, height: 0 } })
    expect(presented).not.toHaveBeenCalled()
  })

  it('asks the host with no anchor when there is no trigger, which pops at the cursor', async () => {
    await expect(popMenu([{ label: 'Rename', action: 'rename' }])).resolves.toBe('native')
    expect(asked.mock.calls[0][0].anchor).toBeUndefined()
    expect(presented).not.toHaveBeenCalled()
  })

  it('a click point anchors the host menu there in place of the trigger’s box', async () => {
    useSession.setState({ devicePrefs: { nativeMenus: true } })
    await popMenu([{ label: 'New Page', action: 'new' }], trigger(), { at: { x: 40, y: 60 } })
    expect(asked.mock.calls[0][0].anchor).toEqual({ left: 40, top: 60, height: 0 })
  })

  it('a click point reaches the presenter with the trigger', async () => {
    const el = trigger()
    await popMenu([{ label: 'New Page', action: 'new' }], el, { at: { x: 40, y: 60 } })
    expect(presented.mock.calls[0][1]).toBe(el)
    expect(presented.mock.calls[0][2]?.at).toEqual({ x: 40, y: 60 })
  })
})
