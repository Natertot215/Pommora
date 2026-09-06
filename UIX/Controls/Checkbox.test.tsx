// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Checkbox } from './Checkbox'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

const mount = (ui: React.JSX.Element): void => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(ui))
}

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('Checkbox', () => {
  it('interactive → a role=checkbox button that toggles', () => {
    const onChange = vi.fn()
    mount(<Checkbox state={false} onChange={onChange} ariaLabel="Done" />)
    const box = host.querySelector('button')
    expect(box).not.toBeNull()
    expect(box?.getAttribute('role')).toBe('checkbox')
    act(() => box?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('readOnly → a static span, no button', () => {
    mount(<Checkbox readOnly state={true} />)
    expect(host.querySelector('button')).toBeNull()
    const span = host.querySelector('span.checkbox')
    expect(span?.classList.contains('checkbox-static')).toBe(true)
    expect(span?.querySelector('svg')).not.toBeNull()
  })

  it('checked + filled + compact carry their modifier classes', () => {
    mount(<Checkbox readOnly state={true} filled size="compact" />)
    const el = host.querySelector('.checkbox')
    expect(el?.classList.contains('checkbox-checked')).toBe(true)
    expect(el?.classList.contains('checkbox-filled')).toBe(true)
    expect(el?.classList.contains('checkbox-compact')).toBe(true)
  })

  it('color overrides the tint base; colorless leaves the accent recipe to :root', () => {
    mount(<Checkbox readOnly state={true} color="blue" />)
    const styled = host.querySelector('.checkbox') as HTMLElement
    expect(styled.style.getPropertyValue('--checkbox-base')).not.toBe('')

    act(() => root.render(<Checkbox readOnly state={true} />))
    const bare = host.querySelector('.checkbox') as HTMLElement
    expect(bare.style.getPropertyValue('--checkbox-base')).toBe('')
  })
})
