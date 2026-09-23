// @vitest-environment jsdom
import { detail } from '@pommora/core/Testing/fixtures'
import { makeTree } from '@pommora/core/Testing/testTree'
import { ok } from '@pommora/core/Contract/result'
import type { PageMeta } from '@pommora/core/Nexus/schemas'
import { describe, expect, it, vi } from 'vitest'
import { act, createElement, isValidElement } from 'react'
import { createRoot } from 'react-dom/client'
import { cachePageDetail } from '../Session/pageDetailCache'
import { useSession } from '../Session/store'
import { usePreviewConnections } from '../Session/pageConnections'
import { stubDialer } from '../vitest.setup'
import type { EditorHost } from '../MarkdownPM/api'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { tileWarmSeam, useEditorHost } from './editorHost'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('tileWarmSeam', () => {
  it('round-trips a capture per host chain', () => {
    const seam = tileWarmSeam(['Host.md', 'Target.md'])
    cachePageDetail(detail({ path: 'Target.md', body: 'hello' }))
    seam.capture({ editorState: { doc: 'hello' }, scrollTop: 42 })
    expect(seam.restore()).toEqual({ editorState: { doc: 'hello' }, scrollTop: 42 })
    expect(tileWarmSeam(['Other.md', 'Target.md']).restore()).toBeUndefined()
  })

  it('a foreign edit to the page drops the entry', () => {
    const seam = tileWarmSeam(['Host.md', 'Edited.md'])
    cachePageDetail(detail({ path: 'Edited.md', body: 'v1' }))
    seam.capture({ editorState: { doc: 'v1' }, scrollTop: 10 })
    cachePageDetail(detail({ path: 'Edited.md', body: 'v2' }))
    expect(seam.restore()).toBeUndefined()
    cachePageDetail(detail({ path: 'Edited.md', body: 'v1' }))
    expect(seam.restore()).toBeUndefined()
  })
})

describe('useEditorHost', () => {
  it('a host seated at mount renders a tile against the live connections', async () => {
    const connA = { generation: 'first' } as unknown as ConnectionsApi
    const connB = { generation: 'second' } as unknown as ConnectionsApi
    let seated: EditorHost | null = null
    const Probe = ({ connections }: { connections: ConnectionsApi }): null => {
      const built = useEditorHost({ connections })
      seated ??= built
      return null
    }
    const el = document.createElement('div')
    const root = createRoot(el)
    await act(async () => {
      root.render(createElement(Probe, { connections: connA }))
    })
    await act(async () => {
      root.render(createElement(Probe, { connections: connB }))
    })

    const tile = seated!.renderTile({
      kind: 'page',
      path: 'Note.md',
      editing: false,
      locked: false,
      ancestors: [],
      onBeginEdit: () => {},
    })
    expect(isValidElement(tile) && (tile.props as { connections: unknown }).connections).toBe(connB)
    act(() => root.unmount())
  })
})

describe('the alias memory', () => {
  const withAliases = (aliases: string[]) => ({
    ...makeTree(),
    pageMetadata: { p1: { aliases } } as Record<string, PageMeta>,
  })

  const mountHosts = async (aliases: string[]) => {
    const mutate = vi.fn(async () => ok({}))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ mutate })
    useSession.setState({ tree: withAliases(aliases) })
    const hosts: EditorHost[] = []
    const Probe = (): null => {
      const tree = useSession((s) => s.tree)
      hosts.push(useEditorHost({ pageId: 'p2', connections: usePreviewConnections(tree) }))
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
    return { mutate, hosts, root }
  }

  it('a forget writes the page’s metadata, and the host re-reads once the confirm lands', async () => {
    const { mutate, hosts, root } = await mountHosts(['the notes', 'my draft'])
    const before = hosts[hosts.length - 1]
    expect(before.aliases.list('p1')).toEqual(['the notes', 'my draft'])
    await act(async () => before.aliases.forget('p1', 'the notes'))
    expect(mutate).toHaveBeenCalledWith({
      op: 'setPageMeta',
      path: 'Notes/Alpha.md',
      patch: { aliases: ['my draft'] },
    })
    await act(async () => useSession.setState({ tree: withAliases(['my draft']) }))
    const after = hosts[hosts.length - 1]
    expect(after).not.toBe(before)
    expect(after.aliases.list('p1')).toEqual(['my draft'])
    act(() => root.unmount())
  })

  it('forgetting the last alias clears the field, and an unchanged gesture writes nothing', async () => {
    const { mutate, hosts, root } = await mountHosts(['the notes'])
    const host = hosts[hosts.length - 1]
    await act(async () => host.aliases.remember('p1', 'the notes'))
    await act(async () => host.aliases.forget('p1', 'never given'))
    expect(mutate).not.toHaveBeenCalled()
    await act(async () => host.aliases.forget('p1', 'the notes'))
    expect(mutate).toHaveBeenCalledWith({
      op: 'setPageMeta',
      path: 'Notes/Alpha.md',
      patch: { aliases: null },
    })
    act(() => root.unmount())
  })
})
