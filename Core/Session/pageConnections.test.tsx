// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { makeTree } from '@pommora/core/Testing/testTree'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { useConnections } from './pageConnections'
import { useSession } from './store'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const page = { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' }
const ref = { kind: 'page', id: 'p1', path: 'Notes/Alpha.md' }

let root: Root | null = null
afterEach(() => {
  const r = root
  root = null
  if (r) act(() => r.unmount())
})

async function mountBundles(mode: 'preview' | 'window' | 'inert'): Promise<ConnectionsApi[]> {
  const bundles: ConnectionsApi[] = []
  const Probe = (): null => {
    const tree = useSession((s) => s.tree)
    const bundle = useConnections(tree, mode)
    if (bundle) bundles.push(bundle)
    return null
  }
  root = createRoot(document.createElement('div'))
  await act(async () => root?.render(createElement(Probe)))
  return bundles
}

describe('one hook builds every connections bundle', () => {
  it('an inert bundle re-resolves when a page’s headings change', async () => {
    useSession.setState({ tree: makeTree(), headings: {} })
    const bundles = await mountBundles('inert')
    act(() => useSession.setState({ headings: { 'Notes/Alpha.md': ['setup'] } }))
    const first = bundles[0]
    const last = bundles[bundles.length - 1]
    expect(last).not.toBe(first)
    expect(last.headingsOf?.('Notes/Alpha.md')).toEqual(['setup'])
    expect(last.menu).toBeUndefined()
  })

  it('a window bundle opens a heading link in the window at its heading', async () => {
    const openWindowTab = vi.fn()
    useSession.setState({ tree: makeTree(), openWindowTab })
    const bundles = await mountBundles('window')
    bundles[bundles.length - 1].open(page, 'Setup')
    expect(openWindowTab).toHaveBeenCalledWith(ref, { heading: 'Setup' })
  })

  it('a preview bundle’s ⌘-click opens a new tab at the heading', async () => {
    const select = vi.fn(async () => {})
    useSession.setState({ tree: makeTree(), select })
    const bundles = await mountBundles('preview')
    bundles[bundles.length - 1].bypass?.(page, 'Setup')
    expect(select).toHaveBeenCalledWith(ref, { newTab: true, heading: 'Setup' })
  })
})
