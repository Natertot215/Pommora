// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import type { SavedView } from '@pommora/core/Views/views'
import { DragGroup, LineZone } from '@pommora/uix/Interactions/drag'
import { firePointer, pressEscape, stubRect } from '@pommora/uix/Testing/pointerHarness'
import { mountEachTest, settle } from '../../Testing/viewHarness'
import { type BandView, GroupBand, bandSpec } from './GroupBand'
import { type BandModel, bandModelOf, headContextOf } from './bandModel'
import type { BandDrop } from './bandRouter'
import { setIndexOf } from './setIndex'

const setNode = (id: string, sets: SetNode[] = []): SetNode =>
  ({ kind: 'set', id, title: id, path: `Col/${id}`, sets, pages: [] }) as unknown as SetNode
const source = {
  kind: 'collection',
  id: 'c',
  title: 'Col',
  path: 'Col',
  sets: [setNode('A', [setNode('A1')]), setNode('B')],
  pages: [],
  properties: [],
  views: [],
} as unknown as CollectionNode
const view = {
  id: 'v',
  name: 'V',
  type: 'table',
  property_order: [],
  hidden_properties: [],
} as unknown as SavedView
const leaf = (key: string, children?: ResolvedGroup[]): ResolvedGroup => ({
  key,
  kind: 'set',
  items: [],
  ...(children ? { children } : {}),
})
const modelOf = (groups: ResolvedGroup[]): BandModel =>
  bandModelOf(
    groups,
    headContextOf(source, setIndexOf(source), undefined, [], view, () => ({}) as never),
  )
const BANDS = modelOf([leaf('A', [leaf('A1')]), leaf('B')])

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
let dropSpy: ReturnType<typeof vi.fn<(dragged: unknown, drop: BandDrop) => void>>
let toggleSpy: ReturnType<typeof vi.fn<(key: string) => void>>

function Bands({
  model = BANDS,
  disabled,
  collapsed = new Set(),
}: {
  model?: BandModel
  disabled?: boolean
  collapsed?: ReadonlySet<string>
}): React.JSX.Element {
  const bands: BandView = {
    collapsed,
    toggle: toggleSpy,
    add: () => {},
    open: () => {},
    springs: () => true,
  }
  const render = (key: string): React.JSX.Element => {
    const node = model.byKey.get(key)
    const children = model.nodes.filter((n) => n.parentKey === key)
    return (
      <GroupBand key={key} node={node} bands={bands}>
        {children.map((c) => render(c.key))}
      </GroupBand>
    )
  }
  return (
    <DragGroup>
      <LineZone
        {...bandSpec({
          bands: model,
          collapsed: bands.collapsed,
          nests: true,
          drop: dropSpy,
          disabled,
          indent: (depth) => ({ left: `${depth * 20}px` }),
        })}
      >
        {model.nodes.filter((n) => n.parentKey === null).map((n) => render(n.key))}
      </LineZone>
    </DragGroup>
  )
}

const head = (key: string): HTMLElement =>
  host.querySelector(`.group-band-head[aria-label="${key}"]`) as HTMLElement
const line = (): HTMLElement | null => host.querySelector('.drop-line')

const lay = (): void => {
  const zone = host.querySelector('.drop-line-host')
  if (zone) stubRect(zone, { top: 0, bottom: 72 })
  for (const [i, key] of ['A', 'A1', 'B'].entries()) {
    const top = i * 24
    stubRect(head(key), { top, bottom: top + 24 })
  }
  const boxes: [string, number, number][] = [
    ['A', 0, 48],
    ['A1', 24, 48],
    ['B', 48, 72],
  ]
  for (const [key, top, bottom] of boxes) {
    const el = head(key).closest('.group-band')
    if (el) stubRect(el, { top, bottom })
  }
}

const mount = async (props: Parameters<typeof Bands>[0] = {}): Promise<void> => {
  await act(async () => {
    root.render(<Bands {...props} />)
  })
  lay()
}

beforeEach(async () => {
  dropSpy = vi.fn()
  toggleSpy = vi.fn()
  await mount()
})

const drag = async (key: string, toY: number): Promise<void> => {
  await act(async () => {
    firePointer(head(key), 'pointerdown', { x: 10, y: 10 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 10, y: toY })
  })
}
const release = async (): Promise<void> => {
  await act(async () => {
    firePointer(window, 'pointerup')
  })
}

describe('the band zone', () => {
  it('activation mounts the insertion line and marks the source band', async () => {
    await drag('A1', 2)
    expect(line()).not.toBeNull()
    expect(head('A1').hasAttribute('data-drag-source')).toBe(true)
    pressEscape()
  })

  it('Escape clears the line and the source mark and commits nothing', async () => {
    await drag('A1', 2)
    await act(async () => {
      pressEscape()
    })
    expect(line()).toBeNull()
    expect(head('A1').hasAttribute('data-drag-source')).toBe(false)
    await release()
    expect(dropSpy).not.toHaveBeenCalled()
  })

  it('a sub-threshold head press-release is a no-op', async () => {
    await act(async () => {
      firePointer(head('A'), 'pointerdown', { x: 10, y: 10 })
    })
    await release()
    expect(dropSpy).not.toHaveBeenCalled()
    expect(line()).toBeNull()
  })

  it('classifies a same-parent drop as a before-slot in the same parent', async () => {
    await drag('B', 2)
    await release()
    expect(dropSpy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ key: 'B' }), {
      kind: 'before',
      beforeKey: 'A',
      parentKey: null,
    })
  })

  it('classifies a parent-changing between-slot as a before-slot under the new parent', async () => {
    await drag('A1', 2)
    await release()
    expect(dropSpy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ key: 'A1' }), {
      kind: 'before',
      beforeKey: 'A',
      parentKey: null,
    })
  })

  it('a 12px drag from the outline lifts the band; a click still toggles', async () => {
    const outline = head('B').querySelector('.group-band-drop-outline') as HTMLElement
    await act(async () => {
      firePointer(outline, 'pointerdown', { x: 5, y: 60 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 5, y: 62 })
    })
    expect(line()).toBeNull()
    await act(async () => {
      firePointer(window, 'pointermove', { x: 5, y: 40 })
    })
    expect(line()).not.toBeNull()
    expect(head('B').hasAttribute('data-drag-source')).toBe(true)
    pressEscape()
    await act(async () => {
      outline.click()
    })
    expect(toggleSpy).toHaveBeenCalledExactlyOnceWith('B')
  })

  it('Enter on a head toggles it through open', async () => {
    await act(async () => {
      head('A').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(toggleSpy).toHaveBeenCalledExactlyOnceWith('A')
  })

  it('marks a band with no items and no sub-bands empty, so opening it adds no clearance', async () => {
    const rowOf = (key: string): HTMLElement => head(key).closest('.group-band-row') as HTMLElement
    expect(rowOf('B').hasAttribute('data-empty')).toBe(true)
    expect(rowOf('A').hasAttribute('data-empty')).toBe(false)
  })

  it('a middle-zone hover draws the line one level in at the first-child edge', async () => {
    await drag('B', 36)
    expect(line()?.style.top).toBe('48px')
    expect(line()?.style.left).toBe('40px')
    await release()
    expect(dropSpy).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ key: 'B' }), {
      kind: 'into',
      parentKey: 'A1',
    })
  })

  it('a collapsed band springs open from anywhere on its head row, not only its label', async () => {
    await mount({ collapsed: new Set(['B']) })
    const row = head('B').closest('.group-band-row')
    const hit = document.elementFromPoint
    document.elementFromPoint = () => row
    try {
      await drag('A1', 60)
      await act(async () => {
        firePointer(window, 'pointermove', { x: 300, y: 62 })
      })
      await settle(700)
      expect(toggleSpy).toHaveBeenCalledWith('B')
    } finally {
      document.elementFromPoint = hit
      pressEscape()
    }
  })

  it('a disabled host starts no drag and commits nothing', async () => {
    await mount({ disabled: true })
    await drag('A1', 2)
    expect(line()).toBeNull()
    expect(head('A1').hasAttribute('data-drag-source')).toBe(false)
    expect(dropSpy).not.toHaveBeenCalled()
  })
})
