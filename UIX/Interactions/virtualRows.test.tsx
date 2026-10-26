// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useVirtualRows } from './virtualRows'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
let drawn: number[]

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function List({ keep }: { keep?: number }): React.JSX.Element {
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
  const [listEl, setListEl] = useState<HTMLElement | null>(null)
  const { rows } = useVirtualRows({ count: 100, rowHeight: 20, listEl, scrollEl, keep }, [])
  drawn = rows.map((row) => row.index)
  return (
    <div
      ref={(el) => {
        if (el) Object.defineProperty(el, 'offsetHeight', { value: 100 })
        setScrollEl(el)
      }}
    >
      <div ref={setListEl} />
    </div>
  )
}

describe('useVirtualRows', () => {
  it('draws the kept row wherever it sits, with its neighbours, in order', async () => {
    await act(async () => root.render(<List />))
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn).not.toContain(50)
    await act(async () => root.render(<List keep={50} />))
    expect(drawn).toEqual(expect.arrayContaining([49, 50, 51]))
    expect(drawn).toEqual([...drawn].sort((a, b) => a - b))
  })

  it('draws a kept row above the window first, clamped to the list', async () => {
    await act(async () => root.render(<List keep={0} />))
    const scroller = host.firstElementChild as HTMLElement
    await act(async () => {
      scroller.scrollTop = 1000
      scroller.dispatchEvent(new Event('scroll'))
    })
    expect(drawn).not.toContain(2)
    expect(drawn.slice(0, 2)).toEqual([0, 1])
    expect(drawn).toEqual([...drawn].sort((a, b) => a - b))
  })
})
