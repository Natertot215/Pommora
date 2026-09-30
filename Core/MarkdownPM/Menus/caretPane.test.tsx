// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, type RefObject } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type PaneCtl, usePaneCtl } from './caretPane'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
})

function mount(initial: string[]) {
  const picked: string[] = []
  const seen: { row: string | null; ctl: RefObject<PaneCtl> | null } = { row: null, ctl: null }
  function Harness({ rows }: { rows: string[] }): null {
    const { row, ctl } = usePaneCtl(rows, 'q', {
      open: true,
      pick: (r) => picked.push(r),
      close: () => {},
    })
    seen.row = row
    seen.ctl = ctl
    return null
  }
  root = createRoot(document.createElement('div'))
  const render = (rows: string[]) => act(() => root?.render(<Harness rows={rows} />))
  render(initial)
  const ctl = () => seen.ctl?.current as PaneCtl
  return {
    picked,
    seen,
    render,
    move: (d: number) => act(() => ctl().move(d)),
    pick: () => ctl().pick(),
  }
}

describe('usePaneCtl', () => {
  it('picks the highlighted row itself', () => {
    const pane = mount(['a', 'b', 'c'])
    pane.move(1)
    pane.pick()
    expect(pane.seen.row).toBe('b')
    expect(pane.picked).toEqual(['b'])
  })

  it('steps from the clamped highlight once the list shrinks under it', () => {
    const pane = mount(['a', 'b', 'c', 'd', 'e'])
    for (let i = 0; i < 4; i++) pane.move(1)
    pane.render(['a', 'b', 'c', 'd'])
    expect(pane.seen.row).toBe('d')
    pane.move(-1)
    expect(pane.seen.row).toBe('c')
  })

  it('picks nothing from an empty list', () => {
    const pane = mount([])
    pane.pick()
    expect(pane.seen.row).toBeNull()
    expect(pane.picked).toEqual([])
  })
})
