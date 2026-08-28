// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MenuIndex, MenuRowView, type MenuRow } from './menu-index'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

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

const render = (node: React.ReactNode): void => {
  act(() => root.render(node))
}
const row = (r: MenuRow): void => render(<MenuRowView row={r} />)

describe('MenuRowView', () => {
  it('renders a heading, capped on request', () => {
    row({ kind: 'heading', label: 'General', caps: true })
    const el = host.firstElementChild as HTMLElement
    expect(el.textContent).toBe('General')
    expect(el.className).toContain('headingCaps')
    row({ kind: 'heading', label: 'General' })
    expect((host.firstElementChild as HTMLElement).className).not.toContain('headingCaps')
  })

  it('renders a separator and a caption', () => {
    row({ kind: 'separator' })
    expect(host.querySelector('[aria-hidden="true"]')).not.toBeNull()
    row({ kind: 'caption', text: 'Nothing here.' })
    expect(host.textContent).toBe('Nothing here.')
  })

  it('renders an item as a button row that selects', () => {
    const onSelect = vi.fn()
    row({ kind: 'item', label: 'Layout', trailing: { kind: 'chevron' }, onSelect })
    const el = host.querySelector('[role="button"]') as HTMLElement
    expect(el.textContent).toBe('Layout')
    expect(el.querySelector('svg')).not.toBeNull()
    el.click()
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('renders an action row on the action class', () => {
    const onClick = vi.fn()
    row({ kind: 'action', label: 'All Properties', onClick })
    const el = host.querySelector('[role="button"]') as HTMLElement
    expect(el.className).toContain('actionRow')
    el.click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('toggles a value row on the row itself', () => {
    const onToggle = vi.fn()
    row({ kind: 'item', label: 'Style', trailing: { kind: 'value', value: 'Compact', onToggle } })
    const el = host.querySelector('[role="button"]') as HTMLElement
    expect(el.textContent).toContain('Compact')
    el.click()
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('keeps a switch trailing labelled on its button', () => {
    const onChange = vi.fn()
    row({
      kind: 'item',
      label: 'Page Icons',
      trailing: { kind: 'switch', checked: true, onChange, ariaLabel: 'Page Icons' },
    })
    const sw = host.querySelector('button[aria-label="Page Icons"]') as HTMLElement
    expect(sw.getAttribute('aria-checked')).toBe('true')
    sw.click()
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('renders a button trailing, inert when disabled', () => {
    const onClick = vi.fn()
    row({
      kind: 'item',
      label: 'Title',
      trailing: { kind: 'button', icon: 'eye', onClick, ariaLabel: 'Show Title', disabled: true },
    })
    const btn = host.querySelector('button[aria-label="Show Title"]') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('renders a picker, a slider and a color trailing', () => {
    row({
      kind: 'item',
      label: 'Order',
      trailing: {
        kind: 'picker',
        ariaLabel: 'Order',
        value: 'a',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        onPick: () => {},
      },
    })
    expect(host.querySelector('button[aria-label="Order"]')?.textContent).toContain('A')
    row({
      kind: 'item',
      label: 'Scale',
      trailing: {
        kind: 'slider',
        value: 1,
        min: 0,
        max: 2,
        ariaLabel: 'Scale',
        onCommit: () => {},
      },
    })
    expect(host.querySelector('[aria-label="Scale"]')).not.toBeNull()
    row({
      kind: 'item',
      label: 'Color',
      trailing: {
        kind: 'color',
        label: 'Color',
        selected: 'default',
        css: 'red',
        onPick: () => {},
      },
    })
    expect(host.querySelector('button')).not.toBeNull()
  })

  it('passes a field trailing and a caption through', () => {
    row({
      kind: 'item',
      label: 'Folder',
      caption: 'Where assets live',
      trailing: { kind: 'field', children: <input aria-label="Folder" /> },
    })
    expect(host.querySelector('input[aria-label="Folder"]')).not.toBeNull()
    expect(host.textContent).toContain('Where assets live')
  })
})

describe('MenuIndex', () => {
  it('renders nothing for zero sections', () => {
    render(<MenuIndex sections={[]} />)
    expect(host.innerHTML).toBe('')
  })

  it('renders nothing for an empty section', () => {
    render(<MenuIndex sections={[{ rows: [] }]} />)
    expect(host.innerHTML).toBe('')
  })

  it('shows a titled section with no rows as its heading alone', () => {
    render(<MenuIndex sections={[{ title: 'Files', caps: true, rows: [] }]} />)
    expect(host.children.length).toBe(1)
    expect(host.textContent).toBe('Files')
    expect((host.firstElementChild as HTMLElement).className).toContain('headingCaps')
  })

  it('renders each section as its heading then its rows', () => {
    render(
      <MenuIndex
        sections={[
          { title: 'A', rows: [{ kind: 'item', label: 'One' }] },
          { rows: [{ kind: 'separator' }, { kind: 'item', label: 'Two' }] },
        ]}
      />,
    )
    expect(host.children.length).toBe(4)
    expect(host.textContent).toBe('AOneTwo')
  })
})
