// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import { solidColorCss } from '@pommora/uix/Theme/ramp'
import * as textPicker from '@pommora/uix/Pickers/text-picker.css'
import { stubEditorBridge } from '../../Testing/editorHarness'
import { makeTree } from '../../Testing/testTree'
import { useSession } from '../../Session/store'
import type { PropertyDefinition, PropertyType } from '../properties'
import type { PropertyValue } from '../propertyValue'
import { buildPageIndex } from '../../Connections/pageIndex'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { PropertyValueInput } from './PropertyValueInput'

stubEditorBridge()

let host: HTMLDivElement
let root: Root
const onCommit = vi.fn()
const onClose = vi.fn()

const holder = { id: 'h', title: 'Holder', path: 'Holder.md' }
const conn: ConnectionsApi = {
  index: buildPageIndex([
    holder,
    { id: 'p1', title: 'Alpha', path: 'Notes/Alpha.md' },
    { id: 'b', title: 'Beta', path: 'Beta.md' },
    { id: 'pg', title: 'Page', path: 'Page.md' },
    { id: 'd1', title: 'Dup', path: 'A/Dup.md' },
    { id: 'd2', title: 'Dup', path: 'B/Dup.md' },
  ]),
  headingsOf: () => undefined,
  open: () => {},
}
const link = (value: string): PropertyValue => ({ kind: 'link', value })
const text = (value: string): PropertyValue => ({ kind: 'text', value })

beforeEach(() => {
  onCommit.mockClear()
  onClose.mockClear()
  useSession.setState({ tree: makeTree() })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  for (const n of document.querySelectorAll('[data-picker-portal]')) n.remove()
})

const mount = (
  def: PropertyDefinition,
  current: PropertyValue | null,
  props: Partial<Parameters<typeof PropertyValueInput>[0]> = {},
): void =>
  act(() =>
    root.render(
      <PropertyValueInput
        def={def}
        current={current}
        holder={holder}
        connections={() => conn}
        onCommit={onCommit}
        onClose={onClose}
        {...props}
      />,
    ),
  )
const remount = (...args: Parameters<typeof mount>): void => {
  act(() => root.render(null))
  mount(...args)
}
const portal = (): Element =>
  document.querySelector('[data-picker-portal]:not([data-dismissal-shield])')!
const popover = { open: true, triggerRef: { current: null } }

const view = (): EditorView => {
  const dom = document.querySelector('.value-field .cm-editor')
  const v = dom && EditorView.findFromDOM(dom as HTMLElement)
  if (!v) throw new Error('no field editor')
  return v
}
const doc = (): string => view().state.doc.toString()
const selected = (): string => {
  const { from, to } = view().state.selection.main
  return doc().slice(from, to)
}
const press = (key: string): void =>
  act(() => {
    view().contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    )
  })
const type = (insert: string, from?: number, to?: number): void =>
  act(() => {
    const v = view()
    const sel = v.state.selection.main
    const a = from ?? sel.from
    const b = to ?? (from === undefined ? sel.to : a)
    v.dispatch({
      changes: { from: a, to: b, insert },
      selection: { anchor: a + insert.length },
      userEvent: insert ? 'input.type' : 'delete.backward',
    })
  })

describe('a Number value', () => {
  const COUNT: PropertyDefinition = { id: 'prop_n', name: 'Count', type: 'number' }
  const input = (): HTMLInputElement => host.querySelector('input') as HTMLInputElement
  const typeInto = (value: string): void =>
    act(() => {
      input().value = value
      input().dispatchEvent(new Event('input', { bubbles: true }))
    })
  const enter = (): void =>
    act(() => {
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
  beforeEach(() => mount(COUNT, { kind: 'number', value: 42 }))

  it('commits the parsed value of changed text and closes', () => {
    expect(input().value).toBe('42')
    typeInto('43.5')
    enter()
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith({ kind: 'number', value: 43.5 })
  })

  it('closes without a commit when the text is unchanged', () => {
    act(() => input().blur())
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('shows a non-number dimmed and refuses it', () => {
    typeInto('42a')
    expect(input().getAttribute('aria-invalid')).toBe('true')
    enter()
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('the popover routes', () => {
  const popoverFor = (type: PropertyType): Element => {
    remount({ id: 'prop_t', name: 'Notes', type }, null, { popover })
    return portal()
  }
  it('opens TextPane for a Text value, the one-line editor for a Link, and the input for a Number', () => {
    expect(popoverFor('text').querySelector('.text-pane .cm-editor')).not.toBeNull()
    expect(portal().querySelector('input')).toBeNull()
    expect(popoverFor('link').querySelector('.value-field .cm-editor')).not.toBeNull()
    expect(portal().querySelector('input')).toBeNull()
    expect(popoverFor('number').querySelector('input')).not.toBeNull()
  })

  it('a Number popover shows its affixes around the input, and a Link popover its editor, in the one field', () => {
    remount(
      { id: 'prop_n', name: 'Count', type: 'number', number_fraction: true, number_denominator: 5 },
      { kind: 'number', value: 2 },
      { popover },
    )
    const chrome = `.${textPicker.field.split(' ')[0]}`
    const number = portal().querySelector(chrome)!
    expect(number.querySelector('input')).not.toBeNull()
    expect(number.textContent).toBe('#/ 5')
    remount({ id: 'prop_l', name: 'Site', type: 'link' }, null, { popover })
    expect(portal().querySelector(`${chrome} .value-field .cm-editor`)).not.toBeNull()
  })

  it('a Number popover commits nothing when its text is unchanged', () => {
    const blank = popoverFor('number').querySelector('input')!
    act(() => {
      blank.focus()
      blank.blur()
    })
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('the Link field', () => {
  const SITE: PropertyDefinition = { id: 'prop_l', name: 'Site', type: 'link', link_color: 'red' }

  it('opens on the whole written value with the caret at the end, wearing the property’s link color', () => {
    mount(SITE, link('[[Alpha|nice]]'))
    expect(host.querySelector('input')).toBeNull()
    expect(doc()).toBe('[[Alpha|nice]]')
    expect(view().state.selection.main.head).toBe(14)
    const wrapper = host.querySelector('span[style]') as HTMLElement
    expect(wrapper.style.color).toBe(solidColorCss('red'))
    expect(wrapper.style.getPropertyValue('--link')).toBe(solidColorCss('red'))
    expect(wrapper.style.getPropertyValue('--connection')).toBe('')
  })

  it('Rename opens the same editor seated in the alias slot', () => {
    mount(SITE, link('[[Alpha|nice]]'), { alias: true, popover })
    expect(selected()).toBe('nice')
    remount(SITE, link('[[Alpha]]'), { alias: true, popover })
    expect(doc()).toBe('[[Alpha|]]')
    expect(view().state.selection.main.head).toBe(8)
    remount(SITE, link('https://example.com'), { alias: true, popover })
    expect(doc()).toBe('[](https://example.com)')
    expect(view().state.selection.main.head).toBe(1)
  })

  it('Rename writes the typed alias onto the same target, and drops it when emptied', () => {
    mount(SITE, link('[[Alpha|nice]]'), { alias: true, popover })
    type('mine')
    press('Enter')
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(link('[[Alpha|mine]]'))
    expect(onClose).toHaveBeenCalledOnce()
    onCommit.mockClear()
    remount(SITE, link('[[Alpha|nice]]'), { alias: true, popover })
    type('')
    press('Enter')
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(link('[[Alpha]]'))
  })

  it('Rename emptied then escaped writes nothing, inline or in the popover', () => {
    for (const props of [{ alias: true }, { alias: true, popover }]) {
      remount(SITE, link('[[Alpha|nice]]'), props)
      type('')
      press('Escape')
      act(() => root.render(null))
    }
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Rename on a bare address and a title respelled by the index both close without a commit', () => {
    mount(SITE, link('https://example.com'), { alias: true, popover })
    press('Enter')
    press('Enter')
    remount(SITE, link('[[Alpha]]'))
    type('[[alpha]]', 0, 9)
    press('Enter')
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Rename clearing the label of a value only the markdown form spells writes its default label, through the settle', () => {
    mount(SITE, link('[x](Page#A%7CB)'), { alias: true, popover })
    expect(selected()).toBe('x')
    type('')
    expect(doc()).toBe('[](Page#A%7CB)')
    press('Enter')
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(link('[A|B](Page#A%7CB)'))
  })

  it('typing `[[` lists pages', async () => {
    mount(SITE, null)
    vi.spyOn(view(), 'coordsAtPos').mockReturnValue({ left: 10, right: 10, top: 10, bottom: 20 })
    await act(async () => {
      view().dispatch({
        changes: { from: 0, insert: '[[Al' },
        selection: { anchor: 4 },
        userEvent: 'input.type',
      })
    })
    expect(document.querySelector('.mdpm-ac')?.textContent).toContain('Alpha')
  })

  it('commits a bare heading on a page, and marks it invalid on a Space', () => {
    mount(SITE, null)
    type('[[#Setup]]')
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(link('[[#Setup]]'))
    remount(SITE, null, { holder: undefined })
    type('[[#Setup]]')
    expect(view().dom.getAttribute('aria-invalid')).toBe('true')
  })

  it('marks a title two pages share invalid, and Return on it closes without a commit', () => {
    mount(SITE, null)
    type('[[Dup]]')
    expect(view().dom.getAttribute('aria-invalid')).toBe('true')
    press('Enter')
    expect(onCommit).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('a title retyped by hand keeps the alias, as a body does', () => {
    mount(SITE, link('[[Alpha|nice]]'))
    type('Beta', 2, 7)
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(link('[[Beta|nice]]'))
  })

  it('Return on an unchanged value, with or without trailing space, and Escape all close without a commit', () => {
    mount(SITE, link('[[Alpha]]'))
    press('Enter')
    expect(onClose).toHaveBeenCalledOnce()
    remount(SITE, link('[[Alpha]]'))
    type(' ')
    press('Enter')
    expect(onClose).toHaveBeenCalledTimes(2)
    remount(SITE, link('[[Alpha]]'))
    type(' x')
    press('Escape')
    expect(onClose).toHaveBeenCalledTimes(3)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Escape in the popover closes it once, through the editor alone', () => {
    mount(SITE, link('[[Alpha]]'), { popover })
    type(' x')
    press('Escape')
    expect(onClose).toHaveBeenCalledOnce()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('remembers nothing on leave: the write layer remembers a landed value once', () => {
    const mutate = vi.spyOn(useSession.getState(), 'mutate').mockResolvedValue(null)
    mount(SITE, link('[[Alpha]]'), { alias: true, popover })
    type('nick')
    press('Enter')
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(link('[[Alpha|nick]]'))
    expect(mutate).not.toHaveBeenCalled()
    mutate.mockRestore()
  })
})

describe('the single-line Text field', () => {
  const NOTES: PropertyDefinition = { id: 'prop_t', name: 'Notes', type: 'text' }

  it('opens on the first line and commits it over the lines behind, untouched', () => {
    mount(NOTES, text('first\nsecond\n'))
    expect(host.querySelector('input')).toBeNull()
    expect(doc()).toBe('first')
    type(' more')
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('first more\nsecond\n'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Escape after typing writes nothing', () => {
    mount(NOTES, null)
    type('see [[Alpha|nick]]')
    press('Escape')
    act(() => root.render(null))
    expect(onCommit).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('remembers an alias typed into a link on leave', () => {
    const mutate = vi.spyOn(useSession.getState(), 'mutate').mockResolvedValue(null)
    mount(NOTES, null)
    type('see [[Alpha|nick]]')
    press('Enter')
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(text('see [[Alpha|nick]]'))
    expect(mutate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ op: 'editAliases', edit: { op: 'add', alias: 'nick' } }),
    )
    mutate.mockRestore()
  })
})
