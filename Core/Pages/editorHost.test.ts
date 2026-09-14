import { detail } from '@pommora/core/Testing/fixtures'
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, createElement, isValidElement } from 'react'
import { createRoot } from 'react-dom/client'
import { cachePageDetail } from '../Session/pageDetailCache'
import type { EditorHost } from '../MarkdownPM/api'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { tileWarmSeam, useEditorHost } from './editorHost'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('tileWarmSeam', () => {
  it('round-trips a capture per host chain', () => {
    const seam = tileWarmSeam(['Host.md', 'Target.md'])
    cachePageDetail(
      detail({ id: 'Target.md', title: 'Target.md', path: 'Target.md', body: 'hello' }),
    )
    seam.capture({ editorState: { doc: 'hello' }, scrollTop: 42 })
    expect(seam.restore()).toEqual({ editorState: { doc: 'hello' }, scrollTop: 42 })
    expect(tileWarmSeam(['Other.md', 'Target.md']).restore()).toBeUndefined()
  })

  it('a foreign edit to the page drops the entry', () => {
    const seam = tileWarmSeam(['Host.md', 'Edited.md'])
    cachePageDetail(detail({ id: 'Edited.md', title: 'Edited.md', path: 'Edited.md', body: 'v1' }))
    seam.capture({ editorState: { doc: 'v1' }, scrollTop: 10 })
    cachePageDetail(detail({ id: 'Edited.md', title: 'Edited.md', path: 'Edited.md', body: 'v2' }))
    expect(seam.restore()).toBeUndefined()
    cachePageDetail(detail({ id: 'Edited.md', title: 'Edited.md', path: 'Edited.md', body: 'v1' }))
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
