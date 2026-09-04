// @vitest-environment jsdom
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InputField } from '@renderer/DesignSystem/Fields'
import { type DismissalHandle, pushDismissal, SHIELD_ATTR, useDismissal } from './dismissalStack'

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

function Host({ onClose }: { onClose: () => void }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useDismissal(true, false, { layer: () => ref.current, dismiss: onClose })
  return (
    <div ref={ref}>
      <InputField edit={{ value: 'Status', onCommit: () => {}, renames: 'row' }}>Status</InputField>
    </div>
  )
}

const pressEscape = (target: EventTarget): void => {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
  })
}
const press = (target: EventTarget): void => {
  act(() => {
    target.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
  })
}
const openCaret = (): HTMLInputElement => {
  act(() => host.querySelector<HTMLElement>('[role="button"]')?.click())
  const input = host.querySelector('input')
  if (!input) throw new Error('no caret opened')
  return input
}

const layer = (): HTMLDivElement => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('useDismissal', () => {
  it('closes the host on Escape', () => {
    const onClose = vi.fn()
    act(() => root.render(<Host onClose={onClose} />))
    pressEscape(document)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leaves the host open when a field inside it takes the Escape', () => {
    const onClose = vi.fn()
    act(() => root.render(<Host onClose={onClose} />))
    pressEscape(openCaret())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('reads the entry live, so a prop change after registration counts', () => {
    const onClose = vi.fn()
    function Toggling({ outside }: { outside: boolean }): React.JSX.Element {
      const ref = useRef<HTMLDivElement>(null)
      useDismissal(true, false, {
        layer: () => ref.current,
        dismiss: onClose,
        outsidePress: outside,
      })
      return <div ref={ref} />
    }
    act(() => root.render(<Toggling outside />))
    act(() => root.render(<Toggling outside={false} />))
    press(document.body)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('leaves the host open while a popup above it owns the Escape', () => {
    const onClose = vi.fn()
    act(() => root.render(<Host onClose={onClose} />))
    const popup = pushDismissal({ layer: () => null, dismiss: () => {} })
    pressEscape(document)
    popup.release()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('the stack', () => {
  const handles: DismissalHandle[] = []
  const stack = (
    names: string[],
    log: string[],
    layers: Record<string, HTMLElement>,
    triggers: Record<string, HTMLElement> = {},
  ): void => {
    for (const n of names)
      handles.push(
        pushDismissal({
          layer: () => layers[n],
          trigger: () => triggers[n] ?? null,
          dismiss: () => log.push(n),
          shield: true,
        }),
      )
  }
  afterEach(() => {
    for (const h of handles.splice(0)) h.release()
    document.body.innerHTML = ''
  })

  it('collapses the whole stack, top down, on a press outside every layer', () => {
    const log: string[] = []
    stack(['a', 'b', 'c'], log, { a: layer(), b: layer(), c: layer() })
    press(document.body)
    expect(log).toEqual(['c', 'b', 'a'])
  })

  it('closes only what stands above the layer that was pressed', () => {
    const log: string[] = []
    const layers = { a: layer(), b: layer(), c: layer() }
    stack(['a', 'b', 'c'], log, layers)
    press(layers.b)
    expect(log).toEqual(['c'])
  })

  it('leaves a press on a popup’s own trigger to that trigger', () => {
    const log: string[] = []
    const layers = { a: layer(), b: layer() }
    const trigger = document.createElement('button')
    layers.a.appendChild(trigger)
    stack(['a', 'b'], log, layers, { b: trigger })
    press(trigger)
    expect(log).toEqual([])
  })

  it('peels one popup per Escape, topmost first', () => {
    const log: string[] = []
    stack(['a', 'b'], log, { a: layer(), b: layer() })
    pressEscape(document)
    handles[1].setClosing(true)
    pressEscape(document)
    expect(log).toEqual(['b', 'a'])
  })

  it('leaves a popup that ignores outside presses standing, and still takes its Escape', () => {
    const log: string[] = []
    const layers = { a: layer(), b: layer() }
    handles.push(
      pushDismissal({ layer: () => layers.a, dismiss: () => log.push('a'), outsidePress: false }),
    )
    stack(['b'], log, layers)
    press(document.body)
    expect(log).toEqual(['b'])
    handles[1].release()
    pressEscape(document)
    expect(log).toEqual(['b', 'a'])
  })

  it('ignores presses while a popup is exiting, and Escape passes the exiting one by', () => {
    const log: string[] = []
    const layers = { a: layer(), b: layer() }
    stack(['a', 'b'], log, layers)
    handles[1].setClosing(true)
    press(document.body)
    expect(log).toEqual([])
    pressEscape(document)
    expect(log).toEqual(['a'])
    expect(handles[0].shields()).toBe(true)
  })

  it('reads through the shield to the layer beneath the press', () => {
    const log: string[] = []
    const layers = { host: layer(), picker: layer() }
    const shield = document.createElement('div')
    shield.setAttribute(SHIELD_ATTR, '')
    document.body.appendChild(shield)
    Object.defineProperty(document, 'elementsFromPoint', {
      value: () => [shield, layers.host, document.body],
      configurable: true,
    })
    stack(['host', 'picker'], log, layers)
    press(shield)
    Reflect.deleteProperty(document, 'elementsFromPoint')
    expect(log).toEqual(['picker'])
  })

  it('marks a consumed Escape before window-level listeners see it', () => {
    let prevented: boolean | null = null
    const onKey = (e: KeyboardEvent): void => {
      prevented = e.defaultPrevented
    }
    window.addEventListener('keydown', onKey)
    stack(['a'], [], { a: layer() })
    pressEscape(document)
    window.removeEventListener('keydown', onKey)
    expect(prevented).toBe(true)
  })

  it('hands the shield to the next popup when the base leaves', () => {
    const layers = { a: layer(), b: layer() }
    stack(['a', 'b'], [], layers)
    expect(handles[0].shields()).toBe(true)
    expect(handles[1].shields()).toBe(false)
    handles[0].release()
    expect(handles[1].shields()).toBe(true)
  })
})
