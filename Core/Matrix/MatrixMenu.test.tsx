// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type MenuDoor, MenuDoorContext } from '@pommora/uix/Pickers/PickerControl'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { DEFAULT_MATRIX_CONFIG } from './matrixConfig'
import { MatrixMenu } from './MatrixMenu'
import { matrixRuntime } from './matrixRuntime'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

let host: HTMLDivElement
let root: Root
let patch: ReturnType<typeof vi.fn>
let picked: string | null = null
const door = vi.fn<MenuDoor>(async () => picked)

const control = (label: string): HTMLButtonElement =>
  host.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement

const click = (el: Element): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
  })
}

const mount = (display: Partial<typeof DEFAULT_MATRIX_CONFIG.display> = {}): void => {
  patch = vi.fn()
  useSession.setState({
    tree: makeTree(),
    matrixConfig: {
      ...DEFAULT_MATRIX_CONFIG,
      display: { ...DEFAULT_MATRIX_CONFIG.display, ...display },
    },
    patchMatrix: patch as never,
  } as never)
  act(() => {
    root.render(
      <MenuDoorContext.Provider value={door}>
        <MatrixMenu />
      </MenuDoorContext.Provider>,
    )
  })
}

beforeEach(() => {
  door.mockClear()
  picked = null
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  useSession.setState({ tree: null } as never)
})

describe('the Matrix menu', () => {
  it('patches the group mode from the picked row', async () => {
    picked = 'space'
    mount()
    click(control('Groups'))
    await act(async () => {})
    expect(patch).toHaveBeenCalledWith({ group: { mode: 'space' } })
  })

  it('patches each display switch under its own key', () => {
    mount()
    for (const [label, key] of [
      ['Unlinked Items', 'unlinked'],
      ['Hide Icons', 'hideIcon'],
      ['Hide Paths', 'hideLocation'],
    ] as const) {
      patch.mockClear()
      click(control(label))
      expect(patch).toHaveBeenCalledWith({
        display: { [key]: !DEFAULT_MATRIX_CONFIG.display[key] },
      })
    }
  })

  it('patches a force from a picked step and clamps a typed one', async () => {
    picked = '2.5'
    mount()
    click(control('Spread'))
    await act(async () => {})
    expect(patch).toHaveBeenCalledWith({ forces: { spread: 2.5 } })

    patch.mockClear()
    act(() => {
      control('Gravity').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
      )
    })
    const field = host.querySelector('input') as HTMLInputElement
    act(() => {
      field.value = '9'
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.blur()
    })
    expect(patch).toHaveBeenCalledWith({ forces: { gravity: 2 } })
  })

  it('toggles the lock and holds Shuffle while it is on', () => {
    mount()
    click(control('Lock Layout'))
    expect(patch).toHaveBeenCalledWith({ display: { locked: true } })
    expect(control('Shuffle Layout').disabled).toBe(false)

    mount({ locked: true })
    expect(control('Shuffle Layout').disabled).toBe(true)
    const shuffle = vi.spyOn(matrixRuntime, 'shuffle')
    click(control('Shuffle Layout'))
    expect(shuffle).not.toHaveBeenCalled()
    shuffle.mockRestore()
  })
})
