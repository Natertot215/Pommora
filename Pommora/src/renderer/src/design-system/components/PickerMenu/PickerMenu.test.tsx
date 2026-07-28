// @vitest-environment jsdom
// Placement/Bloom geometry is visual truth (CDP), not asserted here.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import { PickerMenu } from './PickerMenu'
import { TextPicker } from '../TextPicker/TextPicker'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

function Host({
  open,
  manageFocus,
  manual,
}: {
  open: boolean
  manageFocus?: boolean
  manual?: boolean
}): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null)
  const menu = (
    <>
      <button type="button" data-id="first">
        First
      </button>
      <button type="button" data-id="last">
        Last
      </button>
    </>
  )
  return (
    <>
      <button ref={ref} type="button" data-id="trigger">
        Trigger
      </button>
      {manual ? (
        <PickerMenu>{menu}</PickerMenu>
      ) : (
        <PickerMenu
          open={open}
          onDismiss={() => {}}
          triggerRef={ref}
          {...(manageFocus === undefined ? {} : { manageFocus })}
        >
          {menu}
        </PickerMenu>
      )}
    </>
  )
}

let host: HTMLDivElement
let root: Root

const render = async (el: React.JSX.Element): Promise<void> => {
  await act(async () => {
    root.render(el)
  })
}
const find = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-id="${id}"]`) as HTMLElement
const tab = async (shiftKey: boolean): Promise<void> => {
  await act(async () => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }),
    )
  })
}

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

describe('PickerMenu focus contract', () => {
  it('moves focus to the pane’s first focusable on open', async () => {
    await render(<Host open={false} />)
    find('trigger').focus()
    await render(<Host open />)
    expect(document.activeElement).toBe(find('first'))
  })

  it('hands focus back to the trigger on close', async () => {
    await render(<Host open={false} />)
    find('trigger').focus()
    await render(<Host open />)
    expect(document.activeElement).toBe(find('first'))
    await render(<Host open={false} />)
    expect(document.activeElement).toBe(find('trigger'))
  })

  it('leaves a restore target the user has already moved off alone', async () => {
    await render(<Host open={false} />)
    find('trigger').focus()
    await render(<Host open />)
    expect(document.activeElement).toBe(find('first'))
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)
    elsewhere.focus()
    await render(<Host open={false} />)
    expect(document.activeElement).toBe(elsewhere)
  })

  it('wraps Tab and Shift-Tab inside the pane', async () => {
    await render(<Host open={false} />)
    find('trigger').focus()
    await render(<Host open />)

    find('last').focus()
    await tab(false)
    expect(document.activeElement).toBe(find('first'))

    await tab(true)
    expect(document.activeElement).toBe(find('last'))
  })

  it('lets an unmodified interior Tab through to the browser', async () => {
    await render(<Host open={false} />)
    find('trigger').focus()
    await render(<Host open />)
    find('first').focus()
    let defaultPrevented = false
    await act(async () => {
      const e = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
      find('first').dispatchEvent(e)
      defaultPrevented = e.defaultPrevented
    })
    expect(defaultPrevented).toBe(false)
  })

  it('yields to a child that focuses itself', async () => {
    function SelfFocusing(): React.JSX.Element {
      const input = useRef<HTMLInputElement>(null)
      useEffect(() => input.current?.focus(), [])
      return <input ref={input} data-id="field" />
    }
    function FieldHost({ open }: { open: boolean }): React.JSX.Element {
      const ref = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={ref} type="button" data-id="trigger">
            Trigger
          </button>
          <PickerMenu open={open} onDismiss={() => {}} triggerRef={ref}>
            <button type="button" data-id="first">
              First
            </button>
            <SelfFocusing />
          </PickerMenu>
        </>
      )
    }
    await render(<FieldHost open={false} />)
    find('trigger').focus()
    await render(<FieldHost open />)
    expect(document.activeElement).toBe(find('field'))
    await render(<FieldHost open={false} />)
    expect(document.activeElement).toBe(find('trigger'))
  })

  it('keeps the TextPicker rename field’s caret', async () => {
    function RenameHost({ open }: { open: boolean }): React.JSX.Element {
      const ref = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={ref} type="button" data-id="trigger">
            Trigger
          </button>
          <TextPicker
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

  it('takes no focus when manageFocus is off', async () => {
    await render(<Host open={false} manageFocus={false} />)
    find('trigger').focus()
    await render(<Host open manageFocus={false} />)
    expect(document.activeElement).toBe(find('trigger'))
  })

  it('leaves manual mode out of the contract entirely', async () => {
    await render(<Host open={false} manual />)
    find('trigger').focus()
    await render(<Host open manual />)
    expect(document.activeElement).toBe(find('trigger'))
  })
})
