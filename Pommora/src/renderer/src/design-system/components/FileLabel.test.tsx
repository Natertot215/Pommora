// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { FileLabel } from './FileLabel'

let root: Root | undefined
let host: HTMLElement

const mount = (node: React.JSX.Element): void => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root?.render(node))
}

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  host?.remove()
})

describe('FileLabel', () => {
  it('renders the name it is given', () => {
    mount(<FileLabel name="Report.pdf" />)
    expect(host.textContent).toContain('Report.pdf')
  })

  it('offers no remove control until one is wired', () => {
    mount(<FileLabel name="Report.pdf" />)
    expect(host.querySelector('button')).toBeNull()
  })

  it('wears the chip system’s remove ×, not a copy of it', () => {
    const onRemove = vi.fn()
    mount(<FileLabel name="Report.pdf" onRemove={onRemove} />)
    const remove = host.querySelector('button')
    expect(remove?.getAttribute('aria-label')).toBe('Remove')
    act(() => {
      remove?.click()
    })
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('takes an explicit icon for the names that carry no extension', () => {
    mount(<FileLabel name="Attachments" icon={<svg data-testid="folder" />} />)
    expect(host.querySelector('[data-testid="folder"]')).not.toBeNull()
  })

  it('routes a click when one is wired, and stays inert when none is', () => {
    const onClick = vi.fn()
    mount(<FileLabel name="Report.pdf" onClick={onClick} />)
    act(() => {
      host.querySelector('span')?.click()
    })
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
