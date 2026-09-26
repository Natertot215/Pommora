// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@pommora/core/Contract/result'
import type { ConnMenuAction } from '@pommora/core/Actions/connectionMenu'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
import { makeTree } from '@pommora/core/Testing/testTree'
import { linkValueMenuTarget, showConnectionMenu } from './connectionMenuActions'

const connMenu = vi.fn<(req: unknown) => Promise<ConnMenuAction | null>>()
;(window as unknown as { nexus: unknown }).nexus = stubDialer({
  menu: async (req: unknown) => ok(await connMenu(req)),
})

const page = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
const target = { kind: 'page', page, editable: false, hasAlias: false } as const

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  connMenu.mockReset()
})

afterEach(() => {
  useSession.setState({ windowSlot: null, selection: { kind: 'none' }, pages: {} })
})

describe('a connection opens its page the two ways every page menu offers', () => {
  it('New Tab selects the page a link names into a tab of its own', async () => {
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

  it('Preview floats it instead', async () => {
    const openWindowTab = vi.fn()
    useSession.setState({ openWindowTab })
    connMenu.mockResolvedValue('title:window')
    showConnectionMenu(target)
    await settle()
    expect(openWindowTab).toHaveBeenCalledWith(
      {
        kind: 'page',
        id: 'p1',
        path: 'Notes/Alpha.md',
      },
      { heading: undefined },
    )
  })
})

describe('a heading link opens at its heading', () => {
  const ref = { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' } as const
  const atSetup = { ...target, heading: 'Setup' }

  it('title:window', async () => {
    const openWindowTab = vi.fn()
    useSession.setState({ openWindowTab })
    connMenu.mockResolvedValue('title:window')
    showConnectionMenu(atSetup)
    await settle()
    expect(openWindowTab).toHaveBeenCalledWith(ref, { heading: 'Setup' })
  })

  it('title:newtab', async () => {
    const select = vi.fn(async () => {})
    useSession.setState({ select })
    connMenu.mockResolvedValue('title:newtab')
    showConnectionMenu(atSetup)
    await settle()
    expect(select).toHaveBeenCalledWith(ref, { newTab: true, heading: 'Setup' })
  })

  const offered = async (): Promise<(string | undefined)[]> => {
    connMenu.mockResolvedValue(null)
    showConnectionMenu(atSetup)
    await settle()
    return (connMenu.mock.calls[0][0] as { items: { action?: string }[] }).items.map(
      (i) => i.action,
    )
  }

  it('a page the window already shows still offers Preview, since it travels to the heading', async () => {
    useSession.setState({
      windowSlot: { kind: 'page', tabs: [{ id: 'tab1', target: ref }], activeTabId: 'tab1' },
    })
    expect(await offered()).toContain('title:window')
  })

  it('a page the content view already shows still offers to open, since it travels to the heading', async () => {
    useSession.setState({
      selection: { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' },
      pages: { p1: { status: 'ready', detail: { ...page, frontmatter: {} }, body: '' } } as never,
    })
    expect(await offered()).toContain('title:newtab')
  })

  it('a Link value carries its heading onto the menu', () => {
    useSession.setState({ tree: makeTree() })
    const menu = linkValueMenuTarget('[[Alpha#Setup]]', () => {})
    expect(menu).toMatchObject({ kind: 'page', heading: 'Setup' })
  })
})
