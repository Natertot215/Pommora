// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Button, Segmented } from './Button'
import { segment } from '@renderer/DesignSystem/Elements/Segment/segment.css'
import * as s from './button.css'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('Button', () => {
  it('renders each content mode with its type class', () => {
    act(() => root.render(<Button type="solid" icon="plus" label="Add" outline />))
    const b = host.querySelector('button')!
    expect(b.className).toContain(s.type.solid)
    expect(b.className).toContain(s.outlined)
    expect(b.querySelector('svg')).not.toBeNull()
    expect(b.textContent).toBe('Add')
  })

  it('label-only needs no icon', () => {
    act(() => root.render(<Button label="Cancel" />))
    const b = host.querySelector('button')!
    expect(b.querySelector('svg')).toBeNull()
    expect(b.className).toContain(s.labelOnly)
  })
})

describe('Segmented', () => {
  it('divides N buttons with N-1 segments', () => {
    act(() =>
      root.render(
        <Segmented
          segments={[
            { icon: 'chevron-left', title: 'Back' },
            { icon: 'chevron-right', title: 'Forward', disabled: true },
          ]}
        />,
      ),
    )
    expect(host.querySelectorAll('button')).toHaveLength(2)
    expect(host.querySelectorAll(`.${segment}`)).toHaveLength(1)
    expect(host.querySelectorAll('button')[1].disabled).toBe(true)
  })
})
