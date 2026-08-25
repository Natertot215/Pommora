// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type FieldEdit, InputField } from './InputField'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function mount(edit: FieldEdit): void {
  act(() => root.render(<InputField edit={edit}>{edit.value}</InputField>))
}
const open = (): HTMLInputElement => {
  act(() => host.querySelector<HTMLElement>('[role="button"]')?.click())
  const input = host.querySelector('input')
  if (!input) throw new Error('no caret opened')
  return input
}
const type = (input: HTMLInputElement, text: string): void => {
  act(() => {
    input.value = text
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

describe('InputField edit', () => {
  it('shows the children at rest and a caret over the raw value under a click', () => {
    mount({ value: 'Drafts', onCommit: () => {} })
    expect(host.querySelector('input')).toBeNull()
    expect(open().value).toBe('Drafts')
  })

  it('commits a changed value and cancels an unchanged or emptied one', () => {
    const onCommit = vi.fn()
    mount({ value: 'Drafts', onCommit })
    type(open(), 'Archive')
    expect(onCommit).toHaveBeenCalledWith('Archive')
    type(open(), '')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(host.querySelector('input')).toBeNull()
  })

  it('commits an emptied value when the field holds a value rather than a name', () => {
    const onCommit = vi.fn()
    mount({ value: '.nexus/assets', onCommit, emptyCommits: true })
    type(open(), '')
    expect(onCommit).toHaveBeenCalledWith('')
  })

  it('lets a host drive the edit', () => {
    const onEditingChange = vi.fn()
    mount({ value: 'Drafts', onCommit: () => {}, editing: true, onEditingChange })
    const input = host.querySelector('input')
    expect(input).not.toBeNull()
    act(() => {
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onEditingChange).toHaveBeenCalledWith(false)
  })
})
