// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { FieldPicker } from './FieldPicker'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

const render = async (el: React.JSX.Element): Promise<void> => {
  await act(async () => {
    root.render(el)
  })
}
const find = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-id="${id}"]`) as HTMLElement

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

describe('FieldPicker focus', () => {
  it('keeps the FieldPicker rename field’s caret', async () => {
    function RenameHost({ open }: { open: boolean }): React.JSX.Element {
      const ref = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={ref} type="button" data-id="trigger">
            Trigger
          </button>
          <FieldPicker
            open={open}
            onDismiss={() => {}}
            triggerRef={ref}
            value="Alias"
            onCommit={() => {}}
          />
        </>
      )
    }
    await render(<RenameHost open={false} />)
    find('trigger').focus()
    await render(<RenameHost open />)
    const field = document.querySelector('input') as HTMLInputElement
    expect(document.activeElement).toBe(field)
    expect(field.selectionStart).toBe('Alias'.length)
  })

  it('gives the field’s focus up when Escape aborts it', async () => {
    function RenameHost({ open }: { open: boolean }): React.JSX.Element {
      const ref = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={ref} type="button" data-id="trigger">
            Trigger
          </button>
          <FieldPicker
            open={open}
            onDismiss={() => {}}
            triggerRef={ref}
            value="Alias"
            onCommit={() => {}}
          />
        </>
      )
    }
    await render(<RenameHost open={false} />)
    await render(<RenameHost open />)
    const field = document.querySelector('input') as HTMLInputElement
    await act(async () => {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    // A field torn down while focused fires no blur, which strands the drawn caret where it stood.
    expect(document.activeElement).not.toBe(field)
  })
})
