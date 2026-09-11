// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { DEFAULT_VIEW_ID, type SavedView } from '@pommora/core/Views/views'
import { useActiveView } from './useActiveView'
import { installViewEnvironment } from '../../Testing/viewHarness'
installViewEnvironment()

const schema: PropertyDefinition[] = [{ id: 'prop_status', name: 'Status', type: 'status' }]

const view = (id: string): SavedView => ({
  id,
  name: id,
  type: 'table',
  property_order: ['_title'],
  hidden_properties: [],
})

const source = (over: Partial<CollectionNode>): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [],
    properties: schema,
    ...over,
  }) as unknown as CollectionNode

let host: HTMLDivElement
let root: Root
let seen: ReturnType<typeof useActiveView>

function Probe({ node }: { node: CollectionNode }): null {
  seen = useActiveView(node, schema)
  return null
}

const mount = (node: CollectionNode): void => {
  act(() => root.render(<Probe node={node} />))
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('useActiveView', () => {
  it("takes the sidecar's active view when it names a saved view", () => {
    mount(source({ views: [view('view_a'), view('view_b')], activeView: 'view_b' }))
    expect(seen.id).toBe('view_b')
  })

  it('falls back to the first saved view when the active view names none', () => {
    mount(source({ views: [view('view_a'), view('view_b')], activeView: 'view_gone' }))
    expect(seen.id).toBe('view_a')
  })

  it('falls back to the first saved view when the sidecar names none', () => {
    mount(source({ views: [view('view_a'), view('view_b')] }))
    expect(seen.id).toBe('view_a')
  })

  it('yields the sentinel for a container holding no views', () => {
    mount(source({ views: undefined }))
    expect(seen.id).toBe(DEFAULT_VIEW_ID)
  })
})
