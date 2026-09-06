// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnMenuAction } from '@pommora/core/Actions/connMenu'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
import { showConnectionMenu } from './connectionMenu'

const connMenu = vi.fn<(req: unknown) => Promise<ConnMenuAction | null>>()
;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'row-menu': connMenu })

const page = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
const target = { kind: 'page', page, editable: false, hasAlias: false } as const

const settle = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  connMenu.mockReset()
})

describe('a connection opens its page the two ways every page menu offers', () => {
  it('Open New Tab selects the page a link names into a tab of its own', async () => {
    const select = vi.fn(async () => {})
    useSession.setState({ select })
    connMenu.mockResolvedValue('title:newtab')
    showConnectionMenu(target)
    await settle()
    expect(select).toHaveBeenCalledWith(
      { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' },
      { newTab: true },
    )
  })

  it('Open Preview floats it instead', async () => {
    const openWindow = vi.fn()
    useSession.setState({ openWindow })
    connMenu.mockResolvedValue('title:window')
    showConnectionMenu(target)
    await settle()
    expect(openWindow).toHaveBeenCalledWith({ id: 'p1', path: 'Notes/Alpha.md' })
  })
})
