// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { BundleRow } from '../Bundles/rows'
import { TrashFrame } from './TrashFrame'
import { bundleRow as row, boxOf, press, rowOf, stubBrowserEachTest } from '../Testing/bundles'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'
import { ActionLabel } from '../Interface/Notifications/ActionLabel'
import { storesChanged } from '../Session/nexusSlice'
import { fault } from '../Contract/result'

vi.mock('@pommora/uix/Interactions/virtualRows', () => import('../Testing/virtualRows'))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const COLLECTION = '.trash/2026-10-20T12-00-00-000Z__Notes.deleted'
const SET = `${COLLECTION}/Notes/Ideas`
const PAGE = `${SET}/P.md`

const trashedCollection = (): BundleRow =>
  row({ title: 'Notes', kind: 'collection', bundlePath: COLLECTION, crumbs: [] })
const innerSet = (): BundleRow =>
  row({
    title: 'Ideas',
    kind: 'set',
    bundlePath: SET,
    crumbs: [{ kind: 'collection', title: 'Notes' }],
  })
const innerPage = (over: Partial<BundleRow> = {}): BundleRow =>
  row({
    title: 'P',
    bundlePath: PAGE,
    crumbs: [
      { kind: 'collection', title: 'Notes' },
      { kind: 'set', title: 'Ideas' },
    ],
    ...over,
  })

describe('the Trash pane', () => {
  let host: HTMLDivElement
  let root: Root
  const channels = stubBrowserEachTest(() => ({
    'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
  }))

  const titles = (): string[] =>
    [...host.querySelectorAll('[role="checkbox"]')].map((n) =>
      (n.getAttribute('aria-label') ?? '').replace('Select ', ''),
    )
  const showTree = async (): Promise<void> => {
    channels.listed = [trashedCollection()]
    channels.children = { [COLLECTION]: [innerSet()], [SET]: [innerPage()] }
    await act(async () => storesChanged.emit())
  }
  const nexus = (id: string): void => {
    const tree = makeTree()
    useSession.setState({ tree: { ...tree, nexus: { ...tree.nexus, id } } })
  }

  beforeEach(async () => {
    channels.listed = [row({ title: 'Alpha' })]
    nexus('A')
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root.render(<TrashFrame />))
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    useSession.setState({ tree: null })
  })

  it('an empty, unreadable, or unmatched Trash reads its line in the frame, after the table', async () => {
    const line = (): string | null => {
      const el = host.querySelector('.trash-empty')
      if (el?.parentElement?.classList.contains('trash-frame') !== true) return null
      return el.previousElementSibling?.classList.contains('trash-table') ? el.textContent : null
    }
    channels.listed = []
    await act(async () => storesChanged.emit())
    expect(line()).toBe('Trash is empty.')
    channels.list.mockResolvedValueOnce({ ok: false, error: { code: 'io', message: 'No.' } })
    await act(async () => storesChanged.emit())
    expect(line()).toBe("The trash couldn't be read.")
    channels.listed = [row({ title: 'Alpha' })]
    await act(async () => storesChanged.emit())
    const search = host.querySelector('input') as HTMLInputElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(search, 'zzz')
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(line()).toBe('Nothing matches.')
  })

  it("lists the opened Nexus's trash after a switch", async () => {
    expect(titles()).toEqual(['Alpha'])
    expect(channels.list).toHaveBeenCalledWith({ kind: 'trash' }, undefined)
    channels.listed = [row({ title: 'Beta' })]
    await act(async () => nexus('B'))
    expect(titles()).toEqual(['Beta'])
  })

  it('a lone restore’s refusal is the host’s message, with no count', async () => {
    channels.mutated.mockResolvedValue(fault('That item is no longer there.'))
    channels.picked = 'restore'
    const item = host.querySelector('.data-row') as HTMLElement
    await act(async () => {
      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(currentNotification()?.message).toBe('That item is no longer there.')
  })

  it('a double-click on a Trash page opens nothing', async () => {
    for (const detail of [1, 2]) await press(host, 'Alpha', detail)
    await act(async () => {
      rowOf(host, 'Alpha').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(useSession.getState().reader).toBeNull()
  })

  it('an inner row’s right-click Restore lists destinations, and its Delete empties only that item', async () => {
    await showTree()
    channels.children[SET] = [innerPage({ homeResolves: false })]
    await press(host, 'Notes', 1)
    await press(host, 'Ideas', 1)
    channels.picked = 'restoreTo:c1'
    await act(async () => {
      rowOf(host, 'P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(JSON.stringify(channels.menu.mock.lastCall)).toContain('restoreTo:c1')
    expect(channels.mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: PAGE, destination: { kind: 'container', id: 'c1' } }],
    ])
    channels.mutated.mockClear()
    useSession.setState({ askConfirm: async () => true })
    channels.picked = 'delete'
    await act(async () => {
      rowOf(host, 'P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(channels.mutated.mock.calls).toEqual([[{ op: 'emptyBundle', bundlePath: PAGE }]])
  })

  const labelled = async (): Promise<void> => {
    clearNotification()
    await act(async () =>
      root.render(
        <>
          <TrashFrame />
          <ActionLabel />
        </>,
      ),
    )
  }
  const label = (): Element | null | undefined => host.querySelector('[role=status]')

  it('checking a row declares Restore and Delete', async () => {
    await labelled()
    await act(async () => boxOf(host, 'Alpha').click())
    const face = label()?.querySelector('[data-face="shown"]')
    expect(face?.textContent).toBe('Restore1 Page')
    const restore = [...(face?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent === 'Restore',
    )
    await act(async () => (restore as HTMLElement).click())
    expect(channels.mutated.mock.calls).toEqual([
      [{ op: 'restore', bundlePath: channels.listed[0].bundlePath }],
    ])
  })

  it('unchecking withdraws the bar', async () => {
    await labelled()
    await act(async () => boxOf(host, 'Alpha').click())
    expect(label()?.hasAttribute('inert')).toBe(false)
    await act(async () => boxOf(host, 'Alpha').click())
    expect(label()?.hasAttribute('inert')).toBe(true)
  })

  it('lists a delete made elsewhere while it is open', async () => {
    channels.listed = [row({ title: 'Alpha' }), row({ title: 'Gamma' })]
    await act(async () => {
      await useSession.getState().mutate({ op: 'delete', path: 'Notes', kind: 'collection' })
    })
    expect(titles()).toEqual(['Alpha', 'Gamma'])
  })
})
