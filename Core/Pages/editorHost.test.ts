// @vitest-environment jsdom
import { detail } from '../Testing/fixtures'
import { makeTree } from '../Testing/testTree'
import { ok } from '../Contract/result'
import { NO_PREFS } from '../Testing/editorHarness'
import type { PageMeta } from '../Nexus/schemas'
import { describe, expect, it, vi } from 'vitest'
import { act, createElement, isValidElement, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { cachePageDetail } from '../Session/pageDetailCache'
import { useSession } from '../Session/store'
import { useConnections } from '../Session/pageConnections'
import { stubDialer } from '../vitest.setup'
import type { EditorHost } from '../MarkdownPM/api'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { WarmSeam } from '../MarkdownPM/warmSeam'
import { useEditorHost } from './editorHost'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('a page tile warm seam', () => {
  const tileWarmSeam = async (chain: string[]): Promise<WarmSeam> => {
    let seated: EditorHost | null = null
    const Probe = (): null => {
      const built = useEditorHost({})
      seated ??= built
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
    act(() => root.unmount())
    const tile = seated!.renderTile({
      kind: 'page',
      path: chain[chain.length - 1],
      editing: false,
      locked: false,
      ancestors: chain.slice(0, -1),
      onBeginEdit: () => {},
    })
    return (tile as ReactElement<{ warm: WarmSeam }>).props.warm
  }

  it('round-trips a capture per host chain', async () => {
    const seam = await tileWarmSeam(['Host.md', 'Target.md'])
    cachePageDetail(detail({ path: 'Target.md', body: 'hello' }))
    seam.capture({ editorState: { doc: 'hello' }, scrollTop: 42 })
    expect(seam.restore()).toEqual({ editorState: { doc: 'hello' }, scrollTop: 42 })
    expect((await tileWarmSeam(['Other.md', 'Target.md'])).restore()).toBeUndefined()
  })

  it('a foreign edit to the page drops the entry', async () => {
    const seam = await tileWarmSeam(['Host.md', 'Edited.md'])
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

  it('a page’s host loads and saves its prefs through the keyed pair, and an id-less host has none', async () => {
    const prefs = { ...NO_PREFS, folds: ['A'] }
    const get = vi.fn(async () => ok(prefs))
    const set = vi.fn(async () => ok(null))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'editorPrefs:get': get,
      'editorPrefs:set': set,
    })
    const built: EditorHost[] = []
    const Probe = ({ pageId }: { pageId?: string }): null => {
      built.push(useEditorHost({ pageId }))
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe, { pageId: 'p1' })))
    const paged = built[built.length - 1]
    expect(await paged.prefs?.load()).toEqual(prefs)
    expect(get).toHaveBeenCalledWith('p1')
    paged.prefs?.save('folds', ['B'])
    expect(set).toHaveBeenCalledWith('p1', 'folds', ['B'])
    await act(async () => root.render(createElement(Probe, {})))
    expect(built[built.length - 1].prefs).toBeUndefined()
    act(() => root.unmount())
  })
})

describe('the host follows the editor settings', () => {
  it('re-identifies on an editor setting, and stays put on any other', async () => {
    useSession.setState({ tree: makeTree() })
    const hosts: EditorHost[] = []
    const Probe = (): null => {
      hosts.push(useEditorHost({}))
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
    const first = hosts[hosts.length - 1]
    await act(async () =>
      useSession.setState({ tree: makeTree({ personalization: { hideChevrons: true } }) }),
    )
    expect(hosts[hosts.length - 1]).toBe(first)
    await act(async () =>
      useSession.setState({ tree: makeTree({ personalization: { htmlFormatting: false } }) }),
    )
    const after = hosts[hosts.length - 1]
    expect(after).not.toBe(first)
    expect(after.settings().htmlFormatting).toBe(false)
    act(() => root.unmount())
  })
  it('re-identifies on an editor device preference, and stays put on any other', async () => {
    useSession.setState({ tree: makeTree() })
    const hosts: EditorHost[] = []
    const Probe = (): null => {
      hosts.push(useEditorHost({}))
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
    const first = hosts[hosts.length - 1]
    await act(async () => useSession.setState({ devicePrefs: { pasteLinksIntoText: true } }))
    const after = hosts[hosts.length - 1]
    expect(after).not.toBe(first)
    expect(after.settings().pasteLinksIntoText).toBe(true)
    await act(async () =>
      useSession.setState({
        devicePrefs: { pasteLinksIntoText: true, windows: { nav: { w: 400, h: 300 } } },
      }),
    )
    expect(hosts[hosts.length - 1]).toBe(after)
    act(() => root.unmount())
  })
})

describe('the alias memory', () => {
  const withAliases = (aliases: string[]) =>
    makeTree({ pageMetadata: { p1: { aliases } } as Record<string, PageMeta> })

  const mountHosts = async (aliases: string[]) => {
    const mutate = vi.fn(async () => ok({}))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ mutate })
    useSession.setState({ tree: withAliases(aliases) })
    const hosts: EditorHost[] = []
    const Probe = (): null => {
      const tree = useSession((s) => s.tree)
      hosts.push(useEditorHost({ pageId: 'p2', connections: useConnections(tree, 'preview') }))
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Probe)))
    return { mutate, hosts, root }
  }

  it('a forget writes the page’s metadata, and the host re-reads once the push lands', async () => {
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
