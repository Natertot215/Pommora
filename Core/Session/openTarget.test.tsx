// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { makeTree } from '../Testing/testTree'
import { useNavData } from '../Navigation/useNavData'
import { stubDialer } from '../vitest.setup'
import { useConnections } from './pageConnections'
import { useSession } from './store'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const alpha = { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' } as const
const beta = { kind: 'page', id: 'p2', path: 'Notes/Ideas/Beta.md' } as const
const set = { kind: 'set', id: 's1', path: 'Notes/Ideas' } as const

const matchingAlpha = makeTree({
  personalization: {
    openInPreview: {
      rules: { match: 'any', rules: [{ property_id: '_title', op: 'contains', value: 'alpha' }] },
      enabled: true,
    },
  },
})

const { select: realSelect, openWindowTab: realOpenWindowTab } = useSession.getState()

let root: Root | null = null
afterEach(() => {
  const r = root
  root = null
  if (r) act(() => r.unmount())
  useSession.setState({ select: realSelect, openWindowTab: realOpenWindowTab })
})

async function probe<T>(read: () => T): Promise<() => T> {
  let latest: T
  const Probe = (): null => {
    latest = read()
    return null
  }
  root = createRoot(document.createElement('div'))
  await act(async () => root?.render(createElement(Probe)))
  return () => latest
}

describe('openTarget', () => {
  const select = vi.fn(async () => {})
  const openWindowTab = vi.fn()
  beforeEach(() => {
    select.mockClear()
    openWindowTab.mockClear()
    useSession.setState({ tree: matchingAlpha, select, openWindowTab })
  })

  it('sends ⌘ to a new tab, even for a page the rules match', () => {
    expect(useSession.getState().openTarget(alpha, { newTab: true })).toBe('tab')
    expect(select).toHaveBeenCalledWith(alpha, { newTab: true, heading: undefined })
    expect(openWindowTab).not.toHaveBeenCalled()
  })

  it('sends a page the rules match to the Page Window at its heading', () => {
    expect(useSession.getState().openTarget(alpha, { heading: 'Setup' })).toBe('window')
    expect(openWindowTab).toHaveBeenCalledWith(alpha, { heading: 'Setup' })
    expect(select).not.toHaveBeenCalled()
  })

  it('leaves a page the rules miss, and anything but a page, to Default Opening Behavior', () => {
    expect(useSession.getState().openTarget(beta, { heading: 'Setup' })).toBe('tab')
    expect(select).toHaveBeenLastCalledWith(beta, { newTab: undefined, heading: 'Setup' })
    expect(useSession.getState().openTarget(set)).toBe('tab')
    expect(select).toHaveBeenLastCalledWith(set, { newTab: undefined, heading: undefined })
    expect(openWindowTab).not.toHaveBeenCalled()
  })

  it('previews a connection the rules match while Open Connections In Preview is off', async () => {
    const bundle = await probe(() => useConnections('preview'))
    bundle()?.open({ id: alpha.id, title: 'Alpha', path: alpha.path }, 'Setup')
    expect(openWindowTab).toHaveBeenCalledWith(alpha, { heading: 'Setup' })
    expect(select).not.toHaveBeenCalled()
  })
})

describe('a Navigation row', () => {
  beforeEach(() => {
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'page:open': async () => ({ ok: true, value: {} }),
      'nav:write': async () => ({ ok: true, value: null }),
    })
    useSession.setState({ tree: matchingAlpha, windowSlot: null, windowsFile: { sets: {} } })
  })

  it('keeps the NavWindow open when it opens a page the rules match into it', async () => {
    const nav = await probe(useNavData)
    useSession.getState().openNav()
    act(() => nav().go({ kind: 'page', id: alpha.id }, () => useSession.getState().closeWindow()))
    const slot = useSession.getState().windowSlot
    expect(slot?.kind).toBe('nav')
    expect(slot?.tabs.map((t) => t.target)).toContainEqual(alpha)
  })

  it('closes the NavWindow when it opens a page the rules miss into a tab', async () => {
    const nav = await probe(useNavData)
    useSession.getState().openNav()
    act(() => nav().go({ kind: 'page', id: beta.id }, () => useSession.getState().closeWindow()))
    expect(useSession.getState().windowSlot).toBeNull()
  })
})
