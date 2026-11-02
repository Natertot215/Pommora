// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useContext, useEffect, useRef } from 'react'
import { PickerMenu } from './PickerMenu'
import { FieldPicker } from './FieldPicker'
import { SlideGrowth } from '../Menus/FrameSlide'
import { BASE_FEEL } from '../Animations/feel'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Host({
  open,
  focus,
}: {
  open: boolean
  focus?: 'trap' | 'leave' | 'keep'
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
      <PickerMenu
        open={open}
        onDismiss={() => {}}
        triggerRef={ref}
        {...(focus === undefined ? {} : { focus })}
      >
        {menu}
      </PickerMenu>
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

  it('takes focus again when a persistently mounted menu reopens', async () => {
    await render(<Host open={false} />)
    find('trigger').focus()
    await render(<Host open />)
    await render(<Host open={false} />)
    await act(async () => new Promise((r) => setTimeout(r, 500)))
    expect(document.activeElement).toBe(find('trigger'))
    await render(<Host open />)
    expect(document.activeElement).toBe(find('first'))
    expect(document.activeElement?.closest('[data-picker-portal]')).not.toBeNull()
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
          {/* A stacked pane hung off the first as a SIBLING — the OptionEditPopup arrangement, where the outer's keydown listener registers first. */}
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
    expect(log).toEqual(['inner', 'press:last', 'inner'])
    await press(document.body)
    expect(log).toEqual(['inner', 'press:last', 'inner', 'inner', 'outer'])
  })

  it('a kept-focus pane takes its trigger as its own, so a press beneath it closes only it and lands', async () => {
    const log: string[] = []
    function Nested(): React.JSX.Element {
      const outerRef = useRef<HTMLButtonElement>(null)
      const fieldRef = useRef<HTMLDivElement>(null)
      return (
        <>
          <button ref={outerRef} type="button" data-id="trigger">
            Trigger
          </button>
          <PickerMenu open onDismiss={() => log.push('outer')} triggerRef={outerRef}>
            <div ref={fieldRef} data-id="field" />
            <button type="button" data-id="last" onPointerDown={() => log.push('press:last')}>
              Last
            </button>
          </PickerMenu>
          <PickerMenu open onDismiss={() => log.push('inner')} triggerRef={fieldRef} focus="keep">
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
    await press(find('field'))
    expect(log).toEqual([])
    await act(async () => {
      find('field').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })
    expect(log).toEqual(['inner'])
    await press(find('last'))
    expect(log).toEqual(['inner', 'inner', 'press:last'])
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

  it('a kept-focus pane draws no shield', async () => {
    await render(<Host open focus="keep" />)
    expect(document.querySelector('[data-dismissal-shield]')).toBeNull()
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

  it('a dropdown list shields the pane beneath it, so a press on that pane closes only the list', async () => {
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
          <PickerMenu ownShield open onDismiss={() => log.push('list')} triggerRef={innerRef}>
            <button type="button" data-id="nested">
              Nested
            </button>
          </PickerMenu>
        </>
      )
    }
    await render(<Nested />)
    const shields = document.querySelectorAll('[data-dismissal-shield]')
    expect(shields.length).toBe(2)
    Object.defineProperty(document, 'elementsFromPoint', {
      value: () => [shields[1], find('last'), shields[0], document.body],
      configurable: true,
    })
    await act(async () => {
      shields[1].dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
    })
    Reflect.deleteProperty(document, 'elementsFromPoint')
    expect(log).toEqual(['list'])
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

  it('takes no focus on open when focus is left', async () => {
    await render(<Host open={false} focus="leave" />)
    find('trigger').focus()
    await render(<Host open focus="leave" />)
    expect(document.activeElement).toBe(find('trigger'))
  })

  it('refuses every press inside the pane only when focus is kept, before the content it lands on reads it', async () => {
    const press = (): boolean => {
      let seen = false
      const read = (e: Event): void => {
        seen = e.defaultPrevented
      }
      find('first').addEventListener('mousedown', read)
      find('first').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      find('first').removeEventListener('mousedown', read)
      return seen
    }
    await render(<Host open focus="leave" />)
    expect(press()).toBe(false)
    await render(<Host open focus="keep" />)
    expect(press()).toBe(true)
  })

  it('lets a press on a field inside a kept-focus pane through', async () => {
    await render(
      <PickerMenu open focus="keep">
        <input data-id="field" aria-label="Field" />
        <div data-id="row">Row</div>
      </PickerMenu>,
    )
    const press = (id: string): boolean => {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      find(id).dispatchEvent(e)
      return e.defaultPrevented
    }
    expect(press('field')).toBe(false)
    expect(press('row')).toBe(true)
  })
})

describe('PickerMenu close render', () => {
  const PANE_H = 300
  let paneH = PANE_H
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
      get: () => paneH,
    })
  })
  afterEach(() => {
    paneH = PANE_H
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
        at={at ? { ...at, height: 20 } : undefined}
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

  it('decides its side against content a child builds in an effect', async () => {
    paneH = 0
    function Builds(): React.JSX.Element {
      useEffect(() => {
        paneH = PANE_H
      }, [])
      return <span data-id="body">BODY</span>
    }
    await render(
      <PickerMenu open onDismiss={() => {}} at={{ x: 400, y: 500, height: 20 }}>
        <Builds />
      </PickerMenu>,
    )
    expect(layer().style.bottom).not.toBe('')
    expect(layer().style.top).toBe('')
  })

  it('still decides the flip against a measured pane', async () => {
    await render(<Anchored open={false} at={null} direction="up" />)
    await render(<Anchored open at={{ x: 400, y: 100 }} direction="up" />)
    expect(layer().style.top).toBe(`${120 + 6}px`)
    expect(layer().style.bottom).toBe('')
  })
})

describe('PickerMenu re-measure', () => {
  let paneH = 300
  let grew: ((by: number) => void) | null = null
  const observers: (() => void)[] = []
  const animate = vi.fn()
  const realHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const realObserver = globalThis.ResizeObserver
  const realAnimate = Element.prototype.animate
  const realRect = Element.prototype.getBoundingClientRect
  const realFrame = globalThis.requestAnimationFrame

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => paneH,
    })
    Element.prototype.getBoundingClientRect = function (this: HTMLElement): DOMRect {
      return { top: Number.parseFloat(this.style.top) || 0 } as DOMRect
    }
    globalThis.ResizeObserver = class {
      constructor(fire: () => void) {
        observers.push(fire)
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver
    Element.prototype.animate = animate
  })
  afterEach(() => {
    paneH = 300
    grew = null
    observers.length = 0
    animate.mockReset()
    if (realHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', realHeight)
    globalThis.ResizeObserver = realObserver
    Element.prototype.animate = realAnimate
    Element.prototype.getBoundingClientRect = realRect
    globalThis.requestAnimationFrame = realFrame
  })

  function Slides(): React.JSX.Element {
    grew = useContext(SlideGrowth)
    return <span data-id="body">BODY</span>
  }
  const open = (y = 400): Promise<void> =>
    render(
      <PickerMenu open onDismiss={() => {}} at={{ x: 400, y, height: 20 }}>
        <Slides />
      </PickerMenu>,
    )
  const openOn = async (top: number): Promise<{ top: number }> => {
    const at = { top }
    const trigger = document.body.appendChild(document.createElement('button'))
    trigger.getBoundingClientRect = () =>
      ({ top: at.top, bottom: at.top + 20, left: 400, right: 400, width: 0, height: 20 }) as DOMRect
    const ref = { current: trigger }
    await render(
      <PickerMenu open onDismiss={() => {}} triggerRef={ref}>
        <span data-id="body">BODY</span>
      </PickerMenu>,
    )
    return at
  }
  const outsideAct = (fire: () => void): void => {
    const flags = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    flags.IS_REACT_ACT_ENVIRONMENT = false
    try {
      fire()
    } finally {
      flags.IS_REACT_ACT_ENVIRONMENT = true
    }
  }
  const layer = (): HTMLElement => layerOf('body')

  it('flips past the room a slide grows into, playing the crossing, and holds that side', async () => {
    await open()
    expect(layer().style.top).toBe('426px')
    await act(async () => grew?.(100))
    expect(layer().style.bottom).toBe('374px')
    expect(layer().style.top).toBe('')
    expect(animate).toHaveBeenCalledWith(
      [{ transform: 'translateY(332px)' }, { transform: 'none' }],
      BASE_FEEL,
    )
    paneH = 400
    await act(async () => {
      for (const fire of observers) fire()
    })
    expect(layer().style.top).toBe('')
  })

  it('starts a flip from where a fenced pane stood', async () => {
    await open()
    await open(500)
    expect(layer().style.top).toBe('460px')
    await act(async () => grew?.(100))
    expect(layer().style.bottom).toBe('274px')
    expect(animate).toHaveBeenCalledWith(
      [{ transform: 'translateY(266px)' }, { transform: 'none' }],
      BASE_FEEL,
    )
  })

  it('re-places a grown pane before the frame paints', async () => {
    await open()
    expect(layer().style.top).toBe('426px')
    paneH = 400
    outsideAct(() => observers[0]?.())
    expect(layer().style.top).toBe('360px')
  })

  it('re-places for a moved trigger before the frame paints', async () => {
    const at = await openOn(400)
    expect(layer().style.top).toBe('426px')
    at.top = 300
    outsideAct(() => observers[1]?.())
    expect(layer().style.top).toBe('326px')
  })

  it("re-places on a scroll's frame before it paints", async () => {
    const frames: FrameRequestCallback[] = []
    globalThis.requestAnimationFrame = (cb) => frames.push(cb)
    const at = await openOn(400)
    window.dispatchEvent(new Event('scroll'))
    at.top = 300
    outsideAct(() => frames[0]?.(0))
    expect(layer().style.top).toBe('326px')
  })

  it('keeps its side through a shrink, even where the room no longer holds it', async () => {
    await open()
    await open(600)
    await act(async () => grew?.(-50))
    expect(layer().style.top).toBe('460px')
    expect(animate).not.toHaveBeenCalled()
  })

  it('offers a resizable pane no slide growth, so it never flips', async () => {
    await render(
      <PickerMenu
        open
        onDismiss={() => {}}
        at={{ x: 400, y: 400, height: 20 }}
        resize={{ size: {}, resizing: false, place: () => {}, edges: [] }}
      >
        <Slides />
      </PickerMenu>,
    )
    expect(grew).toBeNull()
  })

  it('dismisses when its trigger leaves the page', async () => {
    const dismiss = vi.fn()
    const trigger = document.body.appendChild(document.createElement('button'))
    await render(
      <PickerMenu open onDismiss={dismiss} triggerRef={{ current: trigger }}>
        <span data-id="body">BODY</span>
      </PickerMenu>,
    )
    trigger.remove()
    await act(async () => {
      for (const fire of observers) fire()
    })
    expect(dismiss).toHaveBeenCalledOnce()
  })
})
