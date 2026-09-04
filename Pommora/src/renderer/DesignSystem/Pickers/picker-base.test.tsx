// @vitest-environment jsdom
// Placement/Bloom geometry is visual truth (CDP), not asserted here.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import { PickerMenu } from './picker-base'
import { TextPicker } from './TextPicker/TextPicker'
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
  bounds,
  origin,
}: {
  open: boolean
  manageFocus?: boolean
  manual?: boolean
  bounds?: { left: number; right: number }
  origin?: 'auto' | 'center' | 'left' | 'right'
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
          {...(bounds ? { bounds } : {})}
          {...(origin ? { origin } : {})}
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
const layerOf = (id: string): HTMLElement => find(id).closest('[data-picker-portal]') as HTMLElement
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

  it('peels only the topmost pane on Escape, then the one beneath it', async () => {
    const dismissed: string[] = []
    function Nested({ inner }: { inner: boolean }): React.JSX.Element {
      const outerRef = useRef<HTMLButtonElement>(null)
      const innerRef = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={outerRef} type="button" data-id="trigger">
            Trigger
          </button>
          <PickerMenu open onDismiss={() => dismissed.push('outer')} triggerRef={outerRef}>
            <button ref={innerRef} type="button" data-id="first">
              First
            </button>
          </PickerMenu>
          {/* A stacked pane hung off the first as a SIBLING — the OptionEditPopup arrangement,
              where the outer's keydown listener registers first. */}
          <PickerMenu open={inner} onDismiss={() => dismissed.push('inner')} triggerRef={innerRef}>
            <button type="button" data-id="nested">
              Nested
            </button>
          </PickerMenu>
        </>
      )
    }
    const pressEscape = async (): Promise<void> => {
      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        )
      })
    }
    await render(<Nested inner />)
    await pressEscape()
    expect(dismissed).toEqual(['inner'])

    // The inner pane stays mounted through its Bloom-out; the outer must not be swallowed by it.
    await render(<Nested inner={false} />)
    await pressEscape()
    expect(dismissed).toEqual(['inner', 'outer'])
  })

  it('a press on the pane beneath closes the stacked pane and still reaches its target', async () => {
    const log: string[] = []
    function Nested(): React.JSX.Element {
      const outerRef = useRef<HTMLButtonElement>(null)
      const innerRef = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={outerRef} type="button" data-id="trigger">
            Trigger
          </button>
          <PickerMenu open onDismiss={() => log.push('outer')} triggerRef={outerRef}>
            <button ref={innerRef} type="button" data-id="first">
              First
            </button>
            <button type="button" data-id="last" onPointerDown={() => log.push('press:last')}>
              Last
            </button>
          </PickerMenu>
          <PickerMenu open onDismiss={() => log.push('inner')} triggerRef={innerRef}>
            <button type="button" data-id="nested">
              Nested
            </button>
          </PickerMenu>
        </>
      )
    }
    const press = async (el: Element): Promise<void> => {
      await act(async () => {
        el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
      })
    }
    await render(<Nested />)
    await press(find('last'))
    expect(log).toEqual(['inner', 'press:last'])
    await press(find('first'))
    expect(log).toEqual(['inner', 'press:last'])
    await press(document.body)
    expect(log).toEqual(['inner', 'press:last', 'inner', 'outer'])
  })

  it('a pane nothing dismisses draws no shield', async () => {
    function Host(): React.JSX.Element {
      const ref = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={ref} type="button" data-id="trigger">
            Trigger
          </button>
          <PickerMenu open triggerRef={ref}>
            <button type="button" data-id="first">
              First
            </button>
          </PickerMenu>
        </>
      )
    }
    await render(<Host />)
    expect(document.querySelectorAll('[data-picker-portal]').length).toBe(1)
  })

  it('only the base pane draws the shield', async () => {
    function Nested(): React.JSX.Element {
      const outerRef = useRef<HTMLButtonElement>(null)
      const innerRef = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={outerRef} type="button" data-id="trigger">
            Trigger
          </button>
          <PickerMenu open onDismiss={() => {}} triggerRef={outerRef}>
            <button ref={innerRef} type="button" data-id="first">
              First
            </button>
          </PickerMenu>
          <PickerMenu open onDismiss={() => {}} triggerRef={innerRef}>
            <button type="button" data-id="nested">
              Nested
            </button>
          </PickerMenu>
        </>
      )
    }
    await render(<Nested />)
    const portals = document.querySelectorAll('[data-picker-portal]')
    expect(portals.length).toBe(3)
    expect(portals[0].contains(find('first'))).toBe(false)
    expect(portals[1].contains(find('first'))).toBe(true)
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

  it('gives the field’s focus up when Escape aborts it', async () => {
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
    await render(<RenameHost open />)
    const field = document.querySelector('input') as HTMLInputElement
    await act(async () => {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    // A field torn down while focused fires no blur, which strands the drawn caret where it stood.
    expect(document.activeElement).not.toBe(field)
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

// Whether a pane CENTERS is a decision, not a look — the pixels stay visual truth, but which of the
// two placements it takes has to hold.
describe('PickerMenu auto-centering', () => {
  const PANE_W = 200
  let triggerCenter = 512
  const realRect = Element.prototype.getBoundingClientRect
  const realWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
  const realHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')

  beforeEach(() => {
    Element.prototype.getBoundingClientRect = (): DOMRect => {
      const left = triggerCenter - 20
      return { left, right: left + 40, top: 100, bottom: 120, width: 40, height: 20 } as DOMRect
    }
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => PANE_W,
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 120,
    })
  })
  afterEach(() => {
    Element.prototype.getBoundingClientRect = realRect
    if (realWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', realWidth)
    if (realHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', realHeight)
  })

  const layer = (): HTMLElement => layerOf('first')

  it('straddles the trigger when the whole pane fits there', async () => {
    triggerCenter = 512 // mid-viewport (jsdom is 1024 wide)
    await render(<Host open={false} />)
    await render(<Host open />)
    expect(layer().style.transform).toBe('translateX(-50%)')
    expect(layer().style.left).toBe('512px')
  })

  // A named `center` slides within its bounds; `auto` declines to center at all once it would have
  // to be clamped, which is the rule below.
  it('slides a centered pane within a given bounds rather than the viewport', async () => {
    // Mid-viewport, so nothing about the WINDOW would move it; the surface is what does.
    triggerCenter = 580
    const b = { left: 200, right: 600 }
    await render(<Host open={false} origin="center" bounds={b} />)
    await render(<Host open origin="center" bounds={b} />)
    expect(layer().style.transform).toBe('translateX(-50%)')
    expect(layer().style.left).toBe('492px') // centering would overhang the surface's right edge
  })

  it('centers freely at that same point when nothing bounds it', async () => {
    triggerCenter = 580
    await render(<Host open={false} origin="center" />)
    await render(<Host open origin="center" />)
    expect(layer().style.left).toBe('580px')
  })

  it('declines to center under `auto` when the bounds would clamp it', async () => {
    triggerCenter = 580
    const b = { left: 200, right: 600 }
    await render(<Host open={false} bounds={b} />)
    await render(<Host open bounds={b} />)
    expect(layer().style.transform).toBe('')
  })

  it('falls back to the edge anchor when centering would be clamped', async () => {
    triggerCenter = 60 // half a pane-width would run past the left margin
    await render(<Host open={false} />)
    await render(<Host open />)
    expect(layer().style.transform).toBe('')
    expect(layer().style.right).not.toBe('')
  })
})

describe('PickerMenu close render', () => {
  const PANE_H = 300
  const realRect = Element.prototype.getBoundingClientRect
  const realWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
  const realHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')

  beforeEach(() => {
    Element.prototype.getBoundingClientRect = (): DOMRect =>
      ({ left: 20, right: 60, top: 500, bottom: 520, width: 40, height: 20 }) as DOMRect
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 200,
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => PANE_H,
    })
  })
  afterEach(() => {
    Element.prototype.getBoundingClientRect = realRect
    if (realWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', realWidth)
    if (realHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', realHeight)
  })

  function Anchored({
    open,
    at,
    direction,
  }: {
    open: boolean
    at: { x: number; y: number } | null
    direction?: 'up' | 'down'
  }): React.JSX.Element {
    return (
      <PickerMenu
        open={open}
        onDismiss={() => {}}
        anchorX={at?.x}
        anchorY={at?.y}
        anchorHeight={at ? 20 : undefined}
        {...(direction ? { direction } : {})}
      >
        {open ? <span data-id="body">BODY</span> : null}
      </PickerMenu>
    )
  }
  const layer = (): HTMLElement => layerOf('body')

  it('holds children a caller nulls in the closing tick', async () => {
    await render(<Anchored open at={{ x: 400, y: 300 }} />)
    await render(<Anchored open={false} at={null} />)
    expect(document.querySelectorAll('[data-picker-portal]').length).toBeGreaterThan(0)
    expect(document.querySelector('[data-id="body"]')?.textContent).toBe('BODY')
  })

  it('holds its place when the anchor is nulled in the closing tick', async () => {
    await render(<Anchored open at={{ x: 400, y: 300 }} />)
    const { left, top } = layer().style
    expect(top).toBe(`${320 + 6}px`)
    await render(<Anchored open={false} at={null} />)
    expect(layer().style.left).toBe(left)
    expect(layer().style.top).toBe(top)
  })

  it('still decides the flip against a measured pane', async () => {
    await render(<Anchored open={false} at={null} direction="up" />)
    await render(<Anchored open at={{ x: 400, y: 100 }} direction="up" />)
    expect(layer().style.top).toBe(`${120 + 6}px`)
    expect(layer().style.bottom).toBe('')
  })
})
