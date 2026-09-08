// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionItem, MenuRequest } from '@pommora/core/Actions/menuModel'
import { ok } from '@pommora/core/Contract/result'
import { stubDialer } from '../vitest.setup'
import { useSession } from '../Session/store'
import { popMenu } from './menuActions'

let asked = vi.fn((_req: MenuRequest) => ok('native'))
let presented = vi.fn(
  async (
    _items: readonly ActionItem<string>[],
    _trigger: HTMLElement,
    _solid?: boolean,
    _stay?: (action: string) => readonly ActionItem<string>[],
  ) => 'in-app' as string | null,
)

beforeEach(() => {
  asked = vi.fn((_req: MenuRequest) => ok('native'))
  presented = vi.fn(
    async (
      _items: readonly ActionItem<string>[],
      _trigger: HTMLElement,
      _solid?: boolean,
      _stay?: (action: string) => readonly ActionItem<string>[],
    ) => 'in-app' as string | null,
  )
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ menu: asked })
  useSession.setState({ devicePrefs: {}, presentMenu: presented })
})

const trigger = (): HTMLElement => document.createElement('button')

describe('the one door every menu opens through', () => {
  it('drops a separator leading the whole menu, which would separate nothing', async () => {
    await popMenu(
      [
        { label: 'Delete', action: 'delete', separatorBefore: true },
        { label: 'Rename', action: 'rename', separatorBefore: true },
      ],
      trigger(),
    )
    expect(presented.mock.calls[0][0]).toEqual([
      { label: 'Delete', action: 'delete', separatorBefore: false },
      { label: 'Rename', action: 'rename', separatorBefore: true },
    ])
  })

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
    expect(presented.mock.calls[0][2]).toBe(true)
  })

  it('carries a stay handler through the door to the presenter', async () => {
    const stay = (): ActionItem<string>[] => [{ label: 'Rename', action: 'rename' }]
    await popMenu([{ label: 'Rename', action: 'rename' }], trigger(), { stay })
    expect(presented.mock.calls[0][3]).toBe(stay)
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
})
